# Recommendations System - Developer Guide

## Overview

The Recommendations system provides evidence-based clinical recommendations from a curated library of medical guidelines (Fleischner, LI-RADS, PI-RADS, etc.).

---

## Quick Start

### How the Pipeline Works

```
Findings → RecommendationsAgent → Impression → Renderer
                  ↓
           RecommendationsGuard
```

1. **RecommendationsAgent** processes each finding
2. Matches finding patterns against the library
3. Returns `evidence_recommendations[]` and `references[]`
4. **Guard** validates no numbers were invented
5. **Renderer** appends REFERÊNCIAS section

---

## Adding a New Finding Pattern

### Step 1: Locate the Pattern Map

File: `src/core/reportGeneration/agents/recommendations.ts`

```typescript
const FINDING_PATTERNS: Record<string, RegExp[]> = {
  "pulmonary_nodule": [
    /nódulo\s+pulmonar/i,
    /pulmonary\s+nodule/i,
    // ...
  ],
  // Add your new pattern here
};
```

### Step 2: Add Your Pattern

```typescript
"adrenal_incidentaloma": [
  /incidentaloma\s+adrenal/i,
  /adrenal\s+incidentaloma/i,
  /nódulo\s+adrenal/i,
  /adrenal\s+nodule/i,
  /massa\s+adrenal/i,
],
```

### Step 3: Ensure Library Has Guidelines

The pattern must match a `finding_type` in the recommendations database:

```sql
SELECT DISTINCT dominio, topico FROM recommendations 
WHERE topico LIKE '%adrenal%';
```

If no guidelines exist, add them using the extraction scripts.

---

## Updating the SQLite Library

### Location

```
data/recommendations/db/recommendations.db
```

### Adding a New Guideline

1. **Download the PDF** to `data/recommendations/sources/`
2. **Register in sources.yaml**:

```yaml
- source_id: ACR_ADRENAL_2024
  title: "ACR Appropriateness Criteria® Adrenal Incidentalomas"
  url: "https://..."
  status: pending
```

3. **Run extraction**:

```bash
npx tsx scripts/recommendations/batch_extract_simple.ts
```

4. **Verify extraction**:

```bash
sqlite3 data/recommendations/db/recommendations.db \
  "SELECT COUNT(*) FROM recommendations WHERE source_id='ACR_ADRENAL_2024'"
```

---

## Anti-Hallucination Rules

### NEVER do:
- ❌ Invent a guideline name or year
- ❌ Make up numbers (mm, months, intervals)
- ❌ Guess patient risk category
- ❌ Apply adult guidelines to pediatric patients

### ALWAYS do:
- ✅ Use exact text from library
- ✅ Mark as `conditional: true` when data is missing
- ✅ Check `applicability` constraints
- ✅ Cite only what came from the library

---

## Observability

### View Metrics

```typescript
import { printMetricsReport } from './recommendations-observability';
printMetricsReport();
```

### Key Metrics
- **Success rate**: % of queries finding a recommendation
- **Missing inputs rate**: % needing conditional output
- **Guard sanitization rate**: % where Guard removed invented numbers
- **Top patterns**: Most frequently matched finding types

---

## Testing

### Smoke Tests

```bash
npx tsx tests/recommendations-smoke-tests.ts
```

### E2E Validation

```bash
npx tsx tests/e2e-recommendations-validation.ts
```

### Expected Results

| Test | Expected Outcome |
|------|------------------|
| No recommendation | Empty refs, generic text |
| Missing inputs | Conditional text, mentions "risco" |
| Numeric follow-up | Numbers from library, valid citation |

---

## Troubleshooting

### "No recommendation found"

1. Check if finding pattern exists in `FINDING_PATTERNS`
2. Verify library has guidelines for that `finding_type`
3. Check `applicability` constraints (age, immunosuppression)

### "Guard sanitized recommendation"

1. Number in output wasn't in library payload
2. Review `recommendations-guard.ts` violations log
3. Check if library extraction captured all numbers

### "Missing inputs"

Recommendation is conditional because:
- `risk_category` is "unknown"
- Required patient data not available
- This is **correct behavior** - don't try to "fix" it

---

## Architecture

```
services/recommendations/
├── query_api.ts          # Main query interface

src/core/reportGeneration/
├── agents/
│   └── recommendations.ts    # RecommendationsAgent
├── recommendations-guard.ts  # Anti-hallucination Guard
├── recommendations-observability.ts  # Metrics
├── orchestrator.ts          # Pipeline integration
└── renderer.ts              # REFERÊNCIAS output

data/recommendations/
└── db/
    └── recommendations.db   # SQLite library
```
