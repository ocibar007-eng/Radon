# Sistema de Recomendações em 3 Trilhas - Radon AI

## 🎯 Visão Geral

O sistema de recomendações do Radon opera em **3 trilhas separadas e independentes**, garantindo que o laudo oficial permaneça blindado contra alucinações enquanto oferece assistência médica adicional.

### REGRA-MÃE (NÃO NEGOCIÁVEL)

**Recomendação só entra no LAUDO se:**
1. Vier da BIBLIOTECA INTERNA (>2.900 recomendações baseadas em evidências) **E**
2. For APLICÁVEL ao caso (validação de tamanho/idade/risco/contexto)

**Evidência WEB:**
- NUNCA entra no laudo
- NUNCA injeta números, intervalos ou citações no laudo
- Serve APENAS para assistência médica (trilha 2) e curadoria (trilha 3)

---

## 📋 As 3 Trilhas

### TRILHA 1: LAUDO (Oficial)

**Campo:** `evidence_recommendations`

**Conteúdo:**
- SOMENTE recomendações recuperadas da biblioteca interna
- SOMENTE recomendações aplicáveis (brackets/idade/risco validados)
- Texto EXATO da biblioteca (ou fallback genérico seguro)
- Zero tolerância a números inventados

**Validação:**
- Guard Layer: verifica que números no texto existem no payload original
- Applicability Check: valida tamanho/idade/risco/contexto
- Se falhar: fallback genérico SEM números

**Exemplo (caso aplicável):**
```json
{
  "evidence_recommendations": [
    {
      "finding_type": "pulmonary_nodule",
      "text": "TC de tórax de controle em 12 meses.",
      "conditional": false,
      "guideline_id": "FLEISCHNER_2017",
      "reference_key": "FLEISCHNER_2017"
    }
  ],
  "references": [
    {
      "key": "FLEISCHNER_2017",
      "citation": "MacMahon H, et al. Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images. Radiology 2017;284:228-243."
    }
  ]
}
```

**Exemplo (caso não aplicável):**
```json
{
  "evidence_recommendations": [
    {
      "finding_type": "pulmonary_nodule",
      "text": "Avaliar clinicamente; diretrizes disponíveis podem não ser aplicáveis a este caso específico.",
      "conditional": true
    }
  ]
}
```

**Exemplo (sem biblioteca):**
```json
{
  "evidence_recommendations": [
    {
      "finding_type": "unknown",
      "text": "Considerar correlação clínica e seguimento conforme diretrizes institucionais.",
      "conditional": false
    }
  ]
}
```

---

### TRILHA 2: PACOTE DE CONSULTA (Assistência Médica)

**Campo:** `consult_assist`

**Conteúdo:**
- Evidências de fontes permitidas (ACR, RSNA, NCCN, journals peer-reviewed)
- Citações completas + data de acesso
- **PODE** conter números SE explícitos na fonte + citação junto
- NÃO vai automaticamente pro laudo

**Uso:**
- Médico consulta/revisa
- Médico copia/adapta manualmente se quiser
- Sistema pode exibir em seção separada "ASSISTÊNCIA MÉDICA" ou "CONSULTA EXTERNA"

**Exemplo:**
```json
{
  "consult_assist": [
    {
      "finding_id": "F1",
      "title": "Diretrizes Fleischner para nódulos pulmonares",
      "summary": "A Fleischner Society publicou diretrizes para manejo de nódulos pulmonares incidentais. As recomendações variam conforme tamanho, morfologia e risco do paciente.",
      "suggested_actions": [
        "Consultar tabela completa da Fleischner Society 2017 para intervalo de seguimento específico",
        "Considerar perfil de risco do paciente (baixo vs alto risco)",
        "Avaliar morfologia (sólido vs subsólido) para protocolo adequado"
      ],
      "copy_ready_note": "Conteúdo para consulta médica. Verificar versão/escopo e adaptar ao contexto do paciente antes de usar.",
      "sources": [
        {
          "source_type": "guideline",
          "organization_or_journal": "Fleischner Society",
          "title": "Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images",
          "year": "2017",
          "url": "https://pubs.rsna.org/doi/10.1148/radiol.2017161659",
          "doi": "10.1148/radiol.2017161659",
          "accessed_at": "2026-01-31",
          "relevance": "high"
        }
      ],
      "evidence_quality": "high",
      "conflicts_or_caveats": [
        "Diretrizes aplicam-se a nódulos INCIDENTAIS (não em screening ou contexto oncológico)",
        "Atualização de 2017 substitui versão anterior de 2005"
      ],
      "numeric_safety": {
        "numbers_included": false,
        "rule": "Números específicos omitidos. Médico deve consultar tabela original da Fleischner para valores exatos."
      }
    }
  ]
}
```

**Allowlist de Fontes:**

