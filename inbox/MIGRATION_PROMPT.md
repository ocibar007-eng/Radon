# 🔄 Prompt para Migração do Design System OCR Batch

> **Use este documento como prompt para outra IA aplicar o design system do OCR Batch em qualquer projeto.**

---

## Instruções para a IA

Você deve migrar **100% do design system** do projeto `frontend-ocr-batch-processor` para o projeto atual, substituindo TODOS os elementos visuais (botões, cores, tipografia, componentes) de forma incremental e segura, SEM quebrar funcionalidades.

### Documentação de Referência

Leia completamente antes de iniciar:
- `docs/design/OCR_BATCH_UI_SPECIFICATION.md` (Especificação Master)
- `frontend-ocr-batch-processor/src/styles/design-tokens.css` (Tokens CSS)
- `frontend-ocr-batch-processor/src/styles/animations.css` (Animações)
- `frontend-ocr-batch-processor/src/components/ui/` (Componentes de referência)

---

## Fase 1: Setup da Fundação (NÃO QUEBRE NADA)

### 1.1 Criar Arquivos de Design Tokens
```bash
# Criar diretório se não existir
mkdir -p src/styles
```

Criar `src/styles/design-tokens.css` com o conteúdo EXATO da seção 9.3 do `OCR_BATCH_UI_SPECIFICATION.md`.

Criar `src/styles/animations.css` com o conteúdo EXATO da seção 9.4.

### 1.2 Configurar Tailwind
- Se o projeto usa Tailwind CDN no `index.html`, adicionar o script de configuração da seção 9.1.
- Se usa `tailwind.config.js`, substituir pela config da seção 9.1.
- **IMPORTANTE:** NÃO remover classes existentes ainda. Apenas adicionar o novo mapeamento.

### 1.3 Importar Fontes
No `index.html`, adicionar na `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Adicionar ao CSS global:
```css
body {
  font-family: 'Inter', sans-serif;
}
```

### 1.4 Importar Styles no Entry Point
No arquivo principal (`main.tsx` ou `index.tsx`), adicionar:
```typescript
import './styles/design-tokens.css';
import './styles/animations.css';
```

### ✅ Checkpoint 1: Verificar
```bash
npm run dev
```
Confirmar que o projeto ainda roda SEM erros.

---

## Fase 2: Componentes Base (Criar SEM Substituir)

### 2.1 Criar Estrutura de Componentes UI
```bash
mkdir -p src/components/ui
```

### 2.2 Criar Button Component
Copiar **EXATAMENTE** o arquivo:
- **Origem:** `frontend-ocr-batch-processor/src/components/ui/Button.tsx`
- **Destino:** `src/components/ui/Button.tsx`

### 2.3 Criar Card Component (se existir na origem)
Repetir o processo acima para:
- `Card.tsx`
- `Modal.tsx`
- `ProgressBar.tsx`

### ✅ Checkpoint 2: Verificar
1. Build sem erros TypeScript: `npm run lint` ou `tsc --noEmit`.
2. Nenhum componente antigo foi modificado ainda.

---

## Fase 3: Migração Incremental (Substituir Componente por Componente)

**REGRA DE OURO:** Migrar **UM componente por vez**, testar, commitar.

### 3.1 Mapear Todos os Botões
Listar todos os arquivos que usam `<button>` ou componentes de botão antigos:
```bash
grep -r "<button" src/ --include="*.tsx" --include="*.jsx"
```

### 3.2 Substituir Botões (Exemplo)
**Antes:**
```tsx
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Clique Aqui
</button>
```

**Depois:**
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md">
  Clique Aqui
</Button>
```

### 3.3 Checklist de Migração de Componentes
Para CADA tipo de componente (faça nesta ordem):

