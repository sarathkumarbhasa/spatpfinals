import { useNavigate } from 'react-router-dom';

export default function TransactionTable({ transactions }) {
  const navigate = useNavigate();

  const getRiskLabel = (score) => {
    if (score >= 0.7) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  const getRiskColor = (score) => {
    if (score >= 0.7) return 'bg-red-500 text-white';
    if (score >= 0.4) return 'bg-yellow-500 text-black';
    return 'bg-green-500 text-white';
  };

  return (
    <div className="bg-bgpanel p-6 rounded-xl shadow-md h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Live Transactions</h2>
      <div className="overflow-auto flex-1 border border-gray-700/50 rounded-lg">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-800 text-gray-400 sticky top-0 uppercase">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Layer</th>
              <th className="px-4 py-3">Sender</th>
              <th className="px-4 py-3">Receiver</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(transactions || []).map((tx, idx) => (
              <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-gray-200">{new Date(tx.timestamp).toLocaleDateString()}</span>
                    <span className="text-gray-500 text-[10px]">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                    {tx.withdrawal_type || 'UPI'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-400 font-bold">L{tx.layer || 0}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{tx.sender_id}</td>
                <td className="px-4 py-3 font-mono text-xs">{tx.receiver_id}</td>
                <td className="px-4 py-3 text-right">₹{tx.amount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 mb-1">{tx.risk_score}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskColor(tx.risk_score)}`}>
                      {getRiskLabel(tx.risk_score)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    tx.status === 'FRAUD_CONFIRMED' ? 'bg-red-900 text-red-200 border border-red-700' :
                    tx.status === 'HOLD' ? 'bg-orange-900 text-orange-200 border border-orange-700' :
                    'bg-green-900 text-green-200 border border-green-700'
                  }`}>
                    {tx.status || 'COMPLETED'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                  <button 
                    onClick={() => navigate(`/graph?account_id=${tx.sender_id}`)}
                    className="text-blue-500 hover:text-blue-400 font-bold uppercase tracking-widest text-[10px] bg-blue-500/10 px-3 py-1 rounded border border-blue-500/20 hover:bg-blue-500/20 transition-all tour-graph-button"
                  >
                    Graph
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!transactions || transactions.length === 0) && (
          <div className="p-8 text-center text-gray-500">No transactions yet</div>
        )}
      </div>
    </div>
  );
}
