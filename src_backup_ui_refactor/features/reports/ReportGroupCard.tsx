
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

// Importação das Máscaras Adaptativas
import {
  PedidoMedicoTemplate,
  TermoConsentimentoTemplate,
  QuestionarioTemplate,
  GuiaAutorizacaoTemplate
} from '../../components/templates';


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

      {/* METADADOS ADICIONAIS (Laudador e Serviço de Origem) */}
      {(meta.laudador || meta.servicoOrigem) && (
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
        {/* Renderização Adaptativa por Tipo de Documento */}
        {(() => {
          // Para documentos que não são laudo_previo, usar templates específicos
          const docType = group.docs[0]?.classification;

          // 🔍 DEBUG: Log para investigar por que templates não aparecem
          console.log('[ReportGroupCard] Rendering:', {
            docType,
            groupId: group.id,
            hasExtractedData: !!unifiedDoc?.extractedData,
            extractedDataKeys: unifiedDoc?.extractedData ? Object.keys(unifiedDoc.extractedData) : [],
            hasDetailedAnalysis: !!unifiedDoc?.detailedAnalysis,
            isStructured: !!structuredData
          });

          // ⚠️ IMPORTANTE: Verificar tipo ANTES de qualquer fallback
          const isAdaptiveType = ['pedido_medico', 'termo_consentimento', 'questionario', 'guia_autorizacao'].includes(docType || '');

          if (isAdaptiveType) {
            console.log('[ReportGroupCard] 🎭 Documento adaptativo detectado:', docType);
          }

          // Renderizar o template correspondente
          if (docType === 'pedido_medico') {
            const pedidoData = unifiedDoc?.extractedData || {};
            console.log('[ReportGroupCard] 📄 Renderizando PedidoMedicoTemplate:', pedidoData);
            return <PedidoMedicoTemplate data={pedidoData} />;
          }

          if (docType === 'termo_consentimento') {
            const termoData = unifiedDoc?.extractedData || {};
            console.log('[ReportGroupCard] 📜 Renderizando TermoConsentimentoTemplate:', termoData);
            return <TermoConsentimentoTemplate data={termoData} />;
          }

          if (docType === 'questionario') {
            const questionarioData = unifiedDoc?.extractedData || {};
            console.log('[ReportGroupCard] 📋 Renderizando QuestionarioTemplate:', questionarioData);
            return <QuestionarioTemplate data={questionarioData} />;
          }

          if (docType === 'guia_autorizacao') {
            const guiaData = unifiedDoc?.extractedData || {};
            console.log('[ReportGroupCard] 💳 Renderizando GuiaAutorizacaoTemplate:', guiaData);
            return <GuiaAutorizacaoTemplate data={guiaData} />;
          }

          // ⚠️ IMPORTANTE: Para documentos adaptativos, NÃO usar fallback de laudo
          if (isAdaptiveType) {
            // Se extractedData está vazio, mostrar estado de aguardando
            const hasExtractedData = unifiedDoc?.extractedData && Object.keys(unifiedDoc.extractedData).length > 1;

            if (!hasExtractedData) {
              return (
                <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded">
                  <p className="text-sm text-amber-400 flex items-center gap-2">
                    <Layers size={16} className="animate-pulse" />
                    Aguardando extração de dados estruturados...
                  </p>
                  <p className="text-xs text-tertiary mt-2">
                    Se o documento foi processado antes da atualização do sistema, delete e faça upload novamente para usar a nova máscara.
                  </p>
                </div>
              );
            }

            // Se tiver dados mas template não renderizou nada, mostrar fallback genérico
            return (
              <div className="mb-4">
                <p className="text-sm text-secondary">
                  Documento classificado como <span className="font-semibold">{docType}</span> mas com dados parciais.
                </p>
              </div>
            );
          }

          // Para laudo_previo ou outros tipos, usar renderização estruturada existente
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

        {!isExpanded && isStructured && (
          <div className="flex justify-center mt-4 pt-4 border-t border-dashed border-subtle">
            <button className="text-xs text-tertiary hover:text-accent flex items-center gap-1 transition-colors" onClick={() => setIsExpanded(true)}>
              <FileText size={12} /> Ver Texto Original Completo
            </button>
          </div>
        )}

        {isExpanded && (
          <div className="rcu-full-content animate-fade-in">
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
