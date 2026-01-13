/**
 * Generate test PDF assets using pdf-lib
 * This creates realistic PDF files for automated testing
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testAssetsDir = path.join(__dirname, '..', 'test-assets');

// Ensure directory exists
if (!fs.existsSync(testAssetsDir)) {
    fs.mkdirSync(testAssetsDir, { recursive: true });
}

async function generateTestPDF(filename, content) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Title
    page.drawText('LAUDO MÉDICO', {
        x: 50,
        y: 780,
        size: 18,
        font: boldFont,
        color: rgb(0, 0, 0),
    });

    // Patient info
    page.drawText(`Paciente: ${content.patient}`, { x: 50, y: 740, size: 12, font });
    page.drawText(`OS: ${content.os}`, { x: 50, y: 720, size: 12, font });
    page.drawText(`Data: ${content.date}`, { x: 50, y: 700, size: 12, font });

    // Report content
    const lines = content.report.split('\n');
    let yPosition = 660;

    for (const line of lines) {
        if (yPosition < 50) break; // Stop if we run out of space
        page.drawText(line, { x: 50, y: yPosition, size: 10, font });
        yPosition -= 15;
    }

    const pdfBytes = await pdfDoc.save();
    const filepath = path.join(testAssetsDir, filename);
    fs.writeFileSync(filepath, pdfBytes);
    console.log(`✓ Created: ${filename}`);
}

async function main() {
    console.log('Generating test PDF assets...\n');

    const testDocuments = [
        {
            filename: 'test_patient_01.pdf',
            content: {
                patient: 'João Silva',
                os: 'OS-12345',
                date: '13/01/2026',
                report: `TOMOGRAFIA COMPUTADORIZADA DE CRÂNIO
        
Técnica: Exame realizado sem contraste.

Achados:
- Estruturas da linha média centradas
- Sem evidência de lesões expansivas
- Sistema ventricular de dimensões normais
- Sem sinais de hemorragia recente

Conclusão:
Exame dentro dos limites da normalidade.`
            }
        },
        {
            filename: 'test_patient_02.pdf',
            content: {
                patient: 'Maria Santos',
                os: 'OS-12346',
                date: '13/01/2026',
                report: `RADIOGRAFIA DE TÓRAX PA

Técnica: Incidência póstero-anterior em ortostática.

Achados:
- Campos pulmonares livres
- Trama vascular preservada
- Área cardíaca dentro dos limites
- Seios costofrênicos livres

Conclusão:
Radiografia de tórax sem alterações.`
            }
        },
        {
            filename: 'test_patient_03.pdf',
            content: {
                patient: 'Pedro Oliveira',
                os: 'OS-12347',
                date: '13/01/2026',
                report: `ULTRASSONOGRAFIA ABDOMINAL TOTAL

Técnica: Exame realizado via translombar.

Achados:
- Fígado de dimensões normais, contornos regulares
- Vesícula biliar sem cálculos
- Rins tópicos, tamanho preservado
- Baço normal

Conclusão:
Ultrassonografia abdominal sem alterações.`
            }
        },
        {
            filename: 'test_patient_04.pdf',
            content: {
                patient: 'Ana Costa',
                os: 'OS-12348',
                date: '13/01/2026',
                report: `RESSONÂNCIA MAGNÉTICA DE COLUNA LOMBAR

Técnica: Sequências T1, T2 e STIR.

Achados:
- Alinhamento vertebral preservado
- Discos intervertebrais com altura preservada
- Sem protrusões ou hérnias discais
- Cone medular em posição habitual

Conclusão:
RM de coluna lombar dentro da normalidade.`
            }
        },
        {
            filename: 'test_patient_05.pdf',
            content: {
                patient: 'Carlos Ferreira',
                os: 'OS-12349',
                date: '13/01/2026',
                report: `TOMOGRAFIA DE ABDOME E PELVE

Técnica: Exame com contraste venoso.

Achados:
- Fígado, baço, pâncreas e rins sem alterações
- Vesícula biliar normal
- Alças intestinais sem distensão
- Ausência de líquido livre

Conclusão:
TC de abdome e pelve sem anormalidades.`
            }
        }
    ];

    for (const doc of testDocuments) {
        await generateTestPDF(doc.filename, doc.content);
    }

    console.log(`\n✓ Successfully generated ${testDocuments.length} test PDFs in ./test-assets/`);
}

main().catch(console.error);
