import React, { useState, useMemo, useEffect } from 'react';
import { AttachmentDoc, DocClassification } from '../types';
import { ClassificationChip } from './ClassificationChip';
import { PedidoMedicoTemplate } from './templates/PedidoMedicoTemplate';
import { QuestionarioTemplate } from './templates/QuestionarioTemplate';
import { TermoConsentimentoTemplate } from './templates/TermoConsentimentoTemplate';
import { GuiaAutorizacaoTemplate } from './templates/GuiaAutorizacaoTemplate';
import { EmptyPageTemplate } from './templates/EmptyPageTemplate';
import { FileText, ChevronRight } from 'lucide-react'; // Fallback icon

interface Props {
    docs: AttachmentDoc[];
    renderLaudoContent: (doc: AttachmentDoc) => React.ReactNode;
}

const TAB_ORDER: DocClassification[] = [
    'laudo_previo',
    'pedido_medico',
    'guia_autorizacao',
    'questionario',
    'termo_consentimento',
    'assistencial',
    'administrativo',
    'outro',
    'pagina_vazia',
    'indeterminado'
];

const TAB_LABELS: Partial<Record<DocClassification, string>> = {
    laudo_previo: 'Laudo Prévio',
    pedido_medico: 'Pedido Médico',
    guia_autorizacao: 'Guia/Autorização',
    questionario: 'Questionário',
    termo_consentimento: 'Termo',
    assistencial: 'Anotação Clínica',
    administrativo: 'Administrativo',
    pagina_vazia: 'Página Vazia',
    outro: 'Outro',
    indeterminado: 'Indeterminado'
};

export const MultiDocumentTabs: React.FC<Props> = ({ docs, renderLaudoContent }) => {
    const [activeTabId, setActiveTabId] = useState<string>(docs[0]?.id);

    // Group docs by sorting them according to TAB_ORDER
    const sortedDocs = useMemo(() => {
        return [...docs].sort((a, b) => {
            const indexA = TAB_ORDER.indexOf(a.classification);
            const indexB = TAB_ORDER.indexOf(b.classification);
            // If types are different, sort by priority
            if (indexA !== indexB) {
                // If one is not found (-1), put it at the end
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            }
            // If types match, sort by page/source name
            return a.source.localeCompare(b.source, undefined, { numeric: true });
        });
    }, [docs]);

    // Ensure active tab is valid
    const activeDoc = useMemo(() =>
        sortedDocs.find(d => d.id === activeTabId) || sortedDocs[0],
        [sortedDocs, activeTabId]
    );

    // Update active tab if docs change and current is lost
    useEffect(() => {
        if (!docs.find(d => d.id === activeTabId)) {
            setActiveTabId(sortedDocs[0]?.id);
        }
    }, [docs, sortedDocs, activeTabId]);

    const renderContent = (doc: AttachmentDoc) => {
        switch (doc.classification) {
            case 'pedido_medico':
                return <PedidoMedicoTemplate data={doc.extractedData} verbatim={doc.verbatimText} />;
            case 'guia_autorizacao':
                return <GuiaAutorizacaoTemplate data={doc.extractedData} verbatim={doc.verbatimText} />;
            case 'termo_consentimento':
                return <TermoConsentimentoTemplate data={doc.extractedData} verbatim={doc.verbatimText} />;
            case 'questionario':
                return <QuestionarioTemplate data={doc.extractedData} verbatim={doc.verbatimText} />;
            case 'pagina_vazia':
                return <EmptyPageTemplate />;
            case 'laudo_previo':
                return renderLaudoContent(doc);
            default:
                // Fallback generic content
                return (
                    <div className="p-4 text-zinc-400 text-sm">
                        <div className="flex items-center gap-2 mb-2 font-medium text-zinc-300">
                            <FileText size={14} />
                            Conteúdo Extraído
                        </div>
                        <pre className="whitespace-pre-wrap bg-black/20 p-3 rounded border border-white/5 font-mono text-xs overflow-auto max-h-[400px]">
                            {doc.verbatimText || 'Sem texto extraído.'}
                        </pre>
                    </div>
                );
        }
    };

    if (!activeDoc) return null;

    return (
        <div className="flex flex-col h-full">
            {/* Tabs Header */}
            <div className="flex items-center gap-1 p-1 bg-black/20 border-b border-white/5 overflow-x-auto scroller-thin">
                {sortedDocs.map(doc => {
                    const isActive = doc.id === activeDoc.id;
                    const label = TAB_LABELS[doc.classification] || doc.classification;

                    return (
                        <button
                            key={doc.id}
                            onClick={() => setActiveTabId(doc.id)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap
                                ${isActive
                                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 shadow-sm'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                                }
                            `}
                        >
                            <ClassificationChip classification={doc.classification} size="xs" />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto min-h-[300px] bg-zinc-900/30 relative">
                {renderContent(activeDoc)}
            </div>
        </div>
    );
};
