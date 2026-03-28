import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GraphVisualization from '../components/GraphVisualization';
import BankSimulation from '../components/BankSimulation';
import { getGraph, propagateHold, confirmFraud } from '../services/api';
import { ArrowLeft, ShieldAlert, ShieldCheck, Activity, Database, Percent, Info, TrendingUp, TrendingDown, Wallet, AlertTriangle, Shield, Zap, Lock, History } from 'lucide-react';

export default function GraphView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accountId = searchParams.get('account_id') || 'acc_dummy';
  
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const bankSimRef = useRef(null);

  const refreshGraph = async () => {
    if (accountId) {
      const res = await getGraph(accountId);
      if (res?.success) {
        setGraphData(res.data);
        const updatedNode = res.data.nodes.find(n => n.id === (selectedNode?.id || accountId));
        if (updatedNode) setSelectedNode(updatedNode);
      }
    }
  };

  useEffect(() => {
    refreshGraph();
  }, [accountId]);

  const handleNodeClick = (id) => {
    const node = graphData?.nodes.find(n => n.id === id);
    if (node) setSelectedNode(node);
  };

  const getRiskLabel = (score) => {
    if (score >= 0.7) return "High";
    if (score >= 0.4) return "Medium";
    return "Low";
  };

  const getAffectedNodes = (rootId) => {
      if (!graphData) return { count: 0, recoverable: 0 };
      const affected = new Set([rootId]);
      const queue = [rootId];
      let recoverableSum = 0;

      while(queue.length > 0) {
          const curr = queue.shift();
          graphData.edges.forEach(e => {
              if (e.source === curr && !affected.has(e.target)) {
                  affected.add(e.target);
                  queue.push(e.target);
              }
          });
      }
      
      affected.forEach(id => {
          const node = graphData.nodes.find(n => n.id === id);
          recoverableSum += node?.data?.financials?.recoverable || 0;
      });

      return { count: affected.size, recoverable: recoverableSum };
  };

  const impact = selectedNode ? getAffectedNodes(selectedNode.id) : { count: 0, recoverable: 0 };

  return (
    <div className="h-screen w-full flex flex-col bg-bgmain">
      <div className="p-4 bg-bgpanel border-b border-gray-800 flex items-center gap-4 z-10 shadow-sm">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Investigation Graph: {accountId}</h1>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-black relative">
          {graphData && graphData.nodes.length > 0 ? (
            <GraphVisualization key={accountId} data={graphData} onNodeClick={handleNodeClick} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Generating graph rendering bounds... Wait for data.
            </div>
          )}
        </div>
        
        {/* Investigation Sidebar */}
        <div className="w-96 bg-bgpanel border-l border-gray-800 p-6 flex flex-col overflow-auto z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.5)]">
          <h2 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
            <Activity size={18} className="text-blue-400" /> Forensic Insight
          </h2>
          
          {selectedNode ? (
            <div className="space-y-6">
              {/* Account Identifier */}
              <div className="bg-gray-800/30 p-3 rounded border border-gray-800">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Account Identifier</p>
                <p className="font-mono text-sm font-bold text-blue-400 truncate">{selectedNode.id}</p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-gray-900 text-gray-400 text-[9px] px-2 py-0.5 rounded border border-gray-700 font-mono">DEPTH LVL: {selectedNode.data.depth}</span>
                  {selectedNode.data.is_new_account && <span className="bg-blue-900/40 text-blue-300 text-[9px] px-2 py-0.5 rounded border border-blue-700 font-bold">NEW ACCOUNT</span>}
                  {selectedNode.data.is_unknown_account && <span className="bg-purple-900/40 text-purple-300 text-[9px] px-2 py-0.5 rounded border border-purple-700 font-bold">UNKNOWN</span>}
                </div>
              </div>

              {/* INTELLIGENCE LAYER STATUS */}
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2">
                    <Zap size={12} className="text-yellow-500" /> Intelligence Layer Status
                </p>
                <div className="space-y-2">
                    {/* MAPL Layer */}
                    <div className={`p-2 rounded border ${selectedNode.data.intelligence?.mapl?.status === 'ACTIVE' ? 'bg-yellow-900/20 border-yellow-700' : 'bg-gray-800/10 border-gray-800'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-yellow-500 uppercase">Layer 1: MAPL (Pre-Fraud)</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${selectedNode.data.intelligence?.mapl?.status === 'ACTIVE' ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                                {selectedNode.data.intelligence?.mapl?.status}
                            </span>
                        </div>
                        {selectedNode.data.intelligence?.mapl?.status === 'ACTIVE' && (
                            <div className="text-[8px] space-y-1">
                                <p className="text-gray-300"><span className="text-gray-500">TRIGGER:</span> {selectedNode.data.intelligence.mapl.reason}</p>
                                <p className="text-gray-300"><span className="text-gray-500">ACTION:</span> {selectedNode.data.intelligence.mapl.action}</p>
                            </div>
                        )}
                    </div>

                    {/* VACT Layer */}
                    <div className={`p-2 rounded border ${selectedNode.data.intelligence?.vact?.status === 'ACTIVE' ? 'bg-red-900/20 border-red-700' : 'bg-gray-800/10 border-gray-800'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-red-500 uppercase">Layer 2: VACT (Fraud Moment)</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${selectedNode.data.intelligence?.vact?.status === 'ACTIVE' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                {selectedNode.data.intelligence?.vact?.status}
                            </span>
                        </div>
                        {selectedNode.data.intelligence?.vact?.status === 'ACTIVE' && (
                            <div className="text-[8px] space-y-1">
                                <p className="text-gray-300"><span className="text-gray-500">SOURCE:</span> {selectedNode.data.intelligence.vact.source}</p>
                                <p className="text-gray-300"><span className="text-gray-500">AFFECTED:</span> {selectedNode.data.intelligence.vact.affected} Nodes</p>
                                <p className="text-gray-300 truncate"><span className="text-gray-500">TARGETS:</span> {selectedNode.data.intelligence.vact.targets.join(', ')}</p>
                            </div>
                        )}
                    </div>

                    {/* FFAP Layer */}
                    <div className={`p-2 rounded border ${selectedNode.data.intelligence?.ffap?.status === 'ACTIVE' ? 'bg-blue-900/20 border-blue-700' : 'bg-gray-800/10 border-gray-800'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-blue-500 uppercase">Layer 3: FFAP (Post-Fraud)</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${selectedNode.data.intelligence?.ffap?.status === 'ACTIVE' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                {selectedNode.data.intelligence?.ffap?.status}
                            </span>
                        </div>
                        {selectedNode.data.intelligence?.ffap?.status === 'ACTIVE' && (
                            <div className="text-[8px] space-y-1">
                                <div className="flex justify-between text-gray-300">
                                    <span>RECOVERABLE: ₹{selectedNode.data.intelligence.ffap.recoverable.toLocaleString()}</span>
                                    <span className="text-red-400">LOST: ₹{selectedNode.data.intelligence.ffap.lost.toLocaleString()}</span>
                                </div>
                                <p className="text-blue-400 font-bold">EXECUTION: PENDING CROSS-BANK FREEZE</p>
                            </div>
                        )}
                    </div>
                </div>
              </div>

              {/* Bank API Checking Simulation */}
              <BankSimulation ref={bankSimRef} selectedNode={selectedNode} />

              {/* Financial State Tracking */}
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2">
                    <Wallet size={12} /> Financial State Tracking
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/20 p-2 rounded">
                        <div className="flex items-center gap-1 mb-1 text-green-400"><TrendingUp size={12}/> <span className="text-[9px] uppercase">Received</span></div>
                        <p className="text-xs font-bold">₹{selectedNode.data.financials?.received?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800/20 p-2 rounded">
                        <div className="flex items-center gap-1 mb-1 text-red-400"><TrendingDown size={12}/> <span className="text-[9px] uppercase">Sent</span></div>
                        <p className="text-xs font-bold">₹{selectedNode.data.financials?.sent?.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 bg-blue-900/10 p-3 rounded border border-blue-900/30">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-blue-300 uppercase font-bold">Recoverable Balance</span>
                            <span className="text-[10px] text-blue-400 font-mono">₹{selectedNode.data.financials?.balance?.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className="bg-blue-500 h-full transition-all duration-500" 
                                style={{ width: `${(selectedNode.data.financials?.recoverable / (selectedNode.data.financials?.received || 1)) * 100}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-1 text-[8px] text-gray-500">
                            <span>RECOVERABLE: ₹{selectedNode.data.financials?.recoverable?.toLocaleString()}</span>
                            <span>LOST: ₹{selectedNode.data.financials?.lost?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
              </div>

              {/* System Trace Timeline */}
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2">
                    <History size={12} /> System Trace Timeline
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedNode.data.timeline?.map((item, i) => (
                        <div key={i} className="flex gap-3 relative pb-2 last:pb-0">
                            <div className="flex flex-col items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 z-10"></div>
                                <div className="w-0.5 flex-1 bg-gray-800"></div>
                            </div>
                            <div className="text-[9px]">
                                <span className="text-gray-500 font-mono">{item.time}</span>
                                <p className="text-gray-300 font-bold">{item.event}</p>
                                <p className="text-gray-500 italic">{item.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
              </div>

              {/* Enforcement Preview & Actions */}
              <div className="pt-4 space-y-3">
                {showPreview ? (
                    <div className="bg-orange-900/20 border border-orange-500/50 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 mb-2 text-orange-400">
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-bold uppercase">Propagation Preview</span>
                        </div>
                        <p className="text-[11px] text-gray-300 mb-3">
                            Freezing this node will propagate downstream to <span className="text-white font-bold">{impact.count} accounts</span>.
                            Estimated recoverable amount: <span className="text-green-400 font-bold">₹{impact.recoverable.toLocaleString()}</span>.
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={async () => {
                                    setLoading(true);
                                    bankSimRef.current?.trigger();
                                    await propagateHold(selectedNode.id);
                                    await refreshGraph();
                                    setShowPreview(false);
                                    setLoading(false);
                                }}
                                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-1.5 rounded text-[10px] font-bold uppercase"
                            >
                                Confirm Freeze
                            </button>
                            <button 
                                onClick={() => setShowPreview(false)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded text-[10px] font-bold uppercase"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button 
                            disabled={loading}
                            onClick={() => setShowPreview(true)}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 py-2.5 rounded font-bold text-xs transition uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2"
                        >
                            Propagate Hold Trace
                        </button>
                        <button 
                            disabled={loading}
                            onClick={async () => {
                                setLoading(true);
                                bankSimRef.current?.retry();
                                await confirmFraud(selectedNode.id);
                                await refreshGraph();
                                setLoading(false);
                            }}
                            className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-700 py-2.5 rounded font-bold text-xs transition uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2"
                        >
                            Confirm Fraud Detection
                        </button>
                    </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <Activity size={48} className="text-gray-800 mb-4" />
              <p className="text-gray-500 text-sm">Select an account node to view deep forensic analytics and take enforcement actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
