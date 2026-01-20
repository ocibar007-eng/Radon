# Plano de Implementacao: Arquitetura Multi-Agente para Laudos Radiologicos

**Versao:** 1.2
**Data:** Janeiro 2026
**Autor:** Staff Engineer - Sistema de Laudos Radiologicos
**Status:** Proposta Tecnica para Aprovacao
**Ultima Atualizacao:** Enriquecido com insights do Radon V3 Industrial Evolution

---

## CHANGELOG v1.2 - Enriquecimentos Radon V3

| Secao | Enriquecimento | Fonte |
|-------|----------------|-------|
| Parte 2 | Separacao Medical Reasoner vs Stylist | Radon V3 Dossier |
| Parte 3 | Sistema de Filas de Risco (S1/S2/S3) | Radon V3 Manual |
| Parte 4 | Self-Healing com MAX_ATTEMPTS | Radon V3 Manual |
| Parte 5 | Parser Sujo para JSON da LLM | Radon V3 War Stories |
| Parte 6 | Data Flywheel com Tags de Feedback | Radon V3 Frontend |
| Parte 8 | Scripts Operacionais (drift_sentinel) | Radon V3 Power-Ups |
| NOVO | Parte 16: Licoes Aprendidas Radon V3 | Consolidacao |

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
| `pulsatility_index` | (VPS - VD) / Vm | IP |
| `renal_artery_ratio` | VPS_renal / VPS_aorta | RAR (>3.5 = estenose) |
| `psa_density` | PSA / Volume_prostatico | PSAD (ng/mL²) |
| `splenic_index` | Comp × Larg × Esp | ILC (normal 120-480) |
| `bladder_wall_thickness` | Medida direta | Espessura (normal <3mm) |
| `post_void_residual` | 0.52 × D1 × D2 × D3 | RPM em mL |
| `hepatorenal_index` | HU_figado / HU_baco | Indice (>1.0 = normal) |
| `liver_spleen_diff` | HU_baco - HU_figado | Diferenca >10 HU = esteatose |

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

---

## Parte 10: Especificacoes por Modalidade

### 10.1 Ultrassonografia (USG) - Regras Especificas

**Terminologia Obrigatoria (Blacklist USG)**:
- USAR: anecoico, hipoecoico, isoecoico, hiperecoico, ecogenico
- NAO USAR: hipodenso, hiperdenso, realce (termos de TC)
- NAO USAR: hipersinal, hipossinal, T1, T2 (termos de RM)

**Artefatos a Descrever**:
- Reforco acustico posterior (cistos)
- Sombra acustica posterior (calculos)
- Artefato em "cauda de cometa" (adenomiomatose)

**Equipamento Padrao**: Mindray® Resona I8

**Lista Sistematica de Orgaos (USG Abdome Total)**:
1. Figado (diametro CC na linha hemiclavicular)
2. Vesicula biliar e vias biliares
3. Pancreas (se visivel)
4. Baco (maior eixo longitudinal)
5. Rins (comprimento, espessura cortical)
6. Lojas adrenais
7. Bexiga (paredes, conteudo, RPM)
8. Orgaos pelvicos (limitado)
9. Grandes vasos (aorta, cava, porta)
10. Cavidade peritoneal (liquido livre)

### 10.2 Doppler - Regras Especificas

**Indices Obrigatorios por Territorio**:

| Territorio | Parametros | Valores Normais |
|------------|------------|-----------------|
| Renal | IR, VPS, VD | IR 0.50-0.70 |
| Hepatico (Arteria) | IR | 0.55-0.70 |
| Portal | Diametro, Velocidade, Direcao | <13mm, 20-40cm/s, hepatopetal |
| Veias Hepaticas | Padrao de onda | Trifasico |
| Aorta | Diametro | <3.0cm |
| Tronco Celiaco | VPS | <200cm/s |
| AMS | VPS | <275cm/s |

**Regra Critica - Angulo de Insonacao**:
- Medidas de velocidade: angulo <= 60°
- IR e IP: menos dependentes do angulo

### 10.3 Tomografia Computadorizada (TC) - Regras Especificas

**Equipamento Fixo**: Tomografo multislice (64 canais)

**Contraste Fixo**: Henetix® (iobitridol 300 mg I/mL)
- Corrigir "Renetix" para "Henetix®"

