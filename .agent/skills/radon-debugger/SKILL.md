---
name: radon-debugger
description: Especialista em Debug e Investigação de Bugs. Use quando algo quebrou e precisa descobrir a causa raiz.
---

# Radon Debugger 🐛 🔍

Use esta skill quando algo **quebrou** e você precisa investigar sem quebrar mais ainda.

---

## 🛑 REGRAS TRANSVERSAIS (NÃO QUEBRE)

> Essas 8 regras valem para todas as skills de documentação, debug e prompt:

1. **Contrato de Entrada/Saída**: Defina "inputs mínimos" + "outputs obrigatórios" + formato.
2. **Definition of Done**: Build/test/e2e passando + validação manual.
3. **Non-goals**: O que NÃO fazer (não refatorar durante debug, não renomear, não atualizar deps).
4. **Escopo por PR/commit**: 1 tipo de mudança por vez.
5. **Invariantes do repo**: Respeite áreas sagradas (`pipeline`/`grouping`/`env`/`offline`).
6. **Privacidade**: ZERO PHI em logs ou prints (sem nomes/OS/IDs reais). Use hash ou IDs sintéticos.
7. **Anti-scope creep**: Melhorias viram Issue, não entram neste fix.
8. **Template de Handoff**: Encerre com "o que fiz / como testar / riscos / rollback".

---

## 🚨 NÃO REFATORAR DURANTE DEBUG (REGRA HARD)

> ⛔ **PROIBIDO**: Fazer mudanças estruturais/cosméticas enquanto corrige um bug.
> Debug é debug. Refactoring é outro PR.

---

## 🎯 MENTALIDADE DE DEBUG

> **"Nunca assuma. Prove."**

- Não adivinhe a causa - **verifique**
- Não mude código "pra ver se funciona" - **entenda primeiro**
- Isole o problema antes de tentar resolver

---

## 🚨 SEVERIDADE E MODO DE AÇÃO

| Nível | Cenário | Modo |
|-------|---------|------|
| **SEV-1 (Crítico)** | Produção parada, perda de dados | **Hotfix**: Patch mínimo + rollback pronto. Investigação profunda depois. |
| **SEV-2 (Alto)** | Feature quebrada, sem workaround | **Investigação**: Protocolo completo. Teste de caracterização antes do fix. |
| **SEV-3 (Baixo)** | CSS, glitch visual, bug raro | **Backlog**: Issue criada, fix planejado. |

---

## 🗺️ MAPA DE ÁREAS CRÍTICAS

### Onde problemas costumam estar:

| Sintoma | Onde olhar primeiro |
|---------|---------------------|
| "Página branca" | `postcss.config.js`, `tailwind.config.js`, console do browser |
| "API offline" | `.env`, `vite.config.ts` (mapeamento process.env), Vercel env vars |
| Processamento travado | `usePipeline.ts`, console logs com `[Pipeline]` |
| Agrupamento errado | `grouping.ts`, verificar `reportGroupHint` nos docs |
| PDF não separa | `global_pdf_analysis` prompt, response da Gemini |
| Firebase error | `src/core/firebase.ts`, `isFirebaseEnabled()` |
| Áudio não transcreve | `useBackgroundAudioTranscription.ts`, tamanho do blob |

---

## 📋 PROTOCOLO DE INVESTIGAÇÃO (5 PASSOS)

### PASSO 0: PROTEÇÃO (Antes de mexer no código)

> Se o bug é em **área crítica** (Pipeline/Grouping): escreva um **Teste de Caracterização (Golden Test)** que reproduz o comportamento atual ANTES de corrigir. Isso garante que o fix não quebra os 99% que funcionavam.

### PASSO 1: REPRODUZIR
- [ ] Consegue reproduzir o bug?
- [ ] É sempre ou às vezes?
- [ ] Acontece com qual input específico?

```bash
# Anote as condições exatas:
- Browser: Chrome 120
- Input: PDF com 3 páginas
- Ação: Clicou em Upload
- Resultado: Travou em "processing"
```

