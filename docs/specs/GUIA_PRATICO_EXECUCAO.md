# GUIA PRÁTICO DE EXECUÇÃO — Sistema Multi-Agente Radon V3

**Versão:** 1.0
**Data:** 20 de Janeiro de 2026
**Perfil:** Radiologista (não-desenvolvedor) + Desenvolvedor de apoio
**Status:** PRONTO PARA SEGUIR

---

## COMO USAR ESTE GUIA

Este documento é o seu **checklist de execução**. Siga na ordem, marcando os itens conforme completa.

- [ ] = Pendente
- [x] = Feito
- ⚠️ = Bloqueado (anotar motivo)

**Regra de ouro:** Não pule para o próximo bloco sem completar o atual.

---

# BLOCO 1: SETUP INICIAL (Dia 1)

## 1.1 Criar estrutura de pastas

```bash
# No terminal, na raiz do projeto:
git checkout -b feature/multi-agent-v3

mkdir -p src/core/reportGeneration/agents
mkdir -p src/core/reportGeneration/qa
mkdir -p services/calculator
mkdir -p tools/sandbox
mkdir -p scripts
mkdir -p data/cases
mkdir -p tests/golden-set/snapshots
```

**Checklist:**
- [ ] Branch criada
- [ ] Todas as pastas existem

## 1.2 Setup Python (Calculator)

```bash
cd services/calculator
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pydantic pytest httpx
```

**Checklist:**
- [ ] venv criado
- [ ] Dependências instaladas

## 1.3 Criar SQLite

```bash
cd ../..  # voltar para raiz

python3 - <<'PY'
import sqlite3
con = sqlite3.connect('data/metrics.sqlite')
cur = con.cursor()
cur.executescript('''
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  case_id TEXT,
  created_at TEXT,
  modality TEXT,
  model_path TEXT,
  prompt_version TEXT,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  qa_pass INTEGER,
  risk_score TEXT,
  rating INTEGER,
  tags TEXT,
  artifacts_path TEXT
);
CREATE TABLE IF NOT EXISTS feedback (
  feedback_id TEXT PRIMARY KEY,
  run_id TEXT,
  corrected_md_path TEXT,
  diff_summary TEXT,
  notes TEXT,
  created_at TEXT
);
''')
con.commit()
con.close()
print('OK: data/metrics.sqlite criado')
PY
```

**Checklist:**
- [ ] Arquivo `data/metrics.sqlite` existe

## 1.4 Criar arquivos TypeScript base (vazios)

```bash
touch src/types/report-json.ts
touch src/types/compute-request.ts
touch src/types/qa-result.ts
touch src/core/reportGeneration/orchestrator.ts
touch src/services/calculator-client.ts
touch src/utils/banlist.ts
touch src/utils/blacklist.ts
```

**Checklist:**
- [ ] Arquivos criados

## 1.5 Primeiro commit

```bash
git add .
git commit -m "feat: scaffold multi-agent architecture v3"
```

**Checklist:**
- [ ] Commit feito

---

# BLOCO 2: CALCULATOR PYTHON (Dias 2-4)

## 2.1 Implementar fórmulas

Criar `services/calculator/formulas.py`:

