/**
 * Gemini OCR Adapter - Usa o cliente Gemini centralizado do Radon
 * SEGURANÇA: Não usa process.env nem new GoogleGenAI diretamente
 */

import { getGeminiClient } from '@/core/gemini';
import { OcrResult } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Processa imagem para API (converte para base64)
 */
async function processImageForApi(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const runGeminiOcr = async (file: File): Promise<OcrResult> => {
  // USA CLIENTE CENTRALIZADO - não cria nova instância
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error('❌ Cliente Gemini não inicializado. Verifique API_KEY no .env');
  }

  const base64Image = await processImageForApi(file);

  const prompt = `
    ROLE: Specialized Medical OCR for Brazilian Ultrasound/DICOM exams.
    
    VISUAL LAYOUT CONTEXT:
    1. EXAM DATE: Top Left corner. Format in image might be YYYY-MM-DD (ISO) or MM/DD/YYYY (US).
    2. PATIENT NAME: Top Center. Often appears as "SURNAME, NAME" (e.g. "SANTOS, ANTONIO").
    3. PATIENT ID: Above the name.
    4. MEASUREMENTS: Text with 'mm', 'cm' inside the image.
 
    TRANSFORMATION RULES (CRITICAL):
    - OUTPUT LANGUAGE: Portuguese (Brazil).
    - DATES: MUST be converted to **DD/MM/YYYY**. 
      Example: Input "2025-12-29" -> Output "29/12/2025".
      Example: Input "12/29/2025" -> Output "29/12/2025".
    - NAMES: MUST be converted to **"NAME SURNAME"** order. Remove commas.
      Example: Input "SANTOS, ANTONIO BORGES" -> Output "ANTONIO BORGES SANTOS".
      Example: Input "DOE, JOHN" -> Output "JOHN DOE".
 
    OUTPUT JSON SCHEMA:
    {
      "full_text": "string (all text found)",
      "extraction": {
        "patient_name": "string (Corrected: NAME SURNAME)",
        "patient_id": "string (The ID found usually above name)",
        "exam_date": "string (Formatted: DD/MM/YYYY)",
        "measurements": ["string (list of measurements)"],
        "institution": "string (Hospital/Clinic name if found)"
      },
      "readability": "READABLE" | "PARTIAL" | "UNREADABLE"
    }
  `;

  let attempt = 0;
  const maxRetries = 10;
  const baseDelay = 1000;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: prompt }
          ]
        },
        config: {
          temperature: 0,
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini.");

      return JSON.parse(text.trim()) as OcrResult;

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStatus = (error as { status?: number })?.status;

      const isRateLimit =
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('quota') ||
        errorStatus === 429;

      const isServerBusy =
        errorMsg.includes('503') ||
        errorMsg.includes('Overloaded') ||
        errorStatus === 503;

      if ((isRateLimit || isServerBusy) && attempt < maxRetries) {
        attempt++;
        const backoff = Math.min(baseDelay * Math.pow(2, attempt - 1), 60000);
        const jitter = Math.random() * 1000;
        const waitTime = backoff + jitter;
        console.warn(`[Gemini OCR] ⚠️ Rate Limit/Busy. Retrying in ${Math.round(waitTime / 1000)}s...`);
        await delay(waitTime);
        continue;
      }

      console.error("Gemini OCR Fatal Error:", error);
      throw new Error(errorMsg || "Failed to process image (Fatal).");
    }
  }
};
