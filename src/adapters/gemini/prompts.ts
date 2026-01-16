
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
Você é um processador de documentos médicos e administrativos inteligente.
Tarefas:
1) Extraia o TEXTO VERBATIM completo (sem reescrever, sem corrigir).
2) Classifique o documento em uma das 8 categorias abaixo.
3) Se for "laudo_previo", gere um report_group_hint DETERMINÍSTICO para agrupar páginas do mesmo laudo.

TIPOS DE DOCUMENTO (escolha 1):

>>> "laudo_previo" <<<
Laudo médico com ACHADOS DIAGNÓSTICOS e CONCLUSÃO.
Palavras-chave: "IMPRESSÃO DIAGNÓSTICA", "CONCLUSÃO", "OPINIÃO", "ACHADOS", "TÉCNICA"
Características: Assinatura médica, seções estruturadas, lista de órgãos, CRM
Exemplos: TC, RM, RX, USG, Endoscopia, Anatomopatológico

>>> "pedido_medico" <<<
Solicitação de exame (guia, ordem de serviço).
Palavras-chave: "PEDIDO", "SOLICITAÇÃO", "ORDEM DE SERVIÇO", "GUIA MÉDICA"
Características: Médico solicitante, justificativa clínica, CID, sem resultados
NÃO TEM: achados, conclusão (é ANTES do exame, não depois!)

>>> "termo_consentimento" <<<
Termo de autorização/esclarecimento para procedimento.
Palavras-chave: "TERMO", "CONSENTIMENTO", "AUTORIZO", "DECLARO", "ESCLARECIMENTO"
Características: Declarações do paciente, riscos, benefícios, assinatura do paciente
Comum: "Termo de uso de contraste", "Termo para sedação"

>>> "questionario" <<<
Formulário de triagem/anamnese pré-exame.
Palavras-chave: "QUESTIONÁRIO", "QUESTÕES", "PERGUNTAS", "TRIAGEM"
Características: Lista de perguntas/respostas, checkboxes, sintomas atuais
Exemplos: "Questionário pré-RM", "Anamnese pré-procedimento"

>>> "guia_autorizacao" <<<
Documento de convênio/plano de saúde.
Palavras-chave: "GUIA", "AUTORIZAÇÃO", "CONVÊNIO", "PLANO DE SAÚDE", "TUSS"
Características: Número de guia, carteirinha, código de procedimento, validade
NÃO CONFUNDIR com pedido médico!

>>> "assistencial" <<<
Outros documentos assistenciais gerais.
Exemplos: Receita, resumo de alta, exames laboratoriais, prontuário

>>> "administrativo" <<<
Documentos administrativos NÃO médicos.
Exemplos: Comprovante de agendamento, recibo, protocolo de entrega

>>> "indeterminado" <<<
APENAS se ilegível, imagem vazia/preta, ou documento completamente não médico (RG, boleto).
SE TIVER DÚVIDA entre tipos médicos, ESCOLHA o mais específico.

REGRAS PARA report_group_hint (se for laudo_previo):
- Priorize IDs de exame/pedido: Protocolo, OS, Pedido, Guia. Formato: "ID:<numero>"
- NÃO use  identificadores do paciente como ID (Prontuário, Atend., CPF, CNS).
- Se não houver ID, use: "PACIENTE:<NOME>|DATA:<YYYY-MM-DD>|EXAME:<TIPO>"
- Normalize: MAIÚSCULAS, sem acentos, sem pontuação extra.
- Se não houver dados confiáveis, deixe vazio.

EXEMPLOS de classificação:
- Página com "IMPRESSÃO DIAGNÓSTICA: Normal" + assinatura → "laudo_previo"
- "PEDIDO DE TOMOGRAFIA / Justificativa: dor torácica" → "pedido_medico"
- "TERMO DE CONSENTIMENTO PARA USO DE CONTRASTE / Declaro que..." → "termo_consentimento"
- "QUESTIONÁRIO PRÉ-EXAME / Sintomas atuais: [ ] Dor" → "questionario"
- "GUIA DE AUTORIZAÇÃO / Nº 12345 / Válido até 30/01" → "guia_autorizacao"

