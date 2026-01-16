
/**
 * Ponte de Logs para o Antigravity
 * Intercepta console.log e salva no localStorage para que possamos ler o estado do app.
 */
export const initDebugBridge = () => {
    if (typeof window === 'undefined') return;

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const saveLog = (type: string, args: any[]) => {
        try {
            const logs = JSON.parse(localStorage.getItem('antigravity_logs') || '[]');
            logs.push({
                t: new Date().toISOString(),
                type,
                m: args.map(arg => {
                    if (arg instanceof Error) return arg.message;
                    if (typeof arg === 'object') {
                        try { return JSON.stringify(arg); } catch (e) { return '[Circular or Complex Object]'; }
                    }
                    return String(arg);
                }).join(' ')
            });

            // Limitar a 500 logs para não estourar o localStorage
            if (logs.length > 500) logs.shift();
            localStorage.setItem('antigravity_logs', JSON.stringify(logs));
        } catch (e) {
            // Ignorar erros na persistência de logs
        }
    };

    console.log = (...args) => {
        originalLog(...args);
        saveLog('log', args);
    };

    console.warn = (...args) => {
        originalWarn(...args);
        saveLog('warn', args);
    };

    console.error = (...args) => {
        originalError(...args);
        saveLog('error', args);
    };

    // Expor função global para facilitar a captura
    (window as any).getAntigravityLogs = () => {
        const logs = localStorage.getItem('antigravity_logs');
        return logs ? JSON.parse(logs) : [];
    };

    (window as any).clearAntigravityLogs = () => {
        localStorage.removeItem('antigravity_logs');
    };

    console.log('🚀 Antigravity Debug Bridge Initialized');
};
