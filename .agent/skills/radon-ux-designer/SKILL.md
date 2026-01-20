---
name: radon-ux-designer
description: Especialista em UI/UX Premium, Glassmorphism e Tailwind v4. Use para garantir visual "Vale do Silício".
---

# Radon UX Designer 🎨 ✨

Use esta skill para criar ou ajustar interfaces que devem parecer **Premium** e **State-of-the-Art**.

## Estilo Visual "Rational Design"
- **Inspiração:** Vercel, Linear, Stripe.
- **Tokens:** Use as variáveis CSS definidas em `src/styles/design-tokens.css`.
- **Glassmorphism:** Use `backdrop-blur-md` e bordas translúcidas (`border-white/10`) em vez de cores sólidas chapadas.

## Regras de Ouro
1. **Safe UI Polish:** Nunca quebre `onClick`, `onSubmit` ou `useEffect` ao melhorar o CSS.
2. **Tailwind v4:** Use a sintaxe moderna (sem `@apply` excessivo, prefira utilitários diretos).
3. **Feedback:** Todo botão deve ter estados `:hover`, `:active` e `:disabled`.
4. **Sem Layout Shift:** Use Skeletons ou placeholders de altura fixa para evitar pulos na tela.

## Componentes Chave
- **Cards:** Background escuro com borda sutil (`border-zinc-800`).
- **Texto:** Nunca use branco puro (#FFF) para parágrafos; use `text-zinc-300` ou `text-zinc-400`.
- **Acessibilidade:** Garanta contraste e `aria-label` em botões de ícone.

---

## ✅ UX DEFINITION OF DONE

Antes de considerar UI "pronta":

- [ ] **Empty States:** O que aparece quando não há dados?
- [ ] **Loading States:** Skeleton ou spinner?
- [ ] **Error States:** Mensagem amigável + retry?
- [ ] **Keyboard/Focus:** Tab navega corretamente?
- [ ] **Acessibilidade:** Contraste OK + aria-label em ícones?

---

## 🚫 REGRA "POLISH NÃO TOCA EM LÓGICA"

> CSS-only changes: **PROIBIDO** alterar hooks / useEffect / handlers.

```typescript
// ✅ PERMITIDO em PR de polish
className="bg-zinc-800 hover:bg-zinc-700"

// ❌ PROIBIDO em PR de polish
onClick={() => doSomething()}  // Não pode mudar isso
useEffect(() => {...})          // Não pode mudar isso
```

Se precisar mudar lógica: **faça em PR separado**.

---

## ⚡ PERFORMANCE UI

### Cuidados com Re-render
```typescript
// ❌ RUIM - recria função toda vez
<Button onClick={() => handleClick(id)} />

// ✅ BOM - useCallback memoriza
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<Button onClick={handleButtonClick} />
```

### Listas Grandes
```typescript
// Usar virtualização se > 100 itens
import { VirtualList } from 'react-window';

// Ou paginação
const visibleItems = items.slice(0, 50);
```

### Skeletons
```typescript
// ✅ Skeleton com altura fixa = Zero layout shift
<div className="h-24 animate-pulse bg-zinc-800 rounded" />
```

---

## 🎨 DESIGN TOKENS COMO LEI

> **PROIBIDO** cores hardcoded fora dos tokens.

```typescript
// ❌ PROIBIDO
className="bg-[#1a1a1a]"
style={{ color: 'rgb(50, 50, 50)' }}

// ✅ OBRIGATÓRIO - usar tokens
className="bg-zinc-900"
className="text-primary"
```

### Tokens Disponíveis
- Cores: `zinc-*`, `primary`, `success`, `warning`, `error`
- Spacing: Tailwind padrão (p-4, m-2, gap-3)
- Radius: `rounded`, `rounded-lg`, `rounded-xl`
- Shadows: `shadow-sm`, `shadow-lg`, `shadow-glow`

