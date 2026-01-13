# OCR Batch Processor & Patient Workspace 🚀

Plataforma inteligente para processamento de exames, transcrição de áudio e gerenciamento de fluxo de trabalho para radiologia e medicina, integrada com Google Gemini e Firebase.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Operational-success?style=for-the-badge&logo=vercel)](https://radon-lite.vercel.app)

## 🔗 Acesso Rápido
- **Produção:** [https://radon-lite.vercel.app](https://radon-lite.vercel.app)

---

## ✨ Funcionalidades Principais

### 1. Sistema de Workflow & Status
- **Gestão de Fluxo:** 5 estados visuais (`Aguardando`, `Processando`, `Em Andamento`, `Pronto`, `Finalizado`).
- **Status Chips:** Interface rica com micro-animações (pulsantes e spinners) para feedback em tempo real.
- **Workflow de Finalização:** Botão inteligente que valida pré-requisitos (anexos/docs) antes de encerrar o caso.

### 2. Upload Inteligente em Lote (Batch)
- **Detecção Automática:** Suporte para **CSV**, **Excel**, **Imagens** (screenshots de tabelas) e **PDFs**.
- **OCR via Gemini Vision:** Extração automática de dados de pacientes de imagens de tabelas.
- **Preview Editável:** Revise e altere dados de múltiplos pacientes simultaneamente antes da criação no banco.

### 3. Integração AI (Gemini)
- **OCR de Alta Precisão:** Processamento de documentos médicos complexos.
- **Transcrição de Áudio:** Gravação direta no navegador com pause, visualização de forma de onda e transcrição automática.

---

## 🛠 Tecnologias
- **Frontend:** React 19, Vite, Tailwind CSS (Design Premium).
- **Backend/DB:** Firebase (Firestore, Storage).
- **IA:** Google Gemini API (@google/genai).
- **Deploy:** Vercel.

---

## 🚀 Como Rodar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o ambiente:**
   Crie um arquivo `.env.local` na raiz com:
   ```env
   VITE_GEMINI_API_KEY=sua_chave_aqui
   # Adicione as variáveis do Firebase conforme .env.example
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 📊 Status do Projeto
- **Build Status:** ✅ Passing (Vercel Production)
- **Versão:** 1.0.0 (Jan/2026)

---
*Desenvolvido para alta performance e experiência de usuário premium.*
