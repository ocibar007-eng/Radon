
import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { BatchManifest } from '@/core/export';

interface JsonViewerProps {
  data: BatchManifest;
  onClose: () => void;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-zinc-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <span className="text-zinc-800 font-bold text-base tracking-tight">Resultado JSON</span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-mono border border-blue-100 font-medium">
                {data.items.length} itens
            </span>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border
                ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
             >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'COPIADO' : 'COPIAR'}
             </button>
             <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
               <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#0d1117] p-6 font-mono text-sm custom-scrollbar leading-relaxed">
            <pre className="text-zinc-300">
                {jsonString}
            </pre>
        </div>
      </div>
    </div>
  );
};

export default JsonViewer;
