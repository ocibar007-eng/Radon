[REDACTED_OPENAI_KEY]
# Dossiê Técnico Mestre: Radon V3 "Industrial Evolution"
**Versão:** 2.0.0 (Ultra-Detailed / Developer Manual)
**Data:** 20 de Janeiro de 2026
**Autor:** Antigravity (Google Deepmind)
**Classificação:** CONFIDENCIAL / MANUAL DE ENGENHARIA SÊNIOR

---

## 1. Introdução e Objetivo

Este documento não é um resumo. É o **Manual Definitivo de Engenharia** para o Radon V3. Ele foi desenhado para que um Engenheiro Sênior possa assumir o projeto do zero, compreendendo não apenas *o que* foi feito, mas *por que* foi feito, *onde* falhou durante a construção e *como* escalar.

O Radon V3 substitui a arquitetura "Black Box" (V2) por uma **Pipeline Industrial Determinística**, onde a IA Generativa é apenas um componente de um sistema maior de orquestração, validação e auto-cura.

---

## 2. Módulo 1: O Orquestrador (Backend API)

**(Arquivo: `api_server.ts`)**

### 2.1. Rastreabilidade de Decisões (Trade-offs)
*   **Node.js/Express vs Python/FastAPI:**
    *   *Decisão:* Escolhemos **Node.js (TypeScript)**.
    *   *Motivo:* O sistema é IO-bound (esperar API da Gemini), não CPU-bound. Node.js lida com concorrência assíncrona de forma mais eficiente que Python (GIL) para este caso de uso. Além disso, permite compartilhamento de tipos Zod com o Frontend.
    *   *Trade-off:* Perdemos as bibliotecas nativas de Data Science do Python no backend, obrigando a criar scripts satélites (`weekly_exec_report.py`) para análise de dados. Aceitável pois a análise é offline.
*   **Armazenamento em JSONL (`dataset.jsonl`) vs SQL/NoSQL:**
    *   *Decisão:* **JSON Lines (Append-only)** no sistema de arquivos local.
    *   *Motivo:* "Zero infra". Elimina a necessidade de Docker/Postgres para desenvolvimento local. Garante velocidade máxima de escrita (O(1)).
    *   *Trade-off:* Consultas complexas (ex: "buscar laudos da semana passada com erro X") são lentas (O(N)). Aceitável para MVP até 10k laudos.

### 2.2. Análise de Erros e Debugging (War Stories)
Durante a implementação, enfrentamos 3 bugs críticos que definiram a robustez atual:
1.  **O Crash do Escopo `datasetEntry`:**
    *   *Erro:* `ReferenceError: datasetEntry is not defined`.
    *   *Causa:* A variável foi inicializada dentro do escopo `try` do Data Flywheel, mas referenciada fora dele para logging de erro.
    *   *Solução:* Mover a definição para o escopo superior da função ou garantir que blocos `catch` não dependam dela.