**Fases de Aquisicao**:
- Pre-contraste (obrigatoria para washout adrenal)
- Arterial (20-35s)
- Portal (60-80s)
- Equilibrio/Tardia (3-5 min ou 15 min para adrenal)

**Classificacao de Esteatose por HU** (TC sem contraste ~120 kVp):
| HU Medio | Classificacao |
|----------|---------------|
| >= 57 | Ausente/Limite |
| 40-56 | Leve |
| 23-39 | Moderada |
| < 23 | Acentuada/Grave |

**Washout Adrenal**:
- APW > 60% = adenoma
- RPW > 40% = adenoma (quando pre-contraste indisponivel)
- HU pre < 10 = adenoma rico em lipidios (dispensa washout)

**Classificacoes Obrigatorias**:
- Bosniak: I, II, IIF, III, IV (romanos)
- Segmentos hepaticos: romanos (I-VIII)

### 10.4 Ressonancia Magnetica (RM) - Regras Especificas

**Campo Magnetico**: Especificar (1.5T ou 3.0T)

**LI-RADS (Figado em pacientes de risco)**:
| Categoria | Probabilidade CHC | Caracteristicas |
|-----------|-------------------|-----------------|
| LR-1 | 0% | Definitivamente benigno |
| LR-2 | ~0% | Provavelmente benigno |
| LR-3 | 30-40% | Intermediario |
| LR-4 | 70-80% | Provavelmente CHC |
| LR-5 | >95% | Definitivamente CHC |
| LR-M | - | Maligno nao-CHC |
| LR-TIV | - | Tumor em veia |

**Caracteristicas Principais LI-RADS**:
- APHE (hiper-realce arterial)
- Washout (portal/tardia)
- Capsula realcante
- Crescimento limiar (>=50% em <=6 meses)

**PI-RADS (Prostata)**:
| Categoria | Probabilidade csPCa |
|-----------|---------------------|
| PI-RADS 1 | Muito baixa |
| PI-RADS 2 | Baixa |
| PI-RADS 3 | Intermediaria |
| PI-RADS 4 | Alta |
| PI-RADS 5 | Muito alta |

**Sequencia Dominante por Zona**:
- Zona Periferica: DWI/ADC
- Zona de Transicao: T2

**Chemical Shift Imaging (Adrenal)**:
- SII% = ((IP - OP) / IP) × 100
- CSI ratio = OP / IP
- SII > 20% ou CSI < 0.71 = adenoma rico em lipidios

---

## Parte 11: Pediatria - Consideracoes Especiais

### 11.1 Valores de Referencia Pediatricos

Os valores de referencia em pediatria variam por idade/peso/altura. O Calculator Service deve incorporar tabelas de:
- Konus et al. (1998) - Figado, baco, rins
- Rosenbaum et al. (1984) - Rins
- Haber et al. (1998) - Utero e ovarios
- Yekeler et al. (2004) - Timo

### 11.2 Adaptacoes de Protocolo USG Pediatrico

```
TECNICA E PROTOCOLO (Pediatrico):
"Devido a faixa etaria pediatrica, o exame foi otimizado com o uso
combinado de transdutores, incluindo o linear de alta frequencia,
para melhor detalhamento anatomico."
```

### 11.3 Faixas Etarias OMS (Obrigatorio)

| Faixa | Idade |
|-------|-------|
| Recem-nascido | 0-28 dias |
| Lactente | 29 dias - 1 ano |
| Crianca | 1-9 anos |
| Adolescente | 10-19 anos |
| Adulto jovem | 20-39 anos |
| Adulto de meia-idade | 40-59 anos |
| Idoso | 60-79 anos |
| Idade muito avancada | >= 80 anos |

---

## Parte 12: Sistemas de Classificacao (RADS)

### 12.1 O-RADS (Ovario)

| Categoria | Risco Malignidade | Conduta |
|-----------|-------------------|---------|
| O-RADS 1 | 0% | Rotina |
| O-RADS 2 | <1% | Acompanhamento anual |
| O-RADS 3 | 1-10% | Acompanhamento 8-12 sem |
| O-RADS 4 | 10-50% | Especialista |
| O-RADS 5 | >50% | Especialista |

### 12.2 BI-RADS (Mama)

