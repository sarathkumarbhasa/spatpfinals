import { useState, useEffect } from 'react';
import TransactionTable from '../components/TransactionTable';
import ControlPanel from '../components/ControlPanel';
import { getTransactions, loadRealCase } from '../services/api';
import { ShieldAlert, TrendingDown, Database, Activity } from 'lucide-react';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const txRes = await getTransactions();
      if (txRes?.success) {
        const txList = txRes.data?.transactions || [];
        setTransactions(txList);
        setSummary(txRes.data?.summary);
        
        // If database is empty, automatically load real case once
        if (txList.length === 0 && !window.__autoLoading) {
          window.__autoLoading = true;
          console.log("Database empty. Auto-ingesting forensic data...");
          const loadRes = await loadRealCase();
          if (loadRes?.success) {
            const retryRes = await getTransactions();
            if (retryRes?.success) {
              setTransactions(retryRes.data?.transactions || []);
              setSummary(retryRes.data?.summary);
            }
          } else {
            console.error("Forensic Ingestion Error:", loadRes?.error || "Unknown Error");
          }
          window.__autoLoading = false;
        }
      }
    } catch (e) {
      console.error("Dashboard Networking error: ", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="p-6 h-screen flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-white tracking-tight">FraudShield <span className="text-blue-500">Live Dashboard</span></h1>
            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Real-Time Transaction Forensic Analysis</p>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={fetchData}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition border border-gray-700 tour-refresh-button"
            >
                Manual Refresh
            </button>
            <ControlPanel onRefresh={fetchData} />
        </div>
      </div>

      {/* Dashboard Top Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-bgpanel border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <Database size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Ingested</p>
              <p className="text-xl font-bold text-white">{summary.total_count}</p>
            </div>
          </div>
          <div className="bg-bgpanel border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">High Risk Alerts</p>
              <p className="text-xl font-bold text-white">{summary.high_risk_count}</p>
            </div>
          </div>
          <div className="bg-bgpanel border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Looted Assets</p>
              <p className="text-xl font-bold text-white">₹{(summary.total_looted / 100000).toFixed(1)}L</p>
            </div>
          </div>
          <div className="bg-bgpanel border border-gray-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">System Status</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-xl font-bold text-white">ACTIVE</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <TransactionTable transactions={transactions} />
      </div>
    </div>
  );
}
