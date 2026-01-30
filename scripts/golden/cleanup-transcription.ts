#!/usr/bin/env node
/**
 * Golden Test Cleanup Script v2
 * 
 * Limpa os arquivos expected_output.md removendo:
 * 1. Blocos de header/footer repetidos do PDF
 * 2. Linhas "Pré-visualização. Laudo sem valor legal."
 * 3. Numeração de página solta (## 2, ## 3, etc.)
 * 4. Linhas vazias excessivas
 * 5. Corrige palavras coladas comuns
 * 6. Corrige espaços extras dentro de palavras
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GOLDEN_TEST_DIR = join(__dirname, '..', '..', 'tests', 'golden-set', 'golden_test');

// Linhas que devem ser removidas completamente
const LINES_TO_REMOVE = [
    /^Pré-visualização\.\s*Laudo sem valor legal\.?$/,
    /^Nome\s*:\s*PACIENTE_P\d+$/,
    /^RG\s*:\s*\[REDACTED/,
    /^## DN\s*:\s*\[REDACTED/,
    /^Médico\s*:\s*\[REDACTED/,
    /^Convênio\s*:\s*\[REDACTED/,
    /^Unidade\s*:\s*\[REDACTED/,
    /^## Página\s*:\s*\d+\/\d+$/,
    /^Responsável Técnico:\s*\[REDACTED/,
    /^Laboratorio registrado no CRM:\s*\[REDACTED/,
    /^Endereço:\s*\[REDACTED/,
    /^_{50,}$/,
    /^## ASSINATURA DIGITAL$/,
    /^## \[REDACTED_SIGNATURE\]$/,
    /^## \d+$/,  // Numeração de página solta
];

// Correções de espaços extras dentro de palavras (regex -> substituição)
const SPACE_FIXES: [RegExp, string][] = [
    // p2
    [/SISTEM A VENOSO/g, 'SISTEMA VENOSO'],
    // p3 - título
    [/RESSONÂNCIAM AGNÉTICA/g, 'RESSONÂNCIA MAGNÉTICA'],
    [/ABDOM E SUPERIOR/g, 'ABDOME SUPERIOR'],
    // p3 - palavras com espaços extras
    [/les ões/g, 'lesões'],
    [/dis crepância/g, 'discrepância'],
    [/diagnós tica/g, 'diagnóstica'],
    [/Tes la/g, 'Tesla'],
    [/dors al/g, 'dorsal'],
    [/horas \./g, 'horas.'],
    [/s upressão/g, 'supressão'],
    [/es teatos e/g, 'esteatose'],
    [/fas e/g, 'fase'],
    [/contras te/g, 'contraste'],
    [/aquis ições/g, 'aquisições'],
    [/endovenos a/g, 'endovenosa'],
    [/artefatos \,/g, 'artefatos,'],
    [/anties pas módico/g, 'antiespasmódico'],
    [/hios cina/g, 'hioscina'],
    [/dimens ões/g, 'dimensões'],
    [/pres ervadas/g, 'preservadas'],
    [/pres ervados/g, 'preservados'],
    [/pres ervado/g, 'preservado'],
    [/s uperfície/g, 'superfície'],
    [/lis a/g, 'lisa'],
    [/s inal/g, 'sinal'],
    [/bas e/g, 'base'],
    [/s em/g, 'sem'],
    [/cirros e/g, 'cirrose'],
    [/s ignificativa/g, 'significativa'],
    [/s ignificativas/g, 'significativas'],
    [/dis tribuição/g, 'distribuição'],
    [/espars a/g, 'esparsa'],
    [/s egmento/g, 'segmento'],
    [/extens ão/g, 'extensão'],
    [/des critas/g, 'descritas'],
    [/des crito/g, 'descrito'],
    [/Caracterís ticas/g, 'Características'],
    [/periférico espess o/g, 'periférico espesso'],
    [/haloespess o/g, 'halo espesso'],
    [/hipers inal/g, 'hipersinal'],
    [/gorduros o/g, 'gorduroso'],
    [/hásinais/g, 'há sinais'],
    [/evidentes \./g, 'evidentes.'],
    [/Difus ão/g, 'Difusão'],
    [/res trição/g, 'restrição'],
    [/caps ular/g, 'capsular'],
    [/centrals em/g, 'central sem'],
    [/pós -contras te/g, 'pós-contraste'],
    [/maisespess a/g, 'mais espessa'],
    [/cáps ula/g, 'cápsula'],
    [/dis creto/g, 'discreto'],
    [/dis creta/g, 'discreta'],
    [/perfus ional/g, 'perfusional'],
    [/peri-les ional/g, 'peri-lesional'],
    [/les ional/g, 'lesional'],
    [/Sis tema/g, 'Sistema'],
    [/s ugerindo/g, 'sugerindo'],
    [/sistemaporta/g, 'sistema porta'],
    [/cautelos a/g, 'cautelosa'],
    [/Intens idade/g, 'Intensidade'],
    [/Was h-in/g, 'Wash-in'],
    [/Was h-out/g, 'Wash-out'],
    [/apres enta/g, 'apresenta'],
    [/vas cularizado/g, 'vascularizado'],
    [/faseshepatobiliares/g, 'fases hepatobiliares'],
    [/aus ência/g, 'ausência'],
    [/Aus ência/g, 'Ausência'],
    [/hepatocitárias ignificativa/g, 'hepatocitária significativa'],
    [/Ves ícula/g, 'Vesícula'],
    [/finas \,/g, 'finas,'],
    [/cálculos \./g, 'cálculos.'],
    [/Colédocos em/g, 'Colédoco sem'],
    [/principals em/g, 'principal sem'],
    [/parenquimatos o/g, 'parenquimatoso'],
    [/Es plenúnculo/g, 'Esplenúnculo'],
    [/hiloes plênico/g, 'hilo esplênico'],
    [/habituais \,/g, 'habituais,'],
    [/formações expans ivas/g, 'formações expansivas'],
    [/Tópicos \,/g, 'Tópicos,'],
    [/pielocalicinals em/g, 'pielocalicinal sem'],
    [/rimes querdo/g, 'rim esquerdo'],
    [/classificadocomo/g, 'classificado como'],
    [/inferiors em/g, 'inferior sem'],
    [/alteraçõessignificativas/g, 'alterações significativas'],
    [/Vas os/g, 'Vasos'],
    [/mes entéricos/g, 'mesentéricos'],
    [/perigás trica/g, 'perigástrica'],
    [/gás trica/g, 'gástrica'],
    [/s ubcentimétricos/g, 'subcentimétricos'],
    [/as pecto/g, 'aspecto'],
    [/ines pecífico/g, 'inespecífico'],
    [/linfonodomegalias \./g, 'linfonodomegalias.'],
    [/coleções \./g, 'coleções.'],
    [/les ões focaissuspeitas/g, 'lesões focais suspeitas'],
    [/Aeração pres ervada/g, 'Aeração preservada'],
    [/pleural\./g, 'pleural.'],
    [/Es tômago/g, 'Estômago'],
    [/alteraçõessignificativasidentificáveis/g, 'alterações significativas identificáveis'],
    [/avaliadas \./g, 'avaliadas.'],
    [/A comparaçãoélimitada/g, 'A comparação é limitada'],
    [/imagens e dos laudos completos dos exames prévios \./g, 'imagens e dos laudos completos dos exames prévios.'],
    [/ultrassonografiadescritacomonormal/g, 'ultrassonografia descrita como normal'],
    [/tomografia computadorizadasugerindohemangiomas/g, 'tomografia computadorizada sugerindo hemangiomas'],
    [/hipótes e/g, 'hipótese'],
    [/abs cess os/g, 'abscessos'],
    [/hepáticos \./g, 'hepáticos.'],
    [/haloespess o/g, 'halo espesso'],
    [/periférico ou caps ular/g, 'periférico ou capsular'],
    [/contrastehepatoes pecífico/g, 'contraste hepatoespecífico'],
    [/perigás tricossubcentimétricos/g, 'perigástricos subcentimétricos'],
    [/dimens ões \./g, 'dimensões.'],
    [/microabs cess os/g, 'microabscessos'],
    [/periféricoespess o/g, 'periférico espesso'],
    [/conteúdo não/g, 'conteúdo não'],
    [/viável\./g, 'viável.'],
    [/adicionaisespars as/g, 'adicionais esparsas'],
    [/s intomassistêmicosdescritos/g, 'sintomas sistêmicos descritos'],
    [/fasessubagudas/g, 'fases subagudas'],
    [/es pecificidade/g, 'especificidade'],
    [/infeccios a/g, 'infecciosa'],
    [/metás tasesnecróticas/g, 'metástases necróticas'],
    [/hepatocitáriasignificativa/g, 'hepatocitária significativa'],
    [/difusãopredominantementeperiférica/g, 'difusão predominantemente periférica'],
    [/as s ociados/g, 'associados'],
    [/his tória/g, 'história'],
    [/s upurativas/g, 'supurativas'],
    [/comopseudotumorinflamatório/g, 'como pseudotumor inflamatório'],
    [/granulomas \./g, 'granulomas.'],
    [/Possívelimpregnaçãotardiadiscreta/g, 'Possível impregnação tardia discreta'],
    [/process os/g, 'processos'],
    [/fibros o/g, 'fibroso'],
    [/Multiplicidadesuperior/g, 'Multiplicidade superior'],
    [/halosãomenostípicos/g, 'halo são menos típicos'],
    [/ess a/g, 'essa'],
    [/hiperplasianodularfocal/g, 'hiperplasia nodular focal'],
    [/caracterís tico/g, 'característico'],
    [/inflamatório-infeccios a/g, 'inflamatório-infecciosa'],
    [/Sugere-s e/g, 'Sugere-se'],
    [/clínico-laboratoriais \,/g, 'clínico-laboratoriais,'],
    [/conformesuspeita/g, 'conforme suspeita'],
    [/Recomenda-s e/g, 'Recomenda-se'],
    [/s eguimento/g, 'seguimento'],
    [/res posta/g, 'resposta'],
    [/res postaclínica/g, 'resposta clínica'],
    [/cons iderar/g, 'considerar'],
    [/inves tigação/g, 'investigação'],
    [/as sis tencial/g, 'assistencial'],
    [/intervencionis ta/g, 'intervencionista'],
    [/clinicamentesignificativoalém/g, 'clinicamente significativo além'],
    [/advers o/g, 'adverso'],
    [/notavisaesclarecer/g, 'nota visa esclarecer'],
    [/termi nol ogi a/g, 'terminologia'],
    [/i ndicar/g, 'indicar'],
    [/c ertezadiagnóstic a/g, 'certeza diagnóstica'],
    [/l éxic o padroni zado/g, 'léxico padronizado'],
    [/Compatívelcom/g, 'Compatível com'],
    [/Consi stentec om/g, 'Consistente com'],
    [/ac hadosconfirmamfortemente/g, 'achados confirmam fortemente'],
    [/hi pótese/g, 'hipótese'],
    [/c erteza/g, 'certeza'],
    [/i ndic a/g, 'indica'],
    [/ac hados/g, 'achados'],
    [/favorec em/g, 'favorecem'],
    [/probabilidadeintermediári a/g, 'probabilidade intermediária'],
    [/al ta/g, 'alta'],
    [/c erc a/g, 'cerca'],
    [/Inespec ífic o/g, 'Inespecífico'],
    [/Indetermi nado/g, 'Indeterminado'],
    [/permi temdirecionar/g, 'permitem direcionar'],
    [/di agnóstic o/g, 'diagnóstico'],
    [/probabili dade/g, 'probabilidade'],
    [/Pouc o/g, 'Pouco'],
    [/desfavorec em/g, 'desfavorecem'],
    [/bai xa/g, 'baixa'],
    [/refutam fortemente/g, 'refutam fortemente'],
    [/c onclusõesdestelaudo/g, 'conclusões deste laudo'],
    [/i magens obti das/g, 'imagens obtidas'],
    [/i nformaç õesclínic as di sponibilizadas/g, 'informações clínicas disponibilizadas'],
    [/podelevantardúvi das/g, 'pode levantar dúvidas'],
    [/exigirinvestigaçãoadicional/g, 'exigir investigação adicional'],
    [/refl eti ndo nec essari amente/g, 'refletindo necessariamente'],
    [/realidadeclínic a/g, 'realidade clínica'],
    [/paci ente/g, 'paciente'],
    [/l audo/g, 'laudo'],
    [/substi tui/g, 'substitui'],
    [/avaliaçãomédic a presencial/g, 'avaliação médica presencial'],
    [/tampouc o/g, 'tampouco'],
    [/i senta/g, 'isenta'],
    [/nec essi dade/g, 'necessidade'],
    [/c orrelaçãocomdados/g, 'correlação com dados'],
    [/clínic os/g, 'clínicos'],
    [/l aboratoriais/g, 'laboratoriais'],
    [/dúvi das/g, 'dúvidas'],
    [/rec omenda-se/g, 'recomenda-se'],
    [/c onsultadireta/g, 'consulta direta'],
    [/radiologistaresponsável/g, 'radiologista responsável'],
    [/médic o assi stente/g, 'médico assistente'],
    [/MRIofhepaticabsc esses/g, 'MRI of hepatic abscesses'],
    [/Semi narsin Roentgenol ogy/g, 'Seminars in Roentgenology'],
    [/Multimodalityimagingofliverinfecti ons/g, 'Multimodality imaging of liver infections'],
    [/di fferentialdiagnosisandpotentialpitfall s/g, 'differential diagnosis and potential pitfalls'],
    [/Radi oGraphic s/g, 'RadioGraphics'],
    [/Fri ttoli/g, 'Frittoli'],
    [/Pri mary/g, 'Primary'],
    [/benignliverlesi ons/g, 'benign liver lesions'],
    [/Journalof/g, 'Journal of'],
    [/Radiol ogy/g, 'Radiology'],
];

// Correções de palavras coladas (sem espaço)
const WORD_GLUE_FIXES: [RegExp, string][] = [
    // Comum em todos os arquivos
    [/hepáticaéaproximadamente/g, 'hepática é aproximadamente'],
    [/esplênicoé/g, 'esplênico é'],
    [/A intençãoéreduzirambiguidades/g, 'A intenção é reduzir ambiguidades'],
    [/A intençãoéreduzir/g, 'A intenção é reduzir'],
    [/torácicaéobjeto/g, 'torácica é objeto'],
    [/pelveéobjeto/g, 'pelve é objeto'],
    [/evolutivaélimitada/g, 'evolutiva é limitada'],
    [/comparaçãoélimitada/g, 'comparação é limitada'],
    [/O achadoécompatível/g, 'O achado é compatível'],
    [/achadoécompatível/g, 'achado é compatível'],
    [/esplênicoécompatível/g, 'esplênico é compatível'],
    [/pulmonaréobjeto/g, 'pulmonar é objeto'],
    [/pulmonaréobjeto/g, 'pulmonar é objeto'],
    // p3 específicos
    [/ressonânciamagnética/g, 'ressonância magnética'],
    [/abdomesuperior/g, 'abdome superior'],
    [/obtidassequênciasmultiplanares/g, 'obtidas sequências multiplanares'],
    [/sequênciasmultiplanaresponderadas/g, 'sequências multiplanares ponderadas'],
    [/númeroestimadosuperior/g, 'número estimado superior'],
    [/lesãoperiféricamedindocerca/g, 'lesão periférica medindo cerca'],
    // Outros
    [/Classificationof/g, 'Classification of'],
    [/Algorithmicto/g, 'Algorithmic to'],
    [/Approachtothe/g, 'Approach to the'],
    [/BosniakII/g, 'Bosniak II'],
    [/BosniakI/g, 'Bosniak I'],
    // p10
    [/Deforessonância magnéticaidade/g, 'Deformidade'],
    [/esquerdahá/g, 'esquerda há'],
    [/tratadohácerca/g, 'tratado há cerca'],
    [/crônicahácerca/g, 'crônica há cerca'],
    [/dor crônicahá/g, 'dor crônica há'],
];

function shouldRemoveLine(line: string): boolean {
    const trimmed = line.trim();
    return LINES_TO_REMOVE.some(pattern => pattern.test(trimmed));
}

function fixSpacing(content: string): string {
    let fixed = content;

    // Aplicar correções de espaços extras
    for (const [pattern, replacement] of SPACE_FIXES) {
        fixed = fixed.replace(pattern, replacement);
    }

    // Aplicar correções de palavras coladas
    for (const [pattern, replacement] of WORD_GLUE_FIXES) {
        fixed = fixed.replace(pattern, replacement);
    }

    return fixed;
}

function cleanFile(filePath: string): { original: number; cleaned: number } {
    const content = readFileSync(filePath, 'utf-8');

    // Primeiro, corrigir espaçamento
    let fixed = fixSpacing(content);

    // Depois, remover linhas indesejadas
    const lines = fixed.split('\n');
    const cleanedLines = lines.filter(line => !shouldRemoveLine(line));

    // Remover linhas vazias excessivas (mais de 1 seguida)
    const finalLines: string[] = [];
    let prevWasEmpty = false;

    for (const line of cleanedLines) {
        const isEmpty = line.trim() === '';
        if (isEmpty && prevWasEmpty) {
            continue;
        }
        finalLines.push(line);
        prevWasEmpty = isEmpty;
    }

    // Remove trailing empty lines
    while (finalLines.length > 0 && finalLines[finalLines.length - 1].trim() === '') {
        finalLines.pop();
    }

    const cleanedContent = finalLines.join('\n') + '\n';
    writeFileSync(filePath, cleanedContent);

    return {
        original: lines.length,
        cleaned: finalLines.length
    };
}

function processAllFiles() {
    const folders = readdirSync(GOLDEN_TEST_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.match(/^p\d+$/))
        .map(d => d.name)
        .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

    console.log('🧹 Golden Test Cleanup Script v2\n');
    console.log(`📁 Processando ${folders.length} pastas...\n`);

    let totalLinesRemoved = 0;

    for (const folder of folders) {
        const filePath = join(GOLDEN_TEST_DIR, folder, 'expected_output.md');

        try {
            const result = cleanFile(filePath);
            const linesRemoved = result.original - result.cleaned;
            totalLinesRemoved += linesRemoved;

            console.log(`✅ ${folder}: ${result.original} → ${result.cleaned} linhas (${linesRemoved > 0 ? '-' + linesRemoved : 'espacing fixed'})`);
        } catch (err) {
            console.error(`❌ ${folder}: Erro - ${err}`);
        }
    }

    console.log(`\n📊 Total: ${totalLinesRemoved} linhas removidas`);
    console.log('✨ Correções de espaçamento aplicadas!');
}

processAllFiles();