2.  **O "Double Json Parse" da Gemini:**
    *   *Erro:* `SyntaxError: Unexpected token '` no JSON.
    *   *Causa:* O modelo Gemini as vezes devolve Markdown (\`\`\`json ...) mesmo quando instruído a retornar JSON puro.
    *   *Solução:* Implementação de um "Parser Sujo" no Shadow Critic que remove regex ```json e ``` antes do `JSON.parse()`.
3.  **Timeout Silencioso:**
    *   *Erro:* O cliente ficava esperando infinitamente.
    *   *Causa:* Falta de timeout explícito no Axios ao chamar a API da Google. Network glitches deixavam a conexão aberta.
    *   *Solução:* Adicionado timeout rígido e tratamento de erro `ECONNRESET` no wrapper `callGemini`.

### 2.3. Segurança e Conformidade
*   **Sanitização de Input:** Utilizamos **Zod** (`CaseBundleSchema.parse`) como primeira linha de defesa. Qualquer payload com campos extras ou tipos errados é rejeitado imediatamente (Fail Fast), prevenindo injeção de dados maliciosos no prompt.
*   **Gestão de Segredos:** A `API_KEY` da Gemini é carregada via `dotenv` do arquivo `.env` (que está no `.gitignore`). Há um fallback hardcoded *apenas* para ambiente de dev local (sandbox), que deve ser removido em prod.
*   **Privacidade (LGPD):** O sistema não loga dados de paciente (PII) no console (stdout), apenas no arquivo `dataset.jsonl` local. Em produção real, este arquivo deve residir em volume criptografado.

### 2.4. Documentação de Interface (API Contract)
**Endpoint:** `POST /v3/process-case`

**Input (Request Body - JSON):**
```typescript
{
  "meta": {
    "case_id": "UUID-v4",
    "patient": { "age_bracket": "adult", "sex": "M" }
  },
  "inputs": {
    "dictation_raw": "String (Texto do ditado médico)",
    "ocr_results": { "file_1": "texto extraído" } // Opcional
  }
}
```

**Output (Response Body - JSON):**
```typescript
{
  "success": true,
  "final_report": "String (Laudo formatado em Markdown)",
  "telemetry": {
    "layer2_latency_ms": 4500,
    "layer2_model": "gemini-3-pro-preview"
  },
  "risk_analysis": {
    "level": "S1 | S2 | S3",
    "flags": ["S1_HARD_GATE_FAIL", "LATERALITY_MISMATCH"]
  }
}
```

### 2.5. Escalabilidade e Limites
*   **Limite Teórico:** Em uma única instância Node.js, o gargalo é a memória para carregar o `dataset.jsonl` em memória para leitura (endpoint `/v3/dataset`). O limite seguro é ~500MB de logs (aprox 50k laudos).
*   **Se a Carga Triplicar (100 -> 300 RPM):**
    *   A API da Gemini vai dar rate-limit (429).
    *   *Solução Necessária:* Implementar fila (BullMQ/Redis) para desacoplar o recebimento da requisição do processamento. O usuário receberia um `job_id` e faria polling.

---

## 3. Módulo 2: Automação e Self-Healing

**(Lógica interna em `api_server.ts` + `pipeline_thresholds.json`)**

### 3.1. Rastreabilidade de Decisões
*   **Gates Regex (Determinístico) vs LLM Judge:**
    *   *Decisão:* **Regex para Hard Gates**.
    *   *Motivo:* Custo e Latência. Chamar um LLM para verificar se existe a palavra "áudio" custa $0.001 e leva 2s. Regex custa $0 e leva 1ms. Para bloqueios de segurança ("Banlist"), determinismo é obrigatório.
    *   *Trade-off:* Regex é "burro". Pode bloquear "suspeita de lesão no átrio" se "átrio" estiver na banlist por algum motivo obscuro. Exige manutenção cuidadosa do `pipeline_thresholds.json`.

### 3.2. Análise de Erros e Debugging
1.  **O Loop Infinito de Self-Healing:**
    *   *Desafio:* A IA falhava em corrigir o erro, o sistema pedia de novo, ela falhava de novo.
    *   *Solução:* Implementação de `MAX_ATTEMPTS = 2`. Se falhar na segunda, aceitamos a derrota, marcamos como **Risco S1** e entregamos para o humano corrigir. Não bloqueamos o processo indefinidamente.
False Positives em "Meta-Texto":
    *   *Desafio:* A palavra "Input" estava na banlist. O médico ditou "Input calórico elevado". O sistema bloqueou.
    *   *Solução:* Refinamento da banlist para frases mais específicas ("segundo o input", "conforme input") em vez de palavras soltas.

### 3.3. Documentação Lógica
O Self-Healing segue o diagrama de estados:
1.  `Geração Inicial` (Layer 3)
2.  `Check Hard Gates` (Regex)
    *   Se PASS: Fim.
    *   Se FAIL: Incrementa `attempt`.
3.  `Injeção de Prompt`: Adiciona "🚨 CRITICAL FEEDBACK: You used forbidden term X. Fix it."
4.  `Retry`: Volta para passo 1.
5.  Se `attempt > MAX`: Marca `Risk = S1`, anexa flags de erro e libera.

---

## 4. Módulo 3: Frontend & Data Flywheel

**(Arquivo: `ReviewPage.tsx`)**

### 4.1. Rastreabilidade de Decisões
*   **React SPA vs Server-Side Rendering (Next.js):**
    *   *Decisão:* **React SPA (Vite)**.
    *   *Motivo:* O Reviewer é uma ferramenta interna de alta interatividade. Não precisamos de SEO (SSR). Precisamos de estado client-side complexo (o texto sendo editado, tags sendo marcadas) ultra-rápido.
*   **Shadow Critic sob Demanda vs Automático:**
    *   *Decisão:* **Sob demanda (Botão)**.
    *   *Motivo:* Custo e Desempenho. Rodar um "Auditor" (Gemini Pro) dobra o custo e o tempo de cada laudo. Só deve ser usado quando o humano tem dúvida ou para amostragem aleatória.

### 4.2. Análise de Erros e Debugging
1.  **Dessincronização de Estado:**
    *   *Erro:* Ao clicar "Next", o campo de texto ainda mostrava o laudo anterior por meio segundo.
    *   *Solução:* `useEffect` monitorando `currentIndex` para forçar o reset de todos os estados (`setCorrection`, `setCriticFeedback`) antes de renderizar.
2.  **Race Condition no Feedback:**
    *   *Erro:* Usuário clicava "Approve" muito rápido duas vezes.
    *   *Solução:* Desabilitar botões (`disabled={loading}`) enquanto a Promise do fetch não retorna.

### 4.3. Interface de Dados (Feedback Strategy)
O Frontend não envia apenas o texto final. Ele envia o **Raciocínio Humano** (Tags).
*   **Tags:** `[Terminologia, Lateralidade, Medidas, Alucinação]`.
*   **Valor:* Isso permite treinar modelos especializados. Ex: "Pegar todos os casos onde a tag 'Lateralidade' foi marcada e fazer DPO (Direct Preference Optimization) para ensinar o modelo a diferenciar esquerda/direita".

---

## 5. Módulo 4: Scripts Operacionais (Power-Ups)

**(Arquivos Python: `nightly_regression.py`, `drift_sentinel.py`, `weekly_exec_report.py`)**

### 5.1. Rastreabilidade de Decisões
*   **Python Scripts Isolados vs Background Jobs no Node:**
    *   *Decisão:* **Scripts Python Isolados**.
    *   *Motivo:* Facilidade de manutenção por Cientistas de Dados. Eles podem alterar a lógica de regressão ou análise de drift usando bibliotecas que conhecem (Pandas, Scikit-learn) sem tocar no backend de produção (TypeScript).

### 5.2. Escalabilidade e Limites
*   **Gargalo do `nightly_regression.py`:**
    *   Ele roda sequencialmente (`for case in cases`). Para 100 casos, leva 10 minutos. Para 10.000 casos, levaria 16 horas.
    *   *Solução Futura:* Paralelismo (`ThreadPoolExecutor`) ou rodar apenas em uma amostra estatística (ex: "Reservoir Sampling" de 500 casos).
*   **Drift Sentinel com Dicionário em Memória:**
    *   O MVP usa `Counter` em memória. Se o vocabulário crescer para milhões de termos, o script vai estourar RAM.
    *   *Solução Futura:* Redis HyperLogLog para contagem de cardinalidade em stream.

---

## 6. Procedimentos de Segurança e Deploy

### 6.1. Deployment Checklist
1.  **Ambiente:** Garantir que `.env` tenha `GEMINI_API_KEY` válida (Tier Pago para SLA).
2.  **Logs:** Verificar permissão de escrita na pasta `/logs`. Em container, montar volume persistente.
3.  **Gates:** Rodar `python3 check_release.py` (simulado) antes de subir nova versão.

### 6.2. Plano de Rollback
Em caso de "Alucinação em Massa" (Modelo começa a inventar câncer em todos os pacientes):
1.  **Kill Switch:** Parar o container Node.js.
2.  **Revert:** Reverter `pipeline_thresholds.json` para versão anterior (Git).
3.  **Fallback:** O sistema V2 (Black Box) deve estar disponível em rota alternativa `/v2/process` como backup emergencial? (Decisão de Produto pendente).

---

**Fim do Manual Técnico.**
Este documento deve ser versionado junto com o código-fonte. Qualquer alteração na arquitetura (ex: adicionar Redis) exige atualização deste dossiê (Seção 2.5 e 5.2).