Saída: JSON com { "classification": "...", "texto_verbatim": "...", "report_group_hint": "..." }
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
Você é um especialista em leitura de laudos médicos. Extraia informações COMPLETAS e FIÉIS ao documento original.

OBJETIVO:
1. Transcrever o laudo de forma VERBATIM (texto exato, sem editar)
2. Extrair metadados estruturados
3. Identificar corretamente o LAUDADOR (quem assinou)

CAMPOS CRÍTICOS A EXTRAIR:

>>> LAUDADOR (QUEM ASSINOU) <<<
- Procure por assinatura MANUSCRITA ou DIGITAL no FINAL do documento
- Formato comum: "Dr(a). [Nome] - CRM [número]"
- NÃO CONFUNDA com "Responsável Técnico" ou "RT" do CABEÇALHO - isso NÃO é o laudador!
- Se houver assinatura mas nome ilegível: { "nome": "Ilegível", "crm": "..." }
- Se não houver assinatura identificável: { "nome": "Não identificado", "crm": null }
- Laudos provisórios ("sem valor legal") têm apenas código alfanumérico digital, não assinatura manuscrita

>>> SERVIÇO DE ORIGEM <<<
- Procure no LOGO/CABEÇALHO ou RODAPÉ
- Exemplos: "Clínica Diagnóstica X", "Hospital Y", "Laboratório Z"
- Se não encontrar nome específico: "Serviço externo não identificado"

>>> TIPO DE EXAME (CATEGORIA) <<<
Classifique em UMA das categorias:
- "imagem_radiologia" (RX, TC, RM, USG, PET-TC, Mamografia, etc)
- "biopsia_anatomopatologico" (Biópsia, AP, Citopatológico)
- "endoscopia" (EDA, Colonoscopia, Broncoscopia)
- "outros" (quando não se encaixar nas anteriores)

>>> DATA DE REALIZAÇÃO <<<
- Procure por: "Data do exame", "Realizado em", "Data de atendimento"
- CUIDADO: Não confundir com "Data de nascimento" do paciente
- Se houver múltiplas datas, priorize a que estiver próxima ao contexto de realização

>>> IMPRESSÃO DIAGNÓSTICA <<<
- Transcreva INTEGRALMENTE (não resuma)
- Inclua todo o texto após "IMPRESSÃO:", "CONCLUSÃO:", "OPINIÃO:"
- Preserve formatação (bullets, numeração, etc)

REGRAS CRÍTICAS:
- Se o texto parecer cortado ou incompleto: EXTRAIA TUDO O QUE ESTIVER DISPONÍVEL e marque documento_incompleto: true
- NÃO inventar achados. Se não estiver no texto, não inclua.
- Preservar medidas em ***negrito*** (ex: ***2.5 cm***).

