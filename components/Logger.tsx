import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';

interface LoggerProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const Logger: React.FC<LoggerProps> = ({ logs, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-blue-400';
    }
  };

  const formatTime = (date: Date) => {
    // Manual millisecond formatting to avoid TypeScript error with fractionalSecondDigits in strict environments
    const timeStr = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  return (
    <div className={`absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 shadow-2xl transition-all duration-300 z-50 flex flex-col ${isOpen ? 'h-80' : 'h-10'}`}>
      {/* Header / Toggle Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 bg-slate-900 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-800 transition-colors select-none"
      >
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className={`w-2 h-2 rounded-full ${logs.length > 0 && logs[logs.length-1].level === 'error' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
          <span className="font-bold text-slate-300">SYSTEM CONSOLE</span>
          {!isOpen && logs.length > 0 && (
            <span className="text-slate-500 hidden sm:inline-block truncate max-w-md border-l border-slate-700 pl-3">
              Last: <span className={getLevelColor(logs[logs.length-1].level)}>{logs[logs.length-1].message}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isOpen && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded"
            >
              Clear
            </button>
          )}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>

      {/* Console Body */}
      {isOpen && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-[#0a0f1e]">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic opacity-50 select-none">-- System Ready --</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3 hover:bg-slate-800/30 px-1 rounded">
                <span className="text-slate-600 shrink-0 select-none">[{formatTime(log.timestamp)}]</span>
                <span className={`uppercase font-bold w-16 shrink-0 ${getLevelColor(log.level)}`}>{log.level}</span>
                <span className="text-slate-300 break-all">
                  {log.message}
                  {log.details && (
                    <pre className="mt-1 text-[10px] text-slate-500 overflow-x-auto">{log.details}</pre>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};