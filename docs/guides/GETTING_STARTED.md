
# Getting Started

Este guia irá ajudá-lo a configurar o ambiente de desenvolvimento local.

## Pré-requisitos

*   Node.js 18+
*   npm ou yarn
*   Uma chave de API do **Google AI Studio** (Gemini).
*   (Opcional) Um projeto no **Firebase** (para persistência em nuvem).

## 1. Instalação

```bash
# Instalar dependências
npm install
```

## 2. Configuração de Variáveis de Ambiente

O projeto utiliza o Vite, então as variáveis devem ser prefixadas ou configuradas no `vite.config.ts` (ou injetadas via sistema).

### A. Chave do Gemini (Obrigatório)
O sistema precisa de uma chave válida para o `process.env.API_KEY` funcionar dentro do código cliente (via define do Vite ou similar).

### B. Configuração do Firebase (Opcional)
Crie um arquivo `.env` na raiz (se suportado pelo seu bundler) ou configure as variáveis de sistema:

```env
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

> **Nota:** Se as chaves do Firebase não forem fornecidas, o sistema entrará automaticamente em **Modo Offline (In-Memory)**. Os dados serão perdidos ao recarregar a página, mas todas as funcionalidades funcionarão.

## 3. Executando o Projeto

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Rodar testes unitários (Vitest)
npm run test
```

## 4. Troubleshooting Comum

### Erro 429 (Resource Exhausted) no Gemini
Se você ver erros de "Too Many Requests" no console:
1.  O sistema possui um mecanismo de **Exponential Backoff** (`src/utils/retry.ts`). Ele tentará novamente automaticamente.
2.  Se persistir, verifique a cota da sua API Key no Google AI Studio.

### PDF não carrega
O projeto usa `pdfjs-dist` via CDN (`esm.sh`) configurado no `src/utils/pdf.ts` para evitar complexidade de build com Workers. Se o PDF não abrir, verifique sua conexão com a internet ou firewall bloqueando `esm.sh`.
