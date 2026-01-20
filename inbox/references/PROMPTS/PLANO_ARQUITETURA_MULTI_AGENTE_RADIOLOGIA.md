# Plano de Implementacao: Arquitetura Multi-Agente para Laudos Radiologicos

**Versao:** 1.1
**Data:** Janeiro 2026
**Autor:** Staff Engineer - Sistema de Laudos Radiologicos
**Status:** Proposta Tecnica para Aprovacao
**Ultima Atualizacao:** Consolidacao com 100% dos arquivos de referencia

---

## Sumario Executivo

Este documento apresenta o plano de implementacao detalhado para uma arquitetura multi-agente destinada a geracao automatizada de laudos radiologicos. A proposta baseia-se na analise do diagrama de arquitetura fornecido e nos extensos materiais de referencia do projeto (prompts V8.7.9, manual de biometria, handoffs tecnicos e guidelines de QA).

### Justificativa da Arquitetura Multi-Agente

A escolha de uma arquitetura multi-agente para este sistema se fundamenta em:

1. **Separacao de Responsabilidades Clinicas**: Cada agente especializado domina um aspecto do laudo (tecnica, achados, impressao), reduzindo a carga cognitiva por etapa e aumentando a precisao.

2. **Guardrails Distribuidos**: Multiplos pontos de validacao (QA deterministica + QA por LLM) garantem conformidade terminologica, formatacao e seguranca clinica.

3. **Escalabilidade de Conhecimento**: Novos protocolos (RECIST, Bosniak, LI-RADS) podem ser adicionados como sub-agentes especializados sem refatoracao do sistema core.

4. **Auditabilidade**: Artefatos intermediarios por etapa permitem rastreabilidade completa para revisao medica e compliance regulatorio (ANVISA, CFM).

5. **Tolerancia a Falhas**: Se um agente falha ou produz output inadequado, o sistema pode reescrever ou escalar para modelos mais robustos sem perder o trabalho anterior.

---

## Parte 1: Analise Critica do Diagrama Proposto

### 1.1 Estrutura de 5 Camadas (Diagrama Original)

O diagrama apresenta uma arquitetura de 5 camadas:

| Layer | Nome | Componentes |
|-------|------|-------------|
| 1 | Input & Preprocessing | User Input -> Orchestrator -> Data Parser |
| 2 | Specialized Content Agents | Clinical, Technical, Findings, Calculations, Comparison, Oncology |
| 3 | Synthesis & Interpretation | Impression, Recommendations + Feedback/Correction Loop |
| 4 | Quality & Formatting | Terminology, Formatting, Validation, Quality Assurance |
| 5 | Output | Documento Final |

### 1.2 Pontos Fortes Identificados

- **Especializacao por dominio**: Agentes separados para Clinical, Technical, Findings, Calculations
- **Loop de correcao**: Feedback entre Layer 3 e Layer 2 para refinamento iterativo
- **QA multicamada**: Terminologia, Formatacao, Validacao e Quality Assurance como etapas distintas
- **Modularidade**: Agente de Oncologia isolado permite atualizacoes em criterios RECIST/iRECIST sem impactar outros fluxos

### 1.3 Lacunas Identificadas e Recomendacoes

#### LACUNA 1: Ausencia de Camada de Observabilidade
**Problema**: Nao ha mecanismo explicito para telemetria, logging e metricas.

**Recomendacao**: Adicionar **Layer 0: Observability Fabric**
```
- Trace ID por caso (correlacao end-to-end)
- Metricas por agente: latencia, tokens, taxa de erro
- Logs estruturados sem PHI (dados sensiveis em vault separado)
- Dashboard de saude do sistema
```

#### LACUNA 2: Ausencia de Human-in-the-Loop (HITL)
**Problema**: Para seguranca clinica, laudos com incerteza alta ou achados criticos devem ser sinalizados para revisao humana.