| Categoria | Risco Malignidade | Conduta |
|-----------|-------------------|---------|
| BI-RADS 0 | Incompleto | Exames complementares |
| BI-RADS 1 | 0% | Rastreamento rotina |
| BI-RADS 2 | 0% | Rastreamento rotina |
| BI-RADS 3 | 0-2% | Acompanhamento 6 meses |
| BI-RADS 4 | 2-95% | Biopsia |
| BI-RADS 5 | >=95% | Biopsia/Cirurgia |
| BI-RADS 6 | Confirmado | Tratamento |

### 12.3 Criterios Oncologicos

**RECIST 1.1**:
- CR: Desaparecimento de todas as lesoes-alvo
- PR: Reducao >=30% na soma dos diametros
- PD: Aumento >=20% ou novas lesoes
- SD: Nem PR nem PD

**iRECIST** (Imunoterapia):
- Adiciona categorias iUPD e iCPD para pseudoprogressao
- iUPD requer confirmacao em 4-8 semanas

**Choi** (GIST):
- Considera densidade (HU) alem de tamanho
- Resposta: reducao >=10% tamanho OU >=15% densidade

**Lugano** (Linfomas):
- Baseado em PET/CT
- Deauville Score 1-5

---

## Parte 13: Controle de Qualidade (QA) - Detalhamento

### 13.1 Blacklist Terminologica Completa

```javascript
const BLACKLIST = {
  // Ortografia
  "subsentimetric": "subcentimetrico",
  "excarator": "excretor",
  "laceriza": "laceracao",
  "incisural": "incisional",
  "RESSONANIA": "ressonancia",
  "colangio-ressonancia": "colangiorressonancia",
  "colo sigmoide": "colon sigmoide",
  "supra-renal": "suprarrenal",

  // Modalidade incorreta
  "zonalidade prostatica": "zonagem prostatica",
  "gadolinico": "contraste a base de gadolinio",

  // Preferencias
  "pequenina": "pequena ou diminuta",
  "discretamente hepatomegalizado": "discreta hepatomegalia",
  "lesoes focalizadas": "lesoes focais",
  "FNH": "HNF",

  // Anglicanismos
  "bone island": "ilhota ossea",
  "air trapping": "aprisionamento aereo",
  "steal syndrome": "sindrome do roubo"
};
```

### 13.2 Banlist de Meta-texto

```javascript
const BANLIST_REGEX = [
  // Fontes do input
  /\b(audio|transcri|ocr|input|prompt|anex|questionario)\b/gi,
  /\b(documento assistencial|dados fornecidos|segundo o relato)\b/gi,
  /\b(conforme informado|conforme o audio|segundo o input)\b/gi,

  // Meta-referencias ao laudo
  /\b(neste laudo|este laudo|neste exame|este exame)\b/gi,
  /\b(o exame mostra|achados acima|conforme descrito)\b/gi,
  /\b(na impressao|como mencionado|este relatorio)\b/gi
];
```

### 13.3 Validacao de Calculos

Todo calculo no laudo DEVE ter correspondente em `compute_results[]`:

```javascript
function validateCalculations(report, computeResults) {
  const calculatedValues = extractNumbers(report);
  const resultIds = computeResults.map(r => r.id);

  for (const value of calculatedValues) {
    if (value.isCalculated && !resultIds.includes(value.sourceId)) {
      throw new QAError(`Calculo ${value.type} nao encontrado em compute_results`);
    }
  }
}
```

---

## Parte 14: Integracao Python Calculator - Especificacao Completa

### 14.1 API Endpoints

```python
# POST /compute
# Body: { "calculations": [ComputeRequest] }
# Response: [ComputeResult]

# GET /health
# Response: { "status": "healthy", "formulas_available": [...] }

# GET /formulas
# Response: { "formulas": [FormulaSpec] }
```

### 14.2 Implementacao de Formulas Adicionais

```python
# Doppler Indices
def resistive_index(vps: float, vd: float) -> float:
    return (vps - vd) / vps

def pulsatility_index(vps: float, vd: float, vm: float) -> float:
    return (vps - vd) / vm

def renal_artery_ratio(vps_renal: float, vps_aorta: float) -> float:
    return vps_renal / vps_aorta

# Prostate
def psa_density(psa: float, volume_ml: float) -> float:
    return psa / volume_ml

# Hepatic Steatosis
def steatosis_grade(liver_hu: float) -> str:
    if liver_hu >= 57:
        return "ausente_ou_limite"
    elif liver_hu >= 40:
        return "leve"
    elif liver_hu >= 23:
        return "moderada"
    else:
        return "acentuada"

# Splenic Index (Chow et al.)
def splenic_uln_length(height_cm: float, sex: str) -> float:
    if sex.lower() == "f":
        return 0.0282 * height_cm + 7.5526
    return 0.0544 * height_cm + 3.6693

def splenic_uln_volume(height_cm: float, sex: str) -> float:
    if sex.lower() == "f":
        return 7.0996 * height_cm - 939.5
    return 4.3803 * height_cm - 457.15
```

