
# Assistente de Laudos — Radiologia (AI-Powered)

> Uma plataforma de inteligência artificial para radiologistas, capaz de organizar, transcrever e estruturar exames médicos automaticamente.

## 🚀 Visão Geral

Este projeto é uma aplicação web **React + TypeScript** focada em produtividade médica. Ele utiliza **Google Gemini 2.0/Flash** para ler documentos (OCR Inteligente), classificar páginas, agrupar exames logicamente e gerar pré-laudos estruturados.

### Principais Funcionalidades

*   **Multimodal Input:** Aceita Imagens, PDFs e Áudio (Ditado).
*   **Pipeline de IA:** Processamento em fila com OCR, Classificação e Extração de Entidades.
*   **Smart Grouping:** Agrupa páginas soltas em exames lógicos (ex: separar RX Tórax de RM Crânio no mesmo PDF).
*   **Heurísticas de Segurança:** Algoritmos "Fail-Safe" para recuperar laudos que a IA falhou em classificar.
*   **Persistência Híbrida:** Funciona 100% offline (Memória) ou Online (Firebase Firestore/Storage).
*   **Design System:** Interface "Dark Mode" médica, focada em leitura e baixo cansaço visual.

## 📚 Documentação Técnica

A documentação está dividida em módulos específicos:

1.  [**Getting Started**](./GETTING_STARTED.md) - Configuração do ambiente e chaves de API.
2.  [**Arquitetura do Sistema**](./ARCHITECTURE.md) - Fluxo de dados, State Management e Persistência.
3.  [**AI Pipeline & Engenharia**](./AI_PIPELINE.md) - Como a mágica da IA funciona (Prompts, Schemas, Heurísticas).
4.  [**Design System**](./DESIGN_SYSTEM.md) - Tokens CSS, Cores e Componentes UI.
5.  [**Estrutura do Projeto**](./PROJECT_STRUCTURE.md) - Mapa de pastas e arquivos.

## 🛠 Tech Stack

*   **Frontend:** React 19, TypeScript, Vite.
*   **AI:** Google GenAI SDK (`gemini-2.0-flash-exp` / `gemini-1.5-flash`).
*   **Estilização:** CSS Puro com CSS Variables (Design Tokens). Sem Tailwind.
*   **Validação:** Zod (com `z.preprocess` para resiliência).
*   **PDF:** `pdfjs-dist` (Renderização via Canvas).
*   **Backend as a Service:** Firebase (Firestore + Storage).

## 📄 Licença

Proprietário.