### PASSO 2: ISOLAR
- [ ] É no frontend ou backend/API?
- [ ] É em um componente específico ou global?
- [ ] Acontece em dev e prod, ou só um deles?

```bash
# Testes de isolamento:
npm run dev        # Funciona local?
npm run build      # Build passa?
npm run test       # Testes passam?
```

### PASSO 3: COLETAR EVIDÊNCIAS (Kit Padronizado)

Sempre colete:
- [ ] **Screenshot/Video** (sem PHI)
- [ ] **Console logs filtrados**: `[Pipeline]`, `[Grouping]`, `[Gemini]`
- [ ] **Correlation IDs**: `jobId` → `groupId` → `docId`
- [ ] **Network HAR** (se for erro de API)
- [ ] **Input mínimo** (ou hash do arquivo que causa o erro)

```javascript
// Habilitar logs de debug no código:
const DEBUG_LOGS = true;  // Maioria dos hooks tem essa flag
```

### PASSO 4: FORMAR HIPÓTESE
- [ ] Qual é sua teoria sobre a causa?
- [ ] Como você pode provar/refutar?

```markdown
HIPÓTESE: O pipeline trava porque o job.type está undefined
PROVA: Adicionar console.log(job) antes do switch
```

### PASSO 5: CORRIGIR MINIMAMENTE
- [ ] Qual é a menor mudança que resolve?
- [ ] A mudança pode quebrar outra coisa?

```typescript
// RUIM - mudança grande demais
// Reescrever todo o pipeline

// BOM - patch mínimo
if (!job.type) {
  console.error('[Pipeline] Job sem type:', job);
  return; // Falha graciosamente
}
```

---

## 🔍 GIT BISECT / ROLLBACK PLAYBOOK

### Quando usar Git Bisect
Se não sabe qual commit quebrou:
```bash
git bisect start
git bisect bad HEAD
git bisect good <ultimo-commit-ok>
# Teste, marque good/bad, repita até achar o culpado
```

### Quando Reverter
- Se o fix demorar >2h e for SEV-1
- Se o fix introduzir risco alto em área crítica
- Se tiver feature flag: desligar a flag primeiro

```bash
git revert <commit-culpado>
```

---

## 🔧 FERRAMENTAS DE DEBUG

### 1. Console do Browser (F12)
```javascript
// Filtrar logs do pipeline:
[Pipeline]
[Grouping]
[Gemini]
[Session]

// Ver estado do React (React DevTools):
Components > SessionContext > session
```

### 2. Logs Estruturados no Código
```typescript
// Padrão de log do projeto (usar Correlation ID):
console.log('[Pipeline] Processando:', { jobId, groupId, docId, status });
console.error('[Pipeline] Erro:', error);
console.warn('[Pipeline] Aviso:', msg);
```

### 3. Network Tab
```
// Para debugar chamadas Gemini:
F12 > Network > Filtrar por "generativelanguage"
// Ver request body e response
```

### 4. Breakpoints
```typescript
// Adicionar debugger no código:
function processItem(item) {
  debugger; // Browser vai pausar aqui
  // ...
}
```

---

## 🐛 PROBLEMAS COMUNS E SOLUÇÕES

### 1. "Tela Branca" (White Screen)
**Checklist:**
```bash
# 1. Console tem erro?
F12 > Console

# 2. CSS está carregando?
F12 > Network > Filtrar CSS

# 3. Tailwind configurado?
cat postcss.config.js
# Deve ter: @tailwindcss/postcss

# 4. Build passa?
npm run build
```

**Causas comuns:**
- `postcss.config.js` com plugin errado
- Import de componente que não existe
- Erro de JavaScript que impede render

---

### 2. "API_KEY not found" / "Modo Offline"
**Checklist:**
```bash
# 1. .env existe e tem a chave?
cat .env | grep GEMINI

# 2. vite.config.ts mapeia corretamente?
# Deve ter: define: { 'process.env.API_KEY': ... }

# 3. Em produção (Vercel)?
# Verificar Environment Variables no dashboard
```

---