**Recomendacao**: Adicionar **Escalation Gateway** entre Layer 3 e Layer 4
```
Criterios de escalacao:
- needs_review = true com criticidade alta
- Multiplos <VERIFICAR> em campos essenciais
- Achados oncologicos novos (novas lesoes em RECIST)
- Washout inconclusivo em nódulo adrenal
- Score LI-RADS >= 4 ou PI-RADS >= 4
```

#### LACUNA 3: Ausencia de Camada de Consenso/Arbitragem
**Problema**: Se agentes discordam (ex: agente de Findings vs agente de Comparison), nao ha mecanismo de resolucao.

**Recomendacao**: Adicionar **Consensus Arbiter** em Layer 3
```
Estrategia:
1. Se discordancia < threshold: usar output do agente primario
2. Se discordancia >= threshold: executar terceiro agente "juiz"
3. Se persistir: marcar para revisao humana
```

#### LACUNA 4: Isolamento do Calculator
**Problema**: O diagrama mostra "Calculations" como agente LLM, mas LLMs nao devem fazer aritmetica.

**Recomendacao**: Substituir por **Calculator Service (Python/deterministico)**
```
- LLM gera compute_requests[] com numeros extraidos
- Python executa formulas whitelist (SII, washout, volume, RECIST)
- LLM recebe compute_results[] e renderiza
```

#### LACUNA 5: Seguranca e Privacidade (LGPD)
**Problema**: Nao ha camada explicita de seguranca.

**Recomendacao**: Adicionar **Security Layer** transversal
```
- Anonimizacao de PHI antes de envio a LLMs externos
- Criptografia em transito e repouso
- Audit trail completo
- Controle de acesso por role (medico, tecnico, admin)
```

---

## Parte 2: Arquitetura Proposta Revisada

### 2.1 Diagrama de Arquitetura (6 Camadas + Security Fabric)

```
+=========================================================================+
|                         SECURITY & PRIVACY FABRIC                        |
|  [PHI Anonymizer] [Encryption] [Access Control] [Audit Trail] [LGPD]    |
+=========================================================================+

+-------------------------------------------------------------------------+
| LAYER 0: OBSERVABILITY                                                   |
| [Trace Manager] [Metrics Collector] [Log Aggregator] [Alerting]         |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| LAYER 1: INPUT & PREPROCESSING                                           |
|                                                                          |
|  [Audio/STT]      [OCR Engine]       [DICOM Metadata]     [Prior Reports]|
|       |                |                   |                    |        |
|       +--------->  [Orchestrator]  <-------+--------------------+        |
|                         |                                                |
|                    [Data Parser]                                         |
|                         |                                                |
|                    [CaseBundle]                                          |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| LAYER 2: SPECIALIZED CONTENT AGENTS                                      |
|                                                                          |
|  +------------+  +------------+  +------------+  +------------+          |
|  | Clinical   |  | Technical  |  | Findings   |  | Comparison |          |
|  | Agent      |  | Agent      |  | Agent      |  | Agent      |          |
|  +------------+  +------------+  +------------+  +------------+          |
|                                                                          |
|  +------------+  +----------------+                                      |
|  | Oncology   |  | Calculator     |  <-- PYTHON (deterministico)        |
|  | Agent      |  | Service        |                                      |
|  +------------+  +----------------+                                      |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| LAYER 3: SYNTHESIS, INTERPRETATION & CONSENSUS                           |
|                                                                          |
|  +----------------+     +------------------+     +-------------------+   |
|  | Impression     | <-> | Recommendations  | <-> | Consensus Arbiter |   |
|  | Synthesizer    |     | Generator        |     | (if disagreement) |   |
|  +----------------+     +------------------+     +-------------------+   |
|           |                      |                                       |
|           |   +------------------+------------------+                    |
|           |   |         Feedback Loop              |                    |
|           +---+         (correction cycle)         +-----> Layer 2      |
|                                                                          |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| LAYER 3.5: ESCALATION GATEWAY (HUMAN-IN-THE-LOOP)                        |
|                                                                          |
|  [Risk Scorer] --> [Escalation Rules] --> [Review Queue / Dashboard]    |
|                                                                          |
|  Criterios:                                                              |
|  - needs_review = true (high severity)                                  |
|  - Multiplos <VERIFICAR> em campos criticos                             |
|  - Achados oncologicos novos (RECIST/Lugano)                            |
|  - Classificacoes de alto risco (LI-RADS 4/5, PI-RADS 4/5)              |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| LAYER 4: QUALITY & FORMATTING                                            |
|                                                                          |
|  +--------------+  +---------------+  +---------------+  +-------------+ |
|  | Terminology  |  | Formatting    |  | Validation    |  | QA Final    | |
|  | Checker      |  | Engine        |  | (Schema/Zod)  |  | (LLM + Det) | |
|  +--------------+  +---------------+  +---------------+  +-------------+ |
|                                                                          |
|  [Banlist Regex] [Blacklist Terms] [Meta-text Detector] [Style Guide]   |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| LAYER 5: OUTPUT                                                          |
|                                                                          |
|  [ReportJSON] --> [Markdown Renderer] --> [PDF Generator]               |
|                                                                          |
|  Artefatos salvos:                                                       |
|  - bundle.json (input normalizado)                                      |
|  - draft_report.json                                                    |
|  - qa_report.json                                                       |
|  - compute_requests.json + compute_results.json                         |
|  - final_report.json                                                    |
|  - final_report.md                                                      |
+-------------------------------------------------------------------------+
```

