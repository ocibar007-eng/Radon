// Test LLM extraction on Fleischner 2017
import 'dotenv/config';
import { extractRecommendations, insertRecommendations } from '../../services/recommendations/llm_extractor';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');
const NORMALIZED_DIR = path.join(process.cwd(), 'data/recommendations/normalized_text');

async function main() {
  const db = new Database(DB_PATH);

  // Test on Fleischner 2017
  const testDoc = db.prepare(`
    SELECT doc_id, source_id, filename 
    FROM documents 
    WHERE source_id = 'fleischner_2017__pdf' 
      AND processing_status = 'processed'
    LIMIT 1
  `).get() as any;

  if (!testDoc) {
    console.error('❌ Test document not found');
    process.exit(1);
  }

  console.log(`\n🧪 Testing Extraction on: ${testDoc.filename}`);
  console.log(`   Source ID: ${testDoc.source_id}\n`);

  const normalizedPath = path.join(NORMALIZED_DIR, `${testDoc.source_id}.json`);

  console.log('🤖 Calling Gemini 1.5 Flash-002 API for extraction...\n');

  const result = await extractRecommendations(
    testDoc.doc_id,
    testDoc.source_id,
    normalizedPath,
    0.1
  );

  if (!result.success) {
    console.error(`❌ Extraction failed: ${result.error}`);
    process.exit(1);
  }

  console.log(`✅ Extraction successful!`);
  console.log(`   Recommendations found: ${result.recommendations.length}`);
  console.log(`   Tokens used: ${result.token_count}\n`);

  // Show first 5
  console.log('📋 Sample Recommendations:\n');
  result.recommendations.slice(0, 5).forEach((rec, idx) => {
    console.log(`${idx + 1}. [${rec.rec_type.toUpperCase()}]`);
    console.log(`   Context: ${rec.clinical_context}`);
    console.log(`   Recommendation: ${rec.recommendation_text}`);
    console.log(`   Certainty: ${rec.certainty_score}%\n`);
  });

  // Insert
  const inserted = insertRecommendations(result.recommendations);
  console.log(`✅ Inserted ${inserted} recommendations into database.\n`);

  const count = db.prepare('SELECT COUNT(*) as count FROM recommendations').get() as any;
  console.log(`📊 Total recommendations in DB: ${count.count}`);

  db.close();
}

main().catch(console.error);
