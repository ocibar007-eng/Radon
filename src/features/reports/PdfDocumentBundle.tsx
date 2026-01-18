/**
 * PdfDocumentBundle.tsx
 * 
 * Componente que agrupa múltiplos ReportGroups do mesmo PDF
 * e renderiza com abas para navegação entre tipos de documento.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Layers } from 'lucide-react';
import { ReportGroup } from '../../utils/grouping';
import { ReportGroupCard } from './ReportGroupCard';
import { DocClassification } from '../../types';

interface Props {
    groups: ReportGroup[];
    onRemoveGroup: (groupId: string) => void;
    onSplitGroup?: (groupId: string, splitStartPage: number) => void;
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

export const PdfDocumentBundle: React.FC<Props> = ({ groups, onRemoveGroup, onSplitGroup, onReclassifyDoc }) => {
    const [activeGroupId, setActiveGroupId] = useState<string>(groups[0]?.id);

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
                <div className="pdf-bundle-pages">
                    <Layers size={12} />
                    <span>{totalDocs} pg{totalDocs > 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Barra de Abas - Design Premium */}
            <div className="tabs-bar flex items-center gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto">
                {sortedGroups.map(group => {
                    const isActive = group.id === activeGroup?.id;
                    const docType = group.docs[0]?.classification || 'outro';
                    const label = TAB_LABELS[docType] || docType;
                    const pageCount = group.docs.length;
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
                            <span>{label}</span>
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
                />
            </div>
        </div>
    );
};