---

## Parte 3: Especificacao Tecnica dos Agentes

### 3.1 Agente Clinical (Layer 2)

**Responsabilidade**: Processar indicacao clinica e contexto do paciente.

**Inputs**:
- Pedido medico
- Questionario/anamnese
- Dados demograficos (idade -> faixa etaria OMS)

**Outputs**:
```json
{
  "clinical_indication": "string (reformulada com terminologia medica)",
  "age_bracket": "enum (OMS: lactente, crianca, adolescente, adulto jovem, etc)",
  "relevant_history": ["string"],
  "clinical_question": "string (pergunta a ser respondida pelo exame)"
}
```

**Regras Especificas**:
- NUNCA incluir idade numerica no laudo final
- Usar faixa etaria OMS em minuscula ("paciente idoso", nao "Paciente Idoso")
- Reformular indicacoes vagas com terminologia precisa

---

### 3.2 Agente Technical (Layer 2)

**Responsabilidade**: Gerar secao TECNICA E PROTOCOLO.

**Inputs**:
- Modalidade (TC, RM, USG)
- Tipo de contraste (se usado)
- Fases adquiridas
- Limitacoes tecnicas

**Outputs**:
```json
{
  "technique_paragraph": "string (paragrafo narrativo, sem marcadores)",
  "modality": "TC | RM | USG",
  "contrast": {
    "used": true,
    "type": "Henetix® (iobitridol 300 mg I/mL)",
    "volume_ml": 100,
    "route": "endovenosa"
  },
  "phases": ["pre-contraste", "arterial", "portal", "equilibrio"],
  "limitations": ["string"]
}
```

**Regras Fixas (Hardcoded)**:
- TC: SEMPRE "tomoografo multislice (64 canais)"
- TC contraste: SEMPRE "Henetix®" (corrigir "Renetix")
- RM: especificar campo (1.5T ou 3.0T)
- Sem contraste: OBRIGATORIO adicionar limitacao de caracterizacao

---

### 3.3 Agente Findings (Layer 2)

**Responsabilidade**: Gerar secao ACHADOS por orgao.

**Inputs**:
- Transcricao de ditado
- Dados extraidos (OCR, JSON)
- Medidas numericas

**Outputs**:
```json
{
  "findings": [
    {
      "organ": "Figado",
      "items": [
        "Parenquima hepatico homogeneo...",
        "Nao ha lesoes focais..."
      ],
      "key_image_refs": ["Fig. 1"],
      "needs_calculation": ["hepatic_steatosis"]
    }
  ],
  "compute_requests": [
    {
      "id": "steatosis_1",
      "type": "hepatic_steatosis_hu",
      "inputs": { "liver_hu": 42 }
    }
  ]
}
```

