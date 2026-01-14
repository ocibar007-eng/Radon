# 🤝 Guia de Contribuição

Obrigado por considerar contribuir para o OCR Batch Processor!

---

## 📋 Código de Conduta

- Seja respeitoso e inclusivo
- Foque em crítica construtiva
- Colabore e ajude outros desenvolvedores

---

## 🚀 Como Contribuir

### 1. Setup do Ambiente

```bash
# Fork e clone o repositório
git clone https://github.com/seu-usuario/ocr-batch-dicom-jpeg
cd ocr-batch-dicom-jpeg

# Instale dependências
npm install

# Configure sua API key Gemini
echo "VITE_GEMINI_API_KEY=sua-chave" > .env.local

# Rode o projeto
npm run dev
```

### 2. Crie uma Branch

```bash
# Para features
git checkout -b feature/nome-da-feature

# Para fixes
git checkout -b fix/nome-do-fix

# Para docs
git checkout -b docs/nome-da-doc
```

### 3. Faça suas Mudanças

- ✅ Siga os padrões de código existentes
- ✅ Adicione testes quando aplicável
- ✅ Atualize documentação relevante
- ✅ Verifique se o build passa

### 4. Commit

Siga [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: adiciona suporte a PDF OCR"

# Fixes
git commit -m "fix: corrige conversão DICOM em arquivos grandes"

# Docs
git commit -m "docs: atualiza README com novos scripts"

# Refactor
git commit -m "refactor: extrai lógica de export para core/"

# Chore
git commit -m "chore: atualiza dependências"
```

### 5. Push e Pull Request

```bash
git push origin feature/nome-da-feature
```

Abra um Pull Request descrevendo:
- **O que** foi mudado
- **Por que** foi mudado
- **Como** testar as mudanças

---

## 🧪 Testes

```bash
# Rodar todos os testes
npm run test

# Modo watch
npm run test:watch

# Coverage
npm run test -- --coverage
```

**Adicione testes para:**
- ✅ Novas features
- ✅ Fixes de bugs
- ✅ Mudanças em core/ e hooks/

---

## 📁 Estrutura de Código

```
src/
├── adapters/      # Interfaces com APIs externas
├── components/    # Componentes React
│   └── ui/       # Primitivos reutilizáveis
├── core/         # Lógica de negócio pura (sem React)
├── hooks/        # React hooks customizados
├── styles/       # CSS global
└── utils/        # Helpers puros
```

**Regras:**
- `core/` → Apenas funções puras (sem React, sem side-effects)
- `hooks/` → Apenas lógica React (useState, useEffect)
- `adapters/` → Interfaces externas (APIs, libs)
- `components/` → UI pura

---

## 🎨 Padrões de Código

### TypeScript

```typescript
// ✅ BOM: Tipagem explícita
function processDicom(file: File): Promise<ProcessResult> {
  // ...
}

// ❌ RUIM: any types
function processDicom(file: any): any {
  // ...
}
```

### React Components

```typescript
// ✅ BOM: Props tipadas, função nomeada
interface FileListProps {
  files: BatchFile[];
  onSelect: (id: string) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, onSelect }) => {
  // ...
};

// ❌ RUIM: Props sem tipo
export const FileList = (props) => {
  // ...
};
```

### Hooks Customizados

```typescript
// ✅ BOM: Callback-based, retorno tipado
interface UseFileProcessingReturn {
  processFiles: (files: File[], sessionId: string) => Promise<void>;
  isProcessing: boolean;
  abort: () => void;
}

export const useFileProcessing = (options: {
  onFilesAdded: (files: BatchFile[]) => void;
  onError: (message: string) => void;
}): UseFileProcessingReturn => {
  // ...
};
```

---

## 📝 Documentação

### JSDoc para Funções Públicas

```typescript
/**
 * Converte arquivo DICOM para PNG e extrai metadados PACS.
 *
 * @param file - Arquivo DICOM (.dcm)
 * @returns Promise com PNG blob e metadata
 * @throws {Error} Se arquivo não for DICOM válido
 *
 * @example
 * ```typescript
 * const result = await processDicom(dicomFile);
 * console.log(result.metadata.patientName);
 * ```
 */
export async function processDicom(file: File): Promise<DicomResult> {
  // ...
}
```

### README para Novas Features

Se adicionar feature grande, crie doc em `docs/`:
- `docs/features/NOME_FEATURE.md`
- Inclua: uso, exemplos, trade-offs

---

## 🐛 Reportar Bugs

### Antes de Reportar

1. ✅ Verifique se já não existe issue aberta
2. ✅ Teste na última versão
3. ✅ Tente reproduzir em ambiente limpo

### Template de Bug Report

```markdown
**Descrição do Bug:**
[Descrição clara e concisa]

**Como Reproduzir:**
1. Abra aplicação
2. Faça upload de arquivo DICOM
3. Clique em "Iniciar Extração"
4. Veja erro

**Comportamento Esperado:**
[O que deveria acontecer]

**Comportamento Atual:**
[O que está acontecendo]

**Screenshots:**
[Se aplicável]

**Ambiente:**
- OS: [ex: macOS 14.1]
- Browser: [ex: Chrome 120]
- Node version: [ex: 18.17.0]

**Console Errors:**
```
[Cole erros do console aqui]
```
```

---

## ✨ Request de Features

### Template de Feature Request

```markdown
**Problema:**
[Qual problema essa feature resolve?]

**Solução Proposta:**
[Como você imagina a solução?]

**Alternativas Consideradas:**
[Outras abordagens que pensou?]

**Contexto Adicional:**
[Screenshots, mockups, referências]
```

---

## 📦 Pull Request Checklist

Antes de submeter seu PR:

- [ ] Código compila sem erros (`npm run build`)
- [ ] Testes passam (`npm run test`)
- [ ] Dev server funciona (`npm run dev`)
- [ ] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Commits seguem Conventional Commits
- [ ] Documentação atualizada (se aplicável)
- [ ] Testei manualmente as mudanças
- [ ] PR tem descrição clara

---

## 🔄 Processo de Review

1. **Automated Checks:** CI roda testes e lint
2. **Code Review:** Mantenedor revisa código
3. **Discussion:** Feedback e ajustes
4. **Approval:** PR aprovado
5. **Merge:** Squash and merge na main

---

## 📚 Recursos Úteis

- [Documentação Técnica](./docs/README.md)
- [Arquitetura](./docs/ARCHITECTURE.md)
- [Decisões Técnicas](./docs/DECISIONS.md)
- [Plano de Refatoração](./docs/REFACTORING_PLAN.md)

---

## 💡 Dúvidas?

- Abra uma issue com a tag `question`
- Consulte a documentação em `docs/`

---

**Obrigado por contribuir!** 🎉
