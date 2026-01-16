
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, FileJson, Trash2, Clock, Hash, Download, Upload, ShieldCheck, FileUp } from 'lucide-react';
import { HistoryItem } from '../types';
import { getHistory, deleteHistoryItem, clearHistory, importHistoryFromJSON } from '../core/history';
import { triggerDownload } from '../core/export';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, isDarkMode = false }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
    }
  }, [isOpen]);

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja apagar este item do histórico?")) {
      const updated = deleteHistoryItem(id);
      setHistory(updated);
    }
  };

  const handleDownloadItem = (item: HistoryItem) => {
    const safeName = item.batchName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeId = item.patientId !== 'NID' ? `_${item.patientId.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const safeDate = item.examDate !== 'NID' ? `_${item.examDate.replace(/[^0-9]/g, '')}` : '';

    const filename = `OCR_${safeName}${safeId}${safeDate}.json`;
    triggerDownload(filename, JSON.stringify(item.jsonResult, null, 2), 'application/json');
  };

  const handleBackupAll = () => {
    if (history.length === 0) return;
    const date = new Date().toISOString().split('T')[0];
    triggerDownload(`OCR_History_Backup_${date}.json`, JSON.stringify(history, null, 2), 'application/json');
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importHistoryFromJSON(content);
        if (success) {
          setHistory(getHistory());
          alert("Histórico restaurado com sucesso!");
        } else {
          alert("Nenhum item novo encontrado ou arquivo inválido.");
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-sm animate-in fade-in">
      <div className={`h-full w-full max-w-md shadow-2xl border-l flex flex-col animate-in slide-in-from-right duration-300 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>

        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'}`}>
          <div>
            <h2 className={`font-bold text-lg tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
              Histórico
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>{history.length}</span>
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Seus dados são salvos localmente.</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className={`px-5 py-3 border-b grid grid-cols-2 gap-3 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
          <button
            onClick={handleBackupAll}
            disabled={history.length === 0}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold border rounded-lg transition-colors disabled:opacity-50 ${isDarkMode ? 'text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border-zinc-200'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Backup Completo
          </button>
          <button
            onClick={handleRestoreClick}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold border rounded-lg transition-colors ${isDarkMode ? 'text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border-zinc-200'}`}
          >
            <FileUp className="w-3.5 h-3.5 text-blue-500" />
            Restaurar
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleRestoreFile}
          />
        </div>

        {/* History List */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 ${isDarkMode ? 'bg-[#252529]' : 'bg-[#FDFDFD]'}`}>
          {history.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-48 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhum histórico encontrado.</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow group ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isDarkMode ? 'bg-blue-950 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{item.batchName}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                        {item.patientId !== 'NID' && (
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                            <Hash className="w-3 h-3" /> {item.patientId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-2 text-[11px] mb-3 p-2 rounded-lg border ${isDarkMode ? 'text-zinc-500 bg-zinc-800/50 border-zinc-800' : 'text-zinc-500 bg-zinc-50/50 border-zinc-50'}`}>
                  <div className="flex items-center gap-1.5">
                    <Calendar className={`w-3.5 h-3.5 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                    <span>Data: {item.examDate !== 'NID' ? item.examDate : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                    <span>Proc: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className={`col-span-2 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {item.itemCount} arquivos no lote
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleDownloadItem(item)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${isDarkMode ? 'bg-white text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-black'}`}
                  >
                    <Download className="w-3.5 h-3.5" /> JSON
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className={`p-2 rounded-lg border transition-colors ${isDarkMode ? 'border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300' : 'border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className={`p-4 border-t ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-100 bg-zinc-50'}`}>
            <button
              onClick={() => { if (confirm("Limpar todo o histórico?")) { clearHistory(); setHistory([]); } }}
              className={`w-full text-xs font-medium transition-colors ${isDarkMode ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-400 hover:text-red-600'}`}
            >
              Limpar Histórico Completo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryModal;
