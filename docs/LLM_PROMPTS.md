# LLM Prompts Catalog

Este documento reflete a estratégia de prompts centralizada em `src/adapters/gemini/prompts.ts`.
Modelo Padrão: `gemini-3-flash-preview`.

## 1. Intake (Header OCR)
**Key:** `header_ocr`
**Objetivo:** Extrair dados cadastrais do cabeçalho de uma imagem.
**Input:** Imagem (crop do cabeçalho ou tela).
**Output Esperado:** JSON `{ os, patientName, examDate, examType, confidence, evidence }`.
**Regras Críticas:**
- Priorizar data de realização.
- Não inventar dados (retornar null).

## 2. Doc Analysis (Classify & Extract)
**Key:** `doc_classify_extract`
**Objetivo:** Processar anexos (PDF/Imagens) individualmente.
**Input:** Imagem da página.
**Output Esperado:** JSON `{ classification, verbatimText, summary }`.
**Classificações:**
- `assistencial`: Pedidos, histórico, alta.
- `laudo_previo`: Laudos antigos.
- `indeterminado`: Outros.
**Regras Críticas:**
- Transcrição deve ser *Verbatim* (ipsis litteris).
- Preservar erros originais para fidelidade.

## 3. Metadata de Laudos Prévios
**Key:** `previous_report_metadata`
**Objetivo:** Refinar dados de documentos classificados como `laudo_previo`.
**Input:** Texto transcrito do passo anterior.
**Output Esperado:** JSON `{ reportDate, reportType, doctorName }`.
**Regras Críticas:**
- Protocolo de Data: Realização > Emissão. Formato YYYY-MM-DD.

## 4. Resumo Clínico
**Key:** `clinical_summary`
**Objetivo:** Consolidar a história clínica.
**Input:** Lista de textos *apenas* dos documentos `assistencial`.
**Output Esperado:** Markdown text.
**Regras Críticas:**
- Ignorar laudos prévios neste resumo.
- Bloqueio total de alucinação (apenas fatos presentes nos docs).

## 5. Transcrição de Áudio
**Key:** `audio_transcribe_raw`
**Objetivo:** Ditado médico para rascunho.
**Input:** Blob de áudio.
**Output Esperado:** Texto bruto (Raw String).
**Regras Críticas:**
- Transcrição fiel (Raw).
- Não formatar/estruturar como laudo final.
- Termos técnicos radiológicos precisos.

## 6. Compilação Final
**Key:** `compile_markdown`
**Objetivo:** Gerar arquivo para download.
**Input:** Session state interpolado.
**Output Esperado:** Markdown formatado.
**Estrutura:**
1. Cabeçalho (OS, Paciente).
2. Resumo Clínico.
3. Lista de Laudos Prévios.
4. Transcrições de Voz.
