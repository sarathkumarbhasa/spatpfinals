import { useState, useEffect } from 'react';
import TransactionTable from '../components/TransactionTable';
import AlertPanel from '../components/AlertPanel';
import ControlPanel from '../components/ControlPanel';
import { getTransactions, getAlerts } from '../services/api';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState(null);

  const fetchData = async () => {
    try {
      const txRes = await getTransactions();
      if (txRes?.success) setTransactions(txRes.data.transactions);
      
      const alRes = await getAlerts();
      if (alRes?.success) setAlerts(alRes.data);
    } catch (e) {
      console.error("Networking error: ", e);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="p-6 h-screen flex gap-6">
      {/* Ensure strictly compliant layout logic -> 70% left, 30% right */}
      <div className="w-[70%] h-full">
        <TransactionTable transactions={transactions} />
      </div>
      <div className="w-[30%] h-full flex flex-col">
        <ControlPanel onRefresh={fetchData} />
        <AlertPanel alerts={alerts} />
      </div>
    </div>
  );
}
