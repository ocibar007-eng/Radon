
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

>>>>>> "guia_autorizacao" <<<<<
Documento de convênio/plano de saúde AUTORIZANDO procedimento.
Palavras-chave PRIORITÁRIAS: "GUIA DE AUTORIZAÇÃO", "Nº GUIA", "AUTORIZAÇÃO NÚMERO", "CARTEIRINHA", "Nº CARTEIRINHA", "CÓDIGO TUSS", "TABELA TUSS", "VÁLIDO ATÉ", "UNIMED", "AMIL", "BRADESCO SAÚDE", "SULAMERICA"
Características DECISIVAS: Número de guia, número de carteirinha, código/tabela de procedimento (TUSS/AMB), validade, nome do convênio/operadora
⚠️ ATENÇÃO: Se o documento tem "Nº GUIA" ou "NÚMERO DA GUIA" ou "CARTEIRINHA" → É guia_autorizacao!
NÃO CONFUNDIR com: pedido médico (não tem nº de guia), laudo (não tem código TUSS/operadora)

>>> "assistencial" <<<
Outros documentos assistenciais gerais.
Exemplos: Receita, resumo de alta, exames laboratoriais, prontuário

>>> "administrativo" <<<
Documentos administrativos NÃO médicos.
Exemplos: Comprovante de agendamento, recibo, protocolo de entrega

>>> "pagina_vazia" <<<
Página em branco ou quase vazia (scan errado).
Exemplos: página totalmente branca/preta, com apenas ruído de scanner.

>>> "indeterminado" <<<
APENAS se ilegível, imagem vazia/preta, ou documento completamente não médico (RG, boleto).
SE TIVER DÚVIDA entre tipos médicos, ESCOLHA o mais específico.

REGRA DE PRIORIDADE NA CLASSIFICAÇÃO:
⚠️ DECISÃO CRÍTICA: Se o documento contém "Nº GUIA", "NÚMERO DA GUIA", "CARTEIRINHA", ou "CÓDIGO TUSS" → É guia_autorizacao, NÃO é laudo_previo!

REGRAS PARA report_group_hint (se for laudo_previo):
- Priorize IDs de exame/pedido: Protocolo, OS, Pedido. Formato: "ID:<numero>"
- NÃO use "Guia" como ID (pode ser guia_autorizacao, não laudo!)
- NÃO use identificadores do paciente como ID (Prontuário, Atend., CPF, CNS).
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