**Lista Sistematica de Orgaos (TC Abdome)**:
1. Figado
2. Vesicula Biliar e Vias Biliares Extra-Hepaticas
3. Pancreas
4. Baco
5. Rins e Vias Urinarias Superiores
6. Adrenais
7. Bexiga e Trato Urinario Inferior
8. Orgaos Pelvicos (Utero/Anexos ou Prostata/Vesiculas Seminais)
9. Estomago e Duodeno
10. Intestino Delgado
11. Colon e Apendice Cecal
12. Vasos Abdominais e Pelvicos
13. Linfonodos Retroperitoneais e Pelvicos
14. Mesenterio e Peritonio
15. Parede Abdominal e Pelvica
16. Estruturas Osseas
17. Bases Pulmonares, Pleura Basal e Diafragma

**Regra Critica**: Se orgao nao mencionado no input, descrever como normal + `<VERIFICAR>`

---

### 3.4 Calculator Service (Layer 2 - Python)

**Responsabilidade**: Executar TODOS os calculos aritmeticos.

**Principio Fundamental**: O LLM NUNCA calcula. Ele extrai numeros e solicita calculos.

**Formulas Whitelist**:

| Tipo | Formula | Output |
|------|---------|--------|
| `volume_ellipsoid` | 0.52 × D1 × D2 × D3 | Volume em cm³ |
| `hepatic_steatosis_hu` | Classificacao por HU | Grau (ausente/leve/moderada/acentuada) |
| `adrenal_washout` | APW e RPW | Percentuais |
| `adrenal_csi` | SII, OP/IP, A/S-CSI | Indices com interpretacao |
| `splenic_volume_chow` | ULN por sexo/altura | Esplenomegalia sim/nao |
| `recist_sld_variation` | (SLD_atual - SLD_nadir) / SLD_nadir × 100 | Variacao percentual |
| `renal_skin_distance` | Media de 3 medidas | Distancia em cm |
| `resistive_index` | (VPS - VD) / VPS | IR |

**Contrato de Request**:
```json
{
  "id": "unique_id",
  "type": "adrenal_washout",
  "inputs": {
    "hu_pre": 12,
    "hu_portal": 85,
    "hu_delayed": 38
  }
}
```

**Contrato de Response**:
```json
{
  "id": "unique_id",
  "type": "adrenal_washout",
  "ok": true,
  "results": {
    "apw_percent": 64.4,
    "rpw_percent": 55.3,
    "interpretation": "Compativel com adenoma (APW > 60%)"
  },
  "error": null
}
```

---

### 3.5 Agente Comparison (Layer 2)

**Responsabilidade**: Gerar secao COMPARACAO com exames anteriores.

**Cenarios Suportados**:

| Cenario | Tratamento |
|---------|------------|
| Sem exame previo | "Nao foram disponibilizados exames previos para comparacao." |
| Mesmo servico (SABIN) | Comparacao direta com medidas e variacao percentual |
| Laudo externo (sem imagens) | Ressalvas sobre comparacao indireta |
| Imagens em filme | Ressalvas sobre limitacoes do formato |
| USG vs TC | Ressalvas sobre diferenca de modalidades |

**Output**:
```json
{
  "comparison_text": "string",
  "prior_exams": [
    {
      "date": "2025-06-15",
      "modality": "TC",
      "institution": "SABIN",
      "images_available": true
    }
  ],
  "oncologic_comparison": {
    "sld_baseline_mm": 45,
    "sld_nadir_mm": 32,
    "sld_current_mm": 28,
    "variation_percent": -12.5,
    "response_category": "PR (Partial Response)"
  }
}
```

---

### 3.6 Agente Oncology (Layer 2)

