# 📚 Bibliographic References - Implementation Note

**Date:** 2026-01-30  
**Priority:** HIGH  
**For:** Laudo generation integration

---

## User Requirement

> "as referencias das recomendacoes depois deverao ser populadas no final do laudo o artigo, autor, etc entende"

**Translation:** Recommendation references (article, author, etc.) must be populated at the end of the report.

---

## Current Database Schema

### `documents` table:
- ✅ `doc_id`: Unique identifier
- ✅ `source_id`: Clean source identifier (e.g., "fleischner_2017__pdf")
- ✅ `filename`: Original PDF filename
- ❌ Missing: `title`, `authors`, `journal`, `year`, `doi`, `citation`

### `recommendations` table:
- ✅ `source_id`: Links back to document
- ✅ `doc_id`: Links to document
- ✅ All recommendation fields populated

---

## Required Implementation

### Phase 3.1: Extend `documents` Schema

Add bibliographic metadata columns:

```sql
ALTER TABLE documents ADD COLUMN title TEXT;
ALTER TABLE documents ADD COLUMN authors TEXT;
ALTER TABLE documents ADD COLUMN journal TEXT;
ALTER TABLE documents ADD COLUMN publication_year INTEGER;
ALTER TABLE documents ADD COLUMN doi TEXT;
ALTER TABLE documents ADD COLUMN citation_formatted TEXT;
ALTER TABLE documents ADD COLUMN url TEXT;
```

### Phase 3.2: Populate Metadata

#### Option A: Manual Curation (Immediate)
Create `bibliographic_metadata.yaml` with:
```yaml
fleischner_2017__pdf:
  title: "Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images"
  authors: "MacMahon H, Naidich DP, Goo JM, et al."
  journal: "Radiology"
  year: 2017
  doi: "10.1148/radiol.2017161659"
  citation: "MacMahon H, et al. Radiology. 2017;284(1):228-243."
```

#### Option B: LLM Extraction (Semi-automated)
Use Gemini to extract from PDF first page:
- Title
- Author list
- Journal name
- Publication year
- DOI (if present)

### Phase 3.3: Citation Generation

**In Laudo Template:**
```typescript
// At end of report
if (recommendations.length > 0) {
  const uniqueSources = [...new Set(recommendations.map(r => r.source_id))];
  const citations = uniqueSources.map(sourceId => {
    const doc = getDocumentMetadata(sourceId);
    return formatCitation(doc); // Vancouver or ABNT style
  });
  
  appendToReport(`\n\n## REFERÊNCIAS\n${citations.join('\n')}`);
}
```

**Citation Format (Vancouver):**
```
1. MacMahon H, Naidich DP, Goo JM, et al. Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images: From the Fleischner Society 2017. Radiology. 2017;284(1):228-243. doi:10.1148/radiol.2017161659
```

---

## Example Usage in Report

```
RECOMENDAÇÃO: Nódulo sólido <6mm em paciente baixo risco não requer seguimento rotineiro. [1]

[...outras recomendações...]

## REFERÊNCIAS

1. MacMahon H, Naidich DP, Goo JM, et al. Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images: From the Fleischner Society 2017. Radiology. 2017;284(1):228-243.

2. Eisenhauer EA, Therasse P, Bogaerts J, et al. New response evaluation criteria in solid tumours: revised RECIST guideline (version 1.1). Eur J Cancer. 2009;45(2):228-247.
```

---

## Next Steps

1. ✅ Complete batch extraction (162 docs)
2. [ ] Create `bibliographic_metadata.yaml` with top 20 must-have sources
3. [ ] Add metadata columns to `documents` table
4. [ ] Implement citation formatter utility
5. [ ] Integrate with laudo generation

**Status:** Documented - to be implemented in Phase 3