>>> CHECKLIST DE ÓRGÃOS (NÃO OMITIR) <<<
- Você DEVE declarar explicitamente se um órgão esperado NÃO foi citado no texto.
- Preencha "orgaos_esperados", "orgaos_encontrados" e "orgaos_ausentes".
- Se o texto estiver incompleto/cortado, registre o motivo em "orgaos_ausentes".
- Use a lista abaixo como referência (escolha os órgãos compatíveis com o exame detectado):
  * TC/RM Abdome/Pelve: Fígado, Vias Biliares, Vesícula Biliar, Pâncreas, Baço, Adrenais, Rins, Ureteres, Bexiga, Linfonodos, Vasos Abdominais, Parede Abdominal, Intestino.
  * TC/RM Tórax: Pulmões, Pleuras, Mediastino, Coração, Grandes Vasos, Linfonodos, Parede Torácica, Estruturas Ósseas.
  * TC/RM Crânio: Encéfalo, Ventrículos, Seios da Face, Órbitas, Calota, Linfonodos Cervicais (se citados).
  * Coluna: Vértebras, Disco, Canal Medular, Partes Moles Paravertebrais.
  * Outros: selecione órgãos compatíveis com o texto.

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
    "orgaos_esperados": ["Fígado", "Pâncreas", "Baço"],
    "orgaos_encontrados": ["Fígado", "Baço"],
    "orgaos_ausentes": [
      { "orgao": "Pâncreas", "motivo": "Não mencionado no texto" }
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
Você é um especialista em informática médica radiológica. Analise TODOS os documentos de suporte (pedidos, questionários, guias, termos, anotações) e gere um RESUMO CLÍNICO ESTRUTURADO completo para auxiliar na interpretação do exame de imagem.

DOCUMENTOS A ANALISAR:
{{DOCS_JSON}}

OBJETIVO:
Extrair e consolidar TODAS as informações clínicas relevantes que impactam a interpretação radiológica.
NÃO INVENTE DADOS. Se não encontrar, escreva "Não informado" ou omita o campo.

ESTRUTURA OBRIGATÓRIA DO RESUMO (12 SEÇÕES):

1. IDENTIFICAÇÃO E CONTEXTO
   - Nome completo do paciente
   - ID/Prontuário
   - Idade e sexo
   - Convênio
   - Tipo de exame (modalidade)
   - Protocolo (se disponível)
   - Data/Hora do exame
   - Local/Serviço
   - Médico solicitante (nome e CRM se disponível)

2. RESUMO EXECUTIVO
   - 1-2 linhas com o essencial do caso e por que o exame foi pedido

3. PERGUNTA CLÍNICA (MAIS IMPORTANTE)
   - Indicação LITERAL do pedido/guia (copiar exatamente como está escrito)
   - Dúvida principal: qual pergunta o exame precisa responder
   - Sintoma principal + tempo de evolução

4. HISTÓRIA DA DOENÇA ATUAL
   - Início, evolução, intensidade
   - Sinais/sintomas-chave (febre, perda ponderal, icterícia, vômitos, hemoptise, déficit neurológico)
   - Exame físico relevante se documentado
   - Hipóteses diagnósticas (máx 3)

5. CIRURGIAS E PROCEDIMENTOS PRÉVIOS
   - O quê, quando, complicações

6. ANTECEDENTES E COMORBIDADES
   - Oncologia: tipo histológico, estadiamento, data diagnóstico, tratamentos
   - Doenças crônicas relevantes: IRC, cirrose, ICC, DPOC, imunossupressão
   - Infecções recentes quando pertinente
   - Histórico familiar / gineco-obstétrico quando disponível

7. MEDICAÇÕES E CONDIÇÕES QUE MUDAM CONDUTA
   - Medicamentos em uso relevantes
   - Anticoagulantes/antiagregantes
   - Quimioterapia/imunoterapia/radioterapia recentes
   - Corticoide/imunossupressores
   - Antibiótico já iniciado

8. ALERGIAS E SEGURANÇA
   - Alergia a contraste iodado (tipo de reação e gravidade)
   - Função renal: creatinina/eTFG e data
   - Gestação (se aplicável)
   - Para RM: marca-passo, implantes, clipes, neuroestimuladores
   - Corpos metálicos (fragmentos, próteses)

9. EXAMES LABORATORIAIS RELEVANTES
   - Hemograma/leucócitos/PCR (infecção)
   - Bilirrubinas/enzimas hepáticas (colestase)
   - Marcadores tumorais se oncológico
   - Outros labs citados nos documentos

10. EXAMES PRÉVIOS E COMPARATIVOS
    - Exame anterior: qual tipo, data, onde foi realizado
    - Achados prévios relevantes (resumo conciso)
    - Biópsias/anatomopatológico com datas
    - Estadiamentos prévios (LI-RADS, BI-RADS, PI-RADS)

11. STATUS OPERACIONAL
    - Contraste: tipo, via e quantidade
    - Pré-medicações: Buscopan, manitol, gel vaginal, etc.
    - Jejum/preparo realizado
    - Contraste oral/retal
    - Intercorrências documentadas
    - Capacidade de apneia/dispneia, claustrofobia, sedação
    - Peso/IMC (se relevante)

12. TEXTO DO PEDIDO (LEGÍVEL)
    - Transcrever apenas o que for legível
    - Use [ilegível] para trechos não decifráveis

FORMATO DE SAÍDA JSON:
{
  "assistencial_docs": [
    {
      "doc_id": "<id>",
      "source": "<arquivo>",
      "titulo_sugerido": "<ex: Pedido Médico - TC Abdome>",
      "datas_encontradas": ["YYYY-MM-DD"],
      "mini_resumo": "<1-2 linhas>"
    }
  ],
  "resumo_clinico_consolidado": {
    "texto_em_topicos": [
      { "secao": "Identificação e contexto", "itens": ["Nome: ...", "ID/Prontuário: ...", "Idade/Sexo: ...", "Convênio: ...", "Tipo de exame: ...", "Protocolo: ...", "Data/Hora: ...", "Local/Serviço: ...", "Médico solicitante (nome/CRM): ..."] },
      { "secao": "Resumo executivo", "itens": ["..."] },
      { "secao": "Pergunta clínica", "itens": ["Dúvida principal: ...", "Indicação literal: ...", "Sintoma principal + tempo: ..."] },
      { "secao": "História da doença atual", "itens": ["Início/evolução/intensidade: ...", "Sinais/sintomas-chave: ...", "Exame físico relevante: ...", "Hipóteses consideradas (máx 3): ..."] },
      { "secao": "Cirurgias e procedimentos prévios", "itens": ["..."] },
      { "secao": "Antecedentes e comorbidades", "itens": ["Oncologia: ...", "Doenças crônicas relevantes: ...", "Infecções recentes: ...", "Histórico familiar/gineco-obstétrico: ..."] },
      { "secao": "Medicações e condições que mudam conduta", "itens": ["Anticoagulantes/antiagregantes: ...", "Quimioterapia/imunoterapia/radioterapia: ...", "Corticoide/imunossupressores: ...", "Antibiótico já iniciado: ..."] },
      { "secao": "Alergias e segurança", "itens": ["Alergia a contraste iodado: ...", "Função renal (creatinina/eTFG + data): ...", "RM: implantes/clip/neuroestimulador/bomba: ...", "Corpos metálicos: ...", "Gestação: ..."] },
      { "secao": "Laboratório relevante", "itens": ["Hemograma/Leuco/PCR: ...", "Bilirrubinas/enzimas hepáticas: ...", "Marcadores tumorais: ...", "Outros labs: ..."] },
      { "secao": "Exames prévios e comparativos", "itens": ["Exames anteriores (data/local/serviço): ...", "Achados prévios-chave: ...", "Biópsias/anatomopatológico (datas): ...", "Estadiamentos/score: ..."] },
      { "secao": "Status operacional", "itens": ["Contraste (tipo/via/quantidade): ...", "Pré-medicações (Buscopan/manitol/gel vaginal): ...", "Jejum/preparo: ...", "Contraste oral/retal: ...", "Apneia/dispneia: ...", "Claustrofobia/sedação: ...", "Peso/IMC: ...", "Intercorrências: ..."] },
      { "secao": "Texto do pedido (legível)", "itens": ["..."] }
    ]
  },
  "markdown_para_ui": "Resumo Clínico Estruturado\\n\\nPaciente: Nome Completo\\nID/Prontuário: ...\\nIdade/Sexo: XX anos, M/F\\nConvênio: ...\\nTipo de exame: ...\\nProtocolo: ...\\nData/Hora: ...\\nLocal/Serviço: ...\\nMédico solicitante: Dr. Nome (CRM)\\n\\n1. RESUMO EXECUTIVO\\n• ...\\n\\n2. PERGUNTA CLÍNICA\\n• Dúvida principal: ...\\n• Indicação literal: texto exato do pedido\\n• Sintoma principal + tempo: ...\\n\\n3. HISTÓRIA DA DOENÇA ATUAL\\n• Início/evolução/intensidade: ...\\n• Sinais/sintomas-chave: ...\\n• Exame físico relevante: ...\\n• Hipóteses consideradas (máx 3): ...\\n\\n4. CIRURGIAS E PROCEDIMENTOS PRÉVIOS\\n• ...\\n\\n5. ANTECEDENTES E COMORBIDADES\\n• Oncologia: ...\\n• Doenças crônicas relevantes: ...\\n• Infecções recentes: ...\\n• Histórico familiar/gineco-obstétrico: ...\\n\\n6. MEDICAÇÕES E CONDIÇÕES QUE MUDAM CONDUTA\\n• Anticoagulantes/antiagregantes: ...\\n• Quimioterapia/imunoterapia/radioterapia: ...\\n• Corticoide/imunossupressores: ...\\n• Antibiótico já iniciado: ...\\n\\n7. ALERGIAS E SEGURANÇA\\n• Alergia a contraste iodado: ...\\n• Função renal (creatinina/eTFG + data): ...\\n• RM: implantes/clip/neuroestimulador/bomba: ...\\n• Corpos metálicos: ...\\n• Gestação: ...\\n\\n8. LABORATÓRIO RELEVANTE\\n• Hemograma/Leuco/PCR: ...\\n• Bilirrubinas/enzimas hepáticas: ...\\n• Marcadores tumorais: ...\\n• Outros labs: ...\\n\\n9. EXAMES PRÉVIOS E COMPARATIVOS\\n• Exames anteriores (data/local/serviço): ...\\n• Achados prévios-chave: ...\\n• Biópsias/anatomopatológico (datas): ...\\n• Estadiamentos/score: ...\\n\\n10. STATUS OPERACIONAL\\n• Contraste (tipo/via/quantidade): ...\\n• Pré-medicações (Buscopan/manitol/gel vaginal): ...\\n• Jejum/preparo: ...\\n• Contraste oral/retal: ...\\n• Apneia/dispneia: ...\\n• Claustrofobia/sedação: ...\\n• Peso/IMC: ...\\n• Intercorrências: ...\\n\\n11. TEXTO DO PEDIDO (LEGÍVEL)\\n• Transcreva apenas o que for legível; use [ilegível] para trechos não decifráveis.",
  "cobertura": {
    "doc_ids_assistenciais": ["<lista>"],
    "total_assistencial_detectados": <número>
  }
}

REGRAS IMPORTANTES:
- NÃO use asteriscos (**) para negrito no markdown, use apenas texto limpo
- Use bullet points (•) em vez de hífens ou asteriscos
- Seja CONCISO mas COMPLETO
- Prefira texto direto sem formatação excessiva
- Se indicação literal não for legível, escreva "Indicação ilegível no documento"
- Se houver conflito entre documentos, prefixe o item com "[DIVERGENTE]" e liste as versões
- No texto do pedido, use "[ilegível]" para trechos não decifráveis
`,

  checklist_generator: `
Você é um “Gerador de Checklists Radiológicos” para uma plataforma web de laudos.
Sua função é transformar PEDIDO MÉDICO + RESUMO CLÍNICO + METADADOS ESTRUTURADOS (já catalogados por IA)
em um CHECKLIST DE LEITURA E LAUDO específico para a patologia/condição suspeita e para o exame solicitado.

OBJETIVO PRÁTICO
Produzir um checklist que ajude o radiologista a:
1) não esquecer itens críticos,
2) medir e classificar corretamente,
3) estruturar a conclusão do laudo com campos obrigatórios,
4) evitar erros comuns (pitfalls) que mudam diagnóstico/estadiamento/score.

