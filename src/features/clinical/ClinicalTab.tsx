
import React from 'react';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { ClinicalSummary } from '../../types';
import { Link2, FileText } from 'lucide-react';

interface Props {
  markdown: string;
  data?: ClinicalSummary;
  isProcessing: boolean;
}

type SummarySection = ClinicalSummary['resumo_clinico_consolidado']['texto_em_topicos'][number];

type ParsedItem = {
  raw: string;
  label: string;
  value: string;
  isDivergent: boolean;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const parseItem = (item: string): ParsedItem => {
  const isDivergent = /\[DIVERGENTE\]/i.test(item);
  const cleaned = item.replace(/\[DIVERGENTE\]/gi, '').trim();
  const parts = cleaned.split(':');
  if (parts.length > 1) {
    const label = parts.shift() ?? '';
    const value = parts.join(':').trim();
    return { raw: cleaned, label: label.trim(), value, isDivergent };
  }
  return { raw: cleaned, label: '', value: cleaned, isDivergent };
};

const findSection = (sections: SummarySection[], names: string[]) =>
  sections.find((section) =>
    names.some((name) => normalize(section.secao).includes(normalize(name)))
  );

const findItemValue = (items: ParsedItem[], labels: string[]) => {
  const match = items.find((item) => {
    const haystack = normalize(item.label || item.raw);
    return labels.some((label) => haystack.includes(normalize(label)));
  });

  if (!match) {
    return { value: '', isDivergent: false };
  }

  return {
    value: match.value || match.raw,
    isDivergent: match.isDivergent
  };
};

const formatValue = (value: string, fallback = 'Não informado') =>
  value && value.trim().length > 0 ? value : fallback;

const matchesAny = (item: ParsedItem, labels: string[]) => {
  const haystack = normalize(item.label || item.raw);
  return labels.some((label) => haystack.includes(normalize(label)));
};

const DivergenceChip: React.FC = () => (
  <span className="clinical-divergence-chip">Divergente</span>
);

const KeyValueRow: React.FC<{
  label?: string;
  value: string;
  isDivergent?: boolean;
}> = ({ label, value, isDivergent }) => (
  <div className="clinical-kv-row">
    {label ? <span className="clinical-kv-label">{label}</span> : null}
    <span className="clinical-kv-value">{value}</span>
    {isDivergent ? <DivergenceChip /> : null}
  </div>
);

const TextList: React.FC<{ items: ParsedItem[] }> = ({ items }) => (
  <div className="clinical-text-list">
    {items.map((item, idx) => (
      <div key={`${item.raw}-${idx}`} className="clinical-line">
        <span className="clinical-line-text">{item.raw}</span>
        {item.isDivergent ? <DivergenceChip /> : null}
      </div>
    ))}
  </div>
);

const ClinicalSummaryStructured: React.FC<{ data: ClinicalSummary }> = ({ data }) => {
  const sections = data.resumo_clinico_consolidado?.texto_em_topicos ?? [];
  const identificationSection = findSection(sections, ['identificação e contexto', 'identificacao e contexto', 'identificacao']);
  const executiveSection = findSection(sections, ['resumo executivo']);
  const questionSection = findSection(sections, ['pergunta clínica', 'pergunta clinica']);
  const surgerySection = findSection(sections, ['cirurgias e procedimentos', 'cirurgias']);
  const antecedentsSection = findSection(sections, ['antecedentes e comorbidades', 'antecedentes']);
  const medsSection = findSection(sections, ['medicações e condições', 'medicacoes e condicoes', 'medicações', 'medicacoes']);
  const safetySection = findSection(sections, ['alergias e segurança', 'alergias e seguranca', 'segurança', 'seguranca']);
  const labsSection = findSection(sections, ['laboratório relevante', 'laboratorio relevante', 'laboratório', 'laboratorio']);
  const previousSection = findSection(sections, ['exames prévios', 'exames previos', 'comparativos']);
  const operationalSection = findSection(sections, ['status operacional', 'procedimento']);
  const requestSection = findSection(sections, ['texto do pedido']);

  const usedSections = new Set(
    [
      identificationSection,
      executiveSection,
      questionSection,
      surgerySection,
      antecedentsSection,
      medsSection,
      safetySection,
      labsSection,
      previousSection,
      operationalSection,
      requestSection
    ].filter(Boolean)
  );

  const extraSections = sections.filter((section) => !usedSections.has(section));

  const identificationItems = (identificationSection?.itens ?? []).map(parseItem);
  const questionItems = (questionSection?.itens ?? []).map(parseItem);
  const safetyItems = (safetySection?.itens ?? []).map(parseItem);
  const operationalItems = (operationalSection?.itens ?? []).map(parseItem);

  const patientName = findItemValue(identificationItems, ['nome', 'paciente']);
  const patientId = findItemValue(identificationItems, ['id', 'prontuario', 'prontuário']);
  const ageSex = findItemValue(identificationItems, ['idade/sexo', 'idade', 'sexo']);
  const insurance = findItemValue(identificationItems, ['convenio', 'convênio']);
  const examType = findItemValue(identificationItems, ['tipo de exame', 'exame', 'modalidade']);
  const examDate = findItemValue(identificationItems, ['data/hora', 'data']);
  const examLocation = findItemValue(identificationItems, ['local', 'servico', 'serviço']);
  const examProtocol = findItemValue(identificationItems, ['protocolo']);
  const orderingPhysician = findItemValue(identificationItems, ['médico solicitante', 'medico solicitante', 'solicitante']);

  const clinicalQuestionRows = [
    { label: 'Dúvida principal', match: ['dúvida principal', 'duvida principal'] },
    { label: 'Indicação literal', match: ['indicação literal', 'indicacao literal'] },
    { label: 'Sintoma principal + tempo', match: ['sintoma principal'] }
  ].map(({ label, match }) => {
    const found = findItemValue(questionItems, match);
    return {
      label,
      value: formatValue(found.value),
      isDivergent: found.isDivergent
    };
  });

  const questionExtras = questionItems.filter(
    (item) =>
      !matchesAny(item, [
        'dúvida principal',
        'duvida principal',
        'indicação literal',
        'indicacao literal',
        'sintoma principal'
      ])
  );

  const examDataRows = [
    {
      label: 'Tipo de exame',
      value: formatValue(examType.value),
      isDivergent: examType.isDivergent
    },
    {
      label: 'Data/Hora',
      value: formatValue(examDate.value),
      isDivergent: examDate.isDivergent
    },
    {
      label: 'Local/Serviço',
      value: formatValue(examLocation.value),
      isDivergent: examLocation.isDivergent
    },
    {
      label: 'Protocolo',
      value: formatValue(examProtocol.value),
      isDivergent: examProtocol.isDivergent
    },
    {
      label: 'Médico solicitante',
      value: formatValue(orderingPhysician.value),
      isDivergent: orderingPhysician.isDivergent
    }
  ];

  const identificationExtras = identificationItems.filter(
    (item) =>
      !matchesAny(item, [
        'nome',
        'paciente',
        'id',
        'prontuario',
        'prontuário',
        'idade',
        'sexo',
        'convenio',
        'convênio',
        'tipo de exame',
        'modalidade',
        'data/hora',
        'data',
        'local',
        'servico',
        'serviço',
        'protocolo',
        'médico solicitante',
        'medico solicitante',
        'solicitante'
      ])
  );

  const contrastInfo = findItemValue([...safetyItems, ...operationalItems], ['contraste']);
  const renalInfo = findItemValue(safetyItems, ['função renal', 'funcao renal', 'creatinina', 'etfg', 'tfg']);
  const allergyInfo = findItemValue(safetyItems, ['alergia']);

  const safetyNotes = safetyItems.filter((item) => {
    const haystack = normalize(item.label || item.raw);
    return !['alergia', 'função renal', 'funcao renal', 'creatinina', 'etfg', 'tfg', 'contraste'].some((key) =>
      haystack.includes(normalize(key))
    );
  });

  return (
    <div className="clinical-summary">
      <div className="sr-organ-card clinical-card clinical-card--full clinical-hero">
        <div className="clinical-hero-title">
          <span className="clinical-patient-name">{formatValue(patientName.value)}</span>
          <span className="clinical-patient-demographics">{formatValue(ageSex.value)}</span>
          {patientName.isDivergent ? <DivergenceChip /> : null}
        </div>
        <div className="clinical-hero-sub">
          <span>
            ID/Prontuário: <b>{formatValue(patientId.value)}</b>
          </span>
          {patientId.isDivergent ? <DivergenceChip /> : null}
          <span>
            Convênio: <b>{formatValue(insurance.value)}</b>
          </span>
          {insurance.isDivergent ? <DivergenceChip /> : null}
        </div>
      </div>

      <div className="sr-organ-card clinical-card clinical-card--full clinical-card--highlight">
        <div className="clinical-card-header">
          <h4 className="clinical-card-title">Pergunta clínica</h4>
        </div>
        <div className="clinical-kv">
          {clinicalQuestionRows.map((row) => (
            <KeyValueRow key={row.label} label={row.label} value={row.value} isDivergent={row.isDivergent} />
          ))}
        </div>
        {questionExtras.length ? <TextList items={questionExtras} /> : null}
      </div>

      {executiveSection?.itens?.length ? (
        <div className="sr-organ-card clinical-card clinical-card--full clinical-card--summary">
          <div className="clinical-card-header">
            <h4 className="clinical-card-title">Resumo executivo</h4>
          </div>
          <div className="clinical-summary-text">
            {executiveSection.itens.map((item, idx) => (
              <p key={`${item}-${idx}`} className="clinical-summary-line">
                {item}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="clinical-grid">
        <div className="sr-organ-card clinical-card">
          <div className="clinical-card-header">
            <h4 className="clinical-card-title">Dados do exame</h4>
          </div>
          <div className="clinical-kv">
            {examDataRows.map((row) => (
              <KeyValueRow key={row.label} label={row.label} value={row.value} isDivergent={row.isDivergent} />
            ))}
          </div>
          {identificationExtras.length ? <TextList items={identificationExtras} /> : null}
        </div>

        <div className="sr-organ-card clinical-card">
          <div className="clinical-card-header">
            <h4 className="clinical-card-title">Alertas</h4>
          </div>
          <div className="clinical-badges">
            <span className="clinical-badge clinical-badge--danger">
              Alergias: <b>{formatValue(allergyInfo.value)}</b>
            </span>
            <span className="clinical-badge clinical-badge--success">
              Função renal: <b>{formatValue(renalInfo.value)}</b>
            </span>
            <span className="clinical-badge clinical-badge--info">
              Contraste: <b>{formatValue(contrastInfo.value)}</b>
            </span>
          </div>
          {safetyNotes.length ? <TextList items={safetyNotes} /> : null}
        </div>

        {surgerySection?.itens?.length ? (
          <div className="sr-organ-card clinical-card">
            <div className="clinical-card-header">
              <h4 className="clinical-card-title">Cirurgias e procedimentos prévios</h4>
            </div>
            <TextList items={surgerySection.itens.map(parseItem)} />
          </div>
        ) : null}

        {antecedentsSection?.itens?.length ? (
          <div className="sr-organ-card clinical-card">
            <div className="clinical-card-header">
              <h4 className="clinical-card-title">Antecedentes e comorbidades</h4>
            </div>
            <TextList items={antecedentsSection.itens.map(parseItem)} />
          </div>
        ) : null}

        {medsSection?.itens?.length ? (
          <div className="sr-organ-card clinical-card">
            <div className="clinical-card-header">
              <h4 className="clinical-card-title">Medicações e condições</h4>
            </div>
            <TextList items={medsSection.itens.map(parseItem)} />
          </div>
        ) : null}

        {labsSection?.itens?.length ? (
          <div className="sr-organ-card clinical-card">
            <div className="clinical-card-header">
              <h4 className="clinical-card-title">Laboratório relevante</h4>
            </div>
            <TextList items={labsSection.itens.map(parseItem)} />
          </div>
        ) : null}

        {previousSection?.itens?.length ? (
          <div className="sr-organ-card clinical-card">
            <div className="clinical-card-header">
              <h4 className="clinical-card-title">Exames prévios e comparativos</h4>
            </div>
            <TextList items={previousSection.itens.map(parseItem)} />
          </div>
        ) : null}

        {operationalSection?.itens?.length ? (
          <div className="sr-organ-card clinical-card">
            <div className="clinical-card-header">
              <h4 className="clinical-card-title">Status operacional</h4>
            </div>
            <TextList items={operationalSection.itens.map(parseItem)} />
          </div>
        ) : null}

        {requestSection?.itens?.length ? (
          <div className="sr-organ-card clinical-card clinical-card--full">
            <div className="clinical-card-header">
              <h4 className="clinical-card-title">Texto do pedido (legível)</h4>
            </div>
            <div className="clinical-request-text">
              {requestSection.itens.map((item, idx) => (
                <p key={`${item}-${idx}`} className="clinical-request-line">
                  {item}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {extraSections.map((section) => (
          <div key={section.secao} className="sr-organ-card clinical-card">
            <div className="clinical-card-header">
              <h4 className="clinical-card-title">{section.secao}</h4>
            </div>
            <TextList items={section.itens.map(parseItem)} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ClinicalTab: React.FC<Props> = ({ markdown, data, isProcessing }) => {
  const hasStructured =
    data?.resumo_clinico_consolidado?.texto_em_topicos &&
    data.resumo_clinico_consolidado.texto_em_topicos.length > 0;

  return (
    <div className="clinical-container animate-fade-in">
      {hasStructured ? (
        <ClinicalSummaryStructured data={data as ClinicalSummary} />
      ) : markdown ? (
        <MarkdownRenderer content={markdown} variant="clinical" />
      ) : (
        <div className="empty-state">
          {isProcessing
            ? 'Processando documentos e gerando resumo...'
            : 'Aguardando documentos assistenciais...'}
        </div>
      )}

      {/* Lista de Fontes (Evidências) */}
      {data && data.assistencial_docs && data.assistencial_docs.length > 0 && (
        <div className="sources-section">
          <h4 className="sources-title">
            <Link2 size={14} /> Fontes Analisadas ({data.assistencial_docs.length})
          </h4>

          <div className="sources-grid">
            {data.assistencial_docs.map((doc, idx) => (
              <div key={idx} className="source-card">
                <div className="source-header">
                  <h5 className="source-title">
                    <FileText size={12} className="mr-2" style={{ display: 'inline' }} />
                    {doc.titulo_sugerido || 'Documento sem título'}
                  </h5>
                  {doc.datas_encontradas && doc.datas_encontradas.length > 0 && (
                    <span className="source-date-badge">{doc.datas_encontradas[0]}</span>
                  )}
                </div>

                <p className="source-summary">{doc.mini_resumo}</p>

                <span className="source-origin" title={doc.source}>
                  Arquivo: {doc.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
