# 🚨 Guia: Problemas de Deploy na Vercel - RADON

## 📋 Resumo do Problema

Quando fazemos deploy manual na Vercel (via `npx vercel --prod`), o app funciona localmente mas **quebra na produção** com erros de:
- ❌ "API key not valid"
- ❌ Upload/OCR/Áudio não funcionam
- ❌ Gemini retorna `INVALID_ARGUMENT`

---

## 🔍 Causa Raiz

### 1. Variáveis de Ambiente com Prioridade Errada

**O código usa:**
```typescript
// src/core/gemini.ts
if (!process.env.API_KEY) { ... }
```

**O Vite mapeia assim (`vite.config.ts` linha 36):**
```typescript
'process.env': {
  API_KEY: JSON.stringify(
    process.env.API_KEY ||           // 🥇 PRIORIDADE 1 (Vercel build-time)
    process.env.VITE_API_KEY ||      // 🥈 PRIORIDADE 2
    env.API_KEY ||                   // 🥉 PRIORIDADE 3 (local .env)
    env.VITE_API_KEY ||              
    process.env.GEMINI_API_KEY ||    // ⚠️ PRIORIDADE BAIXA
    env.GEMINI_API_KEY
  )
}
```

**O que aconteceu:**
1. Alguém configurou `API_KEY` na Vercel com valor **inválido/vazio**
2. `GEMINI_API_KEY` estava correto, mas tem **prioridade baixa**
3. Vite escolheu o `API_KEY` (inválido) por ter prioridade maior
4. Build compilou com chave errada → app quebrou em produção

---

### 2. Webhook do Git Desconectado

Quando fazemos `git push`, a Vercel **não detecta** o novo commit porque:
- O webhook GitHub → Vercel foi pausado/removido
- A integração precisa ser reconectada em **Settings → Git**

---

## ✅ Como Resolver (Passo a Passo)

### Opção A: Via Vercel CLI (Mais Rápido)

```bash
# 1. Verificar qual chave está no .env local
grep GEMINI_API_KEY .env

# 2. Remover variável antiga (se existir)
npx vercel env rm API_KEY production -y
npx vercel env rm GEMINI_API_KEY production -y

# 3. Adicionar com valor correto
printf "SUA_CHAVE_AQUI" | npx vercel env add API_KEY production

# 4. Deploy forçado
npx vercel --prod --force --yes
```

### Opção B: Via Dashboard da Vercel

1. Acesse: https://vercel.com/seu-projeto/settings/environment-variables
2. **Delete** `API_KEY` e `GEMINI_API_KEY` existentes
3. **Add New**:
   - Name: `API_KEY`
   - Value: Copie de `.env` local (começa com `AIza...`)
   - Environment: Production ✅
4. **Deployments** → Redeploy último commit

---

## 🛡️ Como Evitar Este Problema

### ✅ Checklist Antes de Fazer Deploy

- [ ] **Nunca** adicione `API_KEY` manualmente na Vercel sem verificar o valor
- [ ] Use **apenas uma** variável: `API_KEY` (não misture com `GEMINI_API_KEY`)
- [ ] Sempre copie o valor diretamente do `.env` local
- [ ] Teste localmente (`npm run dev`) antes de qualquer deploy
- [ ] Verifique logs do Vercel após deploy: `npx vercel logs --prod`

### 🔧 Manutenção Regular

**A cada 2-3 semanas:**

```bash
# Verificar se o webhook está ativo
# Dashboard Vercel → Settings → Git → Status: "Connected" ✅

# Testar se push aciona deploy automático
git commit --allow-empty -m "chore: test webhook"
git push origin main
# Aguarde 2 min → Verifique dashboard Vercel
```

---

## 🆘 Troubleshooting Rápido

### Sintoma: "API key not valid"

```bash
# 1. Verificar variável na Vercel
npx vercel env ls

# 2. Se API_KEY está lá, verificar valor
# (Não mostra valor completo, mas mostra se existe)

# 3. Comparar com local
grep GEMINI_API_KEY .env

# 4. Se diferente, remover e readicionar
npx vercel env rm API_KEY production -y
printf "$(grep GEMINI_API_KEY .env | cut -d'=' -f2 | tr -d '\"')" | npx vercel env add API_KEY production
```

### Sintoma: Git push não aciona deploy

```bash
# 1. Verificar se commit chegou no GitHub
git log -1 --oneline

# 2. Forçar redeploy via commit vazio
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main

# 3. Se ainda não funcionar, usar CLI
npx vercel --prod --yes
```

### Sintoma: Deploy CLI trava em "Retrieving project..."

```bash
# 1. Cancelar (Ctrl+C)
# 2. Fazer login novamente
npx vercel login
# (Autorizar no navegador)

# 3. Tentar novamente com timeout menor
timeout 120 npx vercel --prod --yes
```

---

## 📊 Checklist de Validação Pós-Deploy

Após qualquer deploy, **SEMPRE** testar:

1. **[ ]** Abrir URL: https://app-ocr-v6.vercel.app
2. **[ ]** Hard Refresh: `Cmd+Shift+R` (Mac) / `Ctrl+F5` (Windows)
3. **[ ]** Testar Upload de arquivo (PDF/imagem)
4. **[ ]** Testar gravação de áudio
5. **[ ]** Verificar console do navegador (F12) → Sem erros vermelhos
6. **[ ]** Verificar Vercel Logs: `npx vercel logs --prod | grep -i error`

---

## 🎯 Solução Definitiva (Futuro)

Para **nunca mais** ter esse problema:

### Opção 1: Usar VITE_GEMINI_API_KEY

**Modificar `vite.config.ts`:**
```typescript
'process.env': {
  API_KEY: JSON.stringify(import.meta.env.VITE_GEMINI_API_KEY),
  // Prioridade única e clara
}
```

**Vantagens:**
- Convenção padrão do Vite (prefixo `VITE_`)
- Menos confusão com nomes de variáveis

### Opção 2: Validação no Build

**Adicionar script `scripts/check-env.js`:**
```javascript
if (!process.env.API_KEY || process.env.API_KEY.length < 30) {
  console.error('❌ API_KEY inválida ou ausente!');
  process.exit(1);
}
console.log('✅ API_KEY válida');
```

**Em `package.json`:**
```json
{
  "scripts": {
    "build": "node scripts/check-env.js && vite build"
  }
}
```

---

## 📞 Contatos de Emergência

Se nada funcionar:

1. **Vercel Support**: https://vercel.com/support
2. **Verificar Status**: https://vercel-status.com
3. **Logs detalhados**: `npx vercel logs --prod --follow`
4. **Build logs**: Dashboard → Deployments → Click no deploy → "View Build Logs"

---

## 🔗 Links Úteis

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