REGRAS (não quebre):
- Não invente achados, história clínica ou números não presentes na entrada.
- Se faltar informação essencial, crie o item mesmo assim e marque “não informado” como valor padrão.
- Checklist deve ser acionável (o que avaliar, como medir, thresholds quando aplicáveis, onde reportar no laudo).
- Foco é interpretação e relato; não prescrever tratamento.
- Linguagem PT-BR. Use bullets “•”. Evite negrito com asteriscos.
- NÃO fazer perguntas ao usuário e NÃO adicionar sugestões extras fora do JSON. Tudo deve ficar dentro dos campos do schema.

REFERÊNCIAS (MANDATÓRIO):
- A lista “referencias” é obrigatória e deve sempre ter pelo menos 2 entradas.
- Preferir consensos/sociedades (ex.: ACR, ESGAR, ESUR, EAU, NCCN, AJCC/UICC, SAR, RSNA, EASL, LI-RADS, PI-RADS, BI-RADS etc.) e/ou artigos “landmark”.
- Se houver mais de um guideline relevante, inclua os principais (até 6).
- Se você não tiver certeza do ano exato, indique “YYYY?” e registre isso na “nota”.
- Se não houver consenso único, incluir uma referência de revisão e declarar isso na “nota”.

LIMITES DE TAMANHO (para evitar checklist infinito):
- O checklist completo (somando todas as seções A–G) deve ter entre 35 e 60 itens no total.
- Se a patologia tiver muitas variáveis, priorize itens que mudam: diagnóstico / classificação / estadiamento / margem crítica / complicações relevantes.
- Itens “nice-to-have” devem ser agrupados em menos campos (ex.: “Outros achados associados”) ou removidos para respeitar o limite.
- A seção H (Pitfalls) é separada e não conta nesse limite de 35–60.