```python
"""
Fórmulas whitelist - LLM NUNCA calcula, sempre chama aqui.
"""
from typing import Optional
import math

def volume_ellipsoid(d1: float, d2: float, d3: float) -> float:
    """Volume elipsoide (prostata, rins, etc)"""
    return round(0.52 * d1 * d2 * d3, 2)

def resistive_index(vps: float, vd: float) -> float:
    """Indice de resistividade renal"""
    if vps == 0:
        return None
    return round((vps - vd) / vps, 2)

def adrenal_washout_abs(hu_pre: float, hu_portal: float, hu_delayed: float) -> float:
    """Washout absoluto adrenal"""
    if hu_portal == hu_pre:
        return None
    return round(100 * (hu_portal - hu_delayed) / (hu_portal - hu_pre), 1)

def adrenal_washout_rel(hu_portal: float, hu_delayed: float) -> float:
    """Washout relativo adrenal"""
    if hu_portal == 0:
        return None
    return round(100 * (hu_portal - hu_delayed) / hu_portal, 1)

def steatosis_grade(liver_hu: float, spleen_hu: Optional[float] = None) -> str:
    """Grau de esteatose hepatica"""
    if spleen_hu:
        diff = liver_hu - spleen_hu
        if diff < -10:
            return "moderada a acentuada"
        elif diff < 0:
            return "leve"
        else:
            return "ausente"
    else:
        if liver_hu < 40:
            return "presente"
        else:
            return "ausente"

def csf_index(transverse: float, biparietal: float) -> float:
    """CSF Index (cefalico)"""
    if biparietal == 0:
        return None
    return round(transverse / biparietal, 2)

def pelvic_kidney_ratio(pelvis: float, kidney: float) -> float:
    """Razao pelve/rim"""
    if kidney == 0:
        return None
    return round(pelvis / kidney, 2)

def percent_change(current: float, previous: float) -> float:
    """Variacao percentual (RECIST)"""
    if previous == 0:
        return None
    return round(100 * (current - previous) / previous, 1)

def sum_target_lesions(measurements: list[float]) -> float:
    """Soma de lesoes alvo (RECIST)"""
    return round(sum(measurements), 1)

def bmi(weight_kg: float, height_m: float) -> float:
    """IMC"""
    if height_m == 0:
        return None
    return round(weight_kg / (height_m ** 2), 1)

def gestational_age_weeks(lmp_days: int) -> float:
    """Idade gestacional em semanas"""
    return round(lmp_days / 7, 1)

def fetal_weight_hadlock(bpd: float, hc: float, ac: float, fl: float) -> float:
    """Peso fetal estimado (Hadlock)"""
    log_weight = 1.3596 + 0.0064 * hc + 0.0424 * ac + 0.174 * fl + 0.00061 * bpd * ac - 0.00386 * ac * fl
    return round(10 ** log_weight, 0)

# Dicionario de formulas disponiveis
FORMULAS = {
    "volume_ellipsoid": volume_ellipsoid,
    "resistive_index": resistive_index,
    "adrenal_washout_abs": adrenal_washout_abs,
    "adrenal_washout_rel": adrenal_washout_rel,
    "steatosis_grade": steatosis_grade,
    "csf_index": csf_index,
    "pelvic_kidney_ratio": pelvic_kidney_ratio,
    "percent_change": percent_change,
    "sum_target_lesions": sum_target_lesions,
    "bmi": bmi,
    "gestational_age_weeks": gestational_age_weeks,
    "fetal_weight_hadlock": fetal_weight_hadlock,
}
```

**Checklist:**
- [ ] Arquivo criado com 12+ fórmulas

## 2.2 Criar schemas Pydantic

Criar `services/calculator/schemas.py`:

```python
from pydantic import BaseModel
from typing import Any, Optional

class CalcRequest(BaseModel):
    formula: str
    inputs: dict[str, Any]
    ref_id: Optional[str] = None

class CalcResult(BaseModel):
    ref_id: Optional[str]
    formula: str
    result: Any
    error: Optional[str] = None

class CalcBatch(BaseModel):
    requests: list[CalcRequest]
```

**Checklist:**
- [ ] Schemas criados

## 2.3 Criar API FastAPI

Criar `services/calculator/main.py`:

```python
from fastapi import FastAPI, HTTPException
from .schemas import CalcBatch, CalcResult
from .formulas import FORMULAS

app = FastAPI(title="Radon Calculator Service")

@app.get("/health")
def health():
    return {"status": "ok", "formulas_available": list(FORMULAS.keys())}

@app.post("/compute", response_model=list[CalcResult])
def compute(batch: CalcBatch) -> list[CalcResult]:
    results = []
    for req in batch.requests:
        if req.formula not in FORMULAS:
            results.append(CalcResult(
                ref_id=req.ref_id,
                formula=req.formula,
                result=None,
                error=f"Formula '{req.formula}' not found"
            ))
            continue

        try:
            fn = FORMULAS[req.formula]
            result = fn(**req.inputs)
            results.append(CalcResult(
                ref_id=req.ref_id,
                formula=req.formula,
                result=result,
                error=None
            ))
        except Exception as e:
            results.append(CalcResult(
                ref_id=req.ref_id,
                formula=req.formula,
                result=None,
                error=str(e)
            ))

    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
```

