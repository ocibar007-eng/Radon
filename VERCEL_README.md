# Vercel Deploy Notes

1. **Branches:** confirme qual branch está ligado ao projeto na Vercel (ex: `main`).
2. **Deploy automático:** após um `git push` no branch configurado, a Vercel inicia build automaticamente (1–5 min em média).
3. **Logs:** abra a página do deploy e confira as abas _Build_ e _Live_ para ver status e erros.
4. **Falhas comuns:** ambiente faltando (env vars), build falhando ou cache/CDN ainda propagando.
5. **Verificação rápida:**
   - `git status` limpa? `git push` feito?
   - Projeto abre em `https://vercel.com/<org>/<project>/deployments`.
   - Se o build falhar, clique no link do deploy e copie o erro.
6. **Cache:** força um _hard refresh_ no browser (Ctrl+Shift+R) se o site não refletir o deploy.

Se quiser, mando um print do log ou te guio na tela da Vercel. É só dizer.