**Primárias (prioridade máxima):**
- American College of Radiology (acr.org, acsearch.acr.org)
- RSNA (rsna.org, pubs.rsna.org, radiology.rsna.org)
- Society of Abdominal Radiology (abdominalradiology.org)
- Colégio Brasileiro de Radiologia (cbr.org.br)
- NCCN (nccn.org)
- ESR/ESUR/EUSOBI (esr.org, esur.org, eusobi.org)
- Órgãos governamentais (.gov, .nhs.uk)

**Journals (peer-reviewed):**
- AJR (ajronline.org)
- JACR (jacr.org)
- PubMed/NCBI (indexação)

**Secundárias (somente background):**
- Radiopaedia (radiopaedia.org)
- Radiology Assistant (radiologyassistant.nl)

**Blocklist:**
- Blogs, fóruns, agregadores sem revisão

---

### TRILHA 3: ALIMENTAÇÃO DA BIBLIOTECA (Curadoria)

**Campo:** `library_ingestion_candidates`

**Conteúdo:**
- Candidatos estruturados para enriquecer a biblioteca interna
- Idealmente em staging para revisão humana
- `review_required: true` obrigatório

**Uso:**
- Sistema de curadoria revisa
- Aprovado → entra na biblioteca
- Rejeitado → descartado

**Exemplo:**
```json
{
  "library_ingestion_candidates": [
    {
      "finding_type": "pulmonary_nodule",
      "trigger_terms": ["nódulo pulmonar", "pulmonary nodule", "lung nodule"],
      "candidate_recommendation_text": "TC de tórax de controle em 12 meses para nódulos sólidos de 6-8mm em pacientes de baixo risco.",
      "applicability_rules": {
        "requires": ["size_mm", "risk_category", "morphology"],
        "size_brackets": ["6-8 mm"],
        "exclusions": ["immunosuppressed", "oncologic_context"]
      },
      "citations": [
        {
          "organization_or_journal": "Fleischner Society",
          "title": "Guidelines for Management of Incidental Pulmonary Nodules",
          "year": "2017",
          "url": "https://pubs.rsna.org/doi/10.1148/radiol.2017161659",
          "doi": "10.1148/radiol.2017161659",
          "accessed_at": "2026-01-31"
        }
      ],
      "extracted_verbatim_snippet": "12-month follow-up for solid nodules 6-8mm in low-risk patients",
      "confidence_for_ingestion": "high",
      "review_required": true
    }
  ]
}
```

---

## ⚙️ Feature Flag

### RADON_WEB_EVIDENCE

**Controle:**
```bash
# Habilitar web evidence (trilhas 2 e 3)
export RADON_WEB_EVIDENCE=1

# Desabilitar (somente biblioteca - trilha 1)
unset RADON_WEB_EVIDENCE
```

**Comportamento:**

**Flag OFF (padrão):**
- Trilha 1: Biblioteca + fallback genérico
- Trilha 2: Evidências conhecidas hardcoded (Fleischner, Bosniak)
- Trilha 3: Vazio

**Flag ON:**
- Trilha 1: Biblioteca + fallback genérico (sem mudança)
- Trilha 2: Web search + evidências conhecidas
- Trilha 3: Candidatos da web search

---

## 🛡️ Regras Anti-Alucinação

### 1. Números no Laudo
- NUNCA inventar: tamanho (mm/cm), tempo (meses/anos), percentuais
- NUNCA inventar: nomes de guideline, ano, DOI, entidade, link
- Se biblioteca não tem número: texto genérico sem número

### 2. Dados Faltantes
- Se falta idade/risco/imunossupressão: recomendação CONDICIONAL
- Texto explica o dado ausente
- Não "chutar" valores

### 3. Aplicabilidade
- Size bracket: achado 8mm não pode usar rec ≤4mm
- Age group: adulto ≠ pediátrico
- Context: incidental ≠ oncológico

### 4. Guard Layer
- Valida TODOS os números no texto final
- Compara com payload original da biblioteca
- Se violação: sanitiza para texto genérico

### 5. Web Evidence
- Números só aparecem se EXPLÍCITOS na fonte
- Cada número com citação junto
- Se só fonte secundária: não incluir números

---

