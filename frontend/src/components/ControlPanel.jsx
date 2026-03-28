import { simulateData } from '../services/api';

export default function ControlPanel({ onRefresh }) {
  const handleSimulate = async () => {
    await simulateData();
    onRefresh();
  };

  return (
    <div className="bg-bgpanel p-4 rounded-xl mb-6 shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-200">Controls</h2>
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={handleSimulate}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold transition text-white"
        >
          Simulate
        </button>
        <button 
          onClick={onRefresh}
          className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-sm font-semibold transition text-white"
        >
          Refresh
        </button>
        <button 
          onClick={async () => { await clearHolds(); onRefresh(); }}
          className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-semibold transition text-white"
        >
          Clear DB
        </button>
      </div>
    </div>
  );
}
