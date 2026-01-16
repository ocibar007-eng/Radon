
import React, { useState, useEffect, useCallback } from 'react';
import { Play, FileJson, Zap, Square, ScanLine, History as HistoryIcon, Moon, Sun, Volume2, Keyboard, Command, CheckSquare, XSquare, Eye, FileType as FileTypeIcon, Palette } from 'lucide-react';
import UploadArea from './components/UploadArea';
import FileList from './components/FileList';
import ImageViewer from './components/ImageViewer';
import JsonViewer from './components/JsonViewer';
import HistoryModal from './components/HistoryModal';
import StatsModal from './components/StatsModal';
import ThemeSelector from './components/ThemeSelector';
import Sidebar from './components/Sidebar';
import { Confetti, ProgressBar } from './components/ui';
import { useStats } from './hooks/useStats';
import { useTheme } from './hooks/useTheme';
import { useFileProcessing } from './hooks/useFileProcessing';
import { useOcrProcessing } from './hooks/useOcrProcessing';
import { useSessionManager } from './hooks/useSessionManager';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { BatchFile, SortMethod, ProcessStatus } from './types';
import { sortFiles, enumerateFiles } from './core/sorting';
import { generateBatchJson, generateCombinedTxt, triggerDownload } from './core/export';
import { saveBatchToHistory } from './core/history';
import { playCelebrationSound } from './utils/sounds';

// LocalStorage key for sound preference
const SOUND_ENABLED_KEY = 'ocr-batch-sound';

