import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GraphVisualization from '../components/GraphVisualization';
import BankSimulation from '../components/BankSimulation';
import { getGraph, propagateHold, confirmFraud } from '../services/api';
import { ArrowLeft, Activity, Wallet, AlertTriangle, Shield, Zap, History } from 'lucide-react';

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
        // If no data and we are using dummy, try to find a real victim
        if (res.data.nodes.length === 0 && accountId === 'acc_dummy') {
           const victims = ["62350102489", "50100250798812"];
           navigate(`/graph?account_id=${victims[0]}`);
           return;
        }
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
                </div>
              </div>

              {/* INTELLIGENCE LAYER STATUS - ONLY FFAP */}
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2">
                    <Zap size={12} className="text-blue-500" /> Layer 3: FFAP Intelligence
                </p>
                <div className={`p-3 rounded border ${selectedNode.data.intelligence?.ffap?.status === 'ACTIVE' ? 'bg-blue-900/20 border-blue-700' : 'bg-gray-800/10 border-gray-800'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-blue-500 uppercase">Post-Fraud Tracking</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${selectedNode.data.intelligence?.ffap?.status === 'ACTIVE' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                            {selectedNode.data.intelligence?.ffap?.status}
                        </span>
                    </div>
                    {selectedNode.data.intelligence?.ffap?.status === 'ACTIVE' ? (
                        <div className="text-[10px] space-y-2">
                            <div className="flex justify-between text-gray-300">
                                <span>RECOVERABLE: <span className="text-green-400 font-bold">₹{selectedNode.data.intelligence.ffap.recoverable.toLocaleString()}</span></span>
                                <span>LOST: <span className="text-red-400 font-bold">₹{selectedNode.data.intelligence.ffap.lost.toLocaleString()}</span></span>
                            </div>
                            <div className="bg-blue-900/30 p-2 rounded text-blue-400 font-bold text-center border border-blue-800/50">
                                EXECUTION: PENDING CROSS-BANK FREEZE
                            </div>
                        </div>
                    ) : (
                        <p className="text-[10px] text-gray-500 italic text-center">No post-fraud activity detected for this node.</p>
                    )}
                </div>
              </div>

              {/* Bank API Checking Simulation */}
              <BankSimulation ref={bankSimRef} selectedNode={selectedNode} />

              {/* Transaction Details & Financials */}
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2">
                    <Wallet size={12} /> Transaction Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/20 p-2 rounded col-span-2 border border-red-900/30">
                        <div className="flex items-center gap-1 mb-1 text-red-500 font-bold uppercase"><Shield size={12}/> <span className="text-[9px]">Total Looted Amount</span></div>
                        <p className="text-sm font-bold text-red-400">₹{selectedNode.data.financials?.total_looted_amount?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800/20 p-2 rounded border border-gray-800">
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Received</span>
                        <p className="text-xs font-bold text-gray-300">₹{selectedNode.data.financials?.received?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800/20 p-2 rounded border border-gray-800">
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Sent</span>
                        <p className="text-xs font-bold text-gray-300">₹{selectedNode.data.financials?.sent?.toLocaleString()}</p>
                    </div>
                </div>
              </div>

              {/* System Trace Timeline - Simplified Transaction Details */}
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2">
                    <History size={12} /> System Trace
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
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

              {/* Enforcement Actions */}
              <div className="pt-4 space-y-3">
                {showPreview ? (
                    <div className="bg-orange-900/20 border border-orange-500/50 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 mb-2 text-orange-400">
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-bold uppercase">Propagation Preview</span>
                        </div>
                        <p className="text-[11px] text-gray-300 mb-3">
                            Freezing this node will propagate downstream to <span className="text-white font-bold">{impact.count} accounts</span>.
                            Estimated recovery: <span className="text-green-400 font-bold">₹{impact.recoverable.toLocaleString()}</span>.
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
                            disabled={loading || selectedNode.data.status === 'HOLD'}
                            onClick={() => setShowPreview(true)}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 py-2.5 rounded font-bold text-xs transition uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2"
                        >
                            {selectedNode.data.status === 'HOLD' ? 'Hold Active' : 'Propagate Hold Trace'}
                        </button>
                        <button 
                            disabled={loading || selectedNode.data.status === 'FRAUD_CONFIRMED'}
                            onClick={async () => {
                                setLoading(true);
                                bankSimRef.current?.retry();
                                await confirmFraud(selectedNode.id);
                                await refreshGraph();
                                setLoading(false);
                            }}
                            className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-700 py-2.5 rounded font-bold text-xs transition uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2"
                        >
                            {selectedNode.data.status === 'FRAUD_CONFIRMED' ? 'Fraud Confirmed' : 'Confirm Fraud Detection'}
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
