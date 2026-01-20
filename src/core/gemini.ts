import { GoogleGenAI } from "@google/genai";
import { CONFIG } from "./config";

// Singleton instance
let aiClient: GoogleGenAI | null = null;

export const getGeminiClient = () => {
  if (!aiClient) {
    if (!process.env.API_KEY) {
      console.error("❌ API_KEY is missing in process.env!");
      throw new Error("API_KEY not found in environment");
    }

    // Sanitize key: remove potential extra quotes added by build process
    const rawKey = process.env.API_KEY;
    const cleanKey = rawKey.replace(/^"|"$/g, '').trim();

    // ⚠️ NEVER log API keys (even partially) - Google detects this as a leak

    aiClient = new GoogleGenAI({ apiKey: cleanKey });
  }
  return aiClient;
};

export const fileToPart = async (file: File | Blob) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type || 'image/jpeg',
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
