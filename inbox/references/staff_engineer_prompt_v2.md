# Handoff para Staff Engineer — Arquitetura Multi-Agente para Laudos Radiológicos (Radon V2)

## Contexto e Visão
Você está assumindo a liderança técnica da implementação do **Radon V2**, um sistema de geração de laudos radiológicos de alta precisão. Diferente da versão anterior (monolítica), o V2 utiliza uma **Arquitetura Multi-Agente de 6 Camadas** para garantir robustez clínica, auditabilidade e segurança.

O sistema atual já possui componentes de OCR e classificação (Gemini). Seu foco é o **Pipeline de Geração e Validação (Layers 2-5)**, integrando modelos de raciocínio (OpenAI o4/o3) com serviços determinísticos.

---

## Metas Críticas de Engenharia
1.  **Zero Alucinação de Cálculos**: LLMs são proibidos de calcular. Todo cálculo aritmético (Volumes, Washout, RECIST) deve ser delegado ao **Calculator Service (Python)**.
2.  **Anti-Meta-Texto Rigoroso**: O laudo final deve ser indistinguível de um escrito por humano. Exterminar referências a "input", "áudio", "transcrição", "conforme solicitado".
3.  **Segurança Clínica (HITL)**: Implementar gateways de escalonamento. Casos de alta incerteza ou criticidade oncológica devem ser travados para revisão humana.
4.  **Observabilidade Granular**: Cada agente deve emitir métricas e traces. Precisamos saber exatamente onde e por que um laudo falhou (ex: "Findings Agent falhou por input incompleto").

---

## Arquitetura de Referência (Layers 0-5)

### Layer 0: Observability & Security Fabric
*   **Responsabilidade**: Tracing (OpenTelemetry), Logs anonimizados, Controle de Acesso e Auditoria LGPD.
*   **Mandatório**: Nada trafega sem `trace_id`. PHI (Protected Health Information) deve ser sanitizado antes de sair do ambiente seguro.

### Layer 1: Input & Preprocessing
*   **Componentes**: Orchestrator, Data Parser.
*   **Input**: Áudio (Ditado), OCR (Imagens/Docs), Histórico HL7/FHIR.
*   **Output**: `CaseBundle` (Objeto normalizado e imutável que alimenta os agentes).

### Layer 2: Specialized Content Agents (Paralelos)
Os especialistas. Cada um foca em um domínio para minimizar carga cognitiva.
*   **Clinical Agent**: Histórico, indicação, questionários. (Normaliza para termos médicos).
*   **Technical Agent**: Protocolo, contraste (Sempre "Henetix®" em TC), limitações.
*   **Findings Agent**: Descreve achados. **CLIENTE do Calculator Service**.
    *   *Regra*: Extrai números -> Pede cálculo ao Python -> Recebe resultado -> Escreve texto.
*   **Comparison Agent**: Compara com exames prévios (estabilidade, progressão).
*   **Oncology Agent**: Protocolos complexos (RECIST, PI-RADS). Isola a lógica oncológica.

### Layer 3: Synthesis & Interpretation
*   **Impression Synthesizer**: Gera a conclusão e recomendações.
*   **Consensus Arbiter**: Resolve conflitos (ex: Findings viu nódulo, mas Impression ignorou).

### Layer 4: Quality & Formatting (O "Auditor")
A barreira final antes do radiologista.
*   **QA Determinístico**: Regex/Banlist (Meta-texto, termos proibidos "subsentimétrico").
*   **QA LLM**: Validação semântica e clínica (ex: checar lateralidade, consistência medidas).
*   **Rewrite Loop**: Se QA falha, realimenta para correção automática (max 2 retries).

### Layer 5: Output
*   Renderização final (Markdown -> PDF). Garante formatação visual perfeita.

---

## Implementação Técnica e Padrões

### 1. Integração com Calculator Service (Python)
Não confie no LLM para matemática.
*   **Fluxo**: Agente identifica necessidade (ex: Washout Adrenal) -> Gera `ComputeRequest` JSON -> Service Python executa -> Retorna `ComputeResult` -> Agente renderiza.
*   **Fórmulas Whitelist**: Apenas fórmulas aprovadas e testadas (nada de `eval()`).

### 2. Protocolo de QA (Banlist & Schemas)
*   **Zod/Pydantic**: Tudo é tipado. Saídas dos agentes devem validar contra schemas rígidos.
*   **Banlist**: Lista negra de termos (regex) que falham o build do laudo imediatamente.
    *   Ex: `/(conforme|segundo) (áudio|input|transcri)/i`

### 3. Stack Sugerida
*   **Orquestração/Agentes**: Node.js/TypeScript (LangChain ou nativo OpenAI SDK).
*   **Cálculos**: Python (FastAPI).
*   **Modelos**:
    *   Routine: `gpt-4o-mini` ou `o4-mini`.
    *   Complex/QA/Oncology: `o3-mini` ou `gpt-4o`.
    *   OCR (Layer 1): Gemini 1.5 Flash (já existente).

### 4. Entregáveis Imediatos (Sua Missão)
1.  Setup da estrutura de pastas `src/core/radon-agents`.
2.  Implementação do `Calculator Service` e seus contratos.
3.  Implementação dos agentes `Clinical` e `Findings` (MVP).
4.  Setup do Pipeline de QA com Banlist inicial.

---

## Definição de Concluído (DoD)
*   Pipeline roda ponta-a-ponta para um caso de teste (Golden Set).
*   NENHUM erro de cálculo aritmético permitido.
*   NENHUM meta-texto no output final.
*   Logs mostram trace completo da execução dos agentes.
