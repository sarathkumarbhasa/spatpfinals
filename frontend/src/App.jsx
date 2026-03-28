import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GraphView from './pages/GraphView';
import { Activity, Share2 } from 'lucide-react';

function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-bgmain min-h-screen text-gray-200">
        <nav className="w-16 bg-bgpanel flex flex-col items-center py-6 gap-6">
          <Link to="/" className="text-gray-400 hover:text-white" title="Dashboard">
            <Activity size={24} />
          </Link>
          <Link to="/graph" className="text-gray-400 hover:text-white" title="Graph View">
            <Share2 size={24} />
          </Link>
        </nav>
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/graph" element={<GraphView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
