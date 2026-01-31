// scripts/recommendations/ingest_seed.ts
// Script de ingestão da Semana 1: Registry -> Download -> Parse -> DB

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import Database from 'better-sqlite3';
import { downloadFile } from '../../services/recommendations/downloader';
import { parsePDF } from '../../services/recommendations/parser';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const REGISTRY_PATH = path.join(process.cwd(), 'data/recommendations/sources/registry.yaml');
const RAW_DIR = path.join(process.cwd(), 'data/recommendations/raw_docs');
const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');

interface Registry {
    sources: SourceEntry[];
}

interface SourceEntry {
    id: string;
    entidade: string;
    titulo: string;
    ano: number;
    doi?: string;
    url_oficial?: string;
    status_acesso: string;
    licenca_notas?: string;
}

async function main() {
    console.log('🚀 Iniciando Ingestão de Seed (Week 1)...');

    // 1. Carregar Registry
    const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    const registry = yaml.parse(registryContent) as Registry;
    console.log(`📋 Registry carregado: ${registry.sources.length} fontes.`);

    // 2. Conectar DB
    const db = new Database(DB_PATH);

    // 3. Processar cada fonte
    for (const source of registry.sources) {
        console.log(`\n-----------------------------------------------------------`);
        console.log(`📌 Processando: ${source.id}`);

        // Upsert Source
        const upsertSource = db.prepare(`
      INSERT INTO sources (source_id, entidade, titulo, ano, doi, url_oficial, status_acesso, licenca_notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_id) DO UPDATE SET
        entidade=excluded.entidade,
        titulo=excluded.titulo,
        updated_at=CURRENT_TIMESTAMP
    `);

        upsertSource.run(
            source.id,
            source.entidade,
            source.titulo,
            source.ano,
            source.doi || null,
            source.url_oficial || null,
            source.status_acesso,
            source.licenca_notas || null
        );

        // Download with Anti-403 Resolution Protocol
        if (!source.url_oficial) {
            console.log(`⚠️  Sem URL oficial para ${source.id}, pulando download.`);
            continue;
        }

        const filename = `${source.id}.pdf`;
        let finalUrl = source.url_oficial;
        let accessType: string = 'direct';

        // Try resolver first (4-step protocol)
        const { resolveSource } = await import('../../services/recommendations/source_resolver');
        const resolution = await resolveSource(source.id, source.url_oficial, source.doi, source.titulo);

        if (resolution.success && resolution.pdf_url) {
            finalUrl = resolution.pdf_url;
            accessType = resolution.access_type || 'resolved';
            console.log(`  ✅ Resolvido via ${resolution.resolution_method}: ${accessType}`);
        } else {
            console.log(`  ⚠️  Resolver falhou, tentando URL original...`);
            // Log blocked source
            const blockedLogPath = path.join(process.cwd(), 'data/recommendations/reports/blocked_sources.md');
            const blockedEntry = `\n## ${source.id}\n- **Título:** ${source.titulo}\n- **DOI:** ${source.doi || 'N/A'}\n- **Attempts:**\n${resolution.attempts.map(a => `  - ${a.step}: ${a.status} (${a.error || 'ok'})`).join('\n')}\n- **Status:** paywalled_unavailable\n- **Timestamp:** ${new Date().toISOString()}\n\n`;
            await fs.promises.appendFile(blockedLogPath, blockedEntry, 'utf-8').catch(() => { });
        }

        const downloadResult = await downloadFile(finalUrl, RAW_DIR, filename);

        if (!downloadResult.success || !downloadResult.filepath) {
            console.error(`❌ Falha no download de ${source.id}: ${downloadResult.error}`);
            continue;
        }

        // Gerar Doc ID (hash do source_id + filename para determinismo neste estagio)
        const docId = crypto.createHash('md5').update(`${source.id}-${filename}`).digest('hex');

        // Parse
        let processedAt: string | null = null;
        let processingStatus = 'pending';
        let fileFormat = 'pdf'; // Assumindo PDF por enquanto
        let pageCount = 0;

        if (filename.endsWith('.pdf')) {
            const parseResult = await parsePDF(downloadResult.filepath, docId, source.id, NORMALIZED_DIR);

            if (parseResult.success) {
                processedAt = new Date().toISOString();
                processingStatus = 'processed';
                pageCount = parseResult.total_pages;
                console.log(`✅ Parse sucesso: ${pageCount} páginas.`);
            } else {
                processingStatus = 'failed';
                console.error(`❌ Parse falhou: ${parseResult.error}`);
            }
        }

        // Insert Document
        const insertDoc = db.prepare(`
      INSERT INTO documents (doc_id, source_id, filename, filepath, checksum_sha256, file_format, page_count, processed_at, processing_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(doc_id) DO UPDATE SET
        processed_at=excluded.processed_at,
        processing_status=excluded.processing_status,
        page_count=excluded.page_count
    `);

        insertDoc.run(
            docId,
            source.id,
            filename,
            `data/recommendations/raw_docs/${filename}`,
            downloadResult.checksum,
            fileFormat,
            pageCount > 0 ? pageCount : null,
            processedAt,
            processingStatus
        );
    }

    console.log(`\n✨ Ingestão concluída!`);
    db.close();
}

main().catch(console.error);
