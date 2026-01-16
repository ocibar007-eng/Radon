---
name: radon-ops
description: Especialista em Vercel, CI/CD e Troubleshooting de infraestrutura. Use para deploys e correções de build.
---

# Radon Ops 🚀 ⚙️

Use esta skill quando o build quebrar, o deploy falhar ou o Vercel reclamar.

## Vercel Troubleshooting
- **Variáveis de Ambiente:** Se a API falhar em produção, verifique primeiro se `GEMINI_API_KEY` está definida no Vercel Project Settings.
- **Build Logs:** Não adivinhe o erro. Leia o log do Vercel (`Run Command`).
- **Cold Starts:** Se a Serverless Function der timeout, considere aumentar o limite ou otimizar imports.

## CI/CD Breakfix
- **Lockfile:** Se o CI quebrar na instalação, verifique diferenças entre `package-lock.json` local e remoto.
- **Tipagem:** Nunca dê bypass no `tsc` (`ts-ignore`). Corrija a tipagem ou use `unknown` + cast seguro.

## Checklist de Release 📦
Antes de avisar o usuário que "está pronto":
1. [ ] **Build:** O comando `npm run build` passa localmente?
2. [ ] **Lint:** O comando `npm run lint` passa?
3. [ ] **Env:** As variáveis novas foram adicionadas ao `.env.example`?
4. [ ] **Clean Install:** Se apagasse o `node_modules`, o projeto rodaria?

## Logs & Observabilidade
- Adicione logs estruturados (`console.info('[Scope] Action', data)`) para facilitar o debug no Vercel Logs.