**Responsabilidade**: Avaliacoes conforme criterios oncologicos.

**Criterios Suportados**:
- RECIST 1.1
- iRECIST
- mRECIST
- Choi
- Lugano (linfomas)

**Regra Critica**: O agente NAO seleciona lesoes-alvo nem mede nas imagens. Depende 100% do input.

**Output**:
```json
{
  "criteria": "RECIST 1.1",
  "target_lesions": [
    {
      "location": "Figado segmento VIII",
      "current_mm": 25,
      "baseline_mm": 32,
      "nadir_mm": 28
    }
  ],
  "non_target_lesions": ["Linfonodo retroperitoneal - estavel"],
  "new_lesions": false,
  "response_category": "PR",
  "needs_confirmation": false
}
```

---

### 3.7 Impression Synthesizer (Layer 3)

**Responsabilidade**: Gerar secao IMPRESSAO sintetizando todos os achados.

**Estrutura Obrigatoria**:
1. **Diagnostico principal** (usando lexico de certeza)
2. **Diagnosticos diferenciais** (se pertinentes)
3. **Relacao com a indicacao clinica**
4. **Recomendacoes** (IA gera padrao, input sobrescreve)
5. **Achados incidentais**
6. **Eventos adversos**

**Lexico de Certeza Padronizado**:

| Termo | Probabilidade | Uso |
|-------|---------------|-----|
| Compativel com / Consistente com | >90% | Confirmacao forte |
| Sugestivo de / Suspeito para | ~75% | Favorece hipotese |
| Inespecifico / Indeterminado | ~50% | Requer correlacao |
| Pouco sugestivo de | ~25% | Desfavorece hipotese |
| Improvavel para | <10% | Refuta hipotese |

---

### 3.8 QA Agent (Layer 4)

**Responsabilidade**: Validacao final antes do output.

**Componentes**:

#### QA Deterministico (Regex/Banlist)

**Meta-texto Proibido** (reprovar se encontrar):
```regex
(?i)\b(audio|transcri|ocr|input|prompt|anex|questionario|documento assistencial)\b
(?i)\b(neste laudo|este laudo|neste exame|este exame|achados acima|conforme descrito|como mencionado|na impressao)\b
```

**Blacklist Terminologica** (reprovar se encontrar):
```regex
(?i)\bsubsentimetric\w*\b  -> subcentimetrico
(?i)\bzonalidade\s+prostatica\b  -> zonagem prostatica
(?i)\bcolo\s+sigmoide\b  -> colon sigmoide
(?i)\bFNH\b  -> HNF (expandir na 1a mencao)
(?i)\bexcarator\b  -> excretor
(?i)\blaceriza\w*\b  -> laceracoes
(?i)\bincisural\w*\b  -> incisional
```

#### QA por LLM

**Prompt de QA**:
```
Voce e um auditor de qualidade de laudos radiologicos.
Verifique:
1. Conformidade com Style Guide Core
2. Ausencia de meta-texto
3. Terminologia correta
4. Estrutura de secoes completa
5. Lexico de certeza apropriado
6. Calculos referenciados em compute_results
```

**Output**:
```json
{
  "pass": false,
  "issues": [
    {
      "severity": "high",
      "type": "blacklist",
      "detail": "Termo 'subsentimetrico' encontrado na linha 45"
    }
  ],
  "suggested_fixes": ["Substituir 'subsentimetrico' por 'subcentimetrico'"]
}
```

---

## Parte 4: Fluxo de Execucao (Pipeline)

### 4.1 Fluxo Principal

