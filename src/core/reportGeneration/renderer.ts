import { generateOpenAIResponse } from '../../adapters/openai/client';
import { OPENAI_MODELS } from '../openai';
import type { ReportJSON } from '../../types/report-json';
import { buildComparisonFallback, isEnteroTCFromText } from './report-utils';

const BASE_RENDER_RULES = [
  'Voce e o Renderer do laudo. Converta o ReportJSON em texto final em Markdown.',
  'Regras obrigatorias:',
  '- Saida apenas do laudo, sem meta-texto.',
  '- Usar linha "---" isolada antes e depois de cada titulo de secao principal.',
  '- Titulos em CAIXA ALTA e NEGRITO (ex: **INDICAÇÃO CLÍNICA**).',
  '- O titulo do exame (conteudo da secao **TÍTULO DO EXAME**) deve estar em CAIXA ALTA.',
  '- Secoes: TÍTULO DO EXAME, INDICAÇÃO CLÍNICA, TÉCNICA E PROTOCOLO, COMPARAÇÃO, ACHADOS, IMPRESSÃO.',
  '- Para ACHADOS: usar "ACHADOS TOMOGRÁFICOS" se CT, "ACHADOS ULTRASSONOGRÁFICOS" se US, "ACHADOS POR RESSONÂNCIA MAGNÉTICA" se MR.',
  '- Em ACHADOS e IMPRESSAO: itens com "►" devem iniciar em nova linha, formar paragrafo proprio, e ter uma linha em branco entre itens.',
  '- O nome do orgao/subtitulo deve estar em linha exclusiva (em negrito) e seguido de uma linha em branco antes do primeiro "►".',
  '- O marcador "►" NUNCA pode estar na mesma linha do orgao ou subtitulo.',
  '- Subitens: usar "    ▪ " (4 espacos). Manter linha em branco entre subitens.',
  '- Nao usar "►" na secao TECNICA E PROTOCOLO.',
  '- Use <VERIFICAR> APENAS quando o dado realmente precisa de verificacao (campo vazio, dado incerto, ou informacao nao disponivel). NAO use em achados normais e completos.',
  '- Proibido usar listas automaticas (-, *, •).',
  '- IMPORTANTE: Ignorar campos "consult_assist" e "library_ingestion_candidates" - esses NÃO entram no laudo.',
].join('\n');

const RENDER_TEXT_FIXES: Array<[RegExp, string]> = [
  [/conforessonância magnéticae/gi, 'conforme'],
  [/foressonância magnéticaa/gi, 'forma'],
  [/noressonância magnéticaais/gi, 'normais'],
  [/alaressonância magnéticae/gi, 'alarme'],
  [/veressonância magnéticaiforessonância magnéticae/gi, 'vermiforme'],
  [/deforessonância magnéticaidade/gi, 'deformidade'],
];

