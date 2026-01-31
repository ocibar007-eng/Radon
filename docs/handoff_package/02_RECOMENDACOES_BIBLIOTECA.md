# Biblioteca de Recomendações - Status Atual

**Data:** 2026-01-31  
**Status:** ✅ 100% Completa  

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| **Documentos fonte** | 162 PDFs de guidelines oficiais |
| **Recomendações extraídas** | 2,923 |
| **Tabelas estruturadas** | 431 |
| **Definições de staging** | 360 (TNM, FIGO, AJCC) |
| **Cutoffs numéricos** | 245 |
| **Taxa de sucesso** | 91% |

---

## 🗂️ Fontes Incluídas

### Por Categoria
- **LI-RADS** (Liver): ~47 tabelas
- **ACR Appropriateness Criteria**: ~54 tabelas
- **PI-RADS** (Prostate): ~25 tabelas
- **Fleischner** (Pulmonary): guidelines completos
- **O-RADS** (Ovarian): múltiplos documentos
- **TI-RADS** (Thyroid): recomendações extraídas
- **TNM Staging** (8th/9th ed): 35+ tabelas
- **ESGAR** Guidelines: 20+ tabelas

### Cobertura por Domínio
| Domínio | Recs |
|---------|------|
| Genitourinary | 270 |
| Abdominal | 237 |
| General | 102 |
| Oncology | 180+ |
| Chest | 150+ |

---

## 🗄️ Schema do Banco de Dados

```sql
-- Tabela principal de recomendações
CREATE TABLE recommendations (
    rec_id TEXT PRIMARY KEY,
    doc_id TEXT,
    source_id TEXT,
    rec_type TEXT,           -- 'recommendation', 'classification', 'response_criteria'
    dominio TEXT,            -- domínio clínico
    topico TEXT,             -- tópico específico
    achado TEXT,             -- achado que dispara a rec
    condicao_if TEXT,        -- condição de aplicabilidade
    acao_then TEXT,          -- ação recomendada
    followup_interval TEXT,  -- intervalo de seguimento
    verbatim_quote TEXT,     -- citação literal
    snippet_suporte TEXT,    -- contexto de suporte
    confidence REAL,         -- 0.0-1.0
    extracted_at DATETIME
);

-- Tabelas extraídas de documentos
CREATE TABLE extracted_tables (
    table_id TEXT PRIMARY KEY,
    doc_id TEXT,
    source_id TEXT,
    title TEXT,
    headers TEXT,           -- JSON array
    rows TEXT,              -- JSON array
    confidence REAL
);

-- Staging (TNM, FIGO, etc.)
CREATE TABLE staging_classifications (
    staging_id TEXT PRIMARY KEY,
    system TEXT,            -- 'TNM', 'FIGO', 'AJCC'
    cancer_type TEXT,
    category TEXT,          -- 'T', 'N', 'M', 'Stage'
    code TEXT,              -- 'T1a', 'Stage IIB'
    description TEXT
);

-- Cutoffs numéricos
CREATE TABLE numeric_cutoffs (
    cutoff_id TEXT PRIMARY KEY,
    parameter TEXT,         -- 'size', 'SUV', 'PSA'
    operator TEXT,          -- '>', '<', '>='
    value REAL,
    unit TEXT               -- 'mm', 'months', 'ng/mL'
);

-- Documentos fonte
CREATE TABLE documents (
    doc_id TEXT PRIMARY KEY,
    source_id TEXT,
    title TEXT,
    authors TEXT,
    journal TEXT,
    publication_year INTEGER,
    citation_formatted TEXT
);
```

---

## 📁 Estrutura de Arquivos

```
data/recommendations/
├── db/
│   └── recommendations.db        # SQLite database (3.2MB)
├── sources/                      # PDFs originais
│   └── *.pdf
├── normalized_text/              # Texto OCR processado
│   └── *.json
└── reports/                      # Relatórios de progresso
    ├── PHASE_3B_FINAL_REPORT.md
    └── ...

services/recommendations/
├── query_api.ts                  # API de busca (USAR ESTE)
├── table_extractor.ts            # Extrator de tabelas
├── llm_extractor.ts              # Extrator LLM
└── ...

scripts/recommendations/          # Scripts de batch
├── batch_extract_*.ts
├── test_query_api.ts
└── ...
```

---

## 🔍 Exemplos de Dados

### Recomendação (Fleischner)
```json
{
  "rec_id": "fleischner_2017_solid_8mm",
  "source_id": "fleischner_2017",
  "achado": "solid pulmonary nodule",
  "condicao_if": "8mm, low risk, incidental, adult, non-immunosuppressed",
  "acao_then": "CT at 6-12 months, then consider CT at 18-24 months",
  "confidence": 0.95,
  "citation_formatted": "MacMahon H, et al. Radiology. 2017;284(1):228-243."
}
```

### Staging (TNM Kidney)
```json
{
  "system": "TNM",
  "cancer_type": "Kidney",
  "category": "T",
  "code": "T1a",
  "description": "Tumor ≤4 cm in greatest dimension, limited to the kidney"
}
```

### Cutoff Numérico
```json
{
  "parameter": "size",
  "operator": ">",
  "value": 10,
  "unit": "cm",
  "context": "Risk of progressive disease"
}
```