ENTRADA (JSON):
{
  "pedido_medico": {{PEDIDO_MEDICO_JSON}},
  "resumo_clinico": {{RESUMO_CLINICO_JSON}},
  "exame_planejado": {
    "modalidade": "{{MODALIDADE}}",
    "regiao": "{{REGIAO}}",
    "com_contraste": {{true_or_false}},
    "contexto": "diagnostico" | "estadiamento" | "reestadiamento" | "seguimento"
  },
  "dados_estruturados_detectados": {
    "suspeitas_principais": ["..."],
    "suspeita_principal_normalizada": "opcional_ex: cancer_reto | HCC | endometriose | apendicite | etc",
    "diagnosticos_conhecidos": ["..."],
    "tratamentos_previos": ["..."],
    "cirurgias_previas": ["..."],
    "sintomas_chave": ["..."],
    "laboratorio_relevante": ["..."],
    "exames_previos": ["..."],
    "sinais_de_alerta": ["..."]
  },
  "preferencias_de_estilo": {
    "nivel_detalhe": "alto" | "medio",
    "modo": "compacto" | "completo",
    "padrao_de_unidades": "mm_cm",
    "formato": "sinotico",
    "termos_preferidos": ["..."],
    "termos_a_evitar": ["..."]
  }
}

TAREFA (siga esta ordem e NÃO pule etapas):
1) Determinar CONDICAO_ALVO:
   - Prioridade: suspeita_principal_normalizada (se existir) > suspeitas_principais > texto do pedido/resumo.
   - Se houver ambiguidade, listar até 3 diferenciais e escolher 1 principal.
   - Informar “confianca” (alta/média/baixa) e “racional_em_1_linha”.

