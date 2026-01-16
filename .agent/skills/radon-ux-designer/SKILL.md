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
