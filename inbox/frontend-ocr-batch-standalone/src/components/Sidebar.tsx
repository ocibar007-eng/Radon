import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Box, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { BatchSession, ProcessStatus } from '@/types';
import { ProgressBar } from './ui/ProgressBar';

interface SidebarProps {
    sessions: BatchSession[];
    activeSessionId: string;
    onSwitchSession: (id: string) => void;
    onCreateSession: () => void;
    onDeleteSession: (id: string) => void;
    onRenameSession: (id: string, newName: string) => void;
    isDarkMode?: boolean;
}

const STORAGE_KEY_COLLAPSED = 'ocr-batch-sidebar-collapsed';

const Sidebar: React.FC<SidebarProps> = ({
    sessions,
    activeSessionId,
    onSwitchSession,
    onCreateSession,
    onDeleteSession,
    onRenameSession,
    isDarkMode = true
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_COLLAPSED);
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, String(isCollapsed));
    }, [isCollapsed]);

    const handleStartEdit = (session: BatchSession) => {
        if (isCollapsed) return;
        setEditingId(session.id);
        setEditName(session.name);
    };

    const handleSaveEdit = () => {
        if (editingId && editName.trim()) {
            onRenameSession(editingId, editName.trim());
        }
        setEditingId(null);
    };

    const getSessionStats = (session: BatchSession) => {
        const completed = session.files.filter(f => f.status === ProcessStatus.COMPLETED).length;
        const errors = session.files.filter(f => f.status === ProcessStatus.ERROR).length;
        const total = session.files.length;
        return { completed, errors, total };
    };

    return (
        <div
            className={`
                flex flex-col h-full sticky top-14 self-start max-h-[calc(100vh-3.5rem)]
                border-r transition-all duration-300 ease-out
                ${isCollapsed ? 'w-16' : 'w-full lg:w-64'}
                ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}
            `}
        >
            {/* Sidebar Header */}
            <div className={`
                p-3 border-b flex items-center justify-between
                ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'}
            `}>
                {!isCollapsed && (
                    <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        <Box className="w-3.5 h-3.5" />
                        Lotes
                    </h2>
                )}
                <div className="flex items-center gap-1">
                    {!isCollapsed && (
                        <button
                            onClick={onCreateSession}
                            className={`p-1.5 rounded-md transition-all duration-200 hover:scale-105 ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700'}`}
                            title="Novo Lote"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-1.5 rounded-md transition-all duration-200 hover:scale-105 ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700'}`}
                        title={isCollapsed ? 'Expandir' : 'Recolher'}
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {sessions.map(session => {
                    const isActive = session.id === activeSessionId;
                    const isEditing = editingId === session.id;
                    const stats = getSessionStats(session);
                    const isProcessing = session.status === 'processing';
                    const isCompleted = session.status === 'completed';
                    const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

                    return (
                        <div
                            key={session.id}
                            className={`
                                group relative rounded-xl cursor-pointer
                                transition-all duration-200
                                ${isCollapsed ? 'p-2' : 'p-3'}
                                ${isActive
                                    ? (isDarkMode
                                        ? 'bg-gradient-to-r from-zinc-800 to-zinc-800/50 border border-zinc-700 shadow-lg'
                                        : 'bg-gradient-to-r from-zinc-100 to-white border border-zinc-200 shadow-md')
                                    : (isDarkMode
                                        ? 'hover:bg-zinc-900/50 border border-transparent'
                                        : 'hover:bg-zinc-50 border border-transparent')
                                }
                            `}
                            onClick={() => onSwitchSession(session.id)}
                        >
                            {isCollapsed ? (
                                /* Collapsed Mini View */
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                        ${isProcessing ? 'animate-pulse' : ''}
                                        ${isActive
                                            ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
                                            : (isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600')
                                        }
                                    `}>
                                        {isProcessing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : isCompleted ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            session.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    {stats.total > 0 && (
                                        <span className={`text-[10px] tabular-nums ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            {stats.completed}/{stats.total}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                /* Expanded Full View */
                                <>
                                    <div className="flex items-center gap-2">
                                        {/* Status indicator */}
                                        <div className={`
                                            w-2 h-2 rounded-full flex-shrink-0
                                            ${isProcessing ? 'bg-amber-500 animate-pulse' : ''}
                                            ${isCompleted ? 'bg-emerald-500' : ''}
                                            ${!isProcessing && !isCompleted ? (isDarkMode ? 'bg-zinc-600' : 'bg-zinc-300') : ''}
                                        `} />

                                        {/* Name / Edit */}
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                                onClick={e => e.stopPropagation()}
                                                className={`flex-1 px-2 py-1 text-sm rounded-md ${isDarkMode ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'} border focus:outline-none focus:ring-2 focus:ring-amber-500`}
                                                autoFocus
                                            />
                                        ) : (
                                            <span className={`flex-1 text-sm font-medium truncate ${isActive ? (isDarkMode ? 'text-white' : 'text-zinc-900') : (isDarkMode ? 'text-zinc-400' : 'text-zinc-600')}`}>
                                                {session.name}
                                            </span>
                                        )}

                                        {/* Actions */}
                                        <div className={`flex items-center gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                            {isEditing ? (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-1 rounded hover:bg-red-500/20 text-red-500">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); handleStartEdit(session); }} className={`p-1 rounded transition-colors ${isDarkMode ? 'hover:bg-zinc-700 text-zinc-500' : 'hover:bg-zinc-200 text-zinc-400'}`}>
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="p-1 rounded hover:bg-red-500/20 text-red-400">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    {stats.total > 0 && (
                                        <div className="mt-2 space-y-1.5">
                                            <ProgressBar
                                                value={progress}
                                                size="sm"
                                                variant={isCompleted ? 'success' : 'default'}
                                                animated={isProcessing}
                                                isDarkMode={isDarkMode}
                                            />
                                            <div className={`flex justify-between text-[10px] ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                <span>{stats.completed} de {stats.total}</span>
                                                {stats.errors > 0 && <span className="text-red-400">{stats.errors} erro(s)</span>}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Collapsed Create Button */}
            {isCollapsed && (
                <div className="p-2 border-t border-zinc-800">
                    <button
                        onClick={onCreateSession}
                        className={`w-full p-2 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-500' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-400'}`}
                        title="Novo Lote"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