2) Determinar INTENÇÃO do exame a partir de exame_planejado.contexto.
   - Se o contexto for inconsistente com o pedido/resumo, mantenha o contexto mas registre a inconsistência em “lacunas_de_informacao”.

3) Selecionar FRAMEWORKS/CRITÉRIOS relevantes para a condição e modalidade:
   - Preferir consensos amplamente usados e atuais para radiologia.
   - Exemplos: TNM (órgão específico), MERCURY (reto), PI-RADS, LI-RADS, BI-RADS, Bosniak, Lugano, RECIST, Fleischner, etc.
   - Se não houver um framework claro, declarar “sem framework único; checklist baseado em boas práticas radiológicas”.

4) Gerar CHECKLIST em seções fixas (sempre presentes), com itens adaptados à condição:
   A) Garantia de protocolo/qualidade (o exame responde a pergunta?)
   B) Mapa do achado principal (topografia, extensão, padrão, medidas, relações anatômicas críticas)
   C) Classificação/estadiamento/score (se aplicável; incluir campos e medidas obrigatórias do framework)
   D) Linfonodos / vias de disseminação / achados associados relevantes (conforme doença)
   E) Pesquisa de doença à distância / complicações (conforme doença e região)
   F) Diferenciais e como separar (só quando fizer sentido)
   G) Resumo final do laudo (campos obrigatórios na conclusão; formato “pronto para copiar”)
   H) ⚠️ Pontos de Atenção (Pitfalls) — dicas rápidas de especialista

