import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error('API_KEY not found');

const genAI = new GoogleGenerativeAI(API_KEY);

async function main() {
  const db = new Database('data/recommendations/db/recommendations.db');
  const testDoc = db.prepare("SELECT doc_id, source_id FROM documents WHERE source_id = 'fleischner_2017__pdf' LIMIT 1").get() as any;
  
  if (!testDoc) {
    console.error('❌ Doc not found');
    process.exit(1);
  }

  console.log(`\n🧪 Testing: ${testDoc.source_id}`);
  console.log('🤖 Using gemini-1.5-flash-002...\n');

  const textData = JSON.parse(fs.readFileSync(`data/recommendations/normalized_text/${testDoc.source_id}.json`, 'utf-8'));
  const sampleText = textData.pages.slice(0, 2).join('\n\n').slice(0, 8000);

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash-002',
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
  });

  const prompt = `Extract recommendations from Fleischner guideline:
[{\"rec_type\": \"recommendation\", \"clinical_context\": \"...\", \"recommendation_text\": \"...\", \"certainty_score\": 90}]

TEXT: ${sampleText}`;

  try {
    const result = await model.generateContent(prompt);
    console.log('✅ API call successful!\n');
    console.log(result.response.text().slice(0, 300));
  } catch (err: any) {
    console.error(`❌ ${err.message}`);
  }

  db.close();
}

main();
