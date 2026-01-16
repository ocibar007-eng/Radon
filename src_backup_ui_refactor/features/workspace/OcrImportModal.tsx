import React, { useState, useEffect } from 'react';
import { X, FileText, Clock, Check, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getHistory } from '../ocr-batch/core/history';
import { HistoryItem } from '../ocr-batch/types';

interface Props {
    isOpen: boolean;
    patientName: string;
    patientOs: string;
    onImport: (historyItem: HistoryItem) => void;
    onClose: () => void;
}

export const OcrImportModal: React.FC<Props> = ({
    isOpen,
    patientName,
    patientOs,
    onImport,
    onClose
}) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [autoMatchFound, setAutoMatchFound] = useState<HistoryItem | null>(null);

    useEffect(() => {
        if (isOpen) {
            const items = getHistory();
            // Filter to last 24 hours
            const recentItems = items.filter(item =>
                Date.now() - item.createdAt < 24 * 60 * 60 * 1000
            );
            setHistory(recentItems);

            // Try to find auto-match by patient name or OS
            const matchedItem = findAutoMatch(recentItems, patientName, patientOs);
            if (matchedItem) {
                setAutoMatchFound(matchedItem);
                setSelectedId(matchedItem.id);
            }
        }
    }, [isOpen, patientName, patientOs]);

    if (!isOpen) return null;

    const handleImport = () => {
        const selectedItem = history.find(h => h.id === selectedId);
        if (selectedItem) {
            onImport(selectedItem);
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                            <FileText size={20} />
                        </div>
                        <h3 className="modal-title">Importar Dados de OCR</h3>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    {autoMatchFound && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1">
                                <Check size={16} />
                                Match automático encontrado!
                            </div>
                            <p className="text-xs text-secondary">
                                Sessão "{autoMatchFound.batchName}" corresponde ao paciente atual.
                            </p>
                        </div>
                    )}

                    {history.length === 0 ? (
                        <div className="text-center py-8 text-muted">
                            <Search size={32} className="mx-auto mb-2 opacity-50" />
                            <p>Nenhuma sessão OCR nas últimas 24h</p>
                            <p className="text-xs mt-1">Processe imagens no módulo OCR Batch primeiro</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {history.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedId === item.id
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{item.batchName}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted mt-1">
                                                <Clock size={12} />
                                                <span>{formatTimeAgo(item.createdAt)}</span>
                                                <span>•</span>
                                                <span>{item.itemCount} imagens</span>
                                            </div>
                                        </div>
                                        {selectedId === item.id && (
                                            <Check size={18} className="text-orange-500" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleImport}
                            disabled={!selectedId}
                        >
                            Importar Selecionado
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper: Find auto-match by patient name or OS
function findAutoMatch(
    history: HistoryItem[],
    patientName: string,
    patientOs: string
): HistoryItem | null {
    if (!patientName && !patientOs) return null;

    const normalizedName = patientName?.toLowerCase().trim() || '';
    const normalizedOs = patientOs?.toLowerCase().trim() || '';

    for (const item of history) {
        const itemName = item.batchName?.toLowerCase().trim() || '';
        const itemId = item.patientId?.toLowerCase().trim() || '';

        // Match by name (fuzzy - contains)
        if (normalizedName && itemName.includes(normalizedName)) {
            return item;
        }
        if (normalizedName && normalizedName.includes(itemName) && itemName.length > 3) {
            return item;
        }

        // Match by OS/ID
        if (normalizedOs && itemId === normalizedOs) {
            return item;
        }
    }

    return null;
}

// Helper: Format time ago
function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return 'mais de 1 dia';
}

export default OcrImportModal;
