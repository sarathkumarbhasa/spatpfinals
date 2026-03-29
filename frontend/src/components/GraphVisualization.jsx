import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import { useState, useEffect } from 'react';

const getNodeStyle = (status, score, colorType) => {
  let base = { color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '10px', width: 120, textAlign: 'center' };
  
  if (colorType === 'max_looted') {
    base = { ...base, background: '#450a0a', border: '3px solid #ef4444', fontWeight: 'bold' }; // Dark Red
  } else if (colorType === 'min_looted' || colorType === 'safe') {
    base = { ...base, background: '#064e3b', border: '2px solid #10b981' }; // Green
  } else if (colorType === 'looted') {
    base = { ...base, background: '#7f1d1d', border: '2px solid #f87171' }; // Medium Red
  } else {
    // Fallback to original logic if colorType not provided
    if (status.includes('FRAUD') || score >= 0.7) base = { ...base, background: '#7f1d1d', border: '2px solid #ef4444' };
    else if (status.includes('HOLD') || score >= 0.4) base = { ...base, background: '#713f12', border: '2px solid #eab308', color: '#fff' };
    else base = { ...base, background: '#14532d', border: '2px solid #22c55e' };
  }
  
  return base;
};

export default function GraphVisualization({ data, onNodeClick }) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Get all unique timestamps from edges to build timeline
  const timestamps = data?.edges?.map(e => new Date(e.data?.timestamp).getTime()).sort((a,b) => a-b) || [];
  const minTime = timestamps[0] || 0;
  const maxTime = timestamps[timestamps.length - 1] || 0;

  useEffect(() => {
    let interval;
    if (isPlaying && currentTime < maxTime) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + (maxTime - minTime) / 50;
          if (next >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, maxTime]);

  const getRiskLabel = (score) => {
    if (score >= 0.7) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  const filteredEdges = data?.edges?.filter(e => new Date(e.data?.timestamp).getTime() <= currentTime) || [];
  const visibleNodeIds = new Set(filteredEdges.flatMap(e => [e.source, e.target]));
  if (data?.nodes?.length > 0) visibleNodeIds.add(data.nodes[0].id); // Always show root

  const initialNodes = data?.nodes?.filter(n => visibleNodeIds.has(n.id)).map((n, index) => {
    // Determine layer based on depth for a better tree structure
    const layer = n.data?.depth || 0;
    // Get all nodes in this layer, sorted by ID for a deterministic order
    const nodesInSameLayer = data.nodes
      .filter(node => (node.data?.depth || 0) === layer && visibleNodeIds.has(node.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    const nodeIndexInLayer = nodesInSameLayer.findIndex(node => node.id === n.id);
    
    return {
      id: n.id,
      data: { 
        label: `${n.data?.label || n.id}\nLvl ${n.data?.depth} | ${n.data?.risk_score} (${getRiskLabel(n.data?.risk_score)})\nLooted: ₹${n.data?.financials?.total_looted_amount?.toLocaleString() || 0}`,
        risk_score: n.data?.risk_score || 0,
        status: n.data?.status || 'NORMAL',
        colorType: n.data?.node_color_type
      },
      // Deterministic spacing: X depends on layer index, Y depends on depth
      position: { 
        x: nodeIndexInLayer * 350 - (nodesInSameLayer.length * 175), 
        y: layer * 300 
      },
      style: getNodeStyle(n.data?.status, n.data?.risk_score, n.data?.node_color_type)
    };
  }) || [];

  // Group edges between the same source and target to prevent overlapping labels
  const groupedEdgesMap = filteredEdges.reduce((acc, e) => {
    const key = `${e.source}-${e.target}`;
    if (!acc[key]) {
      acc[key] = { 
        ...e, 
        count: 1, 
        totalAmount: e.data?.amount || 0, 
        types: new Set([e.data?.type]),
        maxRisk: e.data?.risk_score || 0,
        anyRapid: e.data?.is_rapid || false
      };
    } else {
      acc[key].count += 1;
      acc[key].totalAmount += (e.data?.amount || 0);
      if (e.data?.type) acc[key].types.add(e.data?.type);
      acc[key].maxRisk = Math.max(acc[key].maxRisk, e.data?.risk_score || 0);
      acc[key].anyRapid = acc[key].anyRapid || e.data?.is_rapid;
    }
    return acc;
  }, {});

  const initialEdges = Object.values(groupedEdgesMap).map((e) => ({
    id: e.id || `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: 'smoothstep', // Better for parallel-ish lines
    label: e.count > 1 
      ? `${e.count} Txns | ₹${e.totalAmount.toLocaleString()} [${Array.from(e.types).filter(Boolean).join(', ')}]`
      : `${e.label} [${e.data?.type || ''}]`,
    animated: e.anyRapid,
    markerEnd: { type: MarkerType.ArrowClosed, color: e.maxRisk >= 0.7 ? '#ef4444' : '#9ca3af' },
    style: { 
        stroke: e.maxRisk >= 0.7 ? '#ef4444' : '#9ca3af',
        strokeWidth: e.maxRisk >= 0.7 ? 3 : 1.5,
        opacity: 0.8
    },
    labelStyle: { fill: '#fff', fontSize: 9, fontWeight: '800' },
    labelBgStyle: { fill: '#111827', fillOpacity: 0.95, stroke: '#374151', strokeWidth: 1 },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 6
  })) || [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [data, currentTime]);

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => onNodeClick(node.id)}
          fitView
        >
          <Background color="#222" gap={20} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-[10px] text-white space-y-2 z-10">
        <div className="font-bold border-b border-gray-700 pb-1 mb-1 uppercase tracking-wider">Looting Map</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#450a0a] border border-[#ef4444] rounded"></div>
          <span>Red = Max Looted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#064e3b] border border-[#10b981] rounded"></div>
          <span>Green = Min Looted</span>
        </div>
        <div className="flex items-center gap-2 border-t border-gray-700 pt-1 mt-1">
          <span className="text-gray-400 font-bold">L1-L5</span>
          <span>Layer Numbers</span>
        </div>
      </div>
      
      {/* Timeline Control */}
      {timestamps.length > 0 && maxTime > minTime && (
        <div className="bg-bgpanel p-4 border-t border-gray-800 flex items-center gap-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded text-xs font-bold uppercase"
          >
            {isPlaying ? 'Pause' : 'Play Flow'}
          </button>
          <input 
            type="range" 
            min={minTime} 
            max={maxTime} 
            value={currentTime} 
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-[10px] text-gray-400 font-mono w-32">
            {new Date(currentTime).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
