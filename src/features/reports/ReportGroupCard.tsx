
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, MapPin, ChevronDown, ChevronUp,
  Copy, Check, FileText, Layers, AlertTriangle, AlertCircle, Quote, Trash2, Scissors
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ReportGroup } from '../../utils/grouping';
import { StructuredReportBody, FindingSeverity } from '../../types';
import { useReportDisplay } from './useReportDisplay';
import { useGallery } from '../../context/GalleryContext';

import { MultiDocumentTabs } from '../../components/MultiDocumentTabs';


interface Props {
  group: ReportGroup;
  onRemove: () => void;
  onSplitGroup?: (groupId: string, splitStartPage: number) => void;
  embedded?: boolean;
}

export const ReportGroupCard: React.FC<Props> = ({ group, onRemove, onSplitGroup, embedded = false }) => {
  const { openGallery } = useGallery();
  const isEmbedded = embedded;

  // Hooks de Estado de UI
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitStartPage, setSplitStartPage] = useState(2);
  const [dragTarget, setDragTarget] = useState<'left' | 'right' | null>(null);

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
  const orderedDocs = useMemo(() => (
    [...group.docs].sort((a, b) => a.source.localeCompare(b.source, undefined, { numeric: true }))
  ), [group.docs]);
  const maxSplit = Math.max(2, orderedDocs.length);
  const clampedSplit = Math.min(Math.max(splitStartPage, 2), maxSplit);
  const splitIndex = clampedSplit - 1;
  const leftDocs = orderedDocs.slice(0, splitIndex);
  const rightDocs = orderedDocs.slice(splitIndex);
  const MAX_SPLIT_THUMBS = 6;

  const resolvePageLabel = (source: string, fallback: number) => {
    const match = source.match(/Pg\s*(\d+)/i);
    return match?.[1] ?? String(fallback);
  };

  const handleThumbDragStart = (event: React.DragEvent<HTMLButtonElement>, pageIndex: number) => {
    event.dataTransfer.setData('text/plain', String(pageIndex));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleThumbDragEnd = () => {
    setDragTarget(null);
  };

  const handleSplitDrop = (event: React.DragEvent<HTMLDivElement>, target: 'left' | 'right') => {
    event.preventDefault();
    const payload = event.dataTransfer.getData('text/plain');
    const pageIndex = Number(payload);
    if (!Number.isFinite(pageIndex)) return;

    const nextSplit = target === 'left'
      ? Math.min(maxSplit, pageIndex + 2)
      : Math.max(2, Math.min(maxSplit, pageIndex + 1));

    setSplitStartPage(nextSplit);
    setDragTarget(null);
  };

  const handleSplitDragOver = (event: React.DragEvent<HTMLDivElement>, target: 'left' | 'right') => {
    event.preventDefault();
    if (dragTarget !== target) setDragTarget(target);
    event.dataTransfer.dropEffect = 'move';
  };

  const handleSplitDragLeave = (event: React.DragEvent<HTMLDivElement>, target: 'left' | 'right') => {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    if (dragTarget === target) setDragTarget(null);
  };

  const renderSplitThumbs = (docs: typeof orderedDocs, offset: number) => {
    const visible = docs.slice(0, MAX_SPLIT_THUMBS);
    return (
      <>
        {visible.map((doc, idx) => {
          const pageLabel = resolvePageLabel(doc.source, offset + idx + 1);
          const pageIndex = offset + idx;
          return (
            <button
              key={doc.id}
              type="button"
              className="rcu-split-thumb"
              title={doc.source}
              aria-label={`Abrir página ${pageLabel}`}
              draggable
              onDragStart={(event) => handleThumbDragStart(event, pageIndex)}
              onDragEnd={handleThumbDragEnd}
              onClick={(event) => {
                event.stopPropagation();
                openGallery(orderedDocs, doc.id);
              }}
            >
              {doc.previewUrl ? (
                <img src={doc.previewUrl} alt={`Página ${pageLabel}`} loading="lazy" />
              ) : (
                <div className="rcu-split-thumb-placeholder">Pg {pageLabel}</div>
              )}
              <span className="rcu-split-thumb-label">{pageLabel}</span>
            </button>
          );
        })}
        {docs.length > MAX_SPLIT_THUMBS ? (
          <span className="rcu-split-thumb-more">+{docs.length - MAX_SPLIT_THUMBS}</span>
        ) : null}
      </>
    );
  };

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

  const splitImpressionItems = (text: string) => {
    // Lista de prefixos redundantes para remover
    const redundantPrefixes = [
      /^opinião do relatório\s*[-:]?\s*/i,
      /^impressão diagnóstica\s*[-:]?\s*/i,
      /^impressão\s*[-:]?\s*/i,
      /^conclusão\s*[-:]?\s*/i,
      /^conclusão diagnóstica\s*[-:]?\s*/i,
      /^síntese diagnóstica\s*[-:]?\s*/i,
      /^observaç[õo]es?\s*[-:]?\s*/i
    ];

    const normalized = text
      .replace(/\r\n/g, '\n')
      .replace(/[•►▪●]+/g, '\n')
      .replace(/\n{2,}/g, '\n');

    const items = normalized
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        let cleanItem = item.replace(/^[-–—]\s*/, '').trim();
        // Remove prefixos redundantes
        redundantPrefixes.forEach(regex => {
          cleanItem = cleanItem.replace(regex, '');
        });
        // Capitaliza a primeira letra se necessário
        if (cleanItem.length > 0) {
          return cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1);
        }
        return cleanItem;
      })
      .filter(item => item.length > 0);

    return items.length > 0 ? items : [text.trim()];
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
          <div className="sr-organs-grid mb-4">
            {data.indicacao_clinica && (
              <div className="sr-organ-card">
                <div className="sr-organ-header">
                  <h5 className="sr-organ-title">INDICAÇÃO CLÍNICA</h5>
                </div>
                <p className="text-sm text-secondary leading-relaxed px-3 pb-3">{data.indicacao_clinica}</p>
              </div>
            )}
            {data.tecnica && (
              <div className="sr-organ-card col-span-full">
                <div className="sr-organ-header">
                  <h5 className="sr-organ-title">TÉCNICA</h5>
                </div>
                <p className="text-sm text-secondary leading-relaxed px-3 pb-3">{data.tecnica}</p>
              </div>
            )}
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
              <Quote size={20} style={{ transform: 'scaleX(-1)' }} />
              <span className="text-base font-bold tracking-wide">IMPRESSÃO DIAGNÓSTICA</span>
            </div>
            <ul className="sr-conclusion-list">
              {splitImpressionItems(data.impressao_diagnostica_ou_conclusao_literal).map((item, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: formatBold(item) }} />
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`report-card-unified ${isExpanded ? 'expanded' : ''} ${isEmbedded ? 'embedded' : ''}`}>

      {/* HEADER DO CARD */}
      {!isEmbedded && (
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
      )}

      {isEmbedded && (
        <div className="rcu-embedded-actions" onClick={(e) => e.stopPropagation()}>
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
      )}

      {/* METADADOS ADICIONAIS (Laudador e Serviço de Origem) */}
      {!isEmbedded && (meta.laudador || meta.servicoOrigem) && (
        <div className="px-4 py-3 bg-surface-elevated/50 border-b border-subtle">
          <div className="flex flex-col gap-2 text-xs">
            {meta.servicoOrigem && meta.servicoOrigem.nome && meta.servicoOrigem.nome !== 'Serviço externo não identificado' && (
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-accent shrink-0" />
                <span className="text-secondary">
                  <span className="text-tertiary">Serviço:</span> {meta.servicoOrigem.nome}
                </span>
              </div>
            )}
            {meta.laudador && meta.laudador.nome && meta.laudador.nome !== 'Não identificado' && (
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-accent shrink-0" />
                <span className="text-secondary">
                  <span className="text-tertiary">Laudador:</span> {meta.laudador.nome}
                  {meta.laudador.crm && <span className="text-tertiary ml-1">({meta.laudador.crm})</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARREIRA DE SEGURANÇA (CLINICAL SAFETY) */}
      {group.isBlocked && (
        <div className="bg-red-900/40 border-y border-red-500/30 p-4 animate-pulse-subtle">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-red-400 font-bold text-sm uppercase tracking-wider mb-1">
                Barreira de Segurança: Divergência Detectada
              </h4>
              <p className="text-red-200 text-xs leading-relaxed opacity-90">
                Este grupo de páginas contém dados de pacientes diferentes ou números de OS divergentes.
                A geração do laudo unificado foi bloqueada para evitar contaminação de dados.
              </p>
              <ul className="mt-2 list-disc list-inside text-red-300 text-xs font-mono">
                {group.blockingReasons?.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL DE SPLIT MANUAL */}
      {isSplitMode && canSplit && onSplitGroup && (
        <div className="p-3 bg-surface-elevated border-b border-subtle animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary">Novo laudo a partir da página:</span>
              <select
                className="bg-app border border-strong rounded text-xs p-1 text-primary"
                value={splitStartPage}
                onChange={(e) => setSplitStartPage(Number(e.target.value))}
              >
                {Array.from({ length: orderedDocs.length - 1 }, (_, idx) => idx + 2).map(page => (
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
          <div className="rcu-split-preview">
            <div className="rcu-split-preview-header">
              <span>Prévia da divisão</span>
              <span>{leftDocs.length} + {rightDocs.length} páginas</span>
            </div>
            <div className="rcu-split-preview-hint">
              Arraste uma página para definir onde começa o laudo B.
            </div>
            <div className="rcu-split-preview-columns">
              <div
                className={`rcu-split-preview-column ${dragTarget === 'left' ? 'is-drop-target' : ''}`}
                onDragOver={(event) => handleSplitDragOver(event, 'left')}
                onDragLeave={(event) => handleSplitDragLeave(event, 'left')}
                onDrop={(event) => handleSplitDrop(event, 'left')}
              >
                <div className="rcu-split-preview-title">
                  Laudo A · páginas 1–{splitIndex}
                </div>
                <div className="rcu-split-preview-pages">
                  {renderSplitThumbs(leftDocs, 0)}
                </div>
              </div>
              <div
                className={`rcu-split-preview-column ${dragTarget === 'right' ? 'is-drop-target' : ''}`}
                onDragOver={(event) => handleSplitDragOver(event, 'right')}
                onDragLeave={(event) => handleSplitDragLeave(event, 'right')}
                onDrop={(event) => handleSplitDrop(event, 'right')}
              >
                <div className="rcu-split-preview-title">
                  Laudo B · páginas {splitIndex + 1}–{orderedDocs.length}
                </div>
                <div className="rcu-split-preview-pages">
                  {renderSplitThumbs(rightDocs, splitIndex)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* CORPO DO CARD - COM ABAS SE TIVER MÚLTIPLOS TIPOS */}
      <div className="rcu-body">
        {(() => {
          // Verifica se temos documentos adaptativos misturados (Cenário Multi-Doc PDF)
          const docTypes = group.docs.map(d => d.classification);
          const hasAdaptive = docTypes.some(t => ['pedido_medico', 'guia_autorizacao', 'termo_consentimento', 'questionario', 'assistencial'].includes(t));
          const hasLaudo = docTypes.includes('laudo_previo');

          // Se tiver Laudo + Outros, usa o sistema de Abas
          if (hasAdaptive && hasLaudo) {
            return (
              <div className="h-[500px] border-t border-white/5">
                <MultiDocumentTabs
                  docs={group.docs}
                  mode={isEmbedded ? 'stack' : 'tabs'}
                  showTemplateHeader={!isEmbedded}
                  showDocLabel={isEmbedded}
                  renderLaudoContent={(doc) => (
                    <div className="p-4">
                      {/* Renderiza o Laudo Unificado */}
                      {isStructured && structuredData ? (
                        renderStructuredFindings(structuredData)
                      ) : (
                        meta.summary && (
                          <div className="mb-4">
                            <h4 className="rcu-section-title mb-2">Resumo (Análise Simples)</h4>
                            <p className="text-sm text-secondary leading-relaxed">{meta.summary}</p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                />
              </div>
            );
          }

          // FALLBACK: Comportamento antigo para grupos homogêneos ou sem laudo misturado
          // Para documentos que não são laudo_previo, usar templates específicos (se for grupo só de adaptativos)
          const docType = group.docs[0]?.classification;

          // ... (Rest of the previous logic for homogeneous groups)
          const isAdaptiveType = ['pedido_medico', 'termo_consentimento', 'questionario', 'guia_autorizacao', 'assistencial'].includes(docType || '');

          if (isAdaptiveType) {
            return (
              <div className="h-[500px] border-t border-white/5">
                <MultiDocumentTabs
                  docs={group.docs}
                  mode={isEmbedded ? 'stack' : 'tabs'}
                  showTemplateHeader={!isEmbedded}
                  showDocLabel={isEmbedded}
                  renderLaudoContent={() => (
                    <div className="p-4 text-sm text-secondary">
                      Documento de laudo não esperado neste grupo.
                    </div>
                  )}
                />
              </div>
            );
          }

          // Renderização Padrão de Laudo (Unificado)
          return isStructured && structuredData ? (
            renderStructuredFindings(structuredData)
          ) : (
            meta.summary && (
              <div className="mb-4">
                <h4 className="rcu-section-title mb-2">Resumo (Análise Simples)</h4>
                <p className="text-sm text-secondary leading-relaxed">{meta.summary}</p>
                {!meta.isUnifiedSuccess && group.docs.length > 1 && (
                  <p className="text-xs text-accent mt-2 italic flex items-center gap-1">
                    <Layers size={12} /> Aguardando unificação das {group.docs.length} páginas...
                  </p>
                )}
              </div>
            )
          );
        })()}

        {/* Footer actions (View Original) - Only show if not identifying tabs (tabs have their own internal structure) */}
        {!isExpanded && isStructured && !group.docs.some(d => ['pedido_medico'].includes(d.classification)) && (
          <div className="flex justify-center mt-4 pt-4 border-t border-dashed border-subtle">
            <button className="text-xs text-tertiary hover:text-accent flex items-center gap-1 transition-colors" onClick={() => setIsExpanded(true)}>
              <FileText size={12} /> Ver Texto Original Completo
            </button>
          </div>
        )}

        {isExpanded && (
          <div className="rcu-full-content animate-fade-in">
            {/* ... (Existing expanded content logic) ... */}
            <div className="rcu-content-header" onClick={() => setIsExpanded(false)} style={{ cursor: 'pointer' }} title="Clique para recolher">
              <h4 className="rcu-section-title flex items-center gap-2">
                <ChevronUp size={16} /> Texto Original (Íntegra)
              </h4>
              <div className="flex gap-3">
                <button className="btn-icon-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors" onClick={handleCopy} title="Copiar texto">
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  <span className="text-sm">{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button className="btn-icon-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors" onClick={() => openGallery(group.docs, unifiedDoc.id)} title="Ver Imagens Originais">
                  <FileText size={16} />
                  <span className="text-sm">Original</span>
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
