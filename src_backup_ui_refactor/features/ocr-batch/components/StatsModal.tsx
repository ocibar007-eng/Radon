import React from 'react';
import { Modal } from './ui/Modal';
import { Card } from './ui/Card';
import { Clock, MousePointer, FolderOpen, FileCheck, Calendar, Activity, BarChart3 } from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar';

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    stats: {
        usageMinutes: number;
        clickCount: number;
        firstUseDate: number;
        totalFilesProcessed: number;
        sessionsCount: number;
        currentSessionFiles: number;
    };
}

const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export const StatsModal: React.FC<StatsModalProps> = ({
    isOpen,
    onClose,
    isDarkMode,
    stats
}) => {
    // Derived stats for "Efficiency" chart
    const efficiency = stats.sessionsCount > 0
        ? Math.round((stats.totalFilesProcessed / (stats.sessionsCount * 5)) * 100) // Assuming avg 5 files per batch for demo scale
        : 0;

    // Cap efficiency at 100 for visual sanity, though in reality it's just files/batches
    const visualEfficiency = Math.min(efficiency, 100);

    const statItems = [
        {
            icon: Clock,
            label: 'Tempo de uso',
            value: formatDuration(stats.usageMinutes),
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            icon: MousePointer,
            label: 'Interações',
            value: stats.clickCount.toLocaleString(),
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            icon: FolderOpen,
            label: 'Lotes criados',
            value: stats.sessionsCount.toString(),
            color: 'text-violet-500',
            bg: 'bg-violet-500/10'
        },
        {
            icon: FileCheck,
            label: 'Arquivos Proc.',
            value: stats.totalFilesProcessed.toLocaleString(),
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Dashboard & Analytics"
            size="md"
            isDarkMode={isDarkMode}
        >
            <div className="space-y-6">

                {/* Hero Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {statItems.map((item, index) => (
                        <div
                            key={item.label}
                            className={`p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className={`p-2 rounded-lg ${item.bg}`}>
                                    <item.icon className={`w-5 h-5 ${item.color}`} />
                                </div>
                            </div>
                            <div>
                                <div className={`text-2xl font-bold font-mono mb-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                    {item.value}
                                </div>
                                <div className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {item.label}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Activity Visualizer */}
                <Card variant="glass" padding="lg" isDarkMode={isDarkMode} className="overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity className="w-24 h-24" />
                    </div>

                    <h4 className={`text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <BarChart3 className="w-4 h-4" />
                        Métricas de Produtividade
                    </h4>

                    <div className="space-y-5 relative z-10">
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}>Média Arquivos/Lote</span>
                                <span className="font-mono font-bold">
                                    {stats.sessionsCount > 0 ? (stats.totalFilesProcessed / stats.sessionsCount).toFixed(1) : '0.0'}
                                </span>
                            </div>
                            <ProgressBar value={Math.min(((stats.totalFilesProcessed / stats.sessionsCount) || 0) * 10, 100)} size="sm" variant="success" isDarkMode={isDarkMode} />
                        </div>

                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}>Engajamento (Clicks/Min)</span>
                                <span className="font-mono font-bold">
                                    {stats.usageMinutes > 0 ? (stats.clickCount / stats.usageMinutes).toFixed(1) : '0.0'}
                                </span>
                            </div>
                            <ProgressBar value={Math.min(((stats.clickCount / stats.usageMinutes) || 0) * 5, 100)} size="sm" variant="warning" isDarkMode={isDarkMode} />
                        </div>
                    </div>
                </Card>

                {/* Footer Info */}
                <div className={`flex items-center justify-between text-xs px-2 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Desde {formatDate(stats.firstUseDate)}
                    </span>
                    <span>v2.4.0 Premium</span>
                </div>
            </div>
        </Modal>
    );
};

export default StatsModal;
