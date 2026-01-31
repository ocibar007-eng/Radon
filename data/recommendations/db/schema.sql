-- Schema for Radon Evidence-Based Recommendations Database
-- Version: 1.0
-- Created: 2026-01-30

-- ==============================================================================
-- 1. SOURCES (Fonte da verdade - Guidelines e Papers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sources (
    source_id TEXT PRIMARY KEY,          -- Ex: fleischner_2017 (mesmo do registry.yaml)
    entidade TEXT NOT NULL,              -- Ex: Fleischner Society
    titulo TEXT NOT NULL,                -- Ex: Guidelines for Management...
    ano INTEGER,                         -- Ex: 2017
    doi TEXT,                            -- Ex: 10.1148/radiol.2017161659
    url_oficial TEXT,                    -- URL para fonte original
    status_acesso TEXT DEFAULT 'open',   -- open, paywall, unknown
    licenca_notas TEXT,                  -- Notas sobre copyright/uso
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. DOCUMENTS (Arquivos físicos baixados e processados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS documents (
    doc_id TEXT PRIMARY KEY,             -- UUID ou hash único
    source_id TEXT NOT NULL,             -- FK para sources
    filename TEXT NOT NULL,              -- Nome do arquivo em disco
    filepath TEXT NOT NULL,              -- Caminho relativo (data/recommendations/raw_docs/...)
    checksum_sha256 TEXT NOT NULL,       -- Integridade do arquivo
    file_format TEXT DEFAULT 'pdf',      -- pdf, html, txt
    page_count INTEGER,                  -- Número total de páginas
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,               -- Quando foi parseado/extraído
    processing_status TEXT DEFAULT 'pending', -- pending, processed, failed
    error_log TEXT,                      -- Stack trace se falhar
    FOREIGN KEY (source_id) REFERENCES sources(source_id) ON DELETE CASCADE
);

-- ==============================================================================
-- 3. RECOMMENDATIONS (Conteúdo clínico extraído)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS recommendations (
    rec_id TEXT PRIMARY KEY,             -- UUID
    doc_id TEXT NOT NULL,                -- FK para documents
    
    -- Taxonomia e Organização
    rec_type TEXT NOT NULL,              -- recommendation, classification, staging, response_criteria, reporting_standard
    dominio TEXT NOT NULL,               -- torax, abdome, gu, etc. (do coverage_spec)
    topico TEXT NOT NULL,                -- nodulos_pulmonares, etc. (do coverage_spec)
    
    -- Conteúdo Clínico Core (If This Then That)
    achado TEXT NOT NULL,                -- Ex: Nódulo sólido < 6mm
    condicao_if TEXT NOT NULL,           -- Ex: Baixo risco, paciente > 35 anos
    acao_then TEXT NOT NULL,             -- Ex: Sem follow-up necessário
    followup_interval TEXT,              -- Ex: 12 months (se aplicável)
    
    -- Rastreabilidade (Evidence Traceability)
    verbatim_quote TEXT NOT NULL,        -- Citação exata (max 25 palavras)
    snippet_suporte TEXT NOT NULL,       -- Contexto parafraseado
    anchor TEXT NOT NULL,                -- Localização: "Table 1", "Section 3.2"
    pagina INTEGER NOT NULL,             -- Número da página no PDF
    
    -- Metadados de Extração
    confidence REAL NOT NULL,            -- 0.0 a 1.0 (do LLM ou dual-pass)
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pipeline_version TEXT,               -- Versão do extrator usado
    
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
);

-- ==============================================================================
-- INDICES (Performance)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_recommendations_topic ON recommendations(topico);
CREATE INDEX IF NOT EXISTS idx_recommendations_domain ON recommendations(dominio);
CREATE INDEX IF NOT EXISTS idx_recommendations_achado ON recommendations(achado);
CREATE INDEX IF NOT EXISTS idx_recommendations_source ON recommendations(doc_id);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source_id);