SAÍDA JSON ESPERADA:
{
  "report_metadata": {
    "tipo_exame": "Ex: TOMOGRAFIA DE TÓRAX E ABDOME",
    "categoria_exame": "imagem_radiologia" | "biopsia_anatomopatologico" | "endoscopia" | "outros",
    "os": "Número da OS/Pedido encontrado",
    "paciente": "Nome do paciente",
    "servico_origem": {
      "nome": "Clínica/Hospital X",
      "identificado_em": "cabecalho" | "rodape" | "nao_identificado"
    },
    "origem": "interno_sabin" | "externo",
    "datas_encontradas": [{ "rotulo": "...", "data_literal": "...", "data_normalizada": "YYYY-MM-DD" }],
    "data_realizacao": "YYYY-MM-DD",
    "criterio_data_realizacao": "Explicação de qual campo foi usado"
  },
  "laudador": {
    "nome": "Dr(a). Nome Completo",
    "crm": "CRM 12345/UF",
    "identificado_em": "assinatura_manuscrita" | "assinatura_digital" | "nao_identificado",
    "observacao": "Qualquer nota relevante (ex: assinatura parcialmente legível)"
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
    "impressao_diagnostica_ou_conclusao_literal": "TEXTO INTEGRAL da impressão/conclusão, sem editar",
    "alertas_de_fidelidade": []
  },
  "documento_incompleto": false,
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

  // Prompt para análise global de PDF - identifica quantos laudos existem e quais páginas pertencem a cada um
  pdf_global_grouping: `
Você está analisando TODAS as páginas de um PDF médico.
Sua tarefa é identificar QUANTOS LAUDOS DISTINTOS existem e quais páginas pertencem a cada um.

CONCEITO FUNDAMENTAL:
- Um PDF pode conter MÚLTIPLOS LAUDOS sequenciais do MESMO paciente
- Exemplo: TC Tórax (páginas 1-2) + TC Abdome (páginas 3-4) = 2 LAUDOS DISTINTOS
- Mesmo paciente, mesma data, mesmo serviço = ainda assim são laudos SEPARADOS se tiverem títulos diferentes

COMO IDENTIFICAR ONDE UM LAUDO TERMINA E OUTRO COMEÇA:

>>> INÍCIO DE UM LAUDO <<<
- Página com TÍTULO do exame (ex: "TOMOGRAFIA COMPUTADORIZADA DE TÓRAX")
- Pode ter cabeçalho com dados do paciente/OS
- Alguns têm paginação "1 de X" (mas não é obrigatório)

>>> FIM DE UM LAUDO <<<
- Assinatura manuscrita (nome + CRM caligrafado) OU
- Assinatura digital com código alfanumérico (laudos provisórios) OU
- Próxima página já é título de outro exame

>>> LAUDOS PROVISÓRIOS (sem valor legal) <<<
- Marcação "Pré-visualização. Laudo sem valor legal." no cabeçalho
- NÃO tem assinatura manuscrita, apenas código digital
- São laudos válidos para análise, apenas não oficializados

>>> TIPOS DE DOCUMENTO <<<
Para cada página, classifique como:
- "laudo_previo": Laudo médico com achados/conclusão
- "pedido_medico": Guia de solicitação de exame
- "assistencial": Receita, resumo de alta, etc
- "administrativo": Termo de consentimento, autorização
- "pagina_vazia": Página em branco (scan errado)
- "outro": Documento não identificado

CRITÉRIOS DE SEPARAÇÃO DE LAUDOS:
1. Novo TÍTULO de exame = novo laudo (mesmo que paciente/data sejam iguais!)
2. Assinatura seguida de novo título = fim de um laudo, início de outro
3. TC Tórax ≠ TC Abdome (são 2 laudos, não 1!)

REGRAS ADICIONAIS:

>>> FOLLOW-UP (MESMO EXAME, DATAS DIFERENTES) <<<
- Se houver 2+ laudos do MESMO tipo de exame mas de DATAS DIFERENTES:
- Cada um é um laudo SEPARADO (não agrupar!)
- Exemplo: TC Tórax de 01/01/2025 + TC Tórax de 15/01/2025 = 2 laudos

>>> ERRATA/ADENDO <<<
- Páginas com "ERRATA", "ADENDO", "COMPLEMENTO" no título:
- Vincular ao laudo que referenciam (mesmo OS/data)
- Marcar como 'is_adendo: true'

>>> PÁGINAS EM BRANCO (SCAN ERRADO) <<<
- Páginas praticamente vazias (fundo branco, sem texto significativo):
- Marcar tipo_pagina como 'pagina_vazia'
- NÃO incluir em nenhum grupo de laudo

>>> VALIDAÇÃO DE SEGURANÇA CRÍTICA - PACIENTES TROCADOS <<<
**ATENÇÃO: Este é um alerta de SEGURANÇA CLÍNICA.**
- Para CADA grupo/laudo, extraia o NOME DO PACIENTE
- Se o PDF contém laudos de PACIENTES DIFERENTES:
  - ADICIONE alerta CRÍTICO nos alertas[]
  - Formato: "⚠️ SEGURANÇA: PDF contém laudos de múltiplos pacientes: [Nome1] vs [Nome2]"
  - AINDA ASSIM agrupe normalmente por laudo (não misture), mas sinalize o problema
- O sistema vai bloquear a apresentação desses grupos para evitar erros clínicos

>>> PÁGINAS FORA DE ORDEM <<<
- Se páginas parecerem fora de sequência lógica:
- Tentar reordenar pelo conteúdo (continuidade de texto, paginação "X de Y")
- Se não for possível determinar ordem, manter ordem original
- Adicionar alerta

EXEMPLO DE PDF COM 2 LAUDOS:
- Páginas 1-2: "TOMOGRAFIA DE TÓRAX" → achados → conclusão → assinatura
- Páginas 3-4: "TOMOGRAFIA DE ABDOME TOTAL" → achados → conclusão → assinatura
→ São 2 laudos distintos!

SAÍDA JSON:
{
  "analise": "Descrição do que foi identificado no PDF",
  "total_laudos": 2,
  "total_paginas": 4,
  "grupos": [
    {
      "laudo_id": 1,
      "paginas": [1, 2],
      "tipo_detectado": "TOMOGRAFIA DE TORAX",
      "nome_paciente": "Nome do Paciente Laudo 1",
      "tipo_paginas": ["laudo_previo", "laudo_previo"],
      "is_provisorio": false,
      "is_adendo": false,
      "confianca": "alta"
    },
    {
      "laudo_id": 2,
      "paginas": [3, 4],
      "tipo_detectado": "TOMOGRAFIA DE ABDOME TOTAL",
      "nome_paciente": "Nome do Paciente Laudo 2",
      "tipo_paginas": ["laudo_previo", "laudo_previo"],
      "is_provisorio": false,
      "is_adendo": false,
      "confianca": "alta"
    }
  ],
  "paginas_nao_agrupadas": [],
  "alertas": []
}
`,

  // Prompt para análise global de imagens soltas (quando múltiplas imagens são enviadas juntas)
  images_global_grouping: `
Você está analisando múltiplas IMAGENS que foram enviadas juntas.
Sua tarefa é identificar se são partes do MESMO laudo ou de laudos DIFERENTES.

COMO IDENTIFICAR MESMO LAUDO:
1. Mesmo cabeçalho (paciente, OS, data)
2. Mesmo layout/logo do serviço
3. Uma é continuação da outra (ex: parte 1 tem achados, parte 2 tem conclusão)
4. Mesmo tipo de exame

COMO IDENTIFICAR LAUDOS DIFERENTES:
1. Cabeçalhos com pacientes diferentes
2. Tipos de exame diferentes (ex: TC Tórax vs TC Abdome = 2 laudos!)
3. Datas de realização diferentes (mesmo que mesmo tipo de exame)
4. Serviços/clínicas diferentes

SE NÃO FOR POSSÍVEL DETERMINAR COM CERTEZA:
- Se metadados coincidem (paciente, OS, data, tipo): agrupar com confiança "media"
- Se faltam metadados mas layout é similar: agrupar com confiança "baixa"
- Adicionar alerta para revisão manual

SAÍDA JSON:
{
  "analise": "Descrição do que foi identificado",
  "total_laudos": 1,
  "grupos": [
    {
      "laudo_id": 1,
      "indices": [0, 1],
      "tipo_detectado": "...",
      "confianca": "alta" | "media" | "baixa"
    }
  ],
  "alertas": ["Lista de alertas se houver"]
}
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
