
import 'dotenv/config';
import {
    generateClaudeResponse,
    CLAUDE_SYSTEM_PROMPT,
    buildCaseMessage,
    selectRelevantReferences,
    loadReferenceFiles
} from '../src/adapters/anthropic/index';
import { applyTerminologyFixlistToReport } from '../src/core/reportGeneration/terminology-fixlist';
import { canonicalizeMarkdown } from '../src/core/reportGeneration/canonicalizer';
import fs from 'node:fs';
import path from 'node:path';

// Force load local env if dotenv didn't pick it up (sometimes issue with monorepos/nesting)
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    // ignore
}

// Simulating the environment for the test
process.env.CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-6';

async function main() {
    console.log('=== TESTE MANUAL: INTEGRAÇÃO CLAUDE ===');

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ANTHROPIC_API_KEY não encontrada no ambiente ou .env.local');
        console.error('Por favor, adicione ANTHROPIC_API_KEY=sk-... no arquivo .env.local');
        process.exit(1);
    }

    console.log('✅ API Check: Key encontrada.');

    // 1. Dados do caso (simulado)
    // Caso de Apendicite Aguda (comum) + Cisto Renal (gatilho Bosniak) + Termos para correção
    const caseInput = {
        transcription: `Paciente de 35 anos, sexo feminino. Dor em fossa ilíaca direita há 2 dias.
    Tomografia computadorizada do abdome total com contraste.
    
    Fígado com dimensões normais e contornos regulares. Não há sinais de esteatose.
    Vesícula biliar distendida, paredes finas, sem cálculos.
    Pâncreas e baço sem alterações.
    
    Nos rins, nota-se cisto cortical simples no rim direito, medindo 15 mm, homogêneo, sem septos ou realce.
    
    Apêndice cecal espessado, medindo 14 mm, com borramento da gordura adjacente e realce parietal pelo meio de contraste.
    Nota-se líquido livre laminar na goteira parietocólica direita.
    Ausência de pneumoperitônio.
    
    Útero e anexos sem particularidades.
    
    Impressão: Quadro compatível com apendicite aguda.
    Cisto renal simples à direita (Bosniak I).`,

        modality: 'TC' as const,
        region: 'abdome',
        patientName: 'TESTE MANUAL CLAUDE',
        patientOS: '999999-TEST'
    };

    console.log('\n=== 1. PREPARAÇÃO DO PROMPT ===');

    // 2. RAG Selector
    const refs = selectRelevantReferences(caseInput.transcription);
    console.log(`📚 RAG: Selecionou ${refs.length} referências (IDs: ${refs.join(', ')})`);
    const refsContent = refs.length > 0 ? loadReferenceFiles(refs) : undefined;

    // 3. Build Message
    const userMessage = buildCaseMessage({
        ...caseInput,
        selectedReferences: refsContent
    });
    console.log(`📝 User Message montada (${userMessage.length} chars)`);

    console.log('\n=== 2. CHAMANDO CLAUDE (AGUARDE 30-60s...) ===');
    const startTime = Date.now();

    try {
        const response = await generateClaudeResponse({
            systemPrompt: CLAUDE_SYSTEM_PROMPT,
            userMessage,
            model: process.env.CLAUDE_MODEL,
            maxTokens: 4000
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Resposta recebida em ${(duration / 1000).toFixed(1)}s`);
        console.log(`📊 Usage: Input=${response.usage.input_tokens}, Output=${response.usage.output_tokens}`);

        console.log('\n=== 3. APLICANDO GUARDS ===');

        let report = response.text;

        // Guard 1: Terminology matches our fixlist check?
        // Vamos injetar um erro proposital no input se quisermos testar, mas o LLM pode gerar erros sozinho.

        const termResult = applyTerminologyFixlistToReport(report);
        if (termResult.totalFixes > 0) {
            console.log(`🔧 Terminology Guard: ${termResult.totalFixes} correções aplicadas.`);
            termResult.fixes.forEach(f => console.log(`   - "${f.wrong}" -> "${f.correct}"`));
            report = termResult.text;
        } else {
            console.log('✨ Terminology Guard: Nenhuma correção necessária.');
        }

        // Guard 2: Canonicalizer
        const canonResult = canonicalizeMarkdown(report);
        if (canonResult.corrections.length > 0) {
            console.log(`🧹 Canonicalizer: ${canonResult.corrections.length} formatações ajustadas.`);
            report = canonResult.text;
        } else {
            console.log('✨ Canonicalizer: Texto já estava canônico.');
        }

        console.log('\n=======================================');
        console.log('       LAUDO FINAL GERADO             ');
        console.log('=======================================\n');
        console.log(report);
        console.log('\n=======================================');

    } catch (error: any) {
        console.error('\n❌ ERRO NA CHAMADA API:');
        console.error(error.message);
        if (error.response) {
            console.error('Status:', error.status);
        }
        if (error.message.includes('401')) {
            console.error('Dica: Verifique se sua ANTHROPIC_API_KEY está correta.');
        }
    }
}

main();
