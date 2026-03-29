import { useState, useEffect } from 'react';
import TransactionTable from '../components/TransactionTable';
import ControlPanel from '../components/ControlPanel';
import { getTransactions, loadRealCase } from '../services/api';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const txRes = await getTransactions();
      if (txRes?.success) {
        const txList = txRes.data?.transactions || [];
        setTransactions(txList);
        // If database is empty, automatically load real case once
        if (txList.length === 0 && !window.__autoLoading) {
          window.__autoLoading = true;
          await loadRealCase();
          const retryRes = await getTransactions();
          if (retryRes?.success) setTransactions(retryRes.data?.transactions || []);
          window.__autoLoading = false;
        }
      }
    } catch (e) {
      console.error("Networking error: ", e);
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
      <div className="flex-1 overflow-hidden">
        <TransactionTable transactions={transactions} />
      </div>
    </div>
  );
}
