import 'dotenv/config';
import { extractBibMetadata } from '../../services/recommendations/bib_extractor';
import path from 'path';

const file = path.join(process.cwd(), 'data/recommendations/normalized_text/fleischner_2017__pdf.json');

console.log('🧪 Testing Bibliographic Extraction...');
extractBibMetadata(file)
    .then(result => {
        console.log('✅ Result:', JSON.stringify(result, null, 2));
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
