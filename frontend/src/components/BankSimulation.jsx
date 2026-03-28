import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Loader2, CheckCircle2, XCircle, Send, Clock, Building2, Terminal, Wifi } from 'lucide-react';

const BankCard = ({ bank, state }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-400 border-green-900 bg-green-900/10';
      case 'FAILED': return 'text-red-400 border-red-900 bg-red-900/10';
      case 'PROCESSING': return 'text-blue-400 border-blue-900 bg-blue-900/10';
      case 'REQUEST_SENT': return 'text-yellow-400 border-yellow-900 bg-yellow-900/10 animate-pulse';
      default: return 'text-gray-500 border-gray-800 bg-gray-800/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 size={14} />;
      case 'FAILED': return <XCircle size={14} />;
      case 'PROCESSING': return <Loader2 size={14} className="animate-spin" />;
      case 'REQUEST_SENT': return <Wifi size={14} className="animate-bounce" />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className={`p-3 rounded border transition-all duration-300 ${getStatusColor(state.status)}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Building2 size={16} />
          <span className="font-bold text-xs uppercase tracking-wider">{bank}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold">
          {getStatusIcon(state.status)}
          <span>{state.status}</span>
        </div>
      </div>
      
      <div className="space-y-1 text-[9px]">
        <p className="text-gray-400 uppercase tracking-tighter">Live Payload Detail:</p>
        <div className="grid grid-cols-2 gap-x-2 text-white font-mono opacity-80">
          <span>Target: {state.account || 'N/A'}</span>
          <span className="text-right">Amt: ₹{state.amount?.toLocaleString() || '0'}</span>
        </div>
        <p className="text-gray-400 mt-2 italic">"{state.message || 'Waiting for system trigger...'}"</p>
      </div>
    </div>
  );
};

const BankSimulation = forwardRef(({ selectedNode }, ref) => {
  const [bankStates, setBankStates] = useState({
    IOB: { status: 'IDLE', message: '', account: '', amount: 0 },
    SBI: { status: 'IDLE', message: '', account: '', amount: 0 },
    KVB: { status: 'IDLE', message: '', account: '', amount: 0 }
  });

  const [logs, setLogs] = useState([]);

  const addLog = (bank, type, payload) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, bank, type, payload }, ...prev].slice(0, 15));
  };

  const simulateBankRequest = async (bankName, isRetry = false) => {
    const delay = (ms) => new Promise(res => setTimeout(ms, res));
    
    // 1. Send Request
    const payload = {
        action: "FREEZE_REQUEST",
        account_id: selectedNode?.id,
        amount: selectedNode?.data?.financials?.recoverable || 0,
        timestamp: new Date().toISOString()
    };

    setBankStates(prev => ({
      ...prev,
      [bankName]: { 
        ...prev[bankName], 
        status: 'REQUEST_SENT', 
        message: 'POST /v1/freeze HTTP/1.1...',
        account: selectedNode?.id,
        amount: payload.amount
      }
    }));
    addLog(bankName, "SENT", JSON.stringify(payload));
    await delay(1000 + Math.random() * 1000);

    // 2. Processing
    setBankStates(prev => ({
      ...prev,
      [bankName]: { ...prev[bankName], status: 'PROCESSING', message: 'Bank gateway verifying credentials...' }
    }));
    await delay(1500 + Math.random() * 2000);

    // 3. Result Logic
    let finalStatus = 'SUCCESS';
    let finalMessage = '200 OK - Freeze Active';

    if (!isRetry) {
      if (bankName === 'KVB') {
        finalStatus = 'FAILED';
        finalMessage = '504 Gateway Timeout';
        addLog(bankName, "ERROR", finalMessage);
      } else if (bankName === 'SBI') {
        await delay(1000); 
        addLog(bankName, "RECV", "200 OK - Hold Propagated");
      } else {
        addLog(bankName, "RECV", "200 OK - Request Processed");
      }
    } else {
      finalMessage = '200 OK - Retry Success';
      addLog(bankName, "RECV", "200 OK - Retry Confirmed");
    }

    setBankStates(prev => ({
      ...prev,
      [bankName]: { ...prev[bankName], status: finalStatus, message: finalMessage }
    }));
  };

  const startSimulation = async () => {
    if (!selectedNode) return;
    setLogs([]); // Clear logs on new start
    simulateBankRequest('IOB');
    setTimeout(() => simulateBankRequest('SBI'), 500);
    setTimeout(() => simulateBankRequest('KVB'), 1200);
  };

  const startRetry = async () => {
    Object.keys(bankStates).forEach(bank => {
      if (bankStates[bank].status === 'FAILED') {
        simulateBankRequest(bank, true);
      }
    });
  };

  const reset = () => {
    setBankStates({
      IOB: { status: 'IDLE', message: '', account: '', amount: 0 },
      SBI: { status: 'IDLE', message: '', account: '', amount: 0 },
      KVB: { status: 'IDLE', message: '', account: '', amount: 0 }
    });
    setLogs([]);
  };

  useImperativeHandle(ref, () => ({
    trigger: startSimulation,
    retry: startRetry,
    reset: reset
  }));

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1 flex items-center gap-2">
        <Building2 size={12} className="text-blue-400" /> Bank API Checking Simulation
      </p>
      
      {/* Bank Cards */}
      <div className="grid grid-cols-1 gap-2">
        <BankCard bank="IOB" state={bankStates.IOB} />
        <BankCard bank="SBI" state={bankStates.SBI} />
        <BankCard bank="KVB" state={bankStates.KVB} />
      </div>

      {/* Network Console Logs */}
      <div className="bg-black/50 border border-gray-800 rounded p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold border-b border-gray-800 pb-1 mb-2">
            <Terminal size={12} /> Simulated Network Console
        </div>
        <div className="h-32 overflow-y-auto custom-scrollbar space-y-1">
            {logs.length === 0 ? (
                <p className="text-[9px] text-gray-600 italic">No network activity detected...</p>
            ) : (
                logs.map((log, i) => (
                    <div key={i} className="text-[8px] font-mono flex gap-2">
                        <span className="text-gray-600">[{log.time}]</span>
                        <span className={`font-bold ${log.type === 'SENT' ? 'text-blue-400' : log.type === 'ERROR' ? 'text-red-400' : 'text-green-400'}`}>
                            {log.type}
                        </span>
                        <span className="text-gray-400">[{log.bank}]</span>
                        <span className="text-white truncate opacity-80">{log.payload}</span>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
});

export default BankSimulation;