### 14.3 Regras de Arredondamento

| Tipo | Casas Decimais | Exemplo |
|------|----------------|---------|
| Percentuais (SII, APW, RPW) | 1 | 52.6% |
| Razoes (IR, IP, CSI) | 2-3 | 0.68, 0.474 |
| Volumes (cm³/mL) | 1 | 45.2 mL |
| Medidas lineares | 1 | 12.5 cm |
| HU (atenuacao) | 0 | 42 HU |

---

## Parte 15: Referencias Bibliograficas do Sistema

### 15.1 Referencias Obrigatorias por Calculo

| Calculo/Criterio | Referencia |
|------------------|------------|
| Esteatose HU | Starekova J, et al. Radiology. 2021;301(2):250-262 |
| Washout Adrenal | Caoili EM, et al. Radiology. 2002;222(3):629-33 |
| Esplenomegalia Chow | Chow KU, et al. Radiology. 2016;279(1):306-13 |
| RECIST 1.1 | Eisenhauer EA, et al. Eur J Cancer. 2009;45(2):228-47 |
| iRECIST | Seymour L, et al. Lancet Oncol. 2017;18(3):e143-e152 |
| Lugano | Cheson BD, et al. J Clin Oncol. 2014;32(27):3059-68 |
| Fleischner (nodulos) | MacMahon H, et al. Radiology. 2017;284(1):228-243 |
| Biometria Pediatrica | Konus O, et al. AJR. 1998;171:1693-8 |

### 15.2 Formato de Citacao no Laudo

Quando um criterio/calculo e usado na Impressao, a referencia deve ser incluida na secao **REFERENCIAS** do laudo:

```markdown
---

**REFERENCIAS**

---

Starekova J, et al. Radiology. 2021;301(2):250-262.
Chow KU, et al. Radiology. 2016;279(1):306-13.
```

---

---

## Parte 16: Licoes Aprendidas e Enriquecimentos (Radon V3) 🆕

Esta secao consolida os insights validados do Radon V3 "Industrial Evolution" que foram integrados ao plano.

### 16.1 Otimizacao da Orquestracao (ENRIQUECIDO)

**Insight Radon V3**: Separacao rigida entre "Medical Reasoner" (logica clinica) e "Stylist" (formatacao).

**Problema Original**: Prompt unico gigante causava "esquecimento" de instrucoes de formatacao em casos complexos.

**Solucao Validada**:
```
Layer 2 (Medical Reasoner - Modelo Pro):
- Foco: Logica clinica pura
- Output: "Draft Sujo" mas medicamente perfeito
- NAO se preocupa com Markdown/formatacao

Layer 3 (Stylist - Modelo Flash):
- Foco: Formatacao e estilo
- Input: Draft do Layer 2
- Output: Laudo formatado final
- NAO inventa diagnosticos
```

**Aplicacao no Plano Multi-Agente**:
- Findings Agent (Layer 2) → foco em conteudo clinico
- Formatting Engine (Layer 4) → foco em apresentacao
- Nunca misturar responsabilidades no mesmo prompt

### 16.2 Sistema de Filas de Risco (ENRIQUECIDO)

**Insight Radon V3**: Classificacao automatica em 3 filas baseada em Risk Scoring.

**Implementacao Validada**:

| Fila | Cor | Criterios | Acao |
|------|-----|-----------|------|
| **S1** | 🔴 Vermelha | Hard Gate FAIL, Lateralidade incorreta, Alucinacao detectada | Revisao humana OBRIGATORIA |
| **S2** | 🟠 Laranja | Auto-Fix aplicado, Latencia alta (>10s), Multiplos `<VERIFICAR>` | Revisao humana RECOMENDADA |
| **S3** | 🟢 Verde | Passou em todos os gates, Baixo risco | Amostragem aleatoria (5%) |

