import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GraphView from './pages/GraphView';
import GuidedTour from './components/GuidedTour';
import SplashScreen from './components/SplashScreen';
import { Activity, Share2, HelpCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [runTour, setRunTour] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  return (
    <BrowserRouter>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      <GuidedTour run={runTour} setRun={setRunTour} />
      <div className={`flex h-screen bg-bgdark text-gray-100 overflow-hidden font-sans transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        {/* Modern Glassy Sidebar */}
        <aside className="w-64 border-r border-gray-800 bg-bgpanel/50 backdrop-blur-md flex flex-col z-20 shadow-2xl">
          <div className="p-6 border-b border-gray-800 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <h2 className="font-black text-xl tracking-tighter text-white">FRAUD<span className="text-blue-500">SHIELD</span></h2>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Intelligence Unit</p>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 transition-all group">
              <Activity size={18} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm tracking-wide">Live Dashboard</span>
            </Link>
            <Link to="/graph" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800/50 text-gray-400 hover:text-white transition-all group">
              <Share2 size={18} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm tracking-wide">Graph Network</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-gray-800">
            <button 
              onClick={() => setRunTour(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all border border-gray-700/50 group"
            >
              <HelpCircle size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-xs uppercase tracking-widest">Start Tour</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-[#0a0a0a] relative">
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
