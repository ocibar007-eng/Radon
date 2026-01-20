/**
 * PdfDocumentBundle.tsx
 * 
 * Componente que agrupa múltiplos ReportGroups do mesmo PDF
 * e renderiza com abas para navegação entre tipos de documento.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Check, FileText, Layers } from 'lucide-react';
import { ReportGroup } from '../../utils/grouping';
import { ReportGroupCard } from './ReportGroupCard';
import { DocClassification } from '../../types';
import { useGallery } from '../../context/GalleryContext';

interface Props {
    groups: ReportGroup[];
    onRemoveGroup: (groupId: string) => void;
    onSplitGroup?: (groupId: string, splitStartPage: number) => void;
    onManualGroupDocs?: (docIds: string[]) => void;
    onReclassifyDoc?: (docId: string, newType: DocClassification) => void;
}

// Ordem de prioridade para exibição das abas
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

// Labels amigáveis para as abas (nomes completos)
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

// Cores por tipo de documento (consistente com ClassificationChip)
const TAB_COLORS: Partial<Record<DocClassification, { bg: string; text: string; border: string; activeBg: string }>> = {
    laudo_previo: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', activeBg: 'bg-amber-500/25' },
    pedido_medico: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30', activeBg: 'bg-blue-500/25' },
    guia_autorizacao: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', activeBg: 'bg-emerald-500/25' },
    questionario: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30', activeBg: 'bg-purple-500/25' },
    termo_consentimento: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30', activeBg: 'bg-rose-500/25' },
    assistencial: { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/30', activeBg: 'bg-cyan-500/25' },
    administrativo: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30', activeBg: 'bg-slate-500/25' },
    outro: { bg: 'bg-zinc-500/10', text: 'text-zinc-300', border: 'border-zinc-500/30', activeBg: 'bg-zinc-500/25' },
    pagina_vazia: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', activeBg: 'bg-zinc-500/20' },
    indeterminado: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', activeBg: 'bg-zinc-500/20' }
};

export const PdfDocumentBundle: React.FC<Props> = ({ groups, onRemoveGroup, onSplitGroup, onManualGroupDocs, onReclassifyDoc }) => {
    const [activeGroupId, setActiveGroupId] = useState<string>(groups[0]?.id);
    const [isManualGrouping, setIsManualGrouping] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
    const { openGallery } = useGallery();

    // Ordena grupos pelo tipo de documento principal
    const sortedGroups = useMemo(() => {
        return [...groups].sort((a, b) => {
            const typeA = a.docs[0]?.classification || 'outro';
            const typeB = b.docs[0]?.classification || 'outro';
            const indexA = TAB_ORDER.indexOf(typeA);
            const indexB = TAB_ORDER.indexOf(typeB);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [groups]);

    const typeCounts = useMemo(() => {
        const counts: Partial<Record<DocClassification, number>> = {};
        sortedGroups.forEach(group => {
            const type = group.docs[0]?.classification || 'indeterminado';
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }, [sortedGroups]);

    const typeIndexes = useMemo(() => {
        const counters: Partial<Record<DocClassification, number>> = {};
        const indexes = new Map<string, number>();
        sortedGroups.forEach(group => {
            const type = group.docs[0]?.classification || 'indeterminado';
            const count = (counters[type] || 0) + 1;
            counters[type] = count;
            indexes.set(group.id, count);
        });
        return indexes;
    }, [sortedGroups]);

    // Garante que a aba ativa é válida
    const activeGroup = useMemo(() =>
        sortedGroups.find(g => g.id === activeGroupId) || sortedGroups[0],
        [sortedGroups, activeGroupId]
    );

    // Atualiza aba ativa se grupos mudarem
    useEffect(() => {
        if (!groups.find(g => g.id === activeGroupId)) {
            setActiveGroupId(sortedGroups[0]?.id);
        }
    }, [groups, sortedGroups, activeGroupId]);

    // Título do bundle (nome do PDF)
    const bundleTitle = useMemo(() => {
        const firstGroup = sortedGroups[0];
        if (!firstGroup) return 'Documento';
        const source = firstGroup.docs[0]?.source || '';
        const match = source.match(/^(.+?)(?:\s+Pg\s+\d+)?$/);
        return match ? match[1] : source;
    }, [sortedGroups]);

    // Conta total de documentos
    const totalDocs = useMemo(() =>
        groups.reduce((acc, g) => acc + g.docs.length, 0),
        [groups]
    );

    const allDocs = useMemo(() => {
        const unique = new Map<string, ReportGroup['docs'][number]>();
        groups.forEach(group => {
            group.docs.forEach(doc => {
                if (!unique.has(doc.id)) unique.set(doc.id, doc);
            });
        });
        return Array.from(unique.values()).sort((a, b) =>
            a.source.localeCompare(b.source, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [groups]);

    const canManualGroup = !!(groups.length > 1 && allDocs.length > 1);
    const selectedCount = selectedDocIds.size;

    const resolvePageLabel = (source: string, fallback: number) => {
        const match = source.match(/Pg\s*(\d+)/i);
        return match?.[1] ?? String(fallback);
    };

    const toggleDocSelection = (docId: string) => {
        setSelectedDocIds(prev => {
            const next = new Set(prev);
            if (next.has(docId)) {
                next.delete(docId);
            } else {
                next.add(docId);
            }
            return next;
        });
    };

    const handleApplyManualGrouping = () => {
        if (!selectedCount || !onManualGroupDocs) return;
        onManualGroupDocs(Array.from(selectedDocIds));
        setSelectedDocIds(new Set());
        setIsManualGrouping(false);
    };

    useEffect(() => {
        if (!isManualGrouping) {
            setSelectedDocIds(new Set());
        }
    }, [isManualGrouping, groups]);

    if (!activeGroup) return null;

    return (
        <div className="pdf-bundle-card">
            {/* Header Compacto */}
            <div className="pdf-bundle-header">
                <div className="pdf-bundle-header-main">
                    <FileText size={16} className="text-accent shrink-0" />
                    <div className="pdf-bundle-header-text">
                        <h3 className="pdf-bundle-title" title={bundleTitle}>
                            {bundleTitle}
                        </h3>
                        <span className="pdf-bundle-subtitle">
                            {groups.length} tipo{groups.length > 1 ? 's' : ''} de documento
                        </span>
                    </div>
                </div>
                <div className="pdf-bundle-header-actions">
                    {onManualGroupDocs && canManualGroup && (
                        <button
                            type="button"
                            className={`pdf-bundle-action ${isManualGrouping ? 'active' : ''}`}
                            onClick={() => setIsManualGrouping(prev => !prev)}
                        >
                            <Layers size={12} />
                            <span>{isManualGrouping ? 'Fechar seleção' : 'Agrupar páginas'}</span>
                        </button>
                    )}
                    <div className="pdf-bundle-pages">
                        <Layers size={12} />
                        <span>{totalDocs} pg{totalDocs > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            {isManualGrouping && onManualGroupDocs && canManualGroup && (
                <div className="pdf-bundle-manual">
                    <div className="pdf-bundle-manual-header">
                        <div className="pdf-bundle-manual-text">
                            <div className="pdf-bundle-manual-title">Selecione as páginas que pertencem ao mesmo laudo</div>
                            <div className="pdf-bundle-manual-subtitle">Duplo clique abre a página. As páginas selecionadas serão reagrupadas.</div>
                        </div>
                        <div className="pdf-bundle-manual-actions">
                            <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={!selectedCount}
                                onClick={handleApplyManualGrouping}
                            >
                                Agrupar {selectedCount > 0 ? `(${selectedCount})` : ''}
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                disabled={!selectedCount}
                                onClick={() => setSelectedDocIds(new Set())}
                            >
                                Limpar
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => setIsManualGrouping(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                    <div className="pdf-bundle-manual-count">
                        {selectedCount} página{selectedCount === 1 ? '' : 's'} selecionada{selectedCount === 1 ? '' : 's'}
                    </div>
                    <div className="pdf-bundle-thumbs">
                        {allDocs.map((doc, idx) => {
                            const pageLabel = resolvePageLabel(doc.source, idx + 1);
                            const isSelected = selectedDocIds.has(doc.id);
                            return (
                                <button
                                    key={doc.id}
                                    type="button"
                                    className={`pdf-bundle-thumb ${isSelected ? 'is-selected' : ''}`}
                                    title={doc.source}
                                    onClick={() => toggleDocSelection(doc.id)}
                                    onDoubleClick={() => openGallery(allDocs, doc.id)}
                                >
                                    {doc.previewUrl ? (
                                        <img src={doc.previewUrl} alt={`Página ${pageLabel}`} loading="lazy" />
                                    ) : (
                                        <div className="pdf-bundle-thumb-placeholder">Pg {pageLabel}</div>
                                    )}
                                    <span className="pdf-bundle-thumb-label">Pg {pageLabel}</span>
                                    {isSelected && (
                                        <span className="pdf-bundle-thumb-check">
                                            <Check size={12} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Barra de Abas - Design Premium */}
            <div className="tabs-bar flex items-center gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto">
                {sortedGroups.map(group => {
                    const isActive = group.id === activeGroup?.id;
                    const docType = group.docs[0]?.classification || 'outro';
                    const label = TAB_LABELS[docType] || docType;
                    const pageCount = group.docs.length;
                    const totalOfType = typeCounts[docType] || 0;
                    const typeIndex = typeIndexes.get(group.id);
                    const displayLabel = totalOfType > 1 && typeIndex
                        ? `${label} ${typeIndex}`
                        : label;
                    const colors = TAB_COLORS[docType] || TAB_COLORS.outro!;

                    return (
                        <button
                            key={group.id}
                            onClick={() => setActiveGroupId(group.id)}
                            className={`
                                tab-button flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium 
                                transition-all duration-200 whitespace-nowrap border
                                ${isActive
                                    ? `${colors.activeBg} ${colors.text} ${colors.border} shadow-sm`
                                    : `bg-transparent text-zinc-500 border-transparent hover:bg-white/5 hover:text-zinc-300`
                                }
                            `}
                        >
                            <span>{displayLabel}</span>
                            {pageCount > 1 && (
                                <span className={`
                                    text-[10px] px-1.5 py-0.5 rounded-full
                                    ${isActive ? 'bg-white/10' : 'bg-white/5'}
                                `}>
                                    {pageCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Conteúdo do Grupo Ativo */}
            <div className="bundle-content">
                <ReportGroupCard
                    key={activeGroup.id}
                    group={activeGroup}
                    onRemove={() => onRemoveGroup(activeGroup.id)}
                    onSplitGroup={onSplitGroup}
                    embedded
                />
            </div>
        </div>
    );
};
