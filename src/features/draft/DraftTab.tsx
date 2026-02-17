/**
 * DraftTab — Componente principal da aba Pré-Laudo IA.
 * Compõe Toolbar, conteúdo com sub-abas (Laudo/Thinking),
 * CorrectionInput e MetaBar.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Brain, AlertCircle, ClipboardList, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDraft } from './useDraft';
import { prepareMarkdownForRender } from './domain/format-report';
import { DraftToolbar } from './components/DraftToolbar';
import { DraftMetaBar } from './components/DraftMetaBar';
import { CorrectionInput } from './components/CorrectionInput';

interface Props {
    /** Dados do caso clínico para geração do laudo */
    caseTranscription: string;
    clinicalData?: string;
    technicalData?: string;
    priorReports?: string;
    preComputedCalculations?: string;
    modality?: 'TC' | 'RM' | 'USG';
    region?: string;
    patientName?: string;
    patientOS?: string;
}

type SubTab = 'report' | 'thinking' | 'audit' | 'stream';

export const DraftTab: React.FC<Props> = ({
    caseTranscription,
    clinicalData,
    technicalData,
    priorReports,
    preComputedCalculations,
    modality,
    region,
    patientName,
    patientOS,
}) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('report');

    const caseData = useMemo(() => {
        if (!caseTranscription) return null;
        return {
            transcription: caseTranscription,
            clinicalData,
            technicalData,
            priorReports,
            preComputedCalculations,
            modality,
            region,
            patientName,
            patientOS,
        };
    }, [caseTranscription, clinicalData, technicalData, priorReports, preComputedCalculations, modality, region, patientName, patientOS]);

    const [state, actions] = useDraft(caseData);
    const reportMarkdownForRender = useMemo(
        () => prepareMarkdownForRender(state.reportMarkdown),
        [state.reportMarkdown],
    );
    const auditMarkdownForRender = useMemo(
        () => prepareMarkdownForRender(state.auditText),
        [state.auditText],
    );

    const hasReport = state.reportMarkdown.length > 0;
    const hasThinking = state.thinkingText.length > 0;
    const hasAudit = state.auditText.length > 0;
    const isGenerating = state.status === 'generating' || state.status === 'regenerating';
    const hasStream = state.streamText.length > 0 || state.streamEvents.length > 0 || isGenerating;
    const canRequestAudit = hasReport || state.auditLoading;

    useEffect(() => {
        if (activeSubTab === 'audit' && !canRequestAudit) {
            setActiveSubTab('report');
        }
        if (activeSubTab === 'stream' && !hasStream) {
            setActiveSubTab('report');
        }
    }, [activeSubTab, canRequestAudit, hasStream]);

    const openAuditTab = () => {
        if (!hasAudit && !state.auditLoading) {
            const confirmed = window.confirm(
                'Gerar a auditoria faz uma chamada adicional para a IA e aumenta o custo. Deseja continuar?'
            );
            if (!confirmed) return;
        }

        setActiveSubTab('audit');
        if (!hasAudit && !state.auditLoading) {
            actions.loadAudit();
        }
    };

    return (
        <div className="draft-container animate-fade-in">
            {/* Toolbar */}
            <DraftToolbar
                status={state.status}
                enableThinking={state.enableThinking}
                reasoningEffort={state.reasoningEffort}
                elapsedSeconds={state.elapsedSeconds}
                totalGenerationSeconds={state.totalGenerationSeconds}
                hasReport={hasReport}
                auditLoading={state.auditLoading}
                onGenerate={actions.generate}
                onAbort={actions.abort}
                onToggleThinking={actions.toggleThinking}
                onReasoningEffortChange={actions.setReasoningEffort}
                onReset={actions.reset}
            />

            {/* Error banner */}
            {state.error && (
                <div className="draft-error">
                    <AlertCircle size={16} />
                    <span>{state.error}</span>
                </div>
            )}
            {state.truncated && (
                <div className="draft-error">
                    <AlertCircle size={16} />
                    <span>
                        Resposta atingiu limite de tokens ({state.stopReason || 'max_tokens'}). O sistema tentou continuar automaticamente.
                    </span>
                </div>
            )}

            {/* Empty state */}
            {!hasReport && !hasAudit && !isGenerating && !state.error && (
                <div className="draft-empty">
                    <FileText size={48} className="draft-empty-icon" />
                    <h3>Pré-Laudo IA</h3>
                    <p>
                        Clique em <strong>Gerar Laudo</strong> para criar uma
                        sugestão de laudo baseada nos dados do caso.
                    </p>
                    {!caseData && (
                        <p className="draft-empty-hint">
                            Carregue documentos/transcrições primeiro.
                        </p>
                    )}
                </div>
            )}

            {/* Content area: Sub-tabs (Report / Thinking) */}
            {(hasReport || hasAudit || isGenerating) && (
                <>
                    <div className="draft-subtabs">
                        <button
                            type="button"
                            className={`draft-subtab ${activeSubTab === 'report' ? 'draft-subtab--active' : ''}`}
                            onClick={() => setActiveSubTab('report')}
                        >
                            <FileText size={14} />
                            <span>Laudo</span>
                        </button>
                        {(hasThinking || state.enableThinking) && (
                            <button
                                type="button"
                                className={`draft-subtab ${activeSubTab === 'thinking' ? 'draft-subtab--active' : ''}`}
                                onClick={() => setActiveSubTab('thinking')}
                            >
                                <Brain size={14} />
                                <span>Thinking</span>
                                {isGenerating && activeSubTab !== 'thinking' && hasThinking && (
                                    <span className="draft-subtab-dot" />
                                )}
                            </button>
                        )}
                        {hasStream && (
                            <button
                                type="button"
                                className={`draft-subtab ${activeSubTab === 'stream' ? 'draft-subtab--active' : ''}`}
                                onClick={() => setActiveSubTab('stream')}
                            >
                                <Activity size={14} />
                                <span>Stream</span>
                                {isGenerating && activeSubTab !== 'stream' && (
                                    <span className="draft-subtab-dot" />
                                )}
                            </button>
                        )}
                        {canRequestAudit && (
                            <button
                                type="button"
                                className={`draft-subtab ${activeSubTab === 'audit' ? 'draft-subtab--active' : ''}`}
                                onClick={openAuditTab}
                            >
                                <ClipboardList size={14} />
                                <span>Auditoria</span>
                            </button>
                        )}
                    </div>

                    {/* Report content (formatted HTML, not markdown) */}
                    {activeSubTab === 'report' && (
                        <div className="draft-report scroll-thin">
                            {isGenerating && !hasReport && (
                                <div className="draft-loading">
                                    <div className="draft-loading-pulse" />
                                    <div className="draft-loading-pulse draft-loading-pulse--short" />
                                    <div className="draft-loading-pulse" />
                                </div>
                            )}
                            {hasReport && (
                                <ReactMarkdown
                                    className="draft-report-content"
                                    remarkPlugins={[remarkGfm]}
                                >
                                    {reportMarkdownForRender}
                                </ReactMarkdown>
                            )}
                            {isGenerating && hasReport && (
                                <span className="draft-cursor" />
                            )}
                        </div>
                    )}

                    {/* Thinking content */}
                    {activeSubTab === 'thinking' && (
                        <div className="draft-thinking scroll-thin">
                            {!hasThinking && isGenerating && (
                                <div className="draft-loading">
                                    <div className="draft-loading-pulse" />
                                </div>
                            )}
                            {!hasThinking && !isGenerating && Number(state.tokens.reasoning || 0) > 0 && (
                                <div className="draft-thinking-empty">
                                    O modelo usou {state.tokens.reasoning} tokens de raciocinio, mas esta API nao expoe o texto interno completo do thinking.
                                </div>
                            )}
                            {hasThinking && (
                                <pre className="draft-thinking-text">{state.thinkingText}</pre>
                            )}
                            {isGenerating && hasThinking && (
                                <span className="draft-cursor" />
                            )}
                        </div>
                    )}

                    {/* Stream content */}
                    {activeSubTab === 'stream' && (
                        <div className="draft-stream scroll-thin">
                            <div className="draft-stream-header">
                                <span className="draft-stream-status">
                                    {state.streamStatus || (isGenerating ? 'Conectando stream...' : 'Sem stream ativo')}
                                </span>
                            </div>
                            <div className="draft-stream-layout">
                                <pre className="draft-stream-text">{state.streamText || '(aguardando chunks...)'}</pre>
                                <div className="draft-stream-events">
                                    {state.streamEvents.map((event, index) => (
                                        <div key={`${event.type}_${event.atSeconds}_${index}`} className={`draft-stream-event draft-stream-event--${event.type}`}>
                                            <span className="draft-stream-event-time">[{event.atSeconds.toFixed(1)}s]</span>
                                            <span className="draft-stream-event-type">{event.type}</span>
                                            <span className="draft-stream-event-detail">{event.detail}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Audit content */}
                    {activeSubTab === 'audit' && (
                        <div className="draft-audit scroll-thin">
                            {!hasAudit && state.auditLoading && (
                                <div className="draft-loading">
                                    <div className="draft-loading-pulse" />
                                    <div className="draft-loading-pulse draft-loading-pulse--short" />
                                </div>
                            )}
                            {hasAudit && (
                                <ReactMarkdown
                                    className="draft-audit-content"
                                    remarkPlugins={[remarkGfm]}
                                >
                                    {auditMarkdownForRender}
                                </ReactMarkdown>
                            )}
                        </div>
                    )}

                    {/* Corrections input */}
                    {(state.status === 'done' || state.status === 'correcting' || state.status === 'regenerating') && (
                        <CorrectionInput
                            corrections={state.corrections}
                            status={state.status}
                            onCorrectionsChange={actions.setCorrections}
                            onRegenerate={actions.regenerateWithCorrections}
                            onRegenerateFull={actions.regenerateFullWithCorrections}
                        />
                    )}
                </>
            )}

            {/* Meta bar (always visible when there are tokens) */}
            <DraftMetaBar
                cost={state.cost}
                tokens={state.tokens}
                elapsedSeconds={state.elapsedSeconds}
                dailyStats={state.dailyStats}
                weeklyTotalUSD={state.weeklyTotalUSD}
                monthlyTotalUSD={state.monthlyTotalUSD}
                officialMonthlyUSD={state.officialMonthlyUSD}
                hasReport={hasReport && (state.status === 'done' || state.status === 'correcting')}
                onCopyFormatted={actions.copyFormatted}
                onDownloadPDF={actions.downloadPDF}
                onDownloadMarkdown={actions.downloadMarkdown}
                modelUsed={state.modelUsed}
                runHistory={state.runHistory}
                reasoningEffort={state.reasoningEffort}
            />
        </div>
    );
};
