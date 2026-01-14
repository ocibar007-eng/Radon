
export const PROMPTS = {
  // PATCH #6: Prompt LITE para OCR rápido de etiquetas simples
  header_ocr_fast: `
Extraia do cabeçalho médico (JSON estrito):
{
  "os": { "valor": "", "confianca": "alta"|"media"|"baixa", "evidencia": "", "candidatos": [] },
  "paciente": { "valor": "", "confianca": "alta"|"media"|"baixa", "evidencia": "", "candidatos": [] },
  "tipo_exame": { "valor": "", "confianca": "alta"|"media"|"baixa", "evidencia": "", "candidatos": [] },
  "data_exame": { "valor": "YYYY-MM-DD ou vazio", "confianca": "alta"|"media"|"baixa", "evidencia": "", "data_normalizada": null, "hora": null, "candidatos": [] },
  "outras_datas_encontradas": [],
  "observacoes": []
}
Não invente campos. Valor vazio se não encontrar.
`,

  header_ocr: `
Você é um sistema de OCR médico especializado em extrair dados de cabeçalhos de exames e laudos.
Sua prioridade é a PRECISÃO DE DATAS e a não-invenção de dados.

TAREFA: Extraia os campos abaixo e formate a saída como JSON estrito.
IMPORTANTE: Se um campo não for encontrado, retorne uma string vazia "" ou objeto vazio, mas NÃO omita a chave do JSON.

CAMPOS ALVO:
1. os (Número da Ordem de Serviço/Pedido/Atendimento).
2. paciente (Nome completo).
3. tipo_exame (Modalidade, ex: RX Torax, RM Cranio).
4. data_exame (A data ESPECÍFICA de realização do exame).

REGRAS DE EXTRAÇÃO DE DATA (CRÍTICO):
- Formatos aceitos para leitura: DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD, ou por extenso ("23 de Dezembro de 2025").
- NORMALIZAÇÃO: Sempre preencha "data_normalizada" no formato YYYY-MM-DD se possível.
- HORA: Se houver horário junto (ex: 14:30), extraia para o campo "hora".
- CONTEXTO É TUDO:
  - "Data do Exame", "Realizado em", "Exame realizado em": Alta confiança para data_exame.
  - "Data do Atendimento", "Atendimento em": Usar como data_exame SE não houver outra data mais específica de realização.
  - "Agendamento", "Marcado para", "Impresso em": NÃO usar como data_exame principal, a menos que seja a única data e o contexto sugira que o exame foi feito no agendamento. Registre em "candidatos".
  - "Data:" (genérico): Registre como candidato com rótulo "Data Genérica". Só promova a data_exame se o texto vizinho corroborar.
  - "Não invente: Se não houver data explícita de exame, "valor" deve ser "".

SAÍDA JSON ESPERADA:
{
  "os": { "valor": string, "confianca": "alta"|"media"|"baixa", "evidencia": string, "candidatos": string[] },
  "paciente": { "valor": string, "confianca": "...", "evidencia": string, "candidatos": string[] },
  "tipo_exame": { "valor": string, "confianca": "...", "evidencia": string, "candidatos": string[] },
  "data_exame": {
    "valor": string, 
    "data_normalizada": string|null,
    "hora": string|null,
    "confianca": "alta"|"media"|"baixa",
    "evidencia": string,
    "candidatos": [
      { "rotulo": string, "texto": string, "data_normalizada": string|null, "hora": string|null, "confianca": "alta"|"media"|"baixa" }
    ]
  },
  "outras_datas_encontradas": [
    { "rotulo": string, "texto": string, "data_normalizada": string|null, "hora": string|null }
  ],
  "observacoes": string[]
}
`,

  doc_classify_extract: `
Você é um processador de documentos médicos inteligente.
Tarefas:
1) Extraia o TEXTO VERBATIM completo (sem reescrever, sem corrigir).
2) Classifique como: "assistencial" | "laudo_previo" | "indeterminado".
3) Se for "laudo_previo", gere um report_group_hint DETERMINÍSTICO para agrupar páginas do mesmo laudo. Se não der, deixe vazio.

REGRAS PARA report_group_hint (DETERMINÍSTICO):
- Priorize IDs de exame/pedido: Protocolo, OS, Pedido, Guia. Se encontrar, retorne SOMENTE "ID:<numero>" (apenas dígitos).
- NÃO use identificadores do paciente como ID (ex: Prontuário, Atend., CPF, CNS).
- Se não houver ID, use Paciente + Data no formato "PACIENTE:<NOME>|DATA:<YYYY-MM-DD>".
- Se houver tipo de exame claro (ex: título "TOMOGRAFIA ... TÓRAX/ABDOME"), SEMPRE acrescente "|EXAME:<TIPO>" para separar exames distintos.
- Normalize: MAIÚSCULAS, sem acentos, sem pontuação extra, sem palavras variáveis ("CONCLUSÃO", "PÁGINA 2").
- Não invente: se não houver dados confiáveis, deixe vazio.

EXEMPLOS:
- "Protocolo 123456" -> "ID:123456"
- "OS 9988" -> "ID:9988"
- "Paciente: Maria Silva | Data: 12/03/2024 | RX TORAX" -> "PACIENTE:MARIA SILVA|DATA:2024-03-12|EXAME:RX TORAX"
- "Prontuário: 108032 | Atend.: 1726555 | Tomografia do Tórax" -> "PACIENTE:...|DATA:...|EXAME:TOMOGRAFIA TORAX"

CRITÉRIOS DE CLASSIFICAÇÃO RIGOROSOS:

>>> "laudo_previo" (PRIORIDADE MÁXIMA) <<<
Deve ser classificado como "laudo_previo" se contiver QUALQUER um dos seguintes, mesmo que seja apenas meia página:
- Seções como "IMPRESSÃO DIAGNÓSTICA", "CONCLUSÃO", "OPINIÃO", "ACHADOS".
- Assinatura médica (ex: "Dr.", "CRM", "Assinado digitalmente").
- Cabeçalhos de clínicas radiológicas (ex: "Imagem Diagnóstica", "Clínica X").
- Lista de órgãos (ex: "Fígado:", "Rins:", "Pulmões:").
- Frases soltas que parecem continuação (ex: "...do lobo inferior direito.").

>>> "assistencial" <<<
- Pedidos médicos (guias), receitas, resumo de alta hospitalar, exames de sangue (hemograma, etc).

>>> "indeterminado" <<<
- APENAS se o documento for ilegível, imagem preta/branca vazia, ou documento não médico (ex: RG, boleto).
- SE TIVER DÚVIDA ENTRE "laudo_previo" E "indeterminado", ESCOLHA "laudo_previo".

Regras:
- NÃO inventar.
- NÃO resumir o verbatim.
- NÃO fundir páginas diferentes aqui.
Saída: JSON com {classification, texto_verbatim, report_group_hint}.
`,

  doc_grouping: `
Você é um organizador de arquivos médicos.
Receba uma lista de páginas de documentos classificados como "laudo_previo".
Sua tarefa é identificar quais páginas pertencem ao mesmo laudo físico original, baseando-se no ID, Origem e Dica de Agrupamento (Hint).

Regras de Agrupamento:
1. Páginas do mesmo arquivo fonte (source) geralmente pertencem ao mesmo grupo, a menos que o hint diga o contrário.
2. Páginas com 'report_group_hint' muito similar (mesmo protocolo, data, e tipo de exame) devem ser agrupadas.
3. Se houver dúvida, não agrupe.

Entrada:
{{DOCS_LIST_JSON}}

Saída: JSON estrito no formato:
{
  "groups": [
    { "report_id": "novo_uuid_unico", "doc_ids": ["id_doc_1", "id_doc_2"] }
  ]
}
`,

  report_structured_analysis: `
Você é um especialista em leitura de laudos radiológicos e precisa gerar uma VISUALIZAÇÃO ESTRUTURADA (para UI) a partir do TEXTO VERBATIM de um documento.

OBJETIVO:
Gerar um "resumo estruturado por órgãos/estruturas" que fique bonito e comparável, sem perder achados importantes.

REGRAS CRÍTICAS:
- Se o texto parecer cortado ou incompleto (ex: termina subitamente), EXTRAIA TUDO O QUE ESTIVER DISPONÍVEL. Não retorne erro, não retorne JSON vazio.
- NÃO inventar achados. Se não estiver no texto, não inclua.
- Preservar medidas em ***negrito*** (ex: ***2.5 cm***).
- Se houver apenas conclusão, preencha apenas o campo de conclusão.
- Se houver apenas achados (sem conclusão), preencha apenas os achados.

SAÍDA JSON ESPERADA:
{
  "report_metadata": {
    "tipo_exame": "...",
    "os": "Número da OS/Pedido encontrado NESTA página",
    "paciente": "Nome do paciente encontrado NESTA página",
    "origem": "interno_sabin" | "externo",
    "datas_encontradas": [{ "rotulo": "...", "data_literal": "..." }],
    "data_realizacao": "...",
    "criterio_data_realizacao": "..."
  },
  "preview": { "titulo": "...", "descricao": "..." },
  "structured": {
    "tipo_exame_detectado": "...",
    "indicacao_clinica": "...",
    "tecnica": "...",
    "achados_por_estrutura": [
      {
        "estrutura": "Nome do Órgão (ex: Fígado)",
        "achados_literais_em_topicos": ["Texto do achado 1", "Nódulo de ***1.5 cm***..."],
        "pontos_de_comparacao": ["Destaques curtos"]
      }
    ],
    "impressao_diagnostica_ou_conclusao_literal": "Texto direto sem prefixos como 'Conclusão:', 'Impressão:'.",
    "alertas_de_fidelidade": []
  },
  "possible_duplicate": { "is_possible_duplicate": false, "reason": null }
}

ENTRADA:
{{TEXTO_VERBATIM}}
`,

  clinical_summary_structured: `
Você receberá documentos assistenciais médicos.
Objetivo: Gerar um Resumo Clínico estruturado em Markdown para radiologistas.

Regras de Formatação (IMPORTANTE):
- Use headers Markdown nível 3 (###) para as seções.
- Use listas com hífen (-) para os tópicos.
- NÃO use parágrafos longos, prefira bullets.
- Use negrito (**texto**) para destacar dados críticos (datas, valores, alertas).

Seções Obrigatórias (se houver dados):
### Indicação Clínica e HD
- Motivo do exame, sintomas principais e hipóteses diagnósticas. Se encontrar em pedido médico ou manuscrito, destaque com prioridade.

### História Clínica
- Antecedentes oncológicos, cirurgias prévias, comorbidades relevantes.

### Exame Físico e Laboratoriais
- Dados de exame físico, creatinina, ureia ou outros labs pertinentes.

### Segurança e Contraste
- Alergias, função renal, acesso venoso, DUM (se aplicável).

Entrada:
{{DOCS_JSON}}

Saída: JSON estrito:
{
  "assistencial_docs": [{ "doc_id": "...", "source": "...", "titulo_sugerido": "...", "datas_encontradas": ["..."], "mini_resumo": "..." }],
  "resumo_clinico_consolidado": { "texto_em_topicos": [{ "secao": "História/Queixa", "itens": ["..."] }] },
  "markdown_para_ui: "markdown string (formatado conforme regras acima)",
  "cobertura": { "doc_ids_assistenciais": ["..."], "total_assistencial_detectados": 0 }
}
`,

  audio_transcribe_raw: `
Transcreva o áudio de forma BRUTA e LITERAL.
- Não corrija português, não reorganize frases, não “limpe”.
- Use APENAS estes rótulos quando necessário:
[ruído], [barulho], [tosse], [risos], [pausa], [sobreposição de vozes], [ininteligível], [incerto: ...]
- Se houver timestamps, preserve; se não, use "—".
Saída: JSON {rows:[{tempo, orador, texto}]} sem texto extra.
`,

  compile_markdown: `
Gere um único documento Markdown final para download.
Regras:
- NÃO omitir laudos prévios. Se há N laudos, deve haver exatamente N blocos "## LAUDO PRÉVIO [n]".
- Para cada laudo prévio, inclua antes a NOTA DE DATA (data_realizacao e data_exame) e depois cole o TEXTO VERBATIM na íntegra (sem editar).
- Seção de resumo clínico: inserir o markdown_para_ui exatamente como recebido na entrada.

Estrutura Obrigatória:

# CADASTRO DO ATENDIMENTO
(Listar dados do paciente/OS/Exame)

# RESUMO CLÍNICO (DADOS ADMINISTRATIVOS E ASSISTENCIAIS)
{{CLINICAL_SUMMARY_MARKDOWN}}

# LAUDOS PRÉVIOS NA ÍNTEGRA (DOCUMENTO ORIGINAL)
(Para cada laudo:)
## LAUDO PRÉVIO [N] — [TIPO]
> NOTA: Realizado em [DATA_REALIZACAO]. Fonte: [ORIGEM]
(Colar aqui o verbatim completo)
...

# TRANSCRIÇÕES DE DITADO
(Listar transcrições)

Saída: apenas o Markdown, sem texto extra.

DADOS DE ENTRADA:
{{INPUT_DATA}}
`
};