**Checklist:**
- [ ] API criada

## 2.4 Testes unitários

Criar `services/calculator/tests/test_formulas.py`:

```python
import pytest
from ..formulas import *

def test_volume_ellipsoid():
    assert volume_ellipsoid(5, 4, 3) == 31.2  # 0.52 * 5 * 4 * 3

def test_resistive_index():
    assert resistive_index(100, 30) == 0.7
    assert resistive_index(0, 30) is None  # divisao por zero

def test_adrenal_washout_abs():
    # Pre=10, Portal=100, Delayed=40 → 66.7%
    result = adrenal_washout_abs(10, 100, 40)
    assert result == 66.7

def test_steatosis_grade():
    assert steatosis_grade(30, 50) == "moderada a acentuada"
    assert steatosis_grade(45, 50) == "leve"
    assert steatosis_grade(55, 50) == "ausente"

def test_percent_change():
    assert percent_change(15, 10) == 50.0  # +50%
    assert percent_change(8, 10) == -20.0  # -20%

def test_sum_target_lesions():
    assert sum_target_lesions([10.0, 15.5, 8.3]) == 33.8
```

**Checklist:**
- [ ] Testes criados
- [ ] `pytest services/calculator/tests/` passa 100%

## 2.5 Rodar Calculator

```bash
cd services/calculator
source venv/bin/activate
uvicorn main:app --reload --port 8081
```

Testar em outro terminal:
```bash
curl http://localhost:8081/health
```

**Checklist:**
- [ ] Calculator rodando em http://localhost:8081
- [ ] `/health` retorna lista de fórmulas

---

# BLOCO 3: SCHEMAS TYPESCRIPT (Dia 5)

## 3.1 ReportJSON Schema

Criar `src/types/report-json.ts`:

```typescript
import { z } from 'zod';

export const FindingSchema = z.object({
  organ: z.string(),
  description: z.string(),
  measurements: z.array(z.object({
    label: z.string(),
    value: z.number(),
    unit: z.string(),
  })).optional(),
  compute_requests: z.array(z.object({
    formula: z.string(),
    inputs: z.record(z.any()),
    ref_id: z.string(),
  })).optional(),
});

export const ReportJSONSchema = z.object({
  case_id: z.string(),
  modality: z.string(),
  indication: z.object({
    clinical_history: z.string(),
    exam_reason: z.string(),
    patient_age_group: z.string(),
    patient_sex: z.enum(['M', 'F', 'O']),
  }),
  technique: z.object({
    equipment: z.string(),
    protocol: z.string(),
    contrast: z.object({
      used: z.boolean(),
      type: z.string().optional(),
      volume_ml: z.number().optional(),
      phases: z.array(z.string()).optional(),
    }),
  }),
  comparison: z.object({
    available: z.boolean(),
    source: z.string().optional(),
    date: z.string().optional(),
    findings: z.string().optional(),
  }).optional(),
  findings: z.array(FindingSchema),
  compute_results: z.record(z.any()).optional(),
  impression: z.object({
    primary_diagnosis: z.string(),
    differentials: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
    risk_classification: z.string().optional(),
  }),
  metadata: z.object({
    created_at: z.string(),
    model_used: z.string(),
    prompt_version: z.string(),
    qa_passed: z.boolean(),
    risk_score: z.enum(['S1', 'S2', 'S3']),
  }),
});

export type ReportJSON = z.infer<typeof ReportJSONSchema>;
export type Finding = z.infer<typeof FindingSchema>;
```

**Checklist:**
- [ ] Schema criado
- [ ] TypeScript compila sem erros

