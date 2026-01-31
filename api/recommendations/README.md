# Recommendations Search API Documentation

**Version:** 1.0  
**Base URL:** `/api/recommendations`  
**Database:** SQLite (`data/recommendations/db/recommendations.db`)

---

## Overview

The Recommendations Search API provides programmatic access to 2,923 evidence-based clinical recommendations extracted from 162 medical guideline documents. Supports filtering, full-text search, and pagination.

---

## Endpoints

### 1. Search Recommendations

**Method:** `GET`  
**Endpoint:** `/api/recommendations/search`

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `domain` | string | Filter by medical domain | `Genitourinary`, `Abdominal`, `Thoracic` |
| `topic` | string | Filter by specific topic | `PI-RADS`, `LI-RADS`, `Fleischner` |
| `rec_type` | string | Recommendation type | `recommendation`, `classification`, `staging` |
| `source_id` | string | Source document identifier | `fleischner_2017` |
| `finding` | string | Search in achado or condicao_if | `nodule`, `cyst` |
| `query` | string | Full-text search across all fields | `followup 12 months` |
| `min_confidence` | float | Minimum confidence score (0-1) | `0.8` |
| `limit` | integer | Results per page (default: 50) | `20` |
| `offset` | integer | Pagination offset (default: 0) | `100` |

**Response:**

```json
{
  "recommendations": [
    {
      "rec_id": "uuid-string",
      "doc_id": "doc-uuid",
      "source_id": "fleischner_2017",
      "rec_type": "recommendation",
      "dominio": "Thoracic",
      "topico": "Pulmonary Nodules",
      "achado": "Solid nodule < 6mm",
      "condicao_if": "Low risk patient",
      "acao_then": "No routine follow-up",
      "followup_interval": null,
      "verbatim_quote": "For solid nodules <6 mm, no routine follow-up is necessary",
      "snippet_suporte": "Fleischner Society 2017 guidelines recommend...",
      "anchor": "Table 2",
      "pagina": 3,
      "confidence": 0.95,
      "extracted_at": "2026-01-30T10:15:00Z",
      "pipeline_version": "generic_v1"
    }
  ],
  "total": 104,
  "page": 1,
  "pageSize": 50,
  "filters": {
    "domain": "Thoracic",
    "limit": 50
  }
}
```

---

### 2. Get Recommendation by ID

**Method:** `GET`  
**Endpoint:** `/api/recommendations/:rec_id`

**Response:**

```json
{
  "rec_id": "uuid",
  "dominio": "Genitourinary",
  "topico": "PI-RADS",
  ...
}
```

Returns `404` if not found.

---

### 3. Get Available Domains

**Method:** `GET`  
**Endpoint:** `/api/recommendations/domains`

**Response:**

```json
{
  "domains": [
    "Abdominal",
    "Emergency",
    "General",
    "Genitourinary",
    "Gynecology",
    "Oncology",
    "Thoracic",
    "Vascular"
  ]
}
```

---

### 4. Get Topics by Domain

**Method:** `GET`  
**Endpoint:** `/api/recommendations/domains/:domain/topics`

**Response:**

```json
{
  "domain": "Genitourinary",
  "topics": [
    "PI-RADS",
    "Prostate",
    "Renal Mass",
    "Scrotal Ultrasound"
  ]
}
```

---

### 5. Get Statistics

**Method:** `GET`  
**Endpoint:** `/api/recommendations/stats`

**Response:**

```json
{
  "total": 2923,
  "mapped": 878,
  "unmapped": 2045,
  "byDomain": [
    { "dominio": "Genitourinary", "count": 270 },
    { "dominio": "Abdominal", "count": 237 },
    { "dominio": "General", "count": 102 }
  ],
  "byType": [
    { "rec_type": "recommendation", "count": 2761 },
    { "rec_type": "classification", "count": 107 },
    { "rec_type": "response_criteria", "count": 24 }
  ]
}
```

---

## Usage Examples

### TypeScript/Node.js

```typescript
import { searchRecommendations, getStats } from './api/recommendations/search';

// Search by domain
const abdomenRecs = searchRecommendations({ 
  domain: 'Abdominal', 
  limit: 10 
});

// Full-text search
const noduleRecs = searchRecommendations({ 
  query: 'nodule follow-up',
  min_confidence: 0.8
});

// Get statistics
const stats = getStats();
console.log(`Total: ${stats.total}, Mapped: ${stats.mapped}`);
```

### curl

```bash
# Search Genitourinary recommendations
curl "http://localhost:3000/api/recommendations/search?domain=Genitourinary&limit=5"

# Full-text search
curl "http://localhost:3000/api/recommendations/search?query=nodule&min_confidence=0.8"

# Get stats
curl "http://localhost:3000/api/recommendations/stats"
```

---

## Database Schema

```sql
CREATE TABLE recommendations (
    rec_id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    rec_type TEXT NOT NULL,
    dominio TEXT NOT NULL,
    topico TEXT NOT NULL,
    achado TEXT NOT NULL,
    condicao_if TEXT NOT NULL,
    acao_then TEXT NOT NULL,
    followup_interval TEXT,
    verbatim_quote TEXT NOT NULL,
    snippet_suporte TEXT NOT NULL,
    anchor TEXT NOT NULL,
    pagina INTEGER NOT NULL,
    confidence REAL NOT NULL,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pipeline_version TEXT,
    source_id TEXT,
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
);
```

**Indexes:**
- `idx_recommendations_topic` on `topico`
- `idx_recommendations_domain` on `dominio`
- `idx_recommendations_achado` on `achado`
- `idx_recommendations_source` on `doc_id`

---

## Performance Considerations

- **Indexed Filtering:** Queries filtering by `domain`, `topic`, or `achado` use indexes for fast retrieval
- **Full-text Search:** `LIKE` queries on `verbatim_quote` and `snippet_suporte` may be slower for large result sets
- **Pagination:** Always use `limit` and `offset` for large queries
- **Caching:** Consider caching frequent queries (e.g., domain lists, stats)

**Typical Query Times:**
- Domain filter: ~10ms
- Full-text search: ~50-100ms
- Stats aggregation: ~30ms

---

## Error Handling

All functions use try-catch blocks and return appropriate error responses:

```typescript
try {
  const results = searchRecommendations({ domain: 'Invalid' });
  // Returns empty array, total: 0
} catch (err) {
  console.error('Database error:', err);
}
```

---

## Future Enhancements

1. **GraphQL API** - More flexible querying
2. **Elasticsearch Integration** - Faster full-text search
3. **Recommendation Clustering** - Group similar recommendations
4. **Citation Linking** - Auto-populate bibliography in reports
5. **Confidence Score Calibration** - ML-based confidence adjustment

---

## Testing

Run the test suite:

```bash
npx tsx scripts/recommendations/test_search_api.ts
```

**Expected Output:**
```
✓ Stats: 2923 total, 878 mapped (30.0%)
✓ Search by domain: 270 Genitourinary recs
✓ Search by topic: 54 PI-RADS recs 
✓ Full-text search: 104 'nodule' matches
✓ Combined filters: 196 Abdominal high-conf recs
```

---

**Maintainer:** Radon Team  
**Last Updated:** 2026-01-31  
**Database Version:** Phase 2 (2,923 recommendations from 162 documents)
