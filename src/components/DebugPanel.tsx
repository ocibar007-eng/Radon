
import React, { useState, useEffect } from 'react';
import { Terminal, X, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';

export const DebugPanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const capturedLogs = (window as any).getAntigravityLogs?.() || [];
            setLogs(capturedLogs);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-[9999] p-3 bg-slate-900 border border-slate-700 rounded-full shadow-2xl text-accent hover:scale-110 transition-transform"
                title="Abrir Painel de Debug"
            >
                <Terminal size={20} />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-0 right-0 z-[9999] w-full md:w-96 bg-slate-950 border-t md:border-l border-slate-800 shadow-2xl transition-all ${isExpanded ? 'h-[80vh]' : 'h-64'}`}>
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-accent" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Antigravity Debug</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-tertiary">{logs.length} logs</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-slate-800 rounded transition-colors" title={isExpanded ? "Contrair" : "Expandir"}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <button onClick={() => {
                        (window as any).clearAntigravityLogs?.();
                        setLogs([]);
                    }} className="p-1 hover:bg-red-500/20 text-tertiary hover:text-red-400 rounded transition-colors" title="Limpar Logs">
                        <Trash2 size={14} />
                    </button>
                    <button onClick={() => {
                        const text = logs.map(l => `[${l.t}] ${l.type.toUpperCase()}: ${l.m}`).join('\n');
                        navigator.clipboard.writeText(text);
                    }} className="p-1 hover:bg-slate-800 rounded transition-colors" title="Copiar Logs">
                        <Copy size={14} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-800 rounded transition-colors text-tertiary">
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto p-2 font-mono text-[10px] leading-relaxed h-[calc(100%-48px)] bg-black/30">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 italic">
                        Nenhum log capturado ainda...
                    </div>
                ) : (
                    [...logs].reverse().map((log, i) => (
                        <div key={i} className="mb-1.5 border-b border-slate-900 pb-1.5 last:border-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-slate-500">{new Date(log.t).toLocaleTimeString()}</span>
                                <span className={`px-1 rounded uppercase text-[8px] font-bold ${log.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                        log.type === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {log.type}
                                </span>
                            </div>
                            <div className={`break-words ${log.type === 'error' ? 'text-red-300' :
                                    log.type === 'warn' ? 'text-amber-200' :
                                        'text-slate-300'
                                }`}>
                                {log.m}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