```
1. [Input] -> User submete caso (audio + OCR + anexos)
           |
2. [Orchestrator] -> Valida inputs, gera trace_id
           |
3. [Data Parser] -> Normaliza em CaseBundle
           |
4. [Parallel Agents] -> Clinical, Technical, Findings, Comparison, Oncology
           |                        |
           |              [Calculator Service] (se compute_requests)
           |
5. [Synthesis] -> Impression + Recommendations
           |
           +---> [Consensus Arbiter] (se discordancia)
           |
6. [QA Deterministico] -> Banlist, Blacklist, Format
           |
           +---> FAIL? -> [Rewrite Agent] -> Loop (max 2 ciclos)
           |
7. [QA LLM] -> Validacao semantica
           |
           +---> FAIL? -> [Gating] -> Escalar para modelo mais forte
           |                        -> OU marcar para revisao humana
           |
8. [Escalation Gateway] -> Verifica criterios de HITL
           |
           +---> needs_review? -> [Review Queue]
           |
9. [Renderer] -> JSON -> Markdown -> PDF
           |
10. [Output] -> Salva artefatos + Retorna laudo
```

### 4.2 Ciclo de Correcao

```
Draft Report
     |
     v
[QA Deterministico]
     |
     +-- PASS --> [QA LLM]
     |
     +-- FAIL --> [Rewrite Agent]
                       |
                       v
                  Draft v2
                       |
                       +-- Ciclo <= 2? --> [QA Deterministico]
                       |
                       +-- Ciclo > 2? --> [Gating/Escalation]
```

### 4.3 Gating (Escalacao de Modelo)

| Situacao | Acao |
|----------|------|
| QA falha 2x com modelo leve (o4-mini) | Escalar para modelo intermediario (o3) |
| QA falha 2x com modelo intermediario | Escalar para modelo forte (GPT-5.2) |
| QA falha com modelo forte | Marcar para revisao humana obrigatoria |

---

## Parte 5: Estrutura de Codigo

### 5.1 Organizacao de Diretorios

```
src/
├── adapters/
│   ├── openai/
│   │   ├── client.ts           # Wrapper HTTP com retry/telemetry
│   │   ├── prompts.ts          # Catalogo de prompts
│   │   └── schemas.ts          # Zod schemas
│   └── gemini/
│       └── prompts.ts          # Prompts existentes (OCR, header)
│
├── core/
│   └── reportGeneration/
│       ├── index.ts            # Export barrel
│       ├── pipeline.ts         # Orquestrador principal
│       ├── agents/
│       │   ├── clinical.ts
│       │   ├── technical.ts
│       │   ├── findings.ts
│       │   ├── comparison.ts
│       │   ├── oncology.ts
│       │   ├── impression.ts
│       │   └── qa.ts
│       ├── consensus.ts        # Arbitragem de discordancia
│       ├── escalation.ts       # Gateway HITL
│       └── renderer.ts         # JSON -> Markdown
│
├── services/
│   └── calculator/
│       ├── calculator-client.ts   # Cliente TS para chamar Python
│       ├── formulas.py            # Servico Python (FastAPI)
│       ├── schemas.py             # Pydantic models
│       └── tests/
│           └── test_formulas.py
│
├── types/
│   ├── case-bundle.ts
│   ├── report-json.ts
│   ├── compute-request.ts
│   └── qa-result.ts
│
└── utils/
    ├── banlist.ts             # Regex de meta-texto
    ├── blacklist.ts           # Termos proibidos
    └── terminology.ts         # Mapeamento de correcoes
```

### 5.2 Schemas (Zod)

```typescript
// types/report-json.ts
import { z } from 'zod';

export const ReportFindingSchema = z.object({
  section: z.string(),
  items: z.array(z.string()),
  key_images: z.array(z.string()).optional(),
});

export const ReportJSONSchema = z.object({
  title: z.string(),
  technique: z.array(z.string()),
  findings: z.array(ReportFindingSchema),
  impression: z.array(z.string()),
  probability_note: z.array(z.string()),
  references: z.array(z.string()),
  flags: z.object({
    needs_review: z.boolean(),
    missing_data_markers: z.array(z.string()),
    qa_risks: z.array(z.string()),
  }),
});

export type ReportJSON = z.infer<typeof ReportJSONSchema>;
```

---

## Parte 6: Observabilidade e Metricas

### 6.1 Metricas por Agente

