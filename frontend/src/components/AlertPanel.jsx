export default function AlertPanel({ alerts }) {
  return (
    <div className="bg-bgpanel p-4 rounded-xl flex-1 overflow-auto shadow-md">
      <h2 className="text-xl font-bold mb-4 text-red-400">High Risk Alerts</h2>
      <div className="flex flex-col gap-3">
        {alerts?.high_risk_transactions?.slice(0, 10).map((tx, idx) => (
          <div key={idx} className="bg-red-900/40 border-l-4 border-red-500 p-3 rounded">
            <p className="text-sm font-semibold">Risk: {tx.risk_score}</p>
            <p className="text-xs text-gray-400">{tx.sender_id} → {tx.receiver_id}</p>
            <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</p>
          </div>
        ))}
        {(!alerts || !alerts.high_risk_transactions?.length) && (
          <p className="text-gray-500 text-sm">No high-risk algorithms triggered.</p>
        )}
      </div>
      
      <h2 className="text-xl font-bold mt-6 mb-4 text-orange-400">Holds</h2>
      <div className="flex flex-col gap-3">
        {alerts?.hold_transactions?.slice(0, 5).map((tx, idx) => (
          <div key={idx} className="bg-orange-900/40 border-l-4 border-orange-500 p-3 rounded">
            <p className="text-sm font-semibold">{tx.status}</p>
            <p className="text-xs text-gray-400">{tx.sender_id} → {tx.receiver_id}</p>
          </div>
        ))}
        {(!alerts || !alerts.hold_transactions?.length) && (
          <p className="text-gray-500 text-sm">No transactions held.</p>
        )}
      </div>
    </div>
  );
}