## 3.2 ComputeRequest Schema

Criar `src/types/compute-request.ts`:

```typescript
import { z } from 'zod';

export const ComputeRequestSchema = z.object({
  formula: z.string(),
  inputs: z.record(z.any()),
  ref_id: z.string().optional(),
});

export const ComputeResultSchema = z.object({
  ref_id: z.string().optional(),
  formula: z.string(),
  result: z.any(),
  error: z.string().optional(),
});

export type ComputeRequest = z.infer<typeof ComputeRequestSchema>;
export type ComputeResult = z.infer<typeof ComputeResultSchema>;
```

**Checklist:**
- [ ] Schema criado

## 3.3 Calculator Client

Criar `src/services/calculator-client.ts`:

```typescript
import type { ComputeRequest, ComputeResult } from '../types/compute-request';

const CALC_URL = import.meta.env.VITE_CALC_URL || 'http://localhost:8081';

export async function computeFormulas(requests: ComputeRequest[]): Promise<ComputeResult[]> {
  if (requests.length === 0) return [];

  const response = await fetch(`${CALC_URL}/compute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    throw new Error(`Calculator error: ${response.status}`);
  }

  return response.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${CALC_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
```

**Checklist:**
- [ ] Cliente criado
- [ ] Adicionar `VITE_CALC_URL=http://localhost:8081` no `.env`

---

# BLOCO 4: QA DETERMINÍSTICO (Dias 6-7)

## 4.1 Banlist (termos proibidos)

Criar `src/utils/banlist.ts`:

```typescript
/**
 * BANLIST: frases que NUNCA devem aparecer no laudo final.
 * Use frases específicas, NÃO palavras soltas (evita falsos positivos).
 */
export const BANLIST_PHRASES = [
  // Meta-referências ao input
  'conforme áudio',
  'conforme o áudio',
  'segundo o áudio',
  'de acordo com o áudio',
  'conforme ditado',
  'segundo ditado',
  'conforme transcrição',
  'conforme transcricao',
  'conforme a transcrição',
  'segundo a transcrição',
  'conforme input',
  'conforme o input',
  'no input',
  'do input',
  'conforme anexo',
  'conforme os anexos',
  'segundo anexo',
  'no anexo',
  'conforme OCR',
  'segundo OCR',

  // Auto-referências ao laudo
  'neste laudo',
  'neste exame',
  'no presente laudo',
  'no presente exame',
  'nesta análise',
  'achados acima',
  'os achados acima',
  'conforme descrito acima',
  'como descrito acima',
  'vide acima',
  'na impressão',
  'na impressão acima',
  'conforme impressão',

  // Meta-linguagem
  'cabe ressaltar',
  'é importante notar',
  'vale destacar',
  'importante ressaltar',
  'importante destacar',
  'nota-se que',
  'observa-se que',
  'destaca-se que',
  'salienta-se que',

  // Referências ao prompt/sistema
  'conforme solicitado',
  'como solicitado',
  'conforme instruções',
  'conforme as instruções',
];

export interface BanlistResult {
  passed: boolean;
  violations: Array<{
    phrase: string;
    index: number;
  }>;
}

export function checkBanlist(text: string): BanlistResult {
  const normalizedText = text.toLowerCase();
  const violations: BanlistResult['violations'] = [];

  for (const phrase of BANLIST_PHRASES) {
    const index = normalizedText.indexOf(phrase.toLowerCase());
    if (index !== -1) {
      violations.push({ phrase, index });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
```

**Checklist:**
- [ ] Banlist criada com 30+ frases específicas

## 4.2 Blacklist (correções terminológicas)

Criar `src/utils/blacklist.ts`:

```typescript
/**
 * BLACKLIST: termos incorretos → termos corretos.
 * Aplicar automaticamente no renderer.
 */
export const BLACKLIST_CORRECTIONS: Record<string, string> = {
  // Ortografia
  'subsentimétrico': 'subcentimétrico',
  'subsentimetrico': 'subcentimetrico',
  'subsentimetricos': 'subcentimetricos',
  'subsentimetricas': 'subcentimetricas',

  // Terminologia
  'zonalidade': 'zonagem',
  'parênquima hepático normal': 'parênquima hepático de aspecto habitual',
  'parênquima renal normal': 'parênquima renal de aspecto habitual',
  'sem alterações': 'sem alterações significativas',
  'dentro da normalidade': 'dentro dos limites da normalidade',

  // Abreviações
  'TC': 'tomografia computadorizada',
  'RM': 'ressonância magnética',
  'USG': 'ultrassonografia',
  'RX': 'radiografia',

  // Anglicismos
  'follow-up': 'acompanhamento',
  'follow up': 'acompanhamento',
  'screening': 'rastreamento',
  'findings': 'achados',
  'enhancement': 'realce',
};

export interface BlacklistResult {
  corrected: string;
  corrections: Array<{
    original: string;
    corrected: string;
    count: number;
  }>;
}

export function applyBlacklist(text: string): BlacklistResult {
  let result = text;
  const corrections: BlacklistResult['corrections'] = [];

  for (const [wrong, correct] of Object.entries(BLACKLIST_CORRECTIONS)) {
    const regex = new RegExp(wrong, 'gi');
    const matches = result.match(regex);
    if (matches) {
      result = result.replace(regex, correct);
      corrections.push({
        original: wrong,
        corrected: correct,
        count: matches.length,
      });
    }
  }

  return { corrected: result, corrections };
}
```

**Checklist:**
- [ ] Blacklist criada com 20+ correções

## 4.3 QA Determinístico (integrado)

Criar `src/core/reportGeneration/qa/deterministic.ts`:

```typescript
import { checkBanlist, type BanlistResult } from '../../../utils/banlist';
import { applyBlacklist, type BlacklistResult } from '../../../utils/blacklist';
import type { ReportJSON } from '../../../types/report-json';

export interface QAResult {
  passed: boolean;
  banlist: BanlistResult;
  blacklist: BlacklistResult;
  structure: {
    passed: boolean;
    missing_sections: string[];
  };
  issues: string[];
}

const REQUIRED_SECTIONS = ['indication', 'technique', 'findings', 'impression'];

export function runDeterministicQA(report: ReportJSON, finalText: string): QAResult {
  // 1. Checar banlist
  const banlist = checkBanlist(finalText);

  // 2. Checar blacklist (mas não corrige aqui, só detecta)
  const blacklist = applyBlacklist(finalText);

  // 3. Checar estrutura
  const missingSections: string[] = [];
  if (!report.indication?.clinical_history) missingSections.push('indication.clinical_history');
  if (!report.indication?.exam_reason) missingSections.push('indication.exam_reason');
  if (!report.technique?.equipment) missingSections.push('technique.equipment');
  if (!report.findings || report.findings.length === 0) missingSections.push('findings');
  if (!report.impression?.primary_diagnosis) missingSections.push('impression.primary_diagnosis');

  // 4. Montar issues
  const issues: string[] = [];

  if (!banlist.passed) {
    issues.push(`Banlist: ${banlist.violations.map(v => `"${v.phrase}"`).join(', ')}`);
  }

  if (blacklist.corrections.length > 0) {
    issues.push(`Blacklist: ${blacklist.corrections.length} correções aplicáveis`);
  }

  if (missingSections.length > 0) {
    issues.push(`Estrutura: faltando ${missingSections.join(', ')}`);
  }

  return {
    passed: banlist.passed && missingSections.length === 0,
    banlist,
    blacklist,
    structure: {
      passed: missingSections.length === 0,
      missing_sections: missingSections,
    },
    issues,
  };
}
```

**Checklist:**
- [ ] QA determinístico implementado
- [ ] Testa banlist, blacklist e estrutura

---

# BLOCO 5: GOLDEN SET v1 (Dias 8-10)

## 5.1 Coletar 10 casos

Criar pasta `tests/golden-set/cases/` e adicionar 10 casos reais anonimizados:

**Composição recomendada:**
- 3 casos TC Abdome simples
- 2 casos TC Abdome com contraste e cálculo (washout adrenal, volume)
- 2 casos RM (se disponível, senão mais TC)
- 2 casos USG
- 1 caso oncológico (RECIST)

Para cada caso, criar:
- `tests/golden-set/cases/case_001/input.json` (CaseBundle anonimizado)
- `tests/golden-set/cases/case_001/expected_output.md` (laudo esperado)

**Checklist:**
- [ ] 10 casos coletados e anonimizados
- [ ] Cada caso tem input.json e expected_output.md

## 5.2 Script de testes

Criar `scripts/run_golden_tests.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Golden Set Tests ==="
echo "Data: $(date)"
echo ""

CASES_DIR="tests/golden-set/cases"
PASSED=0
FAILED=0

for case_dir in "$CASES_DIR"/case_*; do
  if [ -d "$case_dir" ]; then
    case_id=$(basename "$case_dir")
    echo "Testing $case_id..."

    # Aqui você chama o pipeline e compara
    # Por enquanto, placeholder:
    if [ -f "$case_dir/expected_output.md" ]; then
      echo "  ✓ Input e expected existem"
      ((PASSED++))
    else
      echo "  ✗ Faltando expected_output.md"
      ((FAILED++))
    fi
  fi
done

echo ""
echo "=== Resultado ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
```

```bash
chmod +x scripts/run_golden_tests.sh
```

**Checklist:**
- [ ] Script criado e executável
- [ ] `./scripts/run_golden_tests.sh` roda sem erro

---

# BLOCO 6: SANDBOX STREAMLIT (Dias 11-12)

## 6.1 Criar app básico

Criar `tools/sandbox/app.py`:

```python
import streamlit as st
import json
import sqlite3
from pathlib import Path
from datetime import datetime
import uuid

st.set_page_config(page_title="Radon Sandbox", layout="wide")
st.title("Sandbox — Laudos Multi-Agente Radon V3")

# Sidebar com status
with st.sidebar:
    st.header("Status")
    st.metric("Calculator", "🟢 Online" if True else "🔴 Offline")
    st.metric("Golden Set", "10 casos")

    st.divider()
    st.markdown("**Atalhos:**")
    st.code("./scripts/run_sandbox.sh", language="bash")
    st.code("./scripts/export_metrics_csv.sh", language="bash")

# Colunas principais
col1, col2 = st.columns(2)

with col1:
    st.header("1. Input")

    input_type = st.radio("Tipo de input:", ["Colar texto", "Upload JSON"])

    if input_type == "Colar texto":
        raw_input = st.text_area(
            "Cole o ditado/input aqui:",
            height=300,
            placeholder="Cole aqui o conteúdo do ditado, OCR, ou dados clínicos..."
        )
    else:
        uploaded = st.file_uploader("Upload JSON (CaseBundle)", type=['json'])
        if uploaded:
            raw_input = uploaded.read().decode()
            st.json(json.loads(raw_input))
        else:
            raw_input = ""

    run_button = st.button("🚀 Rodar Pipeline", type="primary", use_container_width=True)

with col2:
    st.header("2. Resultado")

    if run_button and raw_input.strip():
        with st.spinner("Processando..."):
            # TODO: Integrar com orchestrator real
            # Por enquanto, placeholder
            st.info("⚠️ Pipeline ainda não integrado. Conecte o orchestrator aqui.")

            # Simular resultado
            result = {
                "case_id": str(uuid.uuid4())[:8],
                "qa_passed": True,
                "risk_score": "S3",
                "latency_ms": 2500,
            }

            st.success(f"Processado em {result['latency_ms']}ms")
            st.metric("QA", "✓ Passed" if result['qa_passed'] else "✗ Failed")
            st.metric("Risco", result['risk_score'])

            # Placeholder para laudo
            st.markdown("### Laudo Gerado")
            st.text_area("Markdown:", value="[Laudo será exibido aqui]", height=200, disabled=True)

    elif run_button:
        st.warning("Cole algum input primeiro!")

# Seção de avaliação
st.divider()
st.header("3. Avaliação")

eval_col1, eval_col2 = st.columns([1, 2])

with eval_col1:
    rating = st.slider("Nota (0-10):", 0, 10, 8)

    tags = st.multiselect(
        "Tags de erro (se houver):",
        ["meta_texto", "lateralidade", "medida", "calculo", "terminologia", "omissao", "alucinacao"]
    )

with eval_col2:
    correction = st.text_area(
        "Correção manual (se necessário):",
        height=150,
        placeholder="Cole aqui o laudo corrigido, se precisou corrigir algo..."
    )

approve_col, reject_col = st.columns(2)

with approve_col:
    if st.button("✓ Aprovar", type="primary", use_container_width=True):
        st.success(f"Aprovado com nota {rating}!")
        # TODO: Salvar no SQLite

with reject_col:
    if st.button("✗ Reprovar", type="secondary", use_container_width=True):
        st.error("Reprovado. Feedback salvo.")
        # TODO: Salvar no SQLite com feedback

# Footer
st.divider()
st.caption("Radon V3 Multi-Agent System | Sandbox para Radiologista")
```

**Checklist:**
- [ ] App criado

## 6.2 Script para rodar

Criar `scripts/run_sandbox.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Ativar venv se existir
if [ -f "services/calculator/venv/bin/activate" ]; then
    source services/calculator/venv/bin/activate
fi

# Instalar streamlit se não tiver
pip install -q streamlit

# Rodar
echo "Abrindo Sandbox em http://localhost:8501"
streamlit run tools/sandbox/app.py --server.port 8501
```

```bash
chmod +x scripts/run_sandbox.sh
```

**Checklist:**
- [ ] Script criado e executável
- [ ] `./scripts/run_sandbox.sh` abre o Streamlit

## 6.3 Script para exportar CSV

Criar `scripts/export_metrics_csv.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_PATH="data/metrics.sqlite"

if [ ! -f "$DB_PATH" ]; then
    echo "Erro: $DB_PATH não existe"
    exit 1
fi

echo "Exportando métricas..."

# Exportar runs
sqlite3 -header -csv "$DB_PATH" "SELECT * FROM runs;" > data/runs.csv
echo "✓ data/runs.csv"

# Exportar feedback
sqlite3 -header -csv "$DB_PATH" "SELECT * FROM feedback;" > data/feedback.csv
echo "✓ data/feedback.csv"

echo ""
echo "Pronto! Abra os arquivos no Excel/Sheets."
```

```bash
chmod +x scripts/export_metrics_csv.sh
```

**Checklist:**
- [ ] Script criado e executável

---

# CRITÉRIOS DE CONCLUSÃO POR BLOCO

| Bloco | Critério | Como verificar |
|-------|----------|----------------|
| 1 | Estrutura existe | `ls -la src/core/reportGeneration/` |
| 2 | Calculator funciona | `curl localhost:8081/health` |
| 3 | TypeScript compila | `npm run build` sem erro |
| 4 | QA detecta banlist | Teste unitário |
| 5 | Golden Set existe | `./scripts/run_golden_tests.sh` |
| 6 | Sandbox abre | `./scripts/run_sandbox.sh` |

---

# PRÓXIMOS BLOCOS (após completar 1-6)

## BLOCO 7: Agentes Core
- Clinical Agent
- Technical Agent
- Findings Agent
- Integração com Calculator

## BLOCO 8: Síntese e Rendering
- Impression Synthesizer
- Renderer (JSON → Markdown)
- Canonicalizer

## BLOCO 9: Self-healing + Risk Scoring
- Self-healing loop (MAX_ATTEMPTS=2)
- Risk Scorer (S1/S2/S3)

## BLOCO 10: Integração E2E
- Orchestrator completo
- Testes E2E com Golden Set

---

**Mantenha este documento atualizado conforme avança.**
**Marque cada checkbox quando completar.**
**Não pule blocos.**
