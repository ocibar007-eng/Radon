# Recom

mendations DB - Week 1 Infrastructure Summary

**Data:** 30 de Janeiro de 2026  
**Status:** ✅ **INFRA COMPLETA** | ⚠️ **Aguardando PDFs Reais**

---

## ✅ Componentes Implementados

### 1. Database
- **Schema:** `data/recommendations/db/schema.sql` (sources, documents, recommendations)
- **DB Criado:** `recommendations.db` (SQLite, inicializado)
- **Migrations:** Estrutura pronta para versionamento

### 2. Pipeline Services
- **Downloader:** `services/recommendations/downloader.ts`
  - Rate limiting (1s/req), retries (3x), checksum SHA256
- **Parser:** `services/recommendations/parser.ts`
  - PDF → JSON (pdfjs-dist), preserva páginas
- **Source Resolver:** `services/recommendations/source_resolver.ts` ⭐
  - **4-Step Anti-403 Protocol:**
    1. DOI Resolution (Unpaywall + Crossref)
    2. Directed PDF Search (ACR, EORTC patterns)
    3. Browser-like fallback
    4. Paywalled documentation (`blocked_sources.md`)

### 3. Scripts
- **Init DB:** `scripts/recommendations/init_db.ts` ✅
- **Ingest Seed:** `scripts/recommendations/ingest_seed.ts` ✅
- **Completeness Validator:** `scripts/recommendations/completeness_validator.ts` ✅
- **Dual-Pass Extractor:** `services/recommendations/dual_pass_extractor.ts` ✅

### 4. Configuration
- **Registry:** `data/recommendations/sources/registry.yaml` (10 fontes P0)
- **Coverage Spec:** `data/recommendations/sources/coverage_spec.yaml` (8 domínios, 40+ tópicos)

---

## 📊 Resultados da Ingestão (Tentativa 1)

### Sources Processadas: 10/10
- **Bloqueadas (403):** 4
  - `fleischner_2017`, `fleischner_2005` (RSNA paywall)
  - `bosniak_v2019` (RSNA paywall)
  - `svs_aaa_2018` (Journal paywall)
  - ✅ **Logged em:** [`blocked_sources.md`](file:///Users/lucasdonizetecamargos/Downloads/app%20%286%29/data/recommendations/reports/blocked_sources.md) (91 linhas)

- **Downloaded (HTML/redirect):** 5
  - ACR RADS (LI-RADS, PI-RADS, 2x O-RADS) → Retornaram HTML (2KB)
  - iRECIST → PMC PDF (174KB) ✅

- **Successfully Parsed:** 1
  - `recist_1_1_original` (42KB, EORTC) ✅

### Status DB
```sql
-- 1 documento processado com sucesso
li_rads_v2018 | failed | NULL  -- HTML em vez de PDF
```

---

## ⚠️ Issues Identificados

### 1. ACR PDFs Returning HTML (2KB files)
**Causa:** URLs heurísticas apontam para landing pages, não PDFs diretos.

**Soluções propostas:**
1. ~~Buscar URLs reais via web search~~ (falhou)
2. Implementar scraping leve da landing page ACR para extrair link do PDF embeddado
3. Usar Playwright para simular browser e capturar redirect real

### 2. RSNA Paywall (Fleischner, Bosniak)
**Status:** Corretamente identificado e documentado.  
**Próximos passos:**
- Tentar acesso institucional (se disponível)
- Buscar versões pre-print/post-print em repositórios institucionais
- Marcar como "secondary_source" se usar guideline summary oficial

---

## 🎯 Próximos Passos (Semana 1 → Semana 2)

### Immediate (Desbloquear Coleta)
- [ ] **Opção A:** Implementar HTML scraper para ACR landing pages
- [ ] **Opção B:** Usar Playwright para capturar PDFs via browser automation
- [ ] **Opção C:** Buscar URLs alternative via institutional repos

### Medium (Continuar Coleta)
- [ ] Adicionar mais 30+ fontes ao registry (coverage_spec.yaml guia)
- [ ] Implementar busca sistemática por domínio
- [ ] Detector de duplicatas funcionando

### Long (Preparar Extração)
- [ ] Validar que PDFs parseados têm texto útil (não scan/imagem)
- [ ] Implementar extractor genérico (Fase 2)
- [ ] Testar dual-pass em Fleischner (quando obtido)

---

## 📝 Decisão Necessária

**Qual abordagem usar para ACR PDFs?**

1. **HTML Scraping (rápido):** Parsear página ACR, extrair `<a href="...pdf">` 
2. **Playwright (robusto):** Simular browser, deixar JS carregar, capturar URL final
3. **Manual (último recurso):** Baixar manualmente 4 PDFs ACR, depois automatizar resto

**Recomendação:** Tentar (1) primeiro, fallback (2), evitar (3) conforme protocolo.

---

**Documentos de Referência:**
- [Implementation Plan](file:///Users/lucasdonizetecamargos/.gemini/antigravity/brain/b94dd7eb-4fbb-47d3-a61b-dd5e29ca3dca/implementation_plan.md)
- [Task Breakdown](file:///Users/lucasdonizetecamargos/.gemini/antigravity/brain/b94dd7eb-4fbb-47d3-a61b-dd5e29ca3dca/task.md)
- [Skills Compliance](file:///Users/lucasdonizetecamargos/.gemini/antigravity/brain/b94dd7eb-4fbb-47d3-a61b-dd5e29ca3dca/skills_compliance.md)