- [ ] **Botões** → Substituir por `<Button>`
- [ ] **Cards/Containers** → Aplicar classes `bg-zinc-900 border-zinc-800 rounded-xl`
- [ ] **Inputs** → Aplicar `bg-zinc-800 text-white border-zinc-700`
- [ ] **Modais** → Substituir por novo `<Modal>` component
- [ ] **Progress Bars** → Substituir por `<ProgressBar>`
- [ ] **Textos** → Substituir cores hardcoded por `text-zinc-400`, `text-white`, etc.

### 3.4 Padrão de Migração (Para CADA arquivo)
1. Abrir arquivo.
2. Identificar componente visual.
3. Substituir pela versão do novo design system.
4. Testar visualmente no navegador.
5. Se funcionar: commitar. Se quebrar: reverter e investigar.

### ✅ Checkpoint 3: Após Cada Componente
```bash
npm run dev
# Abrir no navegador, testar interação
```

---

## Fase 4: Temas e Modo Escuro

### 4.1 Hook de Tema
Se o projeto atual NÃO tem gerenciamento de tema, copiar:
- **Origem:** `frontend-ocr-batch-processor/src/hooks/useTheme.ts`
- **Destino:** `src/hooks/useTheme.ts`

### 4.2 ThemeSelector Component
Copiar:
- **Origem:** `frontend-ocr-batch-processor/src/components/ThemeSelector.tsx`
- **Destino:** `src/components/ThemeSelector.tsx`

### 4.3 Integrar no Layout Principal
No componente raiz (ex: `App.tsx`), adicionar:
```tsx
import { useTheme } from '@/hooks/useTheme';

function App() {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={isDarkMode ? 'dark' : 'light'}>
      {/* resto do app */}
    </div>
  );
}
```

---

## Fase 5: Limpeza e Otimização

### 5.1 Remover CSS Antigo
Procurar e remover:
- Arquivos CSS legados não usados.
- Imports de bibliotecas de UI antigas (ex: Bootstrap, Material-UI).

### 5.2 Padronizar Ícones
Se o projeto usa ícones diferentes, migrar para **Lucide React**:
```bash
npm install lucide-react
```

Substituir icons antigos por equivalentes do Lucide (usar mesmo stroke-width `1.5`).

### 5.3 Verificação Final
- [ ] Todas as telas renderizam corretamente.
- [ ] Modo claro/escuro funciona.
- [ ] Todos os botões têm hover/focus states.
- [ ] Não há console errors.
- [ ] Build de produção funciona: `npm run build`.

---

## Fase 6: Documentação e Handoff

### 6.1 Criar Registro de Mudanças
Documentar num arquivo `MIGRATION_LOG.md`:
- Componentes migrados.
- Breaking changes (se houver).
- Novos componentes adicionados.

### 6.2 Atualizar README
Adicionar seção sobre o design system:
```markdown
## Design System
Este projeto usa o design system do OCR Batch Processor.
Referência completa: `docs/design/OCR_BATCH_UI_SPECIFICATION.md`
```

---

## 🚨 Regras Críticas de Segurança

1. **NUNCA** migrar todos os arquivos de uma vez. **SEMPRE** incremental.
2. **SEMPRE** testar após cada mudança.
3. Se algo quebrar: **reverter imediatamente** e investigar.
4. **NUNCA** deletar componentes antigos até confirmar que não são usados.
5. Usar `git commit` após cada componente migrado com sucesso.
6. Se o projeto tem testes automatizados: **rodar após cada fase**.

---

## Exemplo de Prompt para Executar

```
Você deve migrar o design system do OCR Batch Processor para este projeto.

SIGA EXATAMENTE AS INSTRUÇÕES do arquivo `docs/design/MIGRATION_PROMPT.md`.

Comece pela Fase 1 (Setup da Fundação). Após concluir CADA fase, pare e me avise para eu revisar antes de prosseguir.

NÃO pule etapas. NÃO faça mudanças em massa. Seja incremental e seguro.
```

---

**Sucesso garantido se seguir este plano passo a passo! 🎯**
