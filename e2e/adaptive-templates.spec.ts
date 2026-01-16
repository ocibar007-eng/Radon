/**
 * Teste E2E automatizado com Playwright
 * Testa upload de PDFs e renderização de templates adaptativos
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PDFS_DIR = path.join(__dirname, '../test-pdfs');
const BASE_URL = 'http://localhost:3000';

test.describe('Templates Adaptativos - Testes E2E', () => {

    test.beforeEach(async ({ page }) => {
        // Navegar para a aplicação
        await page.goto(BASE_URL);

        // Aguardar aplicação carregar
        await page.waitForLoadState('networkidle');
    });

    test('deve renderizar template de Pedido Médico corretamente', async ({ page }) => {
        // Verificar se PDF existe
        const pdfPath = path.join(TEST_PDFS_DIR, 'pedido_medico_tc_torax.pdf');
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found: ${pdfPath}`);
        }

        // Upload do PDF
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('button:has-text("Upload")') // Ajustar seletor conforme UI
        ]);
        await fileChooser.setFiles(pdfPath);

        // Aguardar processamento
        await page.waitForTimeout(5000); // Ajustar conforme necessário

        // Validações do template
        await expect(page.locator('text=Pedido Médico / Ordem de Serviço')).toBeVisible();
        await expect(page.locator('text=MARIA SILVA SANTOS')).toBeVisible();
        await expect(page.locator('text=Dr. Carlos Alberto Mendes')).toBeVisible();
        await expect(page.locator('text=CRM 12345/SP')).toBeVisible();
        await expect(page.locator('text=TOMOGRAFIA COMPUTADORIZADA DE TÓRAX')).toBeVisible();
        await expect(page.locator('text=tosse persistente')).toBeVisible();
        await expect(page.locator('text=R05 - Tosse')).toBeVisible();
    });

    test('deve renderizar template de Termo de Consentimento', async ({ page }) => {
        const pdfPath = path.join(TEST_PDFS_DIR, 'termo_consentimento_contraste.pdf');
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found: ${pdfPath}`);
        }

        // Upload
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('button:has-text("Upload")')
        ]);
        await fileChooser.setFiles(pdfPath);

        await page.waitForTimeout(5000);

        // Validações
        await expect(page.locator('text=Termo de Consentimento')).toBeVisible();
        await expect(page.locator('text=TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO')).toBeVisible();
        await expect(page.locator('text=Alergias Relatadas')).toBeVisible();
        await expect(page.locator('text=Dipirona')).toBeVisible();
        await expect(page.locator('text=Losartana')).toBeVisible();
        await expect(page.locator('text=✅ Presente')).toBeVisible(); // Assinatura
    });

    test('deve renderizar template de Questionário', async ({ page }) => {
        const pdfPath = path.join(TEST_PDFS_DIR, 'questionario_pre_rm.pdf');
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found: ${pdfPath}`);
        }

        // Upload
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('button:has-text("Upload")')
        ]);
        await fileChooser.setFiles(pdfPath);

        await page.waitForTimeout(5000);

        // Validações
        await expect(page.locator('text=Questionário Pré-Exame')).toBeVisible();
        await expect(page.locator('text=RESSONÂNCIA MAGNÉTICA')).toBeVisible();
        await expect(page.locator('text=Sintomas Atuais')).toBeVisible();
        await expect(page.locator('text=Dor de cabeça intensa')).toBeVisible();
        await expect(page.locator('text=Histórico Cirúrgico')).toBeVisible();
        await expect(page.locator('text=Apendicectomia')).toBeVisible();
        await expect(page.locator('text=marca-passo')).toBeVisible(); // Pergunta
    });

    test('deve renderizar template de Guia de Autorização', async ({ page }) => {
        const pdfPath = path.join(TEST_PDFS_DIR, 'guia_unimed.pdf');
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF not found: ${pdfPath}`);
        }

        // Upload
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('button:has-text("Upload")')
        ]);
        await fileChooser.setFiles(pdfPath);

        await page.waitForTimeout(5000);

        // Validações
        await expect(page.locator('text=Guia de Autorização')).toBeVisible();
        await expect(page.locator('text=UNIMED')).toBeVisible();
        await expect(page.locator('text=2024.01.123456.789')).toBeVisible(); // Nº Guia
        await expect(page.locator('text=4567.8901.2345.6789')).toBeVisible(); // Carteirinha
        await expect(page.locator('text=40901114')).toBeVisible(); // Código TUSS
        await expect(page.locator('text=30/01/2024')).toBeVisible(); // Validade
    });

    test('deve mostrar todos os templates quando múltiplos PDFs são enviados', async ({ page }) => {
        const pdfs = [
            path.join(TEST_PDFS_DIR, 'pedido_medico_tc_torax.pdf'),
            path.join(TEST_PDFS_DIR, 'termo_consentimento_contraste.pdf'),
            path.join(TEST_PDFS_DIR, 'questionario_pre_rm.pdf'),
            path.join(TEST_PDFS_DIR, 'guia_unimed.pdf')
        ];

        // Verificar se todos existem
        pdfs.forEach(pdfPath => {
            if (!fs.existsSync(pdfPath)) {
                throw new Error(`PDF not found: ${pdfPath}`);
            }
        });

        // Upload múltiplo
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('button:has-text("Upload")')
        ]);
        await fileChooser.setFiles(pdfs);

        // Aguardar processamento de todos
        await page.waitForTimeout(15000); //  4 PDFs precisam de mais tempo

        // Verificar que pelo menos um elemento de cada template aparece
        await expect(page.locator('text=Pedido Médico')).toBeVisible();
        await expect(page.locator('text=Termo de Consentimento')).toBeVisible();
        await expect(page.locator('text=Questionário')).toBeVisible();
        await expect(page.locator('text=Guia de Autorização')).toBeVisible();
    });
});