### 3. "Pipeline Travado" / "Processing Forever"
**Checklist:**
```typescript
// 1. Job tem type definido?
console.log('Job:', job);  // type deve existir

// 2. processItem está retornando?
// Adicionar log no início e fim

// 3. Há erro silenciado?
// Procurar por catch vazio: catch (e) {}
```

**Debug do Pipeline:**
```typescript
// Em usePipeline.ts, habilitar:
const DEBUG_LOGS = true;

// Ver logs:
[Pipeline] Enqueuing: {...}
[Pipeline] Processing: {...}
[Pipeline] Completed: {...}
```

---

### 4. "Agrupamento Errado" (Docs misturados)
**Checklist:**
```typescript
// 1. Qual reportGroupHint cada doc recebeu?
session.docs.forEach(d => console.log(d.id, d.reportGroupHint));

// 2. O PDF tinha globalGroupId?
console.log(doc.globalGroupId);

// 3. Validação de paciente funcionou?
// Ver logs de validateGroupConsistency
```

**Prioridade de agrupamento (INVARIANTE - nunca mude a ordem):**
1. `globalGroupId` (mais forte)
2. `MANUAL_SPLIT`
3. PDF source + hint
4. Strong AI hint
5. Avulso

---

### 5. "Gemini Retorna Lixo"
**Checklist:**
```typescript
// 1. Ver response raw:
console.log('Raw response:', response.text());

// 2. JSON está sujo?
// Pode ter ```json ... ``` em volta

// 3. Schema Zod está validando?
try {
  const parsed = MySchema.parse(data);
} catch (e) {
  console.error('Validation error:', e.errors);
}
```

---

### 6. "Firebase Error"
**Checklist:**
```typescript
// 1. Firebase está habilitado?
console.log('Firebase enabled:', isFirebaseEnabled());

// 2. Credenciais configuradas?
// .env deve ter FIREBASE_*

// 3. Modo offline funcionando?
// Se Firebase falhar, deve usar memória
```

---

## 🚫 O QUE NÃO FAZER DURANTE DEBUG

1. ❌ **Não mude múltiplas coisas de uma vez** - impossível saber qual resolveu
2. ❌ **Não delete código "suspeito"** - pode ser crítico (Lei de Chesterton)
3. ❌ **Não ignore erros no console** - eles estão lá por um motivo
4. ❌ **Não assuma que "funcionava antes"** - prove com git log
5. ❌ **Não faça refactoring durante debug** - separe as preocupações
6. ❌ **Não teste com dados reais de pacientes** - use mocks

---

## 📊 TEMPLATE DE BUG REPORT

Ao reportar um bug:

```markdown
## Bug Report (SEV-X)

**Resumo:** [Uma linha descrevendo o problema]

**Passos para Reproduzir:**
1. Abrir app em localhost:3000
2. Fazer upload de PDF X
3. Clicar em Y
4. Ver erro Z

**Comportamento Esperado:**
[O que deveria acontecer]

**Comportamento Atual:**
[O que está acontecendo]

**Evidências (Kit Completo):**
- Console error: [erro]
- Correlation IDs: jobId=X, groupId=Y
- Screenshot: [imagem - sem PHI]
- Network HAR: [se aplicável]

**Ambiente:**
- Browser: Chrome 120
- Node: 18.x
- Modo: dev / prod

**Hipótese Inicial:**
[Se tiver teoria sobre a causa]
```

---

## 🔄 FLUXO DE HOTFIX (SEV-1)

Se o bug está em produção:

```bash
# 1. NÃO FAÇA REFACTORING
# 2. Patch mínimo apenas

# 3. Teste local
npm run dev
# Reproduzir e confirmar fix

# 4. Build
npm run build

# 5. Deploy
git add -A
git commit -m "fix: [descrição curta]"
git push

# 6. Monitorar Vercel
# Ver se build passou e erro sumiu

# 7. Se piorou: ROLLBACK
git revert HEAD
git push
```

---

> 💡 **Regra de Ouro:** Bug investigado metodicamente leva 30 min. Bug atacado no escuro leva 3 horas + cria outros bugs.
