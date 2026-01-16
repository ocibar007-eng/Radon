/**
 * Script para gerar PDFs de teste realistas
 * Cria documentos para cada tipo de template adaptativo
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../test-pdfs');

// Criar pasta de output se não existir
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Gera um PDF de Pedido Médico
 */
function createPedidoMedicoPDF(): string {
    const filePath = path.join(OUTPUT_DIR, 'pedido_medico_tc_torax.pdf');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('PEDIDO MÉDICO / ORDEM DE SERVIÇO', { align: 'center' });
    doc.moveDown(2);

    // Número do pedido
    doc.fontSize(10).font('Helvetica').text('Nº Pedido: PED-2024-001234', { align: 'right' });
    doc.text('Data: 15/01/2024', { align: 'right' });
    doc.moveDown(1);

    // Dados do paciente
    doc.fontSize(12).font('Helvetica-Bold').text('DADOS DO PACIENTE');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('Nome: MARIA SILVA SANTOS');
    doc.text('Idade: 45 anos');
    doc.text('Sexo: Feminino');
    doc.moveDown(1);

    // Médico solicitante
    doc.fontSize(12).font('Helvetica-Bold').text('MÉDICO SOLICITANTE');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('Dr. Carlos Alberto Mendes');
    doc.text('CRM 12345/SP');
    doc.text('Especialidade: Pneumologia');
    doc.moveDown(1);

    // Exame solicitado
    doc.fontSize(12).font('Helvetica-Bold').text('EXAME SOLICITADO');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('TOMOGRAFIA COMPUTADORIZADA DE TÓRAX COM CONTRASTE');
    doc.moveDown(1);

    // Justificativa clínica
    doc.fontSize(12).font('Helvetica-Bold').text('JUSTIFICATIVA CLÍNICA / INDICAÇÃO');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('Paciente com tosse persistente há 3 meses, dispneia aos esforços e perda ponderal de 5kg. Raio-X de tórax prévio mostrou opacidade em lobo superior direito. Investigação de neoplasia pulmonar.');
    doc.moveDown(1);

    // CID
    doc.fontSize(10).font('Helvetica-Bold').text('CID: ', { continued: true });
    doc.font('Helvetica').text('R05 - Tosse');
    doc.moveDown(1);

    // Observações
    doc.fontSize(12).font('Helvetica-Bold').text('OBSERVAÇÕES');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('• Paciente com alergia a iodo - usar contraste não iodado');
    doc.text('• Realizar cortes de 1mm para melhor avaliação');
    doc.text('• Encaminhar resultado com urgência');

    doc.end();
    console.log(`✅ PDF criado: ${filePath}`);
    return filePath;
}

/**
 * Gera um PDF de Termo de Consentimento
 */
function createTermoConsentimentoPDF(): string {
    const filePath = path.join(OUTPUT_DIR, 'termo_consentimento_contraste.pdf');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text('TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO', { align: 'center' });
    doc.fontSize(12).text('PARA USO DE CONTRASTE IODADO', { align: 'center' });
    doc.moveDown(2);

    // Paciente
    doc.fontSize(10).font('Helvetica');
    doc.text('Eu, MARIA SILVA SANTOS, declaro que:');
    doc.moveDown(0.5);

    // Declarações
    doc.text('☑ Fui informado(a) sobre os riscos e benefícios do uso de contraste iodado');
    doc.text('☑ Fui esclarecido(a) sobre possíveis reações alérgicas e seus tratamentos');
    doc.text('☑ Tive a oportunidade de fazer todas as perguntas necessárias');
    doc.text('☑ Autorizo a realização do procedimento descrito acima');
    doc.moveDown(1);

    // Informações clínicas
    doc.fontSize(11).font('Helvetica-Bold').text('INFORMAÇÕES CLÍNICAS RELEVANTES');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    doc.text('Medicações em uso:');
    doc.text('  • Losartana 50mg - 1x ao dia');
    doc.text('  • Metformina 850mg - 2x ao dia');
    doc.text('  • AAS 100mg - 1x ao dia');
    doc.moveDown(0.5);

    doc.text('Alergias conhecidas:');
    doc.text('  • Dipirona (reação cutânea)');
    doc.text('  • Mariscos (urticária)');
    doc.moveDown(0.5);

    doc.text('Comorbidades:');
    doc.text('  • Hipertensão Arterial Sistêmica');
    doc.text('  • Diabetes Mellitus tipo 2');
    doc.text('  • Dislipidemia');
    doc.moveDown(2);

    // Assinatura
    doc.text('São Paulo, 15 de janeiro de 2024');
    doc.moveDown(2);
    doc.text('_________________________________');
    doc.text('Assinatura do Paciente', { align: 'center' });

    doc.end();
    console.log(`✅ PDF criado: ${filePath}`);
    return filePath;
}

/**
 * Gera um PDF de Questionário Pré-Exame
 */