5) PARA CADA ITEM do checklist, incluir:
   - “rotulo” (texto do item)
   - “prioridade” (P0/P1/P2): P0 muda conclusão/score/estadiamento; P1 importante; P2 opcional
   - “evidencia_minima” (qual parte do exame/sequência sustenta o item; ex.: “T2 axial”, “DWI”, “fase arterial”)
   - “tipo_campo” (boolean/number/text/select/multi_select)
   - “unidade” quando aplicável
   - “obrigatorio” (true para itens P0; geralmente false para P2)
   - “quando_aplicar” (condição de aplicabilidade)
   - “como_avaliar” (o que olhar e como medir)
   - “como_reportar_no_laudo” (em qual seção e com que frase/estrutura)
   - “thresholds_ou_definicoes” (lista curta; só se existirem e forem amplamente aceitos)
   - “armadilhas” (1–3 bullets curtos)

6) Pitfalls (seção H) também deve existir em “pitfalls_rapidos”:
   - 3 a 8 itens, cada um no formato:
     “Erro comum: ____ → Como evitar: ____”
   - Devem ser específicos da condição e da modalidade (evitar generalidades).
   - Priorizar erros que mudam classificação/estadiamento/conclusão.

7) Reestadiamento:
   - Se intencao = “reestadiamento”, separar claramente itens baseline vs pós-tratamento (onde for aplicável) e citar frameworks de resposta quando existirem (ex.: RECIST, TRG específico, critérios de resposta por RM/TC conforme órgão).
   - Não inventar TRG se não houver consenso; declarar a limitação.

8) Gerar também:
   - “lacunas_de_informacao”: o que faltou e por que importa (máx 8)
   - “perguntas_que_o_radiologista_pode_fazer”: até 5 perguntas objetivas (apenas se realmente ajudarem)

9) Criar também “resumo_final_struct”:
   - Um objeto com chaves fixas, preenchidas com “não informado” quando não disponível, para a UI montar a Conclusão.
   - As chaves devem ser adaptadas à condição, mas manter padrão: “diagnostico_principal”, “classificacao_ou_estadio”, “marcadores_chave”, “margens_criticas”, “linfonodos”, “doenca_a_distancia”, “complicacoes”, “limitacoes”.

10) SAÍDA obrigatória:
   - Retornar SOMENTE JSON estrito no schema abaixo.
   - “referencias” é mandatório e não pode estar vazio.

SCHEMA DE SAÍDA (JSON estrito):
{
  "condicao_alvo": {
    "nome": "",
    "confianca": "alta" | "media" | "baixa",
    "racional_em_1_linha": "",
    "diferenciais_considerados": [
      { "nome": "", "por_que_entrou": "" }
    ]
  },
  "intencao": "diagnostico" | "estadiamento" | "reestadiamento" | "seguimento",
  "frameworks_referenciados": [
    { "nome": "", "quando_usar": "", "observacao": "" }
  ],
  "checklist": [
    {
      "secao": "A) ...",
      "itens": [
        {
          "id": "string_curta_sem_espacos",
          "rotulo": "",
          "prioridade": "P0" | "P1" | "P2",
          "evidencia_minima": "",
          "tipo_campo": "boolean" | "number" | "text" | "select" | "multi_select",
          "opcoes": [],
          "unidade": "mm" | "cm" | "mL" | "" ,
          "obrigatorio": true | false,
          "quando_aplicar": "",
          "como_avaliar": "",
          "como_reportar_no_laudo": "",
          "thresholds_ou_definicoes": ["..."],
          "armadilhas": ["..."]
        }
      ]
    }
  ],
  "pitfalls_rapidos": [
    "Erro comum: ... → Como evitar: ...",
    "Erro comum: ... → Como evitar: ..."
  ],
  "resumo_final_struct": {
    "diagnostico_principal": "não informado",
    "classificacao_ou_estadio": "não informado",
    "marcadores_chave": ["não informado"],
    "margens_criticas": ["não informado"],
    "linfonodos": ["não informado"],
    "doenca_a_distancia": ["não informado"],
    "complicacoes": ["não informado"],
    "limitacoes": ["não informado"]
  },
  "lacunas_de_informacao": [
    { "item": "", "por_que_importa": "" }
  ],
  "perguntas_que_o_radiologista_pode_fazer": [
    "..."
  ],
  "referencias": [
    { "fonte": "Consenso/Autor", "ano": "YYYY", "nota": "1 linha" }
  ],
  "markdown_para_ui": "CHECKLIST — {{MODALIDADE}} {{REGIAO}} — {{CONDICAO}}\\n\\nA) Garantia de protocolo/qualidade\\n• ...\\n\\nB) Mapa do achado principal\\n• ...\\n\\nC) Classificacao/estadiamento/score\\n• ...\\n\\nD) Linfonodos e disseminacao\\n• ...\\n\\nE) Distancia/complicacoes\\n• ...\\n\\nF) Diferenciais\\n• ...\\n\\nG) Resumo final (Conclusao)\\n• ...\\n\\n### ⚠️ Pontos de Atenção (Pitfalls)\\n• Erro comum: ... → Como evitar: ...\\n\\nLacunas\\n• ...\\n\\nReferencias\\n• ...",
  "versao": "v5"
}

