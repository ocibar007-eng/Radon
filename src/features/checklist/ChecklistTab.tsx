import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, Search, ShieldAlert } from 'lucide-react';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import type { RadiologyChecklist } from '../../types';

interface Props {
  data?: RadiologyChecklist;
  markdown?: string;
  isProcessing: boolean;
  query: string;
  onApplyQuery: (value: string) => void;
  onClearQuery: () => void;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isNotInformed = (value: string) => normalize(value).includes('nao informado');

const formatText = (value: string, fallback = 'não informado') =>
  value && value.trim().length > 0 ? value : fallback;

const formatList = (values?: string[], fallback = 'não informado') =>
  values && values.length > 0 ? values : [fallback];

const INTENT_PRESETS = [
  { key: 'diagnostico', label: 'Diagnóstico', phrase: 'diagnostico' },
  { key: 'estadiamento', label: 'Estadiamento', phrase: 'estadiamento' },
  { key: 'reestadiamento', label: 'Reestadiamento', phrase: 'reestadiamento' },
  { key: 'seguimento', label: 'Seguimento', phrase: 'seguimento' }
];

const INTENT_REGEX = /\b(reestadiamento|estadiamento|seguimento|diagn[oó]stico)\b/gi;

export const ChecklistTab: React.FC<Props> = ({
  data,
  markdown,
  isProcessing,
  query,
  onApplyQuery,
  onClearQuery
}) => {
  const [draftQuery, setDraftQuery] = useState(query);
  const trimmedDraft = draftQuery.trim();
  const trimmedQuery = query.trim();

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  const getActiveIntent = (text: string) => {
    const normalized = normalize(text);
    if (normalized.includes('reestadi')) return 'reestadiamento';
    if (normalized.includes('estadi')) return 'estadiamento';
    if (normalized.includes('seguim')) return 'seguimento';
    if (normalized.includes('diagnost')) return 'diagnostico';
    return '';
  };

  const buildIntentQuery = (phrase: string) => {
    const cleaned = draftQuery.trim();
    if (!cleaned) return phrase;
    const withoutIntent = cleaned.replace(INTENT_REGEX, '').replace(/\s{2,}/g, ' ').trim();
    const base = withoutIntent || cleaned;
    const needsConnector = base && !/^(de|da|do|das|dos)\s/i.test(base);
    return needsConnector ? `${phrase} de ${base}` : `${phrase} ${base}`;
  };

  const applyIntentPreset = (phrase: string) => {
    const newQuery = buildIntentQuery(phrase).replace(/\s{2,}/g, ' ').trim();
    setDraftQuery(newQuery);
    if (newQuery && newQuery !== trimmedQuery) {
      onApplyQuery(newQuery);
    }
  };

  const activeIntent = getActiveIntent(trimmedQuery);

  const renderSearch = () => (
    <div className="checklist-search">
      <div className="checklist-search-input">
        <Search size={16} />
        <input
          type="text"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          placeholder="Buscar checklist (ex: estadiamento de tumor de reto, MERCURY)"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              if (trimmedDraft !== trimmedQuery) {
                onApplyQuery(trimmedDraft);
              }
            }
          }}
        />
      </div>
      <button
        type="button"
        className="checklist-search-btn"
        onClick={() => onApplyQuery(trimmedDraft)}
        disabled={trimmedDraft === trimmedQuery}
      >
        Atualizar
      </button>
      <button
        type="button"
        className="checklist-search-btn is-ghost"
        onClick={() => {
          setDraftQuery('');
          onClearQuery();
        }}
        disabled={!trimmedQuery}
      >
        Limpar
      </button>
      <div className="checklist-search-presets">
        <span className="checklist-search-label">Intenção</span>
        {INTENT_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={`checklist-intent-chip ${activeIntent === preset.key ? 'is-active' : ''}`}
            onClick={() => applyIntentPreset(preset.phrase)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {trimmedQuery ? (
        <span className="checklist-search-note">Busca ativa: {query}</span>
      ) : (
        <span className="checklist-search-note">Dica: refine por intenção, órgão e guideline.</span>
      )}
    </div>
  );

  const sections = data?.checklist ?? [];

  const stats = useMemo(() => {
    const totals = sections.reduce(
      (acc, section) => {
        section.itens.forEach((item) => {
          acc.total += 1;
          if (item.prioridade === 'P0') acc.p0 += 1;
          if (item.prioridade === 'P1') acc.p1 += 1;
          if (item.prioridade === 'P2') acc.p2 += 1;
        });
        return acc;
      },
      { total: 0, p0: 0, p1: 0, p2: 0 }
    );

    return {
      ...totals,
      sections: sections.length,
      frameworks: data?.frameworks_referenciados?.length || 0
    };
  }, [data, sections]);

  if (!data && !markdown) {
    return (
      <div className="checklist-container animate-fade-in">
        {renderSearch()}
        <div className="empty-state">
          {isProcessing ? 'Processando documentos e preparando checklist...' : 'Aguardando dados clínicos para gerar o checklist.'}
        </div>
      </div>
    );
  }

  if (!data && markdown) {
    return (
      <div className="checklist-container animate-fade-in">
        {renderSearch()}
        <MarkdownRenderer content={markdown} variant="clinical" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const summary = data.resumo_final_struct;

  return (
    <div className="checklist-container animate-fade-in">
      {renderSearch()}
      <div className="checklist-hero">
        <div className="checklist-hero-main">
          <span className="checklist-hero-eyebrow">Checklist radiológico</span>
          <h3 className="checklist-hero-title">
            {formatText(data.condicao_alvo.nome, 'Condição não informada')}
          </h3>
          <p className="checklist-hero-subtitle">
            {formatText(data.condicao_alvo.racional_em_1_linha, 'Racional clínico não informado.')}
          </p>
          <div className="checklist-hero-tags">
            <span className={`checklist-chip checklist-chip--${data.condicao_alvo.confianca}`}>
              Confiança: {data.condicao_alvo.confianca}
            </span>
            <span className="checklist-chip">Intenção: {data.intencao}</span>
            <span className="checklist-chip">Seções: {stats.sections}</span>
          </div>
        </div>
        <div className="checklist-hero-stats">
          <div className="checklist-stat">
            <span>Total de itens</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="checklist-stat">
            <span>P0 críticos</span>
            <strong>{stats.p0}</strong>
          </div>
          <div className="checklist-stat">
            <span>Frameworks</span>
            <strong>{stats.frameworks}</strong>
          </div>
        </div>
      </div>

      <div className="checklist-grid">
        <div className="checklist-card">
          <div className="checklist-card-header">
            <h4>Frameworks & critérios</h4>
          </div>
          <div className="checklist-card-body">
            {data.frameworks_referenciados && data.frameworks_referenciados.length > 0 ? (
              data.frameworks_referenciados.map((framework, idx) => (
                <div key={`${framework.nome}-${idx}`} className="checklist-framework">
                  <span className="checklist-framework-title">{formatText(framework.nome)}</span>
                  <span className="checklist-framework-meta">
                    {formatText(framework.quando_usar)}{framework.observacao ? ` · ${framework.observacao}` : ''}
                  </span>
                </div>
              ))
            ) : (
              <span className="checklist-muted">Sem framework declarado.</span>
            )}
          </div>
        </div>

        <div className="checklist-card">
          <div className="checklist-card-header">
            <h4>Diferenciais considerados</h4>
          </div>
          <div className="checklist-card-body">
            {data.condicao_alvo.diferenciais_considerados?.length ? (
              data.condicao_alvo.diferenciais_considerados.map((diff, idx) => (
                <div key={`${diff.nome}-${idx}`} className="checklist-framework">
                  <span className="checklist-framework-title">{formatText(diff.nome)}</span>
                  <span className="checklist-framework-meta">{formatText(diff.por_que_entrou)}</span>
                </div>
              ))
            ) : (
              <span className="checklist-muted">Nenhum diferencial listado.</span>
            )}
          </div>
        </div>

        <div className="checklist-card">
          <div className="checklist-card-header">
            <h4>Lacunas & perguntas</h4>
          </div>
          <div className="checklist-card-body">
            <div className="checklist-inline-section">
              <span className="checklist-inline-title">Lacunas</span>
              {data.lacunas_de_informacao?.length ? (
                data.lacunas_de_informacao.map((gap, idx) => (
                  <div key={`${gap.item}-${idx}`} className="checklist-inline-item">
                    <span>{formatText(gap.item)}</span>
                    <span className="checklist-muted">{formatText(gap.por_que_importa)}</span>
                  </div>
                ))
              ) : (
                <span className="checklist-muted">Sem lacunas destacadas.</span>
              )}
            </div>
            <div className="checklist-inline-section">
              <span className="checklist-inline-title">Perguntas sugeridas</span>
              {data.perguntas_que_o_radiologista_pode_fazer?.length ? (
                <ul className="checklist-list">
                  {data.perguntas_que_o_radiologista_pode_fazer.map((question, idx) => (
                    <li key={`${question}-${idx}`}>{question}</li>
                  ))}
                </ul>
              ) : (
                <span className="checklist-muted">Nenhuma pergunta adicionada.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="checklist-summary-card">
        <div className="checklist-card-header">
          <h4>
            <ClipboardList size={16} /> Resumo final (Conclusão)
          </h4>
        </div>
        <div className="checklist-summary-grid">
          <div className="checklist-summary-row">
            <span>Diagnóstico principal</span>
            <strong className={isNotInformed(summary.diagnostico_principal) ? 'checklist-muted' : ''}>
              {formatText(summary.diagnostico_principal)}
            </strong>
          </div>
          <div className="checklist-summary-row">
            <span>Classificação/Estádio</span>
            <strong className={isNotInformed(summary.classificacao_ou_estadio) ? 'checklist-muted' : ''}>
              {formatText(summary.classificacao_ou_estadio)}
            </strong>
          </div>
          <div className="checklist-summary-row">
            <span>Marcadores-chave</span>
            <strong className={isNotInformed(summary.marcadores_chave?.join(' ')) ? 'checklist-muted' : ''}>
              {formatList(summary.marcadores_chave).join(' · ')}
            </strong>
          </div>
          <div className="checklist-summary-row">
            <span>Margens críticas</span>
            <strong className={isNotInformed(summary.margens_criticas?.join(' ')) ? 'checklist-muted' : ''}>
              {formatList(summary.margens_criticas).join(' · ')}
            </strong>
          </div>
          <div className="checklist-summary-row">
            <span>Linfonodos</span>
            <strong className={isNotInformed(summary.linfonodos?.join(' ')) ? 'checklist-muted' : ''}>
              {formatList(summary.linfonodos).join(' · ')}
            </strong>
          </div>
          <div className="checklist-summary-row">
            <span>Doença à distância</span>
            <strong className={isNotInformed(summary.doenca_a_distancia?.join(' ')) ? 'checklist-muted' : ''}>
              {formatList(summary.doenca_a_distancia).join(' · ')}
            </strong>
          </div>
          <div className="checklist-summary-row">
            <span>Complicações</span>
            <strong className={isNotInformed(summary.complicacoes?.join(' ')) ? 'checklist-muted' : ''}>
              {formatList(summary.complicacoes).join(' · ')}
            </strong>
          </div>
          <div className="checklist-summary-row">
            <span>Limitações</span>
            <strong className={isNotInformed(summary.limitacoes?.join(' ')) ? 'checklist-muted' : ''}>
              {formatList(summary.limitacoes).join(' · ')}
            </strong>
          </div>
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.secao} className="checklist-section">
          <div className="checklist-section-header">
            <h4>{section.secao}</h4>
            <span className="checklist-section-count">{section.itens.length} itens</span>
          </div>
          <div className="checklist-items">
            {section.itens.map((item, idx) => (
              <article key={`${section.secao}-${item.id || item.rotulo}-${idx}`} className="checklist-item">
                <div className="checklist-item-header">
                  <h5>{formatText(item.rotulo, 'Item sem rótulo')}</h5>
                  <div className="checklist-item-tags">
                    <span className={`checklist-tag checklist-tag--${item.prioridade}`}>{item.prioridade}</span>
                    <span className="checklist-tag">{item.tipo_campo}</span>
                    {item.obrigatorio && <span className="checklist-tag checklist-tag--required">Obrigatório</span>}
                    {item.unidade && <span className="checklist-tag">Unidade: {item.unidade}</span>}
                  </div>
                </div>
                <div className="checklist-item-grid">
                  <div className="checklist-item-block">
                    <span>Como avaliar</span>
                    <p>{formatText(item.como_avaliar)}</p>
                  </div>
                  <div className="checklist-item-block">
                    <span>Como reportar</span>
                    <p>{formatText(item.como_reportar_no_laudo)}</p>
                  </div>
                </div>
                <div className="checklist-item-meta">
                  <div>
                    <span>Evidência mínima</span>
                    <p>{formatText(item.evidencia_minima)}</p>
                  </div>
                  <div>
                    <span>Quando aplicar</span>
                    <p>{formatText(item.quando_aplicar)}</p>
                  </div>
                </div>
                {item.thresholds_ou_definicoes?.length ? (
                  <div className="checklist-item-list">
                    <span>Thresholds/definições</span>
                    <ul>
                      {item.thresholds_ou_definicoes.map((threshold, idx) => (
                        <li key={`${item.id}-threshold-${idx}`}>{threshold}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {item.armadilhas?.length ? (
                  <div className="checklist-item-list">
                    <span>Armadilhas</span>
                    <ul>
                      {item.armadilhas.map((pitfall, idx) => (
                        <li key={`${item.id}-pitfall-${idx}`}>{pitfall}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="checklist-alerts">
        <div className="checklist-card-header">
          <h4>
            <ShieldAlert size={16} /> Pontos de atenção
          </h4>
        </div>
        <ul className="checklist-alert-list">
          {data.pitfalls_rapidos?.length ? (
            data.pitfalls_rapidos.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))
          ) : (
            <li className="checklist-muted">Sem pitfalls específicos.</li>
          )}
        </ul>
      </div>

      <div className="checklist-card">
        <div className="checklist-card-header">
          <h4>
            <BookOpen size={16} /> Referências
          </h4>
        </div>
        <div className="checklist-card-body">
          {data.referencias?.length ? (
            <ul className="checklist-list">
              {data.referencias.map((ref, idx) => (
                <li key={`${ref.fonte}-${idx}`}>
                  {formatText(ref.fonte)} · {formatText(ref.ano)} · {formatText(ref.nota)}
                </li>
              ))}
            </ul>
          ) : (
            <span className="checklist-muted">Referências não informadas.</span>
          )}
        </div>
      </div>

      {data.markdown_para_ui ? (
        <details className="checklist-markdown">
          <summary>Versão pronta para copiar</summary>
          <MarkdownRenderer content={data.markdown_para_ui} variant="clinical" />
        </details>
      ) : null}
    </div>
  );
};