| Metrica | Descricao | Alerta |
|---------|-----------|--------|
| `agent_latency_ms` | Tempo de execucao por agente | p99 > 5000ms |
| `agent_tokens_input` | Tokens consumidos (input) | - |
| `agent_tokens_output` | Tokens gerados (output) | - |
| `agent_error_rate` | Taxa de erro por agente | > 5% |
| `qa_pass_rate` | Taxa de aprovacao no QA | < 90% |
| `qa_cycle_count` | Numero medio de ciclos de correcao | > 1.5 |
| `escalation_rate` | Taxa de escalacao para revisao humana | > 10% |
| `banned_terms_frequency` | Termos da blacklist mais frequentes | - |

### 6.2 Artefatos por Caso

```
cases/{case_id}/artifacts/
├── bundle.json              # Input normalizado
├── agent_outputs/
│   ├── clinical.json
│   ├── technical.json
│   ├── findings.json
│   ├── comparison.json
│   └── oncology.json
├── compute_requests.json    # Calculos solicitados
├── compute_results.json     # Calculos executados
├── draft_report_v1.json
├── qa_report_v1.json
├── draft_report_v2.json     # Se houve reescrita
├── qa_report_v2.json
├── final_report.json
└── final_report.md
```

### 6.3 Politica de Retencao

| Tipo | Retencao | Justificativa |
|------|----------|---------------|
| Artefatos intermediarios | 30 dias | Debug e auditoria |
| Laudos finais | Permanente | Requisito legal |
| Logs sem PHI | 90 dias | Observabilidade |
| Metricas agregadas | 1 ano | Tendencias |

---

## Parte 7: Seguranca e Compliance (LGPD/CFM)

### 7.1 Anonimizacao de PHI

Antes de enviar dados para LLMs externos:

```typescript
const anonymizedBundle = {
  ...caseBundle,
  patient: {
    age_bracket: getAgeBracket(patient.birthDate), // "adulto de meia-idade"
    sex: patient.sex,
    // Nome, CPF, data de nascimento NAO sao enviados
  },
  clinical_context: removePHI(caseBundle.clinical_context),
};
```

### 7.2 Audit Trail

Cada acao gera registro:

```json
{
  "timestamp": "2026-01-19T10:30:00Z",
  "action": "report_generated",
  "case_id": "abc123",
  "user_id": "dr_silva",
  "agent_chain": ["clinical", "technical", "findings", "impression", "qa"],
  "qa_cycles": 1,
  "escalated": false,
  "final_status": "approved"
}
```

### 7.3 Controle de Acesso

| Role | Permissoes |
|------|------------|
| Medico Radiologista | Gerar, revisar, aprovar laudos |
| Tecnico | Submeter casos, visualizar status |
| Admin | Configurar sistema, ver metricas |
| Auditor | Acesso read-only a audit trail |

---

## Parte 8: Proximos Passos Praticos

### Fase 1: Fundacao (Semana 1-2)

1. [ ] Criar estrutura de diretorios conforme especificado
2. [ ] Implementar Calculator Service (Python/FastAPI)
3. [ ] Definir Zod schemas para todos os contratos
4. [ ] Configurar observabilidade basica (trace_id, logs)

### Fase 2: Agentes Core (Semana 3-4)

5. [ ] Implementar Clinical Agent
6. [ ] Implementar Technical Agent
7. [ ] Implementar Findings Agent (mais complexo)
8. [ ] Integrar Calculator Service com Findings

### Fase 3: Sintese e QA (Semana 5-6)

9. [ ] Implementar Impression Synthesizer
10. [ ] Implementar QA Deterministico (banlist/blacklist)
11. [ ] Implementar QA LLM
12. [ ] Implementar ciclo de correcao

### Fase 4: Especializacoes (Semana 7-8)

13. [ ] Implementar Comparison Agent
14. [ ] Implementar Oncology Agent (RECIST)
15. [ ] Implementar Consensus Arbiter

