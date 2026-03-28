import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useEffect } from 'react';

const getNodeStyle = (status, score, isHighlighted) => {
  let base = { color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '10px', width: 120, textAlign: 'center' };
  if (status.includes('FRAUD') || score >= 0.7) base = { ...base, background: '#7f1d1d', border: '2px solid #ef4444' };
  else if (status.includes('HOLD') || score >= 0.4) base = { ...base, background: '#713f12', border: '2px solid #eab308', color: '#fff' };
  else base = { ...base, background: '#14532d', border: '2px solid #22c55e' };
  
  if (isHighlighted) base.boxShadow = '0 0 20px #3b82f6';
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

  const initialNodes = data?.nodes?.filter(n => visibleNodeIds.has(n.id)).map((n, index) => ({
    id: n.id,
    data: { 
      label: `${n.data?.label || n.id}\nLvl ${n.data?.depth} | ${n.data?.risk_score} (${getRiskLabel(n.data?.risk_score)})`,
      risk_score: n.data?.risk_score || 0,
      status: n.data?.status || 'NORMAL'
    },
    position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 150 },
    style: getNodeStyle(n.data?.status, n.data?.risk_score, false)
  })) || [];

  const initialEdges = filteredEdges.map((e) => ({
    id: e.id || `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    label: `${e.label}\n${e.data?.type || ''}`,
    animated: e.data?.is_rapid,
    markerEnd: { type: MarkerType.ArrowClosed, color: e.data?.risk_score >= 0.7 ? '#ef4444' : '#9ca3af' },
    style: { 
        stroke: e.data?.risk_score >= 0.7 ? '#ef4444' : '#9ca3af',
        strokeWidth: e.data?.risk_score >= 0.7 ? 3 : 1
    },
    labelStyle: { fill: '#fff', fontSize: 8, fontWeight: 'bold' },
    labelBgStyle: { fill: '#1f2937', fillOpacity: 0.8 },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 4
  })) || [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [data, currentTime]);

  return (
    <div className="w-full h-full flex flex-col">
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
      
      {/* Timeline Control */}
      {timestamps.length > 0 && (
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
