import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ Erro: Nenhuma chave encontrada no .env (API_KEY ou GEMINI_API_KEY)");
    process.exit(1);
}

const cleanKey = API_KEY.replace(/^"|"$/g, '').trim();

async function run() {
    try {
        const ai = new GoogleGenAI({ apiKey: cleanKey });

        console.log(`🔍 Testando chave local: ${cleanKey.substring(0, 10)}...`);

        // Tenta uma chamada simples com um modelo garantido
        console.log("📡 Testando geração com 'gemini-2.0-flash'...");
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: "Responda apenas 'OK'." }] }]
        });

        console.log("✅ Geração de conteúdo OK!");
        console.log("🤖 Resposta do Gemini:", response.text);

    } catch (error) {
        console.error("❌ Erro no teste:");
        if (error.status === 400 && error.message.includes("expired")) {
            console.error("🚨 A chave de API no seu .env está EXPIRADA (Erro 400).");
        } else if (error.status === 404) {
            console.error("🚨 Modelo não encontrado (Erro 404). Verifique se o nome do modelo está correto.");
        } else {
            console.error(error.message || error);
        }
    }
}

run();