**Codigo de Referencia**:
```typescript
function classifyRisk(report: ReportJSON, telemetry: Telemetry): RiskLevel {
  // S1: Falhas criticas
  if (report.flags.hard_gate_failed) return "S1";
  if (report.flags.laterality_mismatch) return "S1";
  if (report.flags.hallucination_detected) return "S1";

  // S2: Atencao necessaria
  if (report.flags.auto_fix_applied) return "S2";
  if (telemetry.latency_ms > 10000) return "S2";
  if (report.flags.missing_data_markers.length > 2) return "S2";

  // S3: Padrao
  return "S3";
}
```

### 16.3 Self-Healing com Limite de Tentativas (ENRIQUECIDO)

**Insight Radon V3**: Loop infinito de correcao e uma armadilha. MAX_ATTEMPTS = 2.

**Problema Original**: IA falhava em corrigir, sistema pedia novamente, IA falhava novamente → loop infinito.

**Solucao Validada**:
```
Geracao Inicial (Layer 3)
         |
         v
Check Hard Gates (Regex)
         |
    +----+----+
    |         |
  PASS      FAIL
    |         |
    v         v
   Fim    Incrementa attempt
              |
              v
         attempt <= 2?
              |
         +----+----+
         |         |
        SIM       NAO
         |         |
         v         v
    Injeta     Marca S1
    Feedback   Libera com flags
         |
         v
      Retry
```

**Prompt de Feedback Injetado**:
```
🚨 CRITICAL FEEDBACK: O laudo contem termo proibido "[TERMO]".
Reescreva o trecho removendo este termo. NAO altere diagnosticos.
Termo detectado em: "[CONTEXTO]"
```

### 16.4 Parser Sujo para JSON (ENRIQUECIDO)

**Insight Radon V3**: LLMs as vezes devolvem Markdown mesmo quando instruidos a retornar JSON puro.

**Problema Original**: `SyntaxError: Unexpected token` ao fazer `JSON.parse()`.

**Solucao Validada**:
```typescript
function parseGeminiJSON(raw: string): any {
  // Remove markdown code blocks
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Remove possiveis prefixos de texto
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }

  // Remove possiveis sufixos de texto
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonEnd > 0 && jsonEnd < cleaned.length - 1) {
    cleaned = cleaned.substring(0, jsonEnd + 1);
  }

  return JSON.parse(cleaned);
}
```

### 16.5 Data Flywheel com Tags de Feedback (ENRIQUECIDO)

**Insight Radon V3**: O frontend deve capturar o "raciocinio humano" via tags, nao apenas o texto final.

**Tags Validadas para Radiologia**:
```typescript
const FEEDBACK_TAGS = [
  "Terminologia",      // Palavra errada/inadequada
  "Lateralidade",      // Direita/Esquerda invertido
  "Medidas",           // Numero incorreto
  "Alucinacao",        // Achado inventado
  "Formatacao",        // Estrutura do laudo
  "Meta-texto",        // Mencao a "audio", "input"
  "Omissao",           // Faltou descrever orgao
  "Calculo"            // Indice/percentual errado
];
```

**Valor para Fine-Tuning**:
- DPO (Direct Preference Optimization) por categoria
- Exemplo: Casos com tag "Lateralidade" → treinar modelo em diferenciar esquerda/direita
- Amostragem estratificada para Golden Set

### 16.6 Banlist Refinada (ENRIQUECIDO)

**Insight Radon V3**: Palavras soltas na banlist causam falsos positivos (ex: "input calorico elevado").

**Problema Original**: Sistema bloqueava termos legitimos.

**Solucao Validada** - Usar frases especificas:
```javascript
// ERRADO - Palavras soltas
const BANLIST_WRONG = ["input", "audio", "anexo"];

// CORRETO - Frases especificas
const BANLIST_CORRECT = [
  "segundo o input",
  "conforme o audio",
  "conforme input",
  "vide anexo",
  "conforme anexo",
  "no audio ditado",
  "transcricao do audio"
];
```

### 16.7 Scripts Operacionais (ENRIQUECIDO)

**Insight Radon V3**: Scripts Python isolados permitem manutencao por Data Scientists sem tocar no backend.

**Scripts Validados para Radiologia**:

| Script | Funcao | Frequencia |
|--------|--------|------------|
| `nightly_regression.py` | Roda Golden Set, detecta regressoes | Diaria 03:00 |
| `drift_sentinel.py` | Detecta novos termos, sugere glossario | Semanal |
| `weekly_exec_report.py` | Resumo executivo para gestao | Segunda 08:00 |
| `feedback_aggregator.py` | Agrega tags de feedback para DPO | Sob demanda |

