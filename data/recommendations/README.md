# Evidence-Based Recommendations Data

Diretório central para armazenamento de dados do pipeline de recomendações.

## Estrutura

- **`sources/`**: Metadados (Registry, Specifications).
  - `registry.yaml`: A "source of truth" de quais documentos monitorar.
  - `coverage_spec.yaml`: Especificação de completude por domínio.

- **`db/`**: Banco de dados SQLite.
  - `recommendations.db`: O banco principal.
  - `schema.sql`: Definição das tabelas.
  - `migrations/`: Scripts de evolução do schema.

- **`raw_docs/`**: Arquivos originais (PDF/HTML).
  - Naming convention: `{source_id}.pdf` (ex: `fleischner_2017.pdf`).
  - **Nota:** Se o download automático falhar (403 Forbidden), baixe manualmente e coloque aqui com o nome correto. O script de ingestão detectará o arquivo e pulará o download.

- **`normalized_text/`**: Texto extraído (JSON).
  - JSONs contendo array de strings (uma por página).
  - Usado como entrada para o Extrator LLM.

- **`extractions/`**: Resultados intermediários da IA.
  - Logs de extração e JSONs brutos do Gemini antes da inserção no DB.

- **`reports/`**: Relatórios de qualidade e cobertura.
  - `gaps.md`: Gerado pelo `completeness_validator.ts`.
  - `disagreements/`: Relatórios de divergência do Dual-Pass.
  - `download_manifest.csv`: Log de downloads.

## Fluxo de Trabalho Manual (Anti-Block)

Para fontes com proteção anti-bot (ex: RSNA, Elsevier):
1. Baixe o PDF manualmente no browser.
2. Salve em `data/recommendations/raw_docs/`.
3. Renomeie para `{source_id}.pdf` (conforme `registry.yaml`).
4. Execute `npm run ingest:seed` (ou equivalente).
   - O script verá o arquivo local ("Cache hit") e processará o parse normalmente.
