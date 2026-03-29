import { useState } from 'react';
import { loadRealCase } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ControlPanel({ onRefresh }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLoadRealCase = async () => {
    setLoading(true);
    const res = await loadRealCase();
    setLoading(false);
    if (res?.success) {
      onRefresh();
    } else {
        const errorMsg = res?.message || res?.error || "Unknown forensic ingestion error";
        alert("Failed to load real case: " + errorMsg);
    }
  };

  return (
    <div className="flex gap-3">
      <button 
        disabled={loading}
        onClick={handleLoadRealCase}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 px-8 py-3 rounded-lg text-sm font-bold transition text-white shadow-lg uppercase tracking-widest border border-emerald-500/50 flex items-center gap-2 tour-load-button"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Processing train_final...' : 'Load Real Case (train_final)'}
      </button>
    </div>
  );
}