## 📊 Pipeline de Execução

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FINDINGS AGENT                                           │
│    Extrai achados do caso                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. RECOMMENDATIONS AGENT (3-TRACK MODE)                     │
│                                                             │
│  Para cada finding:                                         │
│                                                             │
│  ┌─ GATE A: MAPEAMENTO ────────────────────────────────┐  │
│  │ finding_type válido? → SIM: continua                │  │
│  │                       → NÃO: pula                    │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                              │
│  ┌─ GATE B: BIBLIOTECA INTERNA ─────────────────────────┐  │
│  │ query_api(finding_type, size, age, risk...)         │  │
│  │ → Resultados? → SIM: processa                       │  │
│  │               → NÃO: fallback genérico              │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                              │
│  ┌─ GATE C: APLICABILIDADE ──────────────────────────────┐  │
│  │ Valida: size bracket, age, risk, context            │  │
│  │ → Match? → SIM: TRILHA 1 (laudo)                    │  │
│  │          → NÃO: fallback + TRILHAS 2 & 3            │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                              │
│  ┌─ WEB EVIDENCE (se necessário) ────────────────────────┐  │
│  │ Trigger quando: NO_LIBRARY_HITS / NO_APPLICABLE /   │  │
│  │                 MISSING_INPUTS                       │  │
│  │                                                      │  │
│  │ Web search → Allowlist → Extrair evidências         │  │
│  │ → TRILHA 2: consult_assist                          │  │
│  │ → TRILHA 3: library_ingestion_candidates            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. GUARD LAYER                                              │
│    Valida números vs payload original                       │
│    Sanitiza violações                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RENDERER                                                 │
│    Renderiza SOMENTE:                                       │
│    - evidence_recommendations (TRILHA 1)                    │
│    - references                                             │
│                                                             │
│    IGNORA:                                                  │
│    - consult_assist (TRILHA 2)                              │
│    - library_ingestion_candidates (TRILHA 3)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Como Expor consult_assist para o Médico

### Opção 1: Arquivo Separado

```typescript
// No final do pipeline
if (report.consult_assist && report.consult_assist.length > 0) {
  const consultPath = `./output/${report.case_id}_consult_assist.json`;
  fs.writeFileSync(consultPath, JSON.stringify(report.consult_assist, null, 2));
  console.log(`💡 Consulta médica disponível em: ${consultPath}`);
}
```

### Opção 2: Seção no JSON de Auditoria

```typescript
// Adicionar ao report final
report.audit = {
  ...report.audit,
  medical_consult: report.consult_assist
};

// Renderer ignora, mas fica disponível no JSON
```

### Opção 3: UI Separada

- Dashboard mostra 2 abas:
  - **LAUDO OFICIAL** (evidence_recommendations + references)
  - **ASSISTÊNCIA MÉDICA** (consult_assist)

### Opção 4: Markdown Comentado

```markdown
<!-- ASSISTÊNCIA MÉDICA (NÃO FAZ PARTE DO LAUDO OFICIAL) -->
<!-- Fleischner 2017: Consultar tabela completa para intervalo específico -->
<!-- Fonte: https://pubs.rsna.org/doi/10.1148/radiol.2017161659 -->
```

---

## 🧪 Testes

### Rodar Testes E2E

```bash
# Sem web evidence (somente biblioteca)
npx tsx tests/e2e-three-tracks-validation.ts

# Com web evidence
RADON_WEB_EVIDENCE=1 npx tsx tests/e2e-three-tracks-validation.ts
```

### Casos de Teste

1. **Match Aplicável:** Nódulo 8mm, baixo risco → biblioteca tem match → entra no laudo
2. **Size Mismatch:** Nódulo 8mm vs guideline ≤4mm → não aplicável → fallback genérico
3. **No Library Hits:** Achado não mapeado → texto genérico + web evidence (se flag on)

### Outputs Esperados

```
test-output-case1.json  # Match aplicável
test-output-case2.json  # Size mismatch
test-output-case3.json  # No library hits
```

---

## 📝 Checklist de Aceitação

### TRILHA 1: LAUDO
- [ ] Recomendações vêm SOMENTE da biblioteca interna
- [ ] Aplicabilidade validada (size/age/risk/context)
- [ ] Guard valida números vs payload original
- [ ] Fallback genérico quando não aplicável (SEM números)
- [ ] Referências formatadas corretamente

### TRILHA 2: CONSULTA
- [ ] Evidências de fontes permitidas (allowlist)
- [ ] Citações completas (org, title, year, url, doi, accessed_at)
- [ ] Números SOMENTE se explícitos na fonte
- [ ] Caveats e conflitos documentados
- [ ] NÃO renderiza no laudo final

### TRILHA 3: CURADORIA
- [ ] Candidatos estruturados
- [ ] `review_required: true` obrigatório
- [ ] Citações verificáveis
- [ ] Aplicability rules definidas
- [ ] NÃO renderiza no laudo final

### GERAL
- [ ] Feature flag RADON_WEB_EVIDENCE funciona
- [ ] Guard Layer bloqueia alucinações
- [ ] Pipeline não quebra quando web search falha
- [ ] Testes E2E passam
- [ ] Outputs JSON válidos

---

## 🚀 Próximos Passos

1. **Integração Web Search:** Conectar WebSearch tool real do Claude
2. **UI para Consult Assist:** Dashboard com abas separadas
3. **Sistema de Curadoria:** Pipeline de revisão humana para library_ingestion_candidates
4. **Monitoramento:** Métricas de uso de cada trilha
5. **Expansão da Biblioteca:** Usar trilha 3 para enriquecer >2.900 recomendações