function createQuestionarioPDF(): string {
    const filePath = path.join(OUTPUT_DIR, 'questionario_pre_rm.pdf');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('QUESTIONÁRIO PRÉ-EXAME', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('RESSONÂNCIA MAGNÉTICA', { align: 'center' });
    doc.moveDown(2);

    // Sintomas atuais
    doc.fontSize(11).font('Helvetica-Bold').text('SINTOMAS ATUAIS:');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('• Dor de cabeça intensa');
    doc.text('• Náuseas matinais');
    doc.text('• Visão embaçada ocasional');
    doc.moveDown(1);

    // Histórico
    doc.fontSize(11).font('Helvetica-Bold').text('HISTÓRICO CIRÚRGICO:');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('• Apendicectomia - 2010');
    doc.text('• Cesariana - 2015');
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text('HISTÓRICO PATOLÓGICO:');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('• Enxaqueca desde a adolescência');
    doc.text('• Hipotireoidismo (diagnosticado em 2018)');
    doc.moveDown(1.5);

    // Perguntas de segurança
    doc.fontSize(12).font('Helvetica-Bold').text('TRIAGEM DE SEGURANÇA PARA RESSONÂNCIA MAGNÉTICA');
    doc.moveDown(1);

    const perguntas = [
        { q: 'Possui marca-passo cardíaco?', r: '☐ Sim  ☑ Não' },
        { q: 'Possui implantes metálicos (pinos, placas, clipes)?', r: '☐ Sim  ☑ Não' },
        { q: 'Possui tatuagens?', r: '☑ Sim  ☐ Não\n   Detalhe: Tatuagem pequena no braço direito (feita há 5 anos)' },
        { q: 'Sofre de claustrofobia?', r: '☐ Sim  ☑ Não' },
        { q: 'Está grávida ou suspeita de gravidez?', r: '☐ Sim  ☑ Não' },
        { q: 'Possui alergias a medicamentos?', r: 'Sim - Alergia a penicilina' },
        { q: 'Faz uso de medicação contínua?', r: 'Sim - Puran T4 75mcg (hipotireoidismo)' }
    ];

    perguntas.forEach(({ q, r }) => {
        doc.fontSize(10).font('Helvetica-Bold').text(q);
        doc.font('Helvetica').text(r);
        doc.moveDown(0.5);
    });

    doc.end();
    console.log(`✅ PDF criado: ${filePath}`);
    return filePath;
}

/**
 * Gera um PDF de Guia de Autorização
 */
function createGuiaAutorizacaoPDF(): string {
    const filePath = path.join(OUTPUT_DIR, 'guia_unimed.pdf');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.pipe(fs.createWriteStream(filePath));

    // Header com logo simulado
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#006400').text('UNIMED', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('black').text('Plano Empresarial Premium', { align: 'center' });
    doc.moveDown(2);

    // Tipo de guia
    doc.fontSize(14).font('Helvetica-Bold').text('GUIA DE AUTORIZAÇÃO DE PROCEDIMENTO', { align: 'center' });
    doc.moveDown(2);

    // Dados da guia
    doc.fontSize(11).font('Helvetica-Bold').text('Número da Guia: ', { continued: true });
    doc.fontSize(12).font('Courier-Bold').text('2024.01.123456.789');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('Nº Carteirinha: ', { continued: true });
    doc.font('Courier').text('4567.8901.2345.6789');
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Validade: ', { continued: true });
    doc.font('Helvetica').text('30/01/2024');
    doc.moveDown(1.5);

    // Beneficiário
    doc.fontSize(11).font('Helvetica-Bold').text('BENEFICIÁRIO');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('MARIA SILVA SANTOS');
    doc.moveDown(1.5);

    // Procedimento autorizado
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#006400').text('PROCEDIMENTO AUTORIZADO');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('black').text('TOMOGRAFIA COMPUTADORIZADA DE TÓRAX COM CONTRASTE VENOSO');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text('Código TUSS: 40901114');
    doc.text('Quantidade autorizada: 1 sessão');
    doc.moveDown(1.5);

    // Observações
    doc.fontSize(11).font('Helvetica-Bold').text('OBSERVAÇÕES IMPORTANTES');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text('• Autorização válida apenas para a rede credenciada');
    doc.text('• Prazo de validade de 15 dias a partir da emissão');
    doc.text('• Apresentar documento de identificação com foto no dia do exame');
    doc.moveDown(2);

    // Rodapé
    doc.fontSize(8).font('Helvetica-Oblique').text('Emitido em: 15/01/2024', { align: 'center' });
    doc.text('Central de Autorizações: 0800-XXX-XXXX', { align: 'center' });

    doc.end();
    console.log(`✅ PDF criado: ${filePath}`);
    return filePath;
}

/**
 * Função principal
 */
async function main() {
    console.log('🔧 Gerando PDFs de teste...\n');

    const pedido = createPedidoMedicoPDF();
    const termo = createTermoConsentimentoPDF();
    const questionario = createQuestionarioPDF();
    const guia = createGuiaAutorizacaoPDF();

    // Aguardar um pouco para garantir que os arquivos foram escritos
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ Todos os PDFs foram criados com sucesso!');
    console.log(`📁 Pasta de output: ${OUTPUT_DIR}`);
    console.log('\nArquivos criados:');
    console.log(`  - ${path.basename(pedido)}`);
    console.log(`  - ${path.basename(termo)}`);
    console.log(`  - ${path.basename(questionario)}`);
    console.log(`  - ${path.basename(guia)}`);
}

main().catch(console.error);
