// scripts/recommendations/init_db.ts
// Inicializa o banco de dados de recomendações com o schema definido

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const SCHEMA_PATH = path.join(process.cwd(), 'data/recommendations/db/schema.sql');

function initDatabase() {
    console.log('🚀 Inicializando Evidence-Based Recommendations Database...');
    console.log(`📂 DB Path: ${DB_PATH}`);

    try {
        // Garantir que diretório existe
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            console.log(`📦 Criando diretório: ${dbDir}`);
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Ler schema
        if (!fs.existsSync(SCHEMA_PATH)) {
            throw new Error(`❌ Schema não encontrado em: ${SCHEMA_PATH}`);
        }
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

        // Conectar/Criar DB
        const db = new Database(DB_PATH);

        // Executar Schema
        console.log('📜 Executando schema.sql...');
        db.exec(schema);

        console.log('✅ Banco de dados inicializado com sucesso!');
        console.log('   Tabelas criadas: sources, documents, recommendations');

        db.close();
        process.exit(0);
    } catch (error) {
        console.error('💥 Erro fatal ao inicializar DB:', error);
        process.exit(1);
    }
}

// Executar
initDatabase();