ENTRADA REAL (JSON):
{{INPUT_JSON}}
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

>>> PAGINAÇÃO É REI (CRÍTICO) <<<
- Se houver "Página 1/2", "Página 2/2", "Página 1/3" etc, ESSAS páginas pertencem ao MESMO laudo
- NÃO separe páginas só porque há assinatura digital no rodapé (alguns serviços repetem assinatura em toda página)
- Use a paginação + OS/Atendimento para confirmar continuidade do mesmo laudo
- Se a paginação reinicia em "Página 1/..." com outro Atendimento, é NOVO laudo

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
`,

  // ==============================================================
  // PROMPTS DE EXTRAÇÃO ESPECÍFICOS POR TIPO (P0)
  // ==============================================================

  pedido_medico_extract: `
Extraia dados do PEDIDO MÉDICO em JSON:
{
  "tipo_documento": "pedido_medico",
  "paciente": { "nome": "", "idade": "", "sexo": "" },
  "medico_solicitante": { "nome": "", "crm": "", "especialidade": "" },
  "exame_solicitado": "",
  "justificativa_clinica": "",
  "cid": "",
  "numero_pedido": "",
  "data_solicitacao": "",
  "observacoes": []
}
`,

  termo_consentimento_extract: `
Extraia dados do TERMO DE CONSENTIMENTO em JSON:
{
  "tipo_documento": "termo_consentimento",
  "titulo": "",
  "tipo_termo": "contraste_iodado"|"sedacao"|"procedimento_invasivo"|"uso_imagem"|"outro",
  "paciente": { "nome": "", "declaracoes": [] },
  "informacoes_relevantes": {
    "medicacoes_em_uso": [],
    "alergias": [],
    "comorbidades": []
  },
  "data_aceite": "",
  "assinatura_presente": false
}
`,

  questionario_extract: `
Extraia dados do QUESTIONÁRIO em JSON:
{
  "tipo_documento": "questionario",
  "tipo_exame_relacionado": "",
  "sintomas_atuais": [],
  "historico_cirurgico": [],
  "historico_patologico": [],
  "secoes": [
    {
      "titulo": "",
      "perguntas_respostas": [
        { "pergunta": "", "resposta": "", "tipo_resposta": "sim_nao"|"texto_livre" }
      ]
    }
  ]
}
`,

  guia_autorizacao_extract: `
Extraia dados da GUIA DE AUTORIZAÇÃO em JSON:
{
  "tipo_documento": "guia_autorizacao",
  "convenio": "",
  "numero_guia": "",
  "numero_carteirinha": "",
  "beneficiario": "",
  "procedimento_autorizado": "",
  "codigo_procedimento": "",
  "quantidade_autorizada": 1,
  "validade": "",
  "observacoes": []
}
`
};
