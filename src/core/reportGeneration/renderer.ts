import { generateOpenAIResponse } from '../../adapters/openai/client';
import { OPENAI_MODELS } from '../openai';
import type { ReportJSON } from '../../types/report-json';

const BASE_RENDER_RULES = [
  'Voce e o Renderer do laudo. Converta o ReportJSON em texto final em Markdown.',
  'Regras obrigatorias:',
  '- Saida apenas do laudo, sem meta-texto.',
  '- Usar linha "---" isolada antes e depois de cada titulo de secao principal.',
  '- Titulos em CAIXA ALTA e NEGRITO (ex: **INDICACAO CLINICA**).',
  '- Secoes: TITULO DO EXAME, INDICACAO CLINICA, TECNICA E PROTOCOLO, COMPARACAO (se disponivel), ACHADOS, IMPRESSAO.',
  '- Para ACHADOS: usar "ACHADOS TOMOGRAFICOS" se CT, "ACHADOS ULTRASSONOGRAFICOS" se US, "ACHADOS POR RESSONANCIA MAGNETICA" se MR.',
  '- Em ACHADOS e IMPRESSAO: itens com "►" devem iniciar em nova linha, formar paragrafo proprio, e ter uma linha em branco entre itens.',
  '- O nome do orgao/subtitulo deve estar em linha exclusiva (em negrito) e seguido de uma linha em branco antes do primeiro "►".',
  '- O marcador "►" NUNCA pode estar na mesma linha do orgao ou subtitulo.',
  '- Subitens: usar "    ▪ " (4 espacos). Manter linha em branco entre subitens.',
  '- Nao usar "►" na secao TECNICA E PROTOCOLO.',
  '- <VERIFICAR> sempre depois do ponto final.',
  '- Proibido usar listas automaticas (-, *, •).',
].join('\n');

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

  const response = await generateOpenAIResponse({
    model: OPENAI_MODELS.renderer,
    input: prompt,
    temperature: 0.2,
    maxOutputTokens: 3000,
  });

  return (response.text || '').trim();
}
