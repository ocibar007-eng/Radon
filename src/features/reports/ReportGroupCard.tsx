
import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, ChevronDown, ChevronUp, 
  Copy, Check, FileText, Layers, AlertTriangle, AlertCircle, Quote, Trash2, Scissors
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ReportGroup } from '../../utils/grouping';
import { StructuredReportBody, FindingSeverity } from '../../types';
import { useReportDisplay } from './useReportDisplay';
import { useGallery } from '../../context/GalleryContext';

interface Props {
  group: ReportGroup;
  onRemove: () => void;
  onSplitGroup?: (groupId: string, splitStartPage: number) => void;
}

export const ReportGroupCard: React.FC<Props> = ({ group, onRemove, onSplitGroup }) => {
  const { openGallery } = useGallery();
  
  // Hooks de Estado de UI
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitStartPage, setSplitStartPage] = useState(2);
  
  // Custom Hook: Lógica de Dados e Visualização
  const { 
    unifiedDoc, 
    plainText, 
    structuredData, 
    meta, 
    formatBold, 
    isStructured 
  } = useReportDisplay(group);

  const canSplit = group.docs.length > 1 && group.id.startsWith('pdf::') && !!onSplitGroup;

  useEffect(() => {
    setSplitStartPage(2);
    setIsSplitMode(false);
  }, [group.id]);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Subcomponentes de UI (Status Dot)
  const StatusDot = ({ status }: { status?: FindingSeverity }) => {
    if (!status || status === 'normal') return <div className="status-dot normal" title="Normal" />;
    if (status === 'alteracao_benigna') return <div className="status-dot benign" title="Alteração Benigna" />;
    return <div className="status-dot relevant" title="Alteração Relevante" />;
  };

  // Renderização Estruturada (Grid de Órgãos)
  const renderStructuredFindings = (data: StructuredReportBody) => {
    return (
      <div className="structured-report-container animate-fade-in">
        {/* Alertas e Metadados Clínicos */}
        <div className="sr-alerts">
            {data.texto_parece_completo === false && (
            <div className="text-error text-sm p-3 border border-red-900/30 bg-red-900/10 rounded flex items-center gap-2 mb-2">
                <AlertCircle size={16} />
                <strong>Atenção:</strong> O texto parece incompleto.
            </div>
            )}
            {data.alertas_de_fidelidade && data.alertas_de_fidelidade.length > 0 && (
            <div className="text-warning text-sm p-3 border border-amber-900/30 bg-amber-900/10 rounded flex items-center gap-2 mb-2">
                <AlertTriangle size={14} />
                {data.alertas_de_fidelidade.join(' ')}
            </div>
            )}
        </div>

        {(data.indicacao_clinica || data.tecnica) && (
          <div className="text-sm text-primary mb-3 p-3 bg-surface-elevated rounded border border-subtle">
             {data.indicacao_clinica && <p className="mb-2"><strong className="text-accent">INDICAÇÃO:</strong> <span className="text-secondary">{data.indicacao_clinica}</span></p>}
             {data.tecnica && <p><strong className="text-accent">TÉCNICA:</strong> <span className="text-secondary">{data.tecnica}</span></p>}
          </div>
        )}

        {/* Grid Principal */}
        <div className="sr-organs-grid">
           {data.achados_por_estrutura?.map((item, idx) => (
             <div key={idx} className={`sr-organ-card ${item.status === 'alteracao_relevante' ? 'border-relevant' : ''}`}>
               <div className="sr-organ-header">
                 <h5 className="sr-organ-title">{item.estrutura}</h5>
                 <StatusDot status={item.status} />
               </div>
               <ul className="sr-findings-list">
                 {item.achados_literais_em_topicos?.map((finding, fIdx) => (
                   <li key={fIdx} dangerouslySetInnerHTML={{ __html: formatBold(finding) }} />
                 ))}
               </ul>
             </div>
           ))}
           
           {data.linfonodos && data.linfonodos.achados_literais_em_topicos.length > 0 && (
              <div className={`sr-organ-card ${data.linfonodos.status === 'alteracao_relevante' ? 'border-relevant' : ''}`}>
                 <div className="sr-organ-header">
                   <h5 className="sr-organ-title">Linfonodos</h5>
                   <StatusDot status={data.linfonodos.status} />
                 </div>
                 <ul className="sr-findings-list">
                   {data.linfonodos.achados_literais_em_topicos.map((finding, fIdx) => (
                      <li key={fIdx} dangerouslySetInnerHTML={{ __html: formatBold(finding) }} />
                   ))}
                 </ul>
              </div>
           )}
        </div>

        {data.impressao_diagnostica_ou_conclusao_literal && (
           <div className="sr-conclusion-box">
             <div className="sr-conclusion-header">
                <Quote size={16} style={{transform: 'scaleX(-1)'}} />
                <span>IMPRESSÃO DIAGNÓSTICA</span>
             </div>
             <p className="sr-text-conclusion" dangerouslySetInnerHTML={{ __html: formatBold(data.impressao_diagnostica_ou_conclusao_literal) }} />
           </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`report-card-unified ${isExpanded ? 'expanded' : ''}`}>
      
      {/* HEADER DO CARD */}
      <div className="rcu-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="rcu-main-info">
          <div className="rcu-type-row">
            <h3 className="rcu-title">{meta.type}</h3>
            {group.docs.length > 1 && (
              <span className="rcu-badge-pages">
                <Layers size={10} /> {group.docs.length}
                {meta.isUnifiedSuccess && (
                  <Check size={10} className="text-success ml-1" />
                )}
              </span>
            )}
          </div>
          
          <div className="rcu-meta-row">
            <span className="rcu-meta-item">
              <Calendar size={12} className="text-accent" /> {meta.date}
            </span>
            <span className="rcu-meta-divider">•</span>
            <span className={`rcu-meta-item ${meta.isSabin ? 'text-info' : ''}`}>
              <MapPin size={12} /> {meta.originLabel}
            </span>
          </div>
        </div>

        <div className="rcu-actions" onClick={(e) => e.stopPropagation()}>
           {canSplit && (
             <button
               className={`rcu-split-btn ${isSplitMode ? 'active' : ''}`}
               onClick={(e) => { e.stopPropagation(); setIsSplitMode(prev => !prev); }}
               title="Dividir laudo"
             >
               <Scissors size={14} />
               <span className="hidden sm:inline">Dividir</span>
             </button>
           )}
           <button className="action-btn-mini hover:text-error" onClick={onRemove} title="Remover Exame Inteiro">
               <Trash2 size={16} />
           </button>
           <button className={`rcu-expand-btn ${isExpanded ? 'active' : ''}`} onClick={() => setIsExpanded(!isExpanded)}>
             {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
           </button>
        </div>
      </div>

      {/* PAINEL DE SPLIT MANUAL */}
      {isSplitMode && canSplit && onSplitGroup && (
        <div className="p-3 bg-surface-elevated border-b border-subtle flex items-center justify-between gap-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary">Novo laudo a partir da página:</span>
            <select
              className="bg-app border border-strong rounded text-xs p-1 text-primary"
              value={splitStartPage}
              onChange={(e) => setSplitStartPage(Number(e.target.value))}
            >
              {Array.from({ length: group.docs.length - 1 }, (_, idx) => idx + 2).map(page => (
                <option key={page} value={page}>
                  Página {page}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                onSplitGroup(group.id, splitStartPage);
                setIsSplitMode(false);
              }}
            >
              Confirmar
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setIsSplitMode(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* CORPO DO CARD */}
      <div className="rcu-body">
        {isStructured && structuredData ? (
          renderStructuredFindings(structuredData)
        ) : (
           meta.summary && (
            <div className="mb-4">
              <h4 className="rcu-section-title mb-2">Resumo (Análise Simples)</h4>
              <p className="text-sm text-secondary leading-relaxed">{meta.summary}</p>
              {!meta.isUnifiedSuccess && group.docs.length > 1 && (
                <p className="text-xs text-accent mt-2 italic flex items-center gap-1">
                    <Layers size={12}/> Aguardando unificação das {group.docs.length} páginas...
                </p>
              )}
            </div>
           )
        )}
        
        {!isExpanded && isStructured && (
             <div className="flex justify-center mt-4 pt-4 border-t border-dashed border-subtle">
                 <button className="text-xs text-tertiary hover:text-accent flex items-center gap-1 transition-colors" onClick={() => setIsExpanded(true)}>
                    <FileText size={12} /> Ver Texto Original Completo
                 </button>
             </div>
        )}

        {isExpanded && (
          <div className="rcu-full-content animate-fade-in">
            <div className="rcu-content-header">
              <h4 className="rcu-section-title">Texto Original (Íntegra)</h4>
              <div className="flex gap-2">
                 <button className="btn-icon-sm" onClick={handleCopy} title="Copiar texto">
                   {copied ? <Check size={12} className="text-success mr-1"/> : <Copy size={12} className="mr-1"/>}
                   {copied ? 'Copiado' : 'Copiar'}
                 </button>
                 <button className="btn-icon-sm" onClick={() => openGallery(group.docs, unifiedDoc.id)} title="Ver Imagens Originais">
                   <FileText size={12} className="mr-1" /> Original
                 </button>
              </div>
            </div>
            <div className="rcu-verbatim-box scroll-thin">{plainText}</div>
          </div>
        )}
      </div>
    </Card>
  );
};
