// scripts/recommendations/batch_process.ts
// Processa todos os PDFs em raw_docs/, parseando e inserindo no DB
// Detecta automaticamente novos PDFs adicionados

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { parsePDF } from '../../services/recommendations/parser';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const RAW_DIR = path.join(process.cwd(), 'data/recommendations/raw_docs');
const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');

interface ProcessResult {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
}

async function main() {
    console.log('🚀 Batch Processing - Todos os PDFs em raw_docs/\n');

    // Conectar DB
    const db = new Database(DB_PATH);

    // Listar todos os PDFs
    const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.pdf'));
    console.log(`📋 Encontrados: ${files.length} PDFs\n`);

    const results: ProcessResult = {
        total: files.length,
        processed: 0,
        failed: 0,
        skipped: 0
    };

    for (const filename of files) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📄 Processando: ${filename}`);

        const filepath = path.join(RAW_DIR, filename);
        const stats = fs.statSync(filepath);

        // Pular arquivos muito pequenos (< 10KB = provavelmente HTML/broken)
        if (stats.size < 10000) {
            console.log(`  ⚠️  Arquivo muito pequeno (${(stats.size / 1024).toFixed(1)}KB), pulando...`);
            results.skipped++;
            continue;
        }

        // Gerar source_id do nome do arquivo (remover .pdf)
        const sourceId = filename.replace('.pdf', '').replace(/[^a-z0-9_-]/gi, '_');

        // Gerar doc_id único
        const docId = crypto.createHash('md5').update(`${sourceId}-${filename}`).digest('hex');

        // Verificar se já existe no DB
        const existing = db.prepare('SELECT doc_id FROM documents WHERE doc_id = ?').get(docId);
        if (existing) {
            console.log(`  ℹ️  Já existe no DB, pulando...`);
            results.skipped++;
            continue;
        }

        // Calcular checksum
        const fileBuffer = fs.readFileSync(filepath);
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Inserir source se não existir
        const sourceExists = db.prepare('SELECT source_id FROM sources WHERE source_id = ?').get(sourceId);
        if (!sourceExists) {
            console.log(`  ➕ Criando source: ${sourceId}`);
            db.prepare(`
        INSERT INTO sources (source_id, entidade, titulo, ano, status_acesso)
        VALUES (?, ?, ?, ?, ?)
      `).run(sourceId, 'Auto-detected', filename, new Date().getFullYear(), 'open');
        }

        // Parsear PDF
        console.log(`  🔍 Parseando PDF (${(stats.size / 1024 / 1024).toFixed(2)}MB)...`);
        const parseResult = await parsePDF(filepath, docId, sourceId, NORMALIZED_DIR);

        let processingStatus = 'pending';
        let pageCount = 0;
        let processedAt: string | null = null;

        if (parseResult.success) {
            processingStatus = 'processed';
            pageCount = parseResult.total_pages;
            processedAt = new Date().toISOString();
            console.log(`  ✅ Parse sucesso: ${pageCount} páginas`);
            results.processed++;
        } else {
            processingStatus = 'failed';
            console.error(`  ❌ Parse falhou: ${parseResult.error}`);
            results.failed++;
        }

        // Inserir documento
        db.prepare(`
      INSERT INTO documents (doc_id, source_id, filename, filepath, checksum_sha256, file_format, page_count, processed_at, processing_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            docId,
            sourceId,
            filename,
            `data/recommendations/raw_docs/${filename}`,
            checksum,
            'pdf',
            pageCount > 0 ? pageCount : null,
            processedAt,
            processingStatus
        );
    }

    db.close();

    console.log(`\n${'='.repeat(70)}`);
    console.log('\n📊 RESUMO FINAL:');
    console.log(`   Total de PDFs: ${results.total}`);
    console.log(`   ✅ Processados: ${results.processed}`);
    console.log(`   ❌ Falharam: ${results.failed}`);
    console.log(`   ⏭️  Pulados: ${results.skipped}`);
    console.log(`\n✨ Batch processing concluído!\n`);
}

main().catch(console.error);
