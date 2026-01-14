# OCR Batch Processor (DICOM/JPEG)

<div align="center">
<img width="1200" height="475" alt="OCR Batch Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

> **Processador batch de OCR para imagens médicas (DICOM) e imagens convencionais (JPEG/PNG)**
> Converte automaticamente arquivos DICOM em PNG, extrai metadados EXIF/PACS e processa OCR via Gemini API

---

## 📋 Visão Geral

Aplicação web React + TypeScript para processar lotes de imagens (DICOM e JPEG/PNG) com OCR inteligente usando Google Gemini Flash 2.0.

**Principais funcionalidades:**
- ✅ Upload de pastas recursivas e arquivos ZIP
- ✅ Conversão automática DICOM → PNG (via dcmjs)
- ✅ Extração de metadados EXIF e PACS
- ✅ OCR batch com concorrência controlada (8 workers)
- ✅ Gerenciamento de múltiplas sessões/lotes
- ✅ Exportação JSON e TXT
- ✅ Tema claro/escuro com 8 paletas
- ✅ Keyboard shortcuts (Ctrl+Enter, Ctrl+S, etc)
- ✅ Histórico de processamentos

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** 18+ e npm
- **Chave API Gemini** ([obtenha aqui](https://ai.google.dev/))

### Instalação

```bash
# 1. Clone o repositório
git clone <repo-url>
cd ocr-batch-(dicom_jpeg)

# 2. Instale dependências
npm install

# 3. Configure a API key
echo "VITE_GEMINI_API_KEY=sua-chave-aqui" > .env.local

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: `http://localhost:3000`

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção (→ dist/) |
| `npm run preview` | Preview do build de produção |
| `npm run test` | Executa testes (Vitest) |
| `npm run test:watch` | Testes em modo watch |
| `npm run lint` | Verificação de tipos TypeScript |
| `npm run clean` | Limpa cache e build |

---

## 📁 Estrutura do Projeto

```
ocr-batch-(dicom_jpeg)/
├── src/               # 📦 Todo código-fonte
│   ├── adapters/      # Interfaces com APIs externas (OCR)
│   ├── components/    # Componentes React
│   │   └── ui/        # Componentes reutilizáveis (Button, Modal, etc)
│   ├── core/          # Lógica de negócio pura (DICOM, export, sorting)
│   ├── hooks/         # React hooks customizados
│   ├── styles/        # CSS global (animations, design-tokens)
│   ├── utils/         # Helpers puros (fileHelpers, sounds)
│   ├── App.tsx        # Componente principal
│   ├── main.tsx       # Entry point React
│   └── types.ts       # TypeScript types globais
├── tests/             # Testes (estrutura espelhada)
├── docs/              # Documentação técnica
├── index.html         # HTML entry point
└── package.json       # Dependencies e scripts
```

**Nota:** Estrutura totalmente organizada em `src/` com path aliases configurados (`@/`).

---

## 🔧 Onde Mexer Primeiro

### Adicionar novo tipo de arquivo suportado
→ `src/core/metadata.ts` (detecção de tipo)
→ `src/hooks/useFileProcessing.ts` (processamento)

### Trocar provider de OCR
→ `src/adapters/ocr/` (criar novo adapter, ex: openai.ts)
→ `src/hooks/useOcrProcessing.ts` (importar novo adapter)

### Adicionar novo shortcut de teclado
→ `src/hooks/useKeyboardShortcuts.ts` (adicionar handler)
→ `src/App.tsx` (configurar callback)

### Customizar tema
→ `src/styles/design-tokens.css` (variáveis CSS)
→ `src/hooks/useTheme.ts` (lógica de tema)

### Adicionar nova sessão/lote
→ `src/hooks/useSessionManager.ts` (lógica de CRUD)
→ `src/components/Sidebar.tsx` (UI de sessões)

---

## 🧪 Testes

```bash
# Rodar todos os testes
npm run test

# Modo watch (auto-rerun)
npm run test:watch

# Coverage
npm run test -- --coverage
```

**Estrutura de testes:**
- `tests/adapters/` - Testes de integração com APIs
- `tests/core/` - Testes unitários de lógica pura
- `tests/hooks/` - Testes de hooks React

---

## 🐛 Troubleshooting

### Build falha com erro de tipos
```bash
# Limpar cache TypeScript
rm -rf node_modules/.vite
npx tsc --noEmit
```

### DICOM não converte para PNG
- ✅ Verifique se o arquivo é DICOM válido (extensão .dcm)
- ✅ Abra console do navegador - erros de `dcmjs` aparecem lá
- ✅ Alguns DICOM compressed não são suportados

### OCR retorna erros 429 (rate limit)
- ✅ Reduza concorrência em `src/hooks/useOcrProcessing.ts` (linha 21: `CONCURRENCY_LIMIT`)
- ✅ Gemini Flash tem limite de 15 RPM no free tier

### Temas não mudam
- ✅ Limpe localStorage: `localStorage.clear()` no console
- ✅ Verifique se há conflito de CSS customizado

---

## 📚 Documentação Técnica

- [Arquitetura e Fluxos](docs/ARCHITECTURE.md)
- [Decisões Técnicas](docs/DECISIONS.md)
- [Plano de Refatoração](docs/REFACTORING_PLAN.md)
- [Handoff Premium UI](docs/HANDOFF_PREMIUM_UI.md)

---

## 🤝 Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para guia de contribuição.

**Resumo rápido:**
1. Fork o repo
2. Crie branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'feat: adiciona X'`
4. Push: `git push origin feature/minha-feature`
5. Abra Pull Request

---

## 📄 Licença

Este projeto é privado. Todos os direitos reservados.

---

## 🛠️ Stack Técnica

- **React** 19.2.3 (UI)
- **TypeScript** 5.8.2 (Type safety)
- **Vite** 6.2.0 (Build tool)
- **Vitest** 3.2.4 (Testing)
- **dcmjs** 0.29.13 (DICOM processing)
- **exifr** 7.1.3 (EXIF metadata)
- **jszip** 3.10.1 (ZIP extraction)
- **@google/genai** 0.12.0 (Gemini OCR)
- **Lucide React** 0.463.0 (Icons)

---

**Mantido por:** [Seu Nome/Organização]
**Última atualização:** Janeiro 2026
