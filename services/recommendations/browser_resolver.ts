// services/recommendations/browser_resolver.ts
// Playwright-based PDF resolution for JavaScript-heavy sites (ACR, etc.)

import { chromium, Browser, Page } from 'playwright';

export interface BrowserResolveResult {
    success: boolean;
    pdf_url?: string;
    final_url?: string;
    error?: string;
    method: 'direct_pdf' | 'intercepted_redirect' | 'link_click';
}

/**
 * Launches headless browser and navigates to URL
 * Waits for page to stabilize and captures final URL or PDF download
 */
export async function resolvePDFWithBrowser(
    url: string,
    timeout: number = 15000
): Promise<BrowserResolveResult> {
    let browser: Browser | null = null;

    try {
        console.log(`    🎭 Playwright: Navegando para ${url}...`);

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            acceptDownloads: true
        });

        const page = await context.newPage();

        // Track navigation redirects
        let finalPDFUrl: string | undefined;

        // Intercept PDF requests
        await page.route('**/*.pdf', (route) => {
            finalPDFUrl = route.request().url();
            console.log(`    ✅ PDF intercepted: ${finalPDFUrl}`);
            route.abort(); // Don't actually download, just capture URL
        });

        // Navigate
        try {
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout
            });
        } catch (err: any) {
            // If navigation itself fails but we got PDF URL, that's OK
            if (finalPDFUrl) {
                await browser.close();
                return {
                    success: true,
                    pdf_url: finalPDFUrl,
                    final_url: finalPDFUrl,
                    method: 'intercepted_redirect'
                };
            }
            throw err;
        }

        // Check if we intercepted a PDF during navigation
        if (finalPDFUrl) {
            await browser.close();
            return {
                success: true,
                pdf_url: finalPDFUrl,
                final_url: finalPDFUrl,
                method: 'intercepted_redirect'
            };
        }

        // Strategy 1: Check if current URL is PDF
        const currentUrl = page.url();
        if (currentUrl.endsWith('.pdf') || currentUrl.includes('.pdf?')) {
            await browser.close();
            return {
                success: true,
                pdf_url: currentUrl,
                final_url: currentUrl,
                method: 'direct_pdf'
            };
        }

        // Strategy 2: Look for PDF download links on page
        const pdfLinks = await page.locator('a[href$=".pdf"], a[href*=".pdf?"], a:has-text("Download"), a:has-text("PDF")').all();

        for (const link of pdfLinks) {
            try {
                const href = await link.getAttribute('href');
                if (href && (href.endsWith('.pdf') || href.includes('.pdf?'))) {
                    // Make absolute if relative
                    const absoluteUrl = new URL(href, currentUrl).href;
                    await browser.close();
                    return {
                        success: true,
                        pdf_url: absoluteUrl,
                        final_url: currentUrl,
                        method: 'link_click'
                    };
                }
            } catch {
                continue;
            }
        }

        // Strategy 3: Check if page content-type is PDF (for iframe embeds)
        const contentType = await page.evaluate(() => document.contentType);
        if (contentType === 'application/pdf') {
            await browser.close();
            return {
                success: true,
                pdf_url: currentUrl,
                final_url: currentUrl,
                method: 'direct_pdf'
            };
        }

        await browser.close();
        return {
            success: false,
            error: 'No PDF found on page',
            method: 'link_click'
        };

    } catch (err: any) {
        if (browser) await browser.close();
        return {
            success: false,
            error: err.message,
            method: 'direct_pdf'
        };
    }
}
