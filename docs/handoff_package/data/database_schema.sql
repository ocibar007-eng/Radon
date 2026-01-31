CREATE TABLE sources (
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
CREATE TABLE documents (
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
    error_log TEXT, title TEXT, authors TEXT, journal TEXT, publication_year INTEGER, doi TEXT, citation_formatted TEXT, url TEXT,                      -- Stack trace se falhar
    FOREIGN KEY (source_id) REFERENCES sources(source_id) ON DELETE CASCADE
);
CREATE TABLE recommendations (
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
    pipeline_version TEXT, source_id TEXT,               -- Versão do extrator usado
    
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
);
CREATE INDEX idx_recommendations_topic ON recommendations(topico);
CREATE INDEX idx_recommendations_domain ON recommendations(dominio);
CREATE INDEX idx_recommendations_achado ON recommendations(achado);
CREATE INDEX idx_recommendations_source ON recommendations(doc_id);
CREATE INDEX idx_documents_source ON documents(source_id);
CREATE TABLE extracted_tables (
      table_id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      table_number TEXT,
      title TEXT,
      headers TEXT,              -- JSON array of column headers
      rows TEXT,                 -- JSON array of row objects
      context TEXT,              -- Table context/summary
      page_number INTEGER,
      confidence REAL,           -- 0.0-1.0
      extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
    );
CREATE INDEX idx_extracted_tables_source 
    ON extracted_tables(source_id);
CREATE INDEX idx_extracted_tables_doc 
    ON extracted_tables(doc_id);
CREATE INDEX idx_extracted_tables_confidence 
    ON extracted_tables(confidence);
CREATE TABLE staging_classifications (
    staging_id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    table_id TEXT,
    system TEXT,                -- "TNM", "FIGO", "Ann Arbor", etc.
    version TEXT,               -- "8th Edition", "2014", "9th Edition"
    cancer_type TEXT,           -- "Lung", "Ovary", "Kidney"
    category TEXT,              -- "T", "N", "M", "Stage Group", "Risk Group"
    code TEXT,                  -- "T1a", "Stage IIB", "N0"
    description TEXT,           -- Full text description
    criteria JSON,              -- Structured criteria if available (size, extension, etc.)
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id),
    FOREIGN KEY (table_id) REFERENCES extracted_tables(table_id)
);
CREATE TABLE numeric_cutoffs (
    cutoff_id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    table_id TEXT,
    parameter TEXT,        -- "Size", "SUV", "PSA", "Time"
    operator TEXT,         -- ">", "<", ">=", "<=", "="
    value REAL,
    unit TEXT,             -- "mm", "cm", "ng/mL", "months"
    context TEXT,          -- Surrounding text
    confidence REAL,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_id) REFERENCES documents(doc_id),
    FOREIGN KEY (table_id) REFERENCES extracted_tables(table_id)
);
CREATE INDEX idx_cutoff_parameter ON numeric_cutoffs(parameter);
CREATE INDEX idx_cutoff_unit ON numeric_cutoffs(unit);
CREATE INDEX idx_cutoff_source ON numeric_cutoffs(source_id);