export function OcrBatchPage() {
    // --- THEME HOOK ---
    const { theme, isDarkMode, toggleDarkMode, setTheme } = useTheme();

    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem(SOUND_ENABLED_KEY);
        return saved !== 'false'; // Default to true
    });

    // --- STATS HOOK ---
    const stats = useStats();

    // --- CONFETTI STATE ---
    const [showConfetti, setShowConfetti] = useState(false);
    const [showThemeSelector, setShowThemeSelector] = useState(false);

    // --- SESSION MANAGER HOOK ---
    const sessionManager = useSessionManager();
    const {
        sessions,
        activeSessionId,
        activeSession,
        files,
        isProcessing,
        setSessions,
        setActiveSessionId
    } = sessionManager;

    // --- GLOBAL STATE ---
    const [sortMethod, setSortMethod] = useState<SortMethod>(SortMethod.TIMESTAMP);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [isJsonViewerOpen, setIsJsonViewerOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [showShortcutsHint, setShowShortcutsHint] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
    }, [soundEnabled]);

    // Toast helper
    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    }, []);

    // --- FILE PROCESSING HOOK ---
    const fileProcessing = useFileProcessing({
        onFilesAdded: (files, sessionId) => {
            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    const merged = [...s.files, ...files];
                    return { ...s, files: enumerateFiles(sortFiles(merged, sortMethod)) };
                }
                return s;
            }));
        },
        onFileUpdated: (fileId, updates, sessionId) => {
            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    const updatedFiles = s.files.map(existing =>
                        existing.id === fileId ? { ...existing, ...updates } : existing
                    );
                    return { ...s, files: enumerateFiles(sortFiles(updatedFiles, sortMethod)) };
                }
                return s;
            }));
        },
        onError: (message) => showToast(message),
        sortMethod
    });

    const isConverting = fileProcessing.isProcessing;

    // --- OCR PROCESSING HOOK ---
    const ocrProcessing = useOcrProcessing({
        onSessionStatusChange: (sessionId, status) => {
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s));
        },
        onSessionProgressUpdate: (sessionId, current, total) => {
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, progress: { current, total } } : s));
        },
        onFileStatusChange: (fileId, status, sessionId) => {
            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    return { ...s, files: s.files.map(f => f.id === fileId ? { ...f, status } : f) };
                }
                return s;
            }));
        },
        onFileCompleted: (fileId, ocrResult, sessionId) => {
            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    return { ...s, files: s.files.map(f => f.id === fileId ? { ...f, status: ProcessStatus.COMPLETED, ocrResult } : f) };
                }
                return s;
            }));
        },
        onFileError: (fileId, errorMessage, sessionId) => {
            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    return { ...s, files: s.files.map(f => f.id === fileId ? { ...f, status: ProcessStatus.ERROR, errorMessage } : f) };
                }
                return s;
            }));
        },
        onError: (message) => showToast(message),
        onComplete: (sessionId) => {
            // Auto-save to history
            setSessions(prev => {
                const session = prev.find(s => s.id === sessionId);
                if (session) {
                    saveBatchToHistory(session.files);
                    // NOTA: Removido salvamento no localStorage que estava contaminando outros laudos.
                    // O OCR batch é uma feature separada e seus dados não devem ser injetados globalmente.
                }
                return prev;
            });

            // Play celebration sound and show confetti
            if (soundEnabled) {
                playCelebrationSound();
            }
            setShowConfetti(true);
            showToast('Processamento concluído!');
        }
    });

    // --- SESSION MANAGEMENT ---

    const handleCreateSession = (name?: string, initialFiles: BatchFile[] = []) => {
        return sessionManager.createSession(name, initialFiles);
    };

    const handleDeleteSession = (id: string) => {
        sessionManager.deleteSession(id);
        showToast('Lote excluído');
    };

    const handleRenameSession = (id: string, name: string) => {
        sessionManager.renameSession(id, name);
    };

    const handleSwitchSession = (id: string) => {
        sessionManager.switchSession(id);
        setViewerIndex(null);
    };

    // --- CLIPBOARD PASTE (Ctrl+V) ---
    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            const imageFiles: File[] = [];

            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const ext = type.split('/')[1] || 'png';
                        const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type });
                        imageFiles.push(file);
                    }
                }
            }

            if (imageFiles.length > 0) {
                await handleFilesSelected(imageFiles);
                showToast(`${imageFiles.length} imagem(ns) colada(s) da área de transferência`);
            }
        } catch (e) {
            console.warn('Clipboard paste failed:', e);
        }
    }, []);


    // --- FILE HANDLING ---

    const handleFilesSelected = async (rawFiles: File[], groupName?: string) => {
        let targetSessionId = activeSessionId;
        if (groupName) {
            targetSessionId = handleCreateSession(groupName);
        }

        await fileProcessing.processFiles(rawFiles, targetSessionId);
    };

    const updateFiles = sessionManager.updateFiles;

    const handleToggleSelection = (id: string) => {
        updateFiles(prev => prev.map(f => f.id === id ? { ...f, isSelected: !f.isSelected } : f));
    };

    const handleSelectAll = (select: boolean) => {
        updateFiles(prev => prev.map(f => ({ ...f, isSelected: select })));
    };

    const handleRemove = (id: string) => {
        const fileName = files.find(f => f.id === id)?.name;
        updateFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
            return enumerateFiles(prev.filter(f => f.id !== id));
        });
        showToast(`Arquivo removido: ${fileName}`);
    };

    // --- OCR PROCESSING ---

    const handleAbort = () => {
        ocrProcessing.abortProcessing(activeSessionId);
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    files: s.files.map(f => f.status === ProcessStatus.PROCESSING ? { ...f, status: ProcessStatus.READY } : f)
                };
            }
            return s;
        }));
        showToast('Processamento interrompido');
    };

    const handleStartProcessing = async () => {
        await ocrProcessing.startProcessing(files, activeSessionId);
    };

    // --- KEYBOARD SHORTCUTS HOOK ---
    useKeyboardShortcuts({
        onPasteFromClipboard: handlePasteFromClipboard,
        onStartProcessing: handleStartProcessing,
        onExportJson: () => {
            if (files.some(f => f.status === ProcessStatus.COMPLETED)) {
                const safeName = activeSession.name.replace(/[^a-zA-Z0-9]/g, '_');
                triggerDownload(`OCR_${safeName}.json`, JSON.stringify(generateBatchJson(files, sortMethod), null, 2), 'application/json');
                showToast('JSON exportado!');
            }
        },
        onSelectAll: handleSelectAll,
        onToggleSelection: handleToggleSelection,
        onToggleShortcutsHint: () => setShowShortcutsHint(prev => !prev),
        files,
        isProcessing,
        isConverting,
        viewerIndex
    });

    const selectedCount = files.filter(f => f.isSelected).length;

    // Theme classes - Usando cores do Radon
    const themeClasses = isDarkMode
        ? 'min-h-screen bg-[#1e1e22] font-sans text-zinc-100 selection:bg-white selection:text-black antialiased flex flex-col'
        : 'min-h-screen bg-[#FDFDFD] font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white antialiased flex flex-col';

    return (
        <div className={themeClasses}>
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-2 rounded-full shadow-lg text-sm font-medium ${isDarkMode ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-zinc-900 text-white'}`}>
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Modal */}
            {showShortcutsHint && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcutsHint(false)}>
                    <div className={`p-6 rounded-2xl shadow-2xl max-w-md ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Keyboard className="w-5 h-5" /> Atalhos de Teclado
                        </h3>
                        <div className="space-y-2 text-sm">
                            {[
                                ['⌘/Ctrl + V', 'Colar imagem da área de transferência'],
                                ['⌘/Ctrl + Enter', 'Iniciar processamento'],
                                ['⌘/Ctrl + S', 'Exportar JSON'],
                                ['⌘/Ctrl + A', 'Selecionar todos'],
                                ['↑ / ↓', 'Navegar entre arquivos'],
                                ['Espaço', 'Toggle seleção (no viewer)'],
                                ['+ / −', 'Zoom (no viewer)'],
                                ['ESC', 'Desselecionar / Fechar'],
                                ['?', 'Mostrar/ocultar atalhos'],
                            ].map(([key, desc]) => (
                                <div key={key} className="flex justify-between gap-4">
                                    <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>{key}</kbd>
                                    <span className="text-zinc-500">{desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            <StatsModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
                isDarkMode={isDarkMode}
                stats={{
                    usageMinutes: stats.usageMinutes,
                    clickCount: stats.clickCount,
                    firstUseDate: stats.firstUseDate,
                    totalFilesProcessed: stats.totalFilesProcessed,
                    sessionsCount: sessions.length,
                    currentSessionFiles: files.length
                }}
            />

            {/* Confetti */}
            <Confetti
                isActive={showConfetti}
                onComplete={() => setShowConfetti(false)}
            />

            {/* Modals */}
            {viewerIndex !== null && (
                <ImageViewer
                    files={files}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                    onToggleSelection={handleToggleSelection}
                />
            )}
            {isJsonViewerOpen && (
                <JsonViewer
                    data={generateBatchJson(files, sortMethod)}
                    onClose={() => setIsJsonViewerOpen(false)}
                />
            )}
            <HistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                isDarkMode={isDarkMode}
            />

            {/* Modern Header */}
            <header className={`sticky top-0 z-20 backdrop-blur-xl border-b ${isDarkMode ? 'bg-gradient-to-r from-[#1e1e22]/95 to-[#252529]/95 border-zinc-800' : 'bg-gradient-to-r from-white/95 to-zinc-50/95 border-zinc-200'}`}>
                <div className="w-full px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-105 bg-gradient-to-br from-amber-500 to-amber-600 text-white`}>
                            <ScanLine className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold tracking-tight leading-tight">Intelligent OCR</h1>
                            <span className={`text-[10px] font-medium tracking-wide uppercase ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Multi-Batch</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Sound Toggle */}
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`p-2 rounded-md transition-all duration-200 hover:scale-105 ${soundEnabled ? (isDarkMode ? 'text-white bg-zinc-800' : 'text-zinc-900 bg-zinc-100') : (isDarkMode ? 'text-zinc-600' : 'text-zinc-400')}`}
                            title={soundEnabled ? 'Som ativado' : 'Som desativado'}
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>

                        {/* Theme Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowThemeSelector(!showThemeSelector)}
                                className={`p-2 rounded-md transition-all duration-200 hover:scale-105 ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
                                title="Tema"
                            >
                                <Palette className="w-4 h-4" />
                            </button>
                            {showThemeSelector && (
                                <div
                                    className={`absolute top-full right-0 mt-2 p-3 rounded-xl shadow-xl z-50 animate-fade-in-scale ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <ThemeSelector
                                        currentTheme={theme}
                                        onSelectTheme={(t) => { setTheme(t); setShowThemeSelector(false); }}
                                        isDarkMode={isDarkMode}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className={`p-2 rounded-md transition-all duration-200 hover:scale-105 ${isDarkMode ? 'text-yellow-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'}`}
                            title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
                        >
                            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>

                        {/* Keyboard Shortcuts */}
                        <button
                            onClick={() => setShowShortcutsHint(true)}
                            className={`p-2 rounded-md transition-all duration-200 hover:scale-105 ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
                            title="Atalhos de teclado (?)"
                        >
                            <Keyboard className="w-4 h-4" />
                        </button>

                        <div className={`h-4 w-px ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300'} hidden md:block`}></div>

                        {/* Digital Clock (clickable to show stats) */}
                        <button
                            onClick={() => setShowStatsModal(true)}
                            className={`font-mono text-xs tabular-nums tracking-wider px-2 py-1 rounded-md transition-colors ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'}`}
                            title="Ver estatísticas de uso"
                        >
                            {stats.currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </button>

                        <div className={`h-4 w-px ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300'} hidden md:block`}></div>

                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'}`}
                        >
                            <HistoryIcon className="w-4 h-4" />
                            Histórico
                        </button>

                        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border shadow-sm ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-white text-zinc-700 border-zinc-300'}`}>
                            <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Gemini 3 Flash
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-0">

                {/* SIDEBAR: Queues */}
                <Sidebar
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSwitchSession={handleSwitchSession}
                    onCreateSession={() => handleCreateSession()}
                    onDeleteSession={handleDeleteSession}
                    onRenameSession={handleRenameSession}
                    isDarkMode={isDarkMode}
                />

                {/* MAIN CONTENT AREA */}
                <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                    {/* LEFT COLUMN: Controls & Input */}
                    <div className="xl:col-span-4 space-y-6">
                        <section>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                    {activeSession ? activeSession.name : 'Selecionar Lote'}
                                </h2>
                            </div>
                            <UploadArea onFilesSelected={handleFilesSelected} isProcessing={isProcessing || isConverting} isDarkMode={isDarkMode} />
                        </section>

                        <section className={`p-6 rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border relative overflow-hidden group ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none ${isDarkMode ? 'bg-gradient-to-br from-zinc-800 to-transparent' : 'bg-gradient-to-br from-zinc-50 to-transparent'}`}></div>

                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <h3 className={`font-semibold flex items-center gap-2 text-sm ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                    <Command className={`w-4 h-4 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                                    Ações do Lote
                                </h3>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${isDarkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-50 text-zinc-600 border-zinc-100'}`}>
                                    {files.length} arq
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                                <button
                                    onClick={() => handleSelectAll(true)}
                                    disabled={files.length === 0}
                                    className={`flex items-center justify-center gap-2 text-xs font-medium py-2.5 border rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
                                >
                                    <CheckSquare className="w-3.5 h-3.5" /> Todos
                                </button>
                                <button
                                    onClick={() => handleSelectAll(false)}
                                    disabled={files.length === 0}
                                    className={`flex items-center justify-center gap-2 text-xs font-medium py-2.5 border rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
                                >
                                    <XSquare className="w-3.5 h-3.5" /> Nenhum
                                </button>
                            </div>

                            <div className="mb-6 space-y-3 relative z-10">
                                <div className={`flex justify-between text-xs font-medium ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                    <span>Selecionados</span>
                                    <span className={`px-1.5 rounded min-w-[1.5rem] text-center ${isDarkMode ? 'text-white bg-zinc-700' : 'text-zinc-900 bg-zinc-100'}`}>{selectedCount}</span>
                                </div>

                                {isProcessing && activeSession && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            <span>Processando...</span>
                                            <span>{Math.round((activeSession.progress.current / activeSession.progress.total) * 100)}%</span>
                                        </div>
                                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                                            <div
                                                className={`h-full shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out ${isDarkMode ? 'bg-white' : 'bg-zinc-900'}`}
                                                style={{ width: `${(activeSession.progress.current / activeSession.progress.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 relative z-10">
                                {(isProcessing || isConverting) ? (
                                    <button
                                        onClick={handleAbort}
                                        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all active:scale-[0.98]"
                                    >
                                        <Square className="w-4 h-4 fill-current" /> Parar
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleStartProcessing}
                                        disabled={selectedCount === 0}
                                        className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] group ${selectedCount > 0
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white hover:shadow-lg shadow-amber-500/20'
                                            : (isDarkMode ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed shadow-none' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none')
                                            }`}
                                    >
                                        {selectedCount > 0 && <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />}
                                        {selectedCount > 0 ? 'Iniciar Extração' : 'Selecione para Iniciar'}
                                    </button>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsJsonViewerOpen(true)}
                                        disabled={files.length === 0}
                                        className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver JSON
                                    </button>
                                    <button
                                        onClick={() => {
                                            const txtContent = generateCombinedTxt(files);
                                            const blob = new Blob([txtContent], { type: 'text/plain' });
                                            const url = URL.createObjectURL(blob);
                                            window.open(url, '_blank');
                                        }}
                                        disabled={files.length === 0}
                                        className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
                                    >
                                        <FileTypeIcon className="w-4 h-4" />
                                        Ver TXT
                                    </button>
                                </div>

                                <div className={`mt-6 pt-6 border-t grid grid-cols-2 gap-3 relative z-10 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                                    <button
                                        onClick={() => {
                                            const safeName = activeSession.name.replace(/[^a-zA-Z0-9]/g, '_');
                                            triggerDownload(`OCR_${safeName}.json`, JSON.stringify(generateBatchJson(files, sortMethod), null, 2), 'application/json');
                                        }}
                                        disabled={!files.some(f => f.status === ProcessStatus.COMPLETED)}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3.5 border rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-md ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400 hover:text-purple-400' : 'bg-zinc-50 hover:bg-white border-zinc-100 hover:border-zinc-300 text-zinc-500 hover:text-purple-600'}`}
                                    >
                                        <FileJson className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">JSON</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const safeName = activeSession.name.replace(/[^a-zA-Z0-9]/g, '_');
                                            triggerDownload(`OCR_${safeName}.txt`, generateCombinedTxt(files), 'text/plain');
                                        }}
                                        disabled={!files.some(f => f.status === ProcessStatus.COMPLETED)}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3.5 border rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-md ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400 hover:text-blue-400' : 'bg-zinc-50 hover:bg-white border-zinc-100 hover:border-zinc-300 text-zinc-500 hover:text-blue-600'}`}
                                    >
                                        <FileTypeIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">TXT</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: File List */}
                    <div className="xl:col-span-8 flex flex-col h-[calc(100vh-8rem)]">
                        <FileList
                            files={files}
                            onRemove={handleRemove}
                            sortMethod={sortMethod}
                            onSortChange={(m) => {
                                setSortMethod(m);
                                updateFiles(prev => enumerateFiles(sortFiles(prev, m)));
                            }}
                            onMoveItem={(f, t) => updateFiles(prev => {
                                const n = [...prev]; const [i] = n.splice(f, 1); n.splice(t, 0, i);
                                return enumerateFiles(n);
                            })}
                            onPreview={(idx) => setViewerIndex(idx)}
                            isProcessing={isProcessing || isConverting}
                            onToggleSelection={handleToggleSelection}
                            isDarkMode={isDarkMode}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}