**Gargalo Identificado e Solucao**:
- `nightly_regression.py` sequencial → lento para >1000 casos
- Solucao: `ThreadPoolExecutor` ou Reservoir Sampling (500 casos)

### 16.8 Interface de Revisao (UX Validada)

**Funcionalidades que Agregam Valor ao Radiologista**:

1. **Fila Visual por Risco**:
   - Tab S1 (vermelha): Casos criticos primeiro
   - Tab S2 (laranja): Atencao
   - Tab S3 (verde): Amostragem

2. **Shadow Critic sob Demanda**:
   - Botao "Auditar com IA" chama segundo modelo
   - NAO automatico (custo dobrado)
   - Usar quando radiologista tem duvida

3. **Tags de Feedback com Checkbox**:
   - Selecao rapida (1 clique)
   - Multiplas tags por caso
   - Autocomplete para tags personalizadas

4. **Diff Visual**:
   - Mostrar original vs editado
   - Highlight de alteracoes
   - Historico de versoes

### 16.9 Decisoes de Trade-off Validadas

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Backend | Node.js/TS | IO-bound, compartilha tipos com frontend |
| Storage MVP | JSONL (append-only) | Zero infra, consultas lentas aceitavel ate 10k |
| Gates | Regex (deterministic) | Custo $0, latencia 1ms, previsivel |
| QA Semantico | LLM (sob demanda) | Complemento, nao substituto do regex |
| Frontend | React SPA (Vite) | Alta interatividade, sem necessidade de SSR |

### 16.10 Plano de Rollback (Seguranca Clinica)

**Em caso de "Alucinacao em Massa"**:

1. **Kill Switch**: Parar container Node.js imediatamente
2. **Revert**: `git revert` no `pipeline_thresholds.json`
3. **Fallback**: Rota `/v2/process` com sistema anterior como backup
4. **Comunicacao**: Notificar radiologistas sobre casos do periodo afetado
5. **Auditoria**: Revisar todos os laudos gerados no intervalo

---

## Parte 17: Roadmap Atualizado (Enriquecido)

### Fase 1: Fundacao (Semana 1-2) - SEM ALTERACOES

### Fase 2: Agentes Core (Semana 3-4) - SEM ALTERACOES

### Fase 3: Sintese e QA (Semana 5-6) - ENRIQUECIDO

9. [ ] Implementar Impression Synthesizer
10. [ ] Implementar QA Deterministico (banlist/blacklist)
    - **🆕 Usar frases especificas, nao palavras soltas**
11. [ ] Implementar QA LLM
12. [ ] Implementar ciclo de correcao
    - **🆕 MAX_ATTEMPTS = 2 para Self-Healing**
13. [ ] **🆕 Implementar Parser Sujo para JSON da LLM**

### Fase 4: Especializacoes (Semana 7-8) - ENRIQUECIDO

14. [ ] Implementar Comparison Agent
15. [ ] Implementar Oncology Agent (RECIST)
16. [ ] Implementar Consensus Arbiter
17. [ ] **🆕 Implementar Sistema de Filas de Risco (S1/S2/S3)**

### Fase 5: Seguranca e HITL (Semana 9-10) - ENRIQUECIDO

18. [ ] Implementar Escalation Gateway
19. [ ] Implementar Review Queue/Dashboard
    - **🆕 Tabs por nivel de risco (S1/S2/S3)**
    - **🆕 Shadow Critic sob demanda**
20. [ ] Configurar anonimizacao de PHI
21. [ ] Implementar audit trail
22. [ ] **🆕 Implementar Data Flywheel com Tags de Feedback**

### Fase 6: Integracao e Testes (Semana 11-12) - ENRIQUECIDO

23. [ ] Golden set de casos de regressao
24. [ ] Testes de carga
25. [ ] Documentacao final
26. [ ] Deploy em staging
27. [ ] **🆕 Implementar Scripts Operacionais (nightly_regression, drift_sentinel)**
28. [ ] **🆕 Definir Plano de Rollback**

---

**Documento elaborado por Staff Engineer**
**Revisao tecnica pendente**
**Aprovacao clinica pendente**
**Enriquecido com insights Radon V3 Industrial Evolution**
