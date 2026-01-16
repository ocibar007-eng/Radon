
import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker para usar a versão ESM correspondente via CDN (fallback seguro para este ambiente)
// Em produção real com bundler, isso seria um import local do worker.min.mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

export class PdfLoadError extends Error {
  constructor(message: string, public reason: 'password' | 'corrupt' | 'unknown') {
    super(message);
    this.name = 'PdfLoadError';
  }
}

export async function convertPdfToImages(file: File): Promise<Blob[]> {
  let pdf: pdfjsLib.PDFDocumentProxy | null = null;
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      stopAtErrors: true 
    });

    loadingTask.onPassword = (updatePassword: any, reason: any) => {
      throw new PdfLoadError("O arquivo é protegido por senha.", 'password');
    };

    pdf = await loadingTask.promise;
    const images: Blob[] = [];

    // Safety limit to avoid browser crash on massive PDFs
    const maxPages = 50; 
    const numPages = Math.min(pdf.numPages, maxPages);

    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Cleanup page resources
        page.cleanup();

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        if (blob) images.push(blob);
      } catch (pageError) {
        console.warn(`Erro ao renderizar página ${i} do PDF`, pageError);
        // Continue to next page if one fails
      }
    }

    if (images.length === 0) {
      throw new PdfLoadError("Nenhuma página válida encontrada no PDF.", 'corrupt');
    }

    return images;

  } catch (error: any) {
    console.error("PDF Processing Error:", error);

    if (error instanceof PdfLoadError) {
      throw error;
    }

    const errMsg = error?.name || error?.message || '';
    if (errMsg.includes('PasswordException') || errMsg.includes('password')) {
      throw new PdfLoadError("PDF protegido por senha.", 'password');
    } else if (errMsg.includes('InvalidPDFException') || errMsg.includes('Invalid PDF structure')) {
      throw new PdfLoadError("Arquivo PDF corrompido ou inválido.", 'corrupt');
    }

    throw new PdfLoadError("Falha ao processar o PDF.", 'unknown');
  } finally {
    if (pdf) {
      try {
        await pdf.destroy();
      } catch (e) { /* ignore cleanup error */ }
    }
  }
}
