/**
 * DraftToolbar — Barra superior da aba Pré-Laudo.
 * Toggle de Thinking, botão Gerar, indicador de status.
 */

import React from 'react';
import { Brain, Sparkles, RotateCcw, Loader2, Hand } from 'lucide-react';
import type { DraftReasoningEffort, DraftStatus } from '../useDraft';

interface Props {
    status: DraftStatus;
    enableThinking: boolean;
    reasoningEffort: DraftReasoningEffort;
    elapsedSeconds: number;
    totalGenerationSeconds: number;
    hasReport: boolean;
    auditLoading: boolean;
    onGenerate: () => void;
    onAbort: () => void;
    onToggleThinking: () => void;
    onReasoningEffortChange: (effort: DraftReasoningEffort) => void;
    onReset: () => void;
}

const STATUS_LABELS: Record<DraftStatus, string> = {
    idle: 'Pronto para gerar',
    generating: 'Gerando laudo...',
    done: 'Laudo gerado',
    correcting: 'Aguardando correções',
    regenerating: 'Reprocessando...',
};

function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return `${minutes}m${remain}s`;
}

const EFFORT_OPTIONS: Array<{ value: DraftReasoningEffort; label: string }> = [
    { value: 'high', label: 'High' },
    { value: 'xhigh', label: 'X-High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

export const DraftToolbar: React.FC<Props> = ({
    status,
    enableThinking,
    reasoningEffort,
    elapsedSeconds,
    totalGenerationSeconds,
    hasReport,
    auditLoading,
    onGenerate,
    onAbort,
    onToggleThinking,
    onReasoningEffortChange,
    onReset,
}) => {
    const isGenerating = status === 'generating' || status === 'regenerating';
    const isBusy = isGenerating || auditLoading;
    const statusLabel = auditLoading ? 'Gerando auditoria...' : STATUS_LABELS[status];

    return (
        <div className="draft-toolbar">
            <div className="draft-toolbar-left">
                {/* Thinking Toggle */}
                <button
                    type="button"
                    className={`draft-toggle ${enableThinking ? 'draft-toggle--active' : ''}`}
                    onClick={onToggleThinking}
                    disabled={isBusy}
                    aria-label={enableThinking ? 'Desativar thinking' : 'Ativar thinking'}
                    title={enableThinking ? 'Thinking ativado' : 'Thinking desativado'}
                >
                    <Brain size={14} />
                    <span>Thinking</span>
                    <span className={`draft-toggle-dot ${enableThinking ? 'draft-toggle-dot--on' : ''}`} />
                </button>

                {enableThinking && (
                    <label className="draft-effort-picker" title="Nível de raciocínio do modelo">
                        <span>Raciocínio</span>
                        <select
                            className="draft-effort-select"
                            value={reasoningEffort}
                            onChange={(event) => onReasoningEffortChange(event.target.value as DraftReasoningEffort)}
                            disabled={isBusy}
                            aria-label="Nível de raciocínio"
                        >
                            {EFFORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {/* Status indicator */}
                <span className="draft-status-label">
                    {isBusy && <Loader2 size={14} className="draft-spinner" />}
                    {statusLabel}
                    {isBusy && (
                        <span className="draft-status-time">
                            {formatElapsed(elapsedSeconds)}
                        </span>
                    )}
                    {!isBusy && totalGenerationSeconds > 0 && (
                        <span className="draft-status-time" title="Tempo total da ultima geracao">
                            total: {formatElapsed(Math.round(totalGenerationSeconds))}
                        </span>
                    )}
                </span>
            </div>

            <div className="draft-toolbar-right">
                {isBusy && (
                    <button
                        type="button"
                        className="draft-btn draft-btn--danger"
                        onClick={onAbort}
                        aria-label="Abortar geração"
                    >
                        <Hand size={14} />
                        <span>Abortar</span>
                    </button>
                )}

                {hasReport && (
                    <button
                        type="button"
                        className="draft-btn draft-btn--ghost"
                        onClick={onReset}
                        disabled={isBusy}
                        aria-label="Limpar e recomeçar"
                    >
                        <RotateCcw size={14} />
                        <span>Limpar</span>
                    </button>
                )}

                <button
                    type="button"
                    className={`draft-btn draft-btn--primary ${isBusy ? 'draft-btn--pulse' : ''}`}
                    onClick={onGenerate}
                    disabled={isBusy}
                    aria-label="Gerar laudo via IA"
                >
                    {isBusy ? <Loader2 size={16} className="draft-spinner" /> : <Sparkles size={16} />}
                    <span>{hasReport ? 'Regerar' : 'Gerar Laudo'}</span>
                </button>
            </div>
        </div>
    );
};