### Fase 5: Seguranca e HITL (Semana 9-10)

16. [ ] Implementar Escalation Gateway
17. [ ] Implementar Review Queue/Dashboard
18. [ ] Configurar anonimizacao de PHI
19. [ ] Implementar audit trail

### Fase 6: Integracao e Testes (Semana 11-12)

20. [ ] Golden set de casos de regressao
21. [ ] Testes de carga
22. [ ] Documentacao final
23. [ ] Deploy em staging

---

## Parte 9: Criterios de Aceitacao

### 9.1 Funcionais

1. **Zero Meta-texto**: Laudo final NUNCA contem mencao a "audio", "input", "neste laudo", etc.
2. **Blacklist Enforced**: Termos da blacklist NUNCA aparecem no output final.
3. **Calculos Corretos**: Todos os indices/percentuais vem do Calculator Service (Python).
4. **Estrutura Completa**: Todas as secoes obrigatorias presentes no laudo.
5. **Marcadores de Duvida**: `<VERIFICAR>` usado quando dados essenciais ausentes.

### 9.2 Nao-Funcionais

| Metrica | Target |
|---------|--------|
| Latencia end-to-end (p95) | < 30 segundos |
| Taxa de QA pass (1o ciclo) | > 85% |
| Taxa de QA pass (apos correcao) | > 99% |
| Taxa de escalacao HITL | < 5% |
| Disponibilidade | > 99.5% |

### 9.3 Compliance

1. [ ] Laudos salvos conforme requisitos CFM
2. [ ] Audit trail completo e imutavel
3. [ ] PHI nunca enviado a LLMs externos sem anonimizacao
4. [ ] Acesso controlado por role

---

## Apendice A: Prompt do Staff Engineer Adaptado para Radiologia

```markdown
# Staff Engineer Protocol — Radiology Report Platform

## Sua Identidade
Voce e um Staff Engineer especializado em sistemas criticos de saude.
Sua responsabilidade e garantir que o sistema de laudos radiologicos seja:
- Clinicamente seguro (nunca inventar dados)
- Tecnicamente robusto (QA multicamada)
- Auditavel (artefatos rastreiaveis)
- Conforme regulamentacao (LGPD, CFM, ANVISA)

## Protocolos Obrigatorios

### Protocolo Omega (Seguranca Maxima)
- **Lei de Chesterton**: Nunca remova logica de validacao sem entender o caso clinico que ela protege.
- **Preservacao de Dados**: Jamais delete artefatos de caso sem backup.
- **PHI Seguro**: Dados de paciente nunca em logs ou enviados a LLMs externos.

### Protocolo Anti-Alucinacao
- LLM NUNCA calcula (usa Calculator Service)
- LLM NUNCA inventa medidas (usa `<VERIFICAR>`)
- LLM NUNCA menciona suas fontes (proibido meta-texto)

### Protocolo de QA
- QA Deterministico SEMPRE executa antes de QA LLM
- Maximo 2 ciclos de correcao antes de escalar
- Casos com risco alto sempre vao para revisao humana

### Protocolo de Mudanca
- Mudancas em prompts requerem teste com golden set
- Mudancas em blacklist requerem aprovacao de radiologista
- Mudancas em formulas requerem validacao com casos conhecidos
```

---

## Apendice B: Glossario

| Termo | Definicao |
|-------|-----------|
| **CaseBundle** | Estrutura normalizada contendo todos os dados de um caso |
| **Gating** | Mecanismo de escalacao para modelos mais fortes |
| **HITL** | Human-in-the-Loop - revisao humana obrigatoria |
| **Banlist** | Lista de termos de meta-texto proibidos |
| **Blacklist** | Lista de termos terminologicos incorretos |
| **Compute Request** | Solicitacao de calculo para o Calculator Service |
| **Golden Set** | Conjunto de casos de referencia para testes de regressao |

---

**Documento elaborado por Staff Engineer**
**Revisao tecnica pendente**
**Aprovacao clinica pendente**
