// services/recommendations/downloader.ts
// Serviço de download robusto com rate limiting, retries e checksum

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { setTimeout } from 'timers/promises';

export interface DownloadResult {
    success: boolean;
    filepath?: string;
    filename?: string;
    checksum?: string;
    size_bytes?: number;
    error?: string;
    cached: boolean;
}

const USER_AGENT = 'RadonMedicalAI/1.0 (Research; compliant; +http://radon-ai.example.com)';

/**
 * Calcula SHA256 de um arquivo
 */
async function calculateChecksum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filepath);
        stream.on('error', (err) => reject(err));
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

/**
 * Baixa um arquivo de uma URL
 */
export async function downloadFile(
    url: string,
    outputDir: string,
    filename: string, // Nome desejado (ex: source_id.pdf)
    options: { retries?: number; delayMs?: number; force?: boolean } = {}
): Promise<DownloadResult> {
    const { retries = 3, delayMs = 1000, force = false } = options;
    const filepath = path.join(outputDir, filename);

    // Check cache (se não forçar e arquivo existir com tamanho > 0)
    if (!force && fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        if (stats.size > 0) {
            console.log(`  📦 Cache hit: ${filename}`);
            const checksum = await calculateChecksum(filepath);
            return {
                success: true,
                filepath,
                filename,
                checksum,
                size_bytes: stats.size,
                cached: true,
            };
        }
    }

    // Criar diretório se necessário
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (attempt > 1) {
                console.log(`  🔄 Tentativa ${attempt}/${retries} para ${url}...`);
                await setTimeout(delayMs * attempt); // Backoff simples
            } else {
                await setTimeout(delayMs); // Rate limiting preventivo
            }

            console.log(`  ⬇️  Baixando: ${url}`);

            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                headers: {
                    'User-Agent': USER_AGENT,
                },
                timeout: 30000, // 30s timeout
            });

            const writer = fs.createWriteStream(filepath);

            await new Promise((resolve, reject) => {
                response.data.pipe(writer);
                let error: Error | null = null;

                writer.on('error', (err) => {
                    error = err;
                    writer.close();
                    reject(err);
                });

                writer.on('close', () => {
                    if (!error) resolve(true);
                });
            });

            // Validar download
            const stats = fs.statSync(filepath);
            if (stats.size === 0) {
                throw new Error('Arquivo vazio baixado');
            }

            const checksum = await calculateChecksum(filepath);

            console.log(`  ✅ Download concluído: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

            return {
                success: true,
                filepath,
                filename,
                checksum,
                size_bytes: stats.size,
                cached: false,
            };

        } catch (err: any) {
            console.error(`  ❌ Erro no download (tentativa ${attempt}):`, err.message);
            lastError = err;

            // Apagar arquivo parcial/corrompido
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }
    }

    return {
        success: false,
        error: lastError?.message || 'Download falhou após retries',
        cached: false,
    };
}