function buildRendererPrompt(report: ReportJSON, feedback?: string): string {
  const payload = {
    report,
    feedback: feedback || null,
  };

  return [
    BASE_RENDER_RULES,
    '',
    'Dados do caso (JSON):',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

export async function renderReportMarkdown(report: ReportJSON, feedback?: string): Promise<string> {
  const prompt = buildRendererPrompt(report, feedback);

  try {
    const response = await generateOpenAIResponse({
      model: OPENAI_MODELS.renderer,
      input: prompt,
      temperature: 0,
      maxOutputTokens: 3000,
    });

    let output = (response.text || '').trim();
    for (const [pattern, replacement] of RENDER_TEXT_FIXES) {
      output = output.replace(pattern, replacement);
    }

    output = uppercaseExamTitleSection(output);
    output = replaceComparisonSection(output, report);
    output = replaceFindingsSection(output, report);
    output = replaceImpressionSection(output, report);
    output = normalizeSectionHeadings(output);

    // Append REFERÊNCIAS section if evidence recommendations have references
    output = appendReferencesSection(output, report);

    return output;
  } catch (error) {
    console.warn('[Renderer] OpenAI unavailable, usando render determinístico.');
    const fallback = renderFallbackMarkdown(report);
    return appendReferencesSection(fallback, report);
  }
}

function renderFallbackMarkdown(report: ReportJSON): string {
  const title = buildExamTitle(report);
  const indication = buildIndicationBlock(report);
  const technique = buildTechniqueBlock(report);
  const comparison = buildComparisonSection(report);
  const findings = buildFindingsSection(report);
  const impression = buildImpressionSection(report);

  return [
    '---',
    '',
    '**TÍTULO DO EXAME**',
    '',
    '---',
    '',
    title,
    '',
    '---',
    '',
    '**INDICAÇÃO CLÍNICA**',
    '',
    '---',
    '',
    indication,
    '',
    '---',
    '',
    '**TÉCNICA E PROTOCOLO**',
    '',
    '---',
    '',
    technique,
    '',
    comparison,
    '',
    findings,
    '',
    impression,
  ].join('\n').trim();
}

function buildExamTitle(report: ReportJSON): string {
  const raw = (report.exam_title || '').trim();
  if (raw) return raw.toUpperCase();

  const modality = report.modality?.toUpperCase() || 'UNKNOWN';
  if (modality === 'CT') return 'TOMOGRAFIA COMPUTADORIZADA';
  if (modality === 'MR') return 'RESSONÂNCIA MAGNÉTICA';
  if (modality === 'US') return 'ULTRASSONOGRAFIA';
  return 'EXAME NÃO INFORMADO';
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '<VERIFICAR>.';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function buildIndicationBlock(report: ReportJSON): string {
  const indication = report.indication || {
    clinical_history: '<VERIFICAR>.',
    exam_reason: '<VERIFICAR>.',
    patient_age_group: '<VERIFICAR>.',
    patient_sex: 'O',
  };

  return [
    `História clínica: ${ensurePeriod(indication.clinical_history)}`,
    '',
    `Motivo do exame: ${ensurePeriod(indication.exam_reason)}`,
    '',
    `Faixa etária: ${ensurePeriod(indication.patient_age_group)}`,
    '',
    `Sexo: ${indication.patient_sex || 'O'}.`,
  ].join('\n');
}

function buildTechniqueBlock(report: ReportJSON): string {
  const tech = report.technique || {
    equipment: '<VERIFICAR>.',
    protocol: '<VERIFICAR>.',
    contrast: { used: false },
  };
  const lines = [
    ensurePeriod(tech.equipment),
    '',
    ensurePeriod(tech.protocol),
  ];
  if (tech.contrast?.used) {
    const type = tech.contrast.type ? ` (${tech.contrast.type})` : '';
    lines.push('', `Contraste: utilizado${type}.`);
  } else {
    lines.push('', 'Contraste: não utilizado.');
  }
  return lines.join('\n');
}

function buildFindingsSection(report: ReportJSON): string {
  const modality = report.modality?.toUpperCase() || 'UNKNOWN';
  const sectionTitle = modality === 'CT'
    ? 'ACHADOS TOMOGRÁFICOS'
    : modality === 'MR'
      ? 'ACHADOS POR RESSONÂNCIA MAGNÉTICA'
      : modality === 'US'
        ? 'ACHADOS ULTRASSONOGRÁFICOS'
        : 'ACHADOS';

  const findings = Array.isArray(report.findings) ? report.findings : [];
  const grouped = new Map<string, string[]>();

  for (const finding of findings) {
    const organ = (finding?.organ || 'ACHADOS').toUpperCase();
    const description = ensurePeriod(finding?.description || '<VERIFICAR>');
    const list = grouped.get(organ) || [];
    list.push(`► ${description}`);
    grouped.set(organ, list);
  }

  const body: string[] = [];
  if (grouped.size === 0) {
    body.push('► Achados não descritos (<VERIFICAR>).');
  } else {
    for (const [organ, items] of grouped.entries()) {
      body.push(`**${organ}**`, '');
      body.push(...items, '');
    }
  }

  return [
    '---',
    '',
    `**${sectionTitle}**`,
    '',
    '---',
    '',
    body.join('\n').trim(),
  ].join('\n');
}

function replaceFindingsSection(markdown: string, report: ReportJSON): string {
  if (!isEnteroTCReport(report)) {
    return markdown;
  }
  const section = buildEnteroFindingsSection(report);
  const pattern = /---\s*\n\s*\*\*ACHADOS[^*]*\*\*\s*\n\s*---\s*\n([\s\S]*?)(?=\n---\s*\n\*\*|$)/i;
  if (pattern.test(markdown)) {
    return markdown.replace(pattern, `${section}\n`);
  }
  return `${markdown.trim()}\n\n${section}\n`;
}

function isEnteroTCReport(report: ReportJSON): boolean {
  if (report.flags?.enterography) return true;
  return isEnteroTCFromText(report.exam_title, report.indication?.exam_reason);
}

function uppercaseExamTitleSection(markdown: string): string {
  const pattern = /---\s*\n\s*\*\*(?:TITULO DO EXAME|TÍTULO DO EXAME)\*\*\s*\n\s*---\s*\n([\s\S]*?)(?=\n---\s*\n\*\*|$)/i;
  const match = markdown.match(pattern);
  if (!match) return markdown;
  const original = match[1];
  const uppercased = original
    .split('\n')
    .map((line) => line.toUpperCase())
    .map((line) => line.replace(/ENTERO[-\s]?TOMOGRAFIA/g, 'ENTEROTOMOGRAFIA'))
    .join('\n');
  return markdown.replace(pattern, `---\n**TÍTULO DO EXAME**\n---\n${uppercased}`);
}

function normalizeSectionHeadings(markdown: string): string {
  const sections: Array<{ label: string; variants: string[] }> = [
    { label: 'TÍTULO DO EXAME', variants: ['TITULO DO EXAME', 'TÍTULO DO EXAME'] },
    { label: 'INDICAÇÃO CLÍNICA', variants: ['INDICACAO CLINICA', 'INDICAÇÃO CLÍNICA'] },
    { label: 'TÉCNICA E PROTOCOLO', variants: ['TECNICA E PROTOCOLO', 'TÉCNICA E PROTOCOLO'] },
    { label: 'COMPARAÇÃO', variants: ['COMPARACAO', 'COMPARAÇÃO'] },
    { label: 'IMPRESSÃO', variants: ['IMPRESSAO', 'IMPRESSÃO'] },
    { label: 'ACHADOS TOMOGRÁFICOS', variants: ['ACHADOS TOMOGRAFICOS', 'ACHADOS TOMOGRÁFICOS'] },
    { label: 'ACHADOS ULTRASSONOGRÁFICOS', variants: ['ACHADOS ULTRASSONOGRAFICOS', 'ACHADOS ULTRASSONOGRÁFICOS'] },
    { label: 'ACHADOS POR RESSONÂNCIA MAGNÉTICA', variants: ['ACHADOS POR RESSONANCIA MAGNETICA', 'ACHADOS POR RESSONÂNCIA MAGNÉTICA'] },
  ];

  let output = markdown;
  for (const section of sections) {
    const variantsPattern = section.variants.map(escapeRegExp).join('|');
    const headingPattern = new RegExp(`^\\s*\\*\\*(?:${variantsPattern})\\*\\*\\s*$`, 'gmi');
    output = output.replace(headingPattern, `**${section.label}**`);

    const blockPattern = new RegExp(
      `(^|\\n)(?:---\\s*\\n)?\\s*\\*\\*${escapeRegExp(section.label)}\\*\\*\\s*\\n(?:---\\s*\\n)?`,
      'g'
    );
    output = output.replace(blockPattern, (match, leading) => `${leading}---\n**${section.label}**\n---\n`);
  }
  return output;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function normalizeItems(items: string[] | undefined, fallback?: string): string[] {
  const cleaned = (items || []).map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0 && fallback) {
    return [fallback];
  }
  return cleaned;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/[\n]+|[.!?]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sanitizeFindingSentence(sentence: string): string {
  let cleaned = sentence.trim();
  if (!cleaned) return cleaned;
  cleaned = cleaned.replace(/\s+/g, ' ');
  if (!/[.!?]$/.test(cleaned)) {
    cleaned = `${cleaned}.`;
  }
  return cleaned;
}

function hasMeasurement(sentence: string): boolean {
  return /\d+(?:[.,]\d+)?\s*(mm|cm)\b/i.test(sentence);
}

function needsEssentialMeasurement(sentence: string): boolean {
  return /(espessamento|estenose|colec[aã]o|abscesso|dilatac|cisto|n[óo]dulo|les[aã]o)\b/i.test(sentence);
}

function applyMissingMeasurement(sentence: string): string {
  if (needsEssentialMeasurement(sentence) && !hasMeasurement(sentence)) {
    return sentence.replace(/\.*$/, '').trim() + ' <VERIFICAR MEDIDA(S) AUSENTE(S)>.';
  }
  return sentence;
}

function filterRecommendationSentence(sentence: string): boolean {
  return /(recomend|acompanha|considerar)\w*/i.test(sentence);
}

type RegionConfig = {
  key: string;
  title: string;
  keywords: RegExp[];
  defaults: string[];
};

function collectRegionSentences(sentences: string[], keywords: RegExp[]): string[] {
  const results: string[] = [];
  for (const sentence of sentences) {
    if (filterRecommendationSentence(sentence)) continue;
    if (keywords.some((re) => re.test(sentence))) {
      results.push(applyMissingMeasurement(sanitizeFindingSentence(sentence)));
    }
  }
  return Array.from(new Set(results));
}

function extractImageKeyMap(sentences: string[], regionConfigs: RegionConfig[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const keyPattern = /imagem chave\s*(\d+)/i;
  for (const sentence of sentences) {
    const match = sentence.match(keyPattern);
    if (!match) continue;
    const fig = match[1];
    const region = regionConfigs.find((config) => config.keywords.some((re) => re.test(sentence)));
    const key = region?.key || '__unmatched__';
    const existing = map.get(key) || [];
    if (!existing.includes(fig)) {
      existing.push(fig);
      map.set(key, existing);
    }
  }
  return map;
}

function appendBullets(lines: string[], bullets: string[], figNumbers?: string[]): void {
  if (bullets.length === 0) {
    return;
  }
  const appliedFig = figNumbers && figNumbers.length > 0 ? ` (Fig. ${figNumbers.join(', ')})` : '';
  bullets.forEach((bullet, index) => {
    let line = bullet;
    if (index === 0 && appliedFig && !line.includes('Fig.')) {
      line = line.replace(/\.*$/, '').trim() + appliedFig + '.';
    }
    lines.push(`► ${line}`);
    lines.push('');
  });
}

function buildEnteroFindingsSection(report: ReportJSON): string {
  const findingsText = report.findings
    .map((finding) => `${finding.organ}: ${finding.description}`)
    .join('\n');
  const sentences = splitSentences(findingsText);

  const regions: RegionConfig[] = [
    {
      key: 'prep',
      title: 'Avaliação da Qualidade do Preparo',
      keywords: [/distens[aã]o|preparo|adequada|sub[óo]tima|inadequada/i],
      defaults: [
        'A distensão das alças de intestino delgado foi considerada adequada, não limitando a análise detalhada da parede intestinal.',
      ],
    },
    {
      key: 'stomach',
      title: 'Estômago e Duodeno',
      keywords: [/est[oô]mago|duoden/i],
      defaults: [
        'Aspecto normal das porções visualizadas, sem espessamentos parietais ou lesões focais significativas.',
      ],
    },
    {
      key: 'jejunum',
      title: 'Jejuno',
      keywords: [/jejuno|jejunal/i],
      defaults: [
        'Alças jejunais com pregueado mucoso de aspecto e espessura normais.',
        'Parede de espessura preservada (geralmente < 3 mm), sem sinais de espessamento ou realce anômalo.',
      ],
    },
    {
      key: 'ileum',
      title: 'Íleo (proximal, médio e distal)',
      keywords: [/íleo(?!\s*terminal)|ileo(?!\s*terminal)|al[cç]as ileais/i],
      defaults: [
        'Alças ileais com padrão de pregas mucosas preservado.',
        'Parede de espessura normal, sem achados inflamatórios ou lesões focais.',
      ],
    },
    {
      key: 'terminal_ileum',
      title: 'Íleo Terminal',
      keywords: [/íleo terminal|ileo terminal/i],
      defaults: [
        'Segmento de aspecto normal, com calibre preservado e paredes finas, sem realce anômalo.',
      ],
    },
    {
      key: 'colon',
      title: 'Cólon (segmentos visualizados) e Apêndice Cecal',
      keywords: [/c[oó]lon|ceco|ap[eê]ndice|cecal/i],
      defaults: [
        'Ceco, cólon ascendente e demais segmentos cólicos incluídos no campo de visão com haustrações e espessura parietal normais.',
        'Apêndice cecal, se visualizado, de morfologia e dimensões normais.',
      ],
    },
    {
      key: 'inflammatory',
      title: 'Sinais de Atividade Inflamatória',
      keywords: [/espessamento parietal|hiper[- ]?realce|realce estratificado|sinal do alvo|vasa recta|sinal do pente|gordura mesenter/i],
      defaults: [
        'Sem sinais tomográficos de atividade inflamatória significativa no intestino delgado ou cólon.',
      ],
    },
    {
      key: 'chronic',
      title: 'Sinais de Cronicidade e Complicações',
      keywords: [/estenose|estreitamento|fistul|abscesso|colec[aã]o|perfura|pneumoperitoneo|obstru/i],
      defaults: [
        'Sem sinais de estenoses, fístulas, abscessos ou outras complicações evidentes.',
      ],
    },
  ];

  const imageKeyMap = extractImageKeyMap(sentences, regions);

  const lines: string[] = [
    '---',
    '',
    '**ACHADOS TOMOGRÁFICOS**',
    '',
    '---',
    '',
  ];

  regions.forEach((region) => {
    const regionSentences = collectRegionSentences(sentences, region.keywords);
    const bullets = regionSentences.length > 0 ? regionSentences : region.defaults;
    lines.push(`**${region.title}**`, '');
    appendBullets(lines, bullets, imageKeyMap.get(region.key));
  });

  lines.push('**Avaliação Extraintestinal**', '');

  const extraRegions: RegionConfig[] = [
    {
      key: 'liver',
      title: 'Fígado e Vias Biliares',
      keywords: [/f[íi]gado|vias biliares|col[eê]doco/i],
      defaults: [
        'Fígado de dimensões e atenuação normais. Vias biliares de calibre normal.',
      ],
    },
    {
      key: 'gallbladder_pancreas',
      title: 'Vesícula Biliar e Pâncreas',
      keywords: [/ves[íi]cula biliar|p[âa]ncreas/i],
      defaults: [
        'Morfologia e atenuação normais.',
      ],
    },
    {
      key: 'spleen',
      title: 'Baço',
      keywords: [/ba[çc]o/i],
      defaults: [
        'Dimensões e atenuação normais.',
      ],
    },
    {
      key: 'kidneys',
      title: 'Rins e Vias Urinárias',
      keywords: [/rim|renal|pelvicalic|pielocalic|ureter/i],
      defaults: [
        'Tópicos, de dimensões e morfologia preservadas, sem lesões focais ou dilatação do sistema pielocalicinal.',
      ],
    },
    {
      key: 'adrenals',
      title: 'Adrenais',
      keywords: [/adrenal/i],
      defaults: [
        'Morfologia e dimensões normais.',
      ],
    },
    {
      key: 'nodes_vessels',
      title: 'Linfonodos e Vasos Mesentéricos',
      keywords: [/linfonod|linfaden|vasos mesent[ée]ricos|mesent[ée]rio/i],
      defaults: [
        'Linfonodos de dimensões normais. Vasos mesentéricos pérvios.',
      ],
    },
    {
      key: 'abdominal_wall',
      title: 'Parede Abdominal, Estruturas Ósseas e Bases Pulmonares',
      keywords: [/parede abdominal|osso|coluna|base pulmonar|pleura|diafragma/i],
      defaults: [
        'Sem alterações significativas.',
      ],
    },
  ];

  extraRegions.forEach((region) => {
    const regionSentences = collectRegionSentences(sentences, region.keywords);
    const bullets = regionSentences.length > 0 ? regionSentences : region.defaults;
    lines.push(`**${region.title}**`, '');
    appendBullets(lines, bullets, imageKeyMap.get(region.key));
  });

  return lines.join('\n').trim();
}

function appendBulletBlock(lines: string[], items: string[]): void {
  for (const item of items) {
    if (!item) continue;
    lines.push(`► ${item}`);
    lines.push('');
  }
}

function buildImpressionSection(report: ReportJSON): string {
  const impression = report.impression || { primary_diagnosis: '<VERIFICAR>.' };
  const lines: string[] = [
    '---',
    '',
    '**IMPRESSÃO**',
    '',
    '---',
    '',
  ];

  const criteriaItems = normalizeItems(impression.criteria_assessment);
  if (criteriaItems.length > 0) {
    appendBulletBlock(lines, criteriaItems);
  }

  lines.push('**Diagnóstico principal:**', '');
  appendBulletBlock(
    lines,
    normalizeItems([impression.primary_diagnosis || ''], '<VERIFICAR>.')
  );

  lines.push('**Diagnósticos diferenciais:**', '');
  appendBulletBlock(
    lines,
    normalizeItems(impression.differentials, 'Nenhum relevante a acrescentar.')
  );

  lines.push('**Relação com a indicação clínica:**', '');
  appendBulletBlock(
    lines,
    normalizeItems(impression.indication_relation, 'Nenhuma correlação adicional a acrescentar.')
  );

  lines.push('**Recomendações:**', '');
  appendBulletBlock(
    lines,
    normalizeItems(
      impression.recommendations,
      'Não há recomendações específicas de seguimento por imagem com base nos achados deste exame.'
    )
  );

  lines.push('**Achados incidentais:**', '');
  appendBulletBlock(
    lines,
    normalizeItems(
      impression.incidental_findings,
      'Nenhum achado incidental clinicamente significativo identificado.'
    )
  );

  lines.push('**Eventos adversos:**', '');
  appendBulletBlock(
    lines,
    normalizeItems(
      impression.adverse_events,
      'Nenhum relatado durante o procedimento.'
    )
  );

  if (report.modality === 'CT' || report.modality === 'MR') {
    lines.push(...buildProbabilityNotes());
  }

  return lines.join('\n').trim();
}

function buildProbabilityNotes(): string[] {
  return [
    '---',
    '',
    '**NOTA SOBRE DESCRITORES DE PROBABILIDADE**',
    '',
    '---',
    '',
    'Esta nota visa esclarecer a terminologia utilizada na seção IMPRESSÃO para indicar o grau de certeza diagnóstica, baseada em léxico padronizado adaptado da literatura brasileira (ex: Silva, 2022). A intenção é reduzir ambiguidades e facilitar a interpretação clínica.',
    '',
    '• **Compatível com / Consistente com:** Usado quando os achados confirmam fortemente a hipótese (>90% de certeza).',
    '',
    '• **Sugestivo de / Suspeito para:** Indica que os achados favorecem a hipótese (probabilidade intermediária-alta, ~75%).',
    '',
    '• **Inespecífico / Indeterminado:** Achados não permitem direcionar o diagnóstico (~50% de probabilidade), geralmente requerendo correlação ou investigação adicional.',
    '',
    '• **Pouco sugestivo de / Pouco provável para:** Achados desfavorecem a hipótese (probabilidade intermediária-baixa, ~25%).',
    '',
    '• **Improvável para:** Usado quando os achados refutam fortemente a hipótese (<10% de certeza).',
    '',
    '---',
    '',
    '**■ NOTA DE ESCLARECIMENTO**',
    '',
    '---',
    '',
    'As conclusões deste laudo fundamentam-se nas imagens obtidas e nas informações clínicas disponibilizadas no momento do exame. Como todo método de diagnóstico, este exame pode levantar dúvidas ou exigir investigação adicional, não refletindo a totalidade da realidade clínica do paciente. Este laudo não substitui a avaliação médica presencial, tampouco isenta a necessidade de correlação com dados clínicos, laboratoriais e de outros exames. Em caso de dúvidas, recomendamos consulta direta ao radiologista responsável ou ao médico assistente.',
    '',
    '---',
  ];
}

function replaceImpressionSection(markdown: string, report: ReportJSON): string {
  const section = buildImpressionSection(report);
  // Match IMPRESSÃO section with proper regex escaping
  const pattern = /---\s*\n\s*\*\*IMPRESS[ÃA]O\*\*\s*\n\s*---\s*\n([\s\S]*?)(?=\n---\s*\n\*\*|$)/i;
  let replaced = markdown;

  if (pattern.test(markdown)) {
    replaced = markdown.replace(pattern, `${section}\n`);
  } else {
    replaced = `${markdown.trim()}\n\n${section}\n`;
  }

  const needsNotes = report.modality === 'CT' || report.modality === 'MR';
  if (!needsNotes) {
    return replaced;
  }

  // Remove any duplicate probability notes that may have been added by the LLM
  const notePattern = /\n---\s*\n\*\*NOTA SOBRE DESCRITORES DE PROBABILIDADE\*\*[\s\S]*?(?=\n---\s*\n\*\*REFERÊNCIAS\*\*|\n---\s*\n\*\*IMAGENS CHAVE\*\*|$)/gi;
  // Count occurrences
  const matches = replaced.match(notePattern);
  if (matches && matches.length > 1) {
    // Keep only the first occurrence
    let count = 0;
    replaced = replaced.replace(notePattern, (match) => {
      count++;
      return count === 1 ? match : '';
    });
  }

  return replaced;
}

function buildComparisonSection(report: ReportJSON): string {
  const summary = report.comparison?.summary?.trim();
  let body = summary;

  if (!body) {
    if (report.comparison?.available) {
      body = buildComparisonFallback(report.comparison?.date);
    } else {
      body = 'Não foram disponibilizados exames prévios para comparação.';
    }
  }

  return [
    '---',
    '',
    '**COMPARAÇÃO**',
    '',
    '---',
    '',
    body,
  ].join('\n').trim();
}

function replaceComparisonSection(markdown: string, report: ReportJSON): string {
  const section = buildComparisonSection(report);
  // Match COMPARAÇÃO section with proper regex escaping
  const pattern = /---\s*\n\s*\*\*COMPARA[CÇ][ÃA]O\*\*\s*\n\s*---\s*\n([\s\S]*?)(?=\n---\s*\n\*\*|$)/i;

  if (pattern.test(markdown)) {
    return markdown.replace(pattern, `${section}\n`);
  }

  const achadosPattern = /---\s*\n\s*\*\*ACHADOS\*\*/i;
  if (achadosPattern.test(markdown)) {
    return markdown.replace(achadosPattern, `${section}\n\n---\n\n**ACHADOS**`);
  }

  return `${markdown.trim()}\n\n${section}\n`;
}

/**
 * Appends REFERÊNCIAS section to the markdown output if references exist.
 * References come from the evidence-based recommendations system.
 */
function appendReferencesSection(markdown: string, report: ReportJSON): string {
  // Access references from the report (added by RecommendationsAgent)
  const references = (report as any).references;

  if (!references || !Array.isArray(references) || references.length === 0) {
    return markdown;
  }

  // Deduplicate by key
  const uniqueRefs = Array.from(
    new Map(references.map((r: any) => [r.key, r])).values()
  );

  if (uniqueRefs.length === 0) {
    return markdown;
  }

  // Build references section
  const refsSection = [
    '',
    '---',
    '',
    '**REFERÊNCIAS**',
    '',
  ];

  uniqueRefs.forEach((ref: any, index: number) => {
    refsSection.push(`${index + 1}. ${ref.citation}`);
    refsSection.push('');
  });

  return markdown + refsSection.join('\n');
}
