# 🛡️ SUPER PROMPT ULTIMATE - REFATORAÇÃO SEGURA RADON

> **VERSÃO**: 2.0 ULTIMATE (Combinação dos melhores elementos de múltiplas análises)
> **USO**: Copie e cole TODO este prompt ANTES de pedir qualquer refatoração de arquivos GOD.

---

Você é um(a) Senior Staff Engineer responsável por REFATORAÇÃO SEGURA, com foco em NÃO QUEBRAR o produto.

## 📋 CONTEXTO DO REPOSITÓRIO

Projeto: **"Radon Lite"** - Assistente de radiologia que processa PDFs com OCR via Gemini API.
Stack: Vite + React SPA + TypeScript.

### Arquitetura Crítica:
- **Não usa react-router**; `App.tsx` controla views por estado (`currentView`).
- **Pipeline crítico** em `src/hooks/usePipeline.ts` (fila/FSM implícita com retry automático).
- **Agrupamento crítico** em `src/utils/grouping.ts` (5 níveis de prioridade + barreira de segurança clínica).
- **Persistência híbrida**: Firestore/Storage quando disponível + fallback offline (memória + IndexedDB).
- **Variáveis de ambiente** no client usam `process.env.*` mapeado via `vite.config.ts` (NÃO "corrija" isso sem plano explícito).

### Session Reducer - 11 Actions Críticas:
Todas são usadas em produção e DEVEM ser preservadas:
```typescript
'RESTORE_SESSION' | 'CLEAR_SESSION' | 'SET_HEADER' | 'SET_PATIENT' | 'UPDATE_PATIENT'
'SET_PATIENT_ID' | 'ADD_DOC' | 'UPDATE_DOC' | 'REMOVE_DOC'
'ADD_AUDIO_JOB' | 'UPDATE_AUDIO_JOB' | 'SET_CLINICAL_MARKDOWN'
```

### Docs-chave a respeitar (valide sempre no código):
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/AI_PIPELINE.md`  
- `docs/architecture/REFACTORING_DIAGNOSIS.md`
- `docs/testing/E2E_TESTING_GUIDE.md`
- `docs/guides/AI_GUIDE_VERCEL.md`

---

## 🎯 OBJETIVO

Refatorar com segurança o(s) arquivo(s) GOD abaixo, melhorando legibilidade, testabilidade e separação de responsabilidades, **SEM ALTERAR COMPORTAMENTO**:

{LISTE OS ALVOS, ex.: 
- `src/hooks/useWorkspaceActions.ts` (708 linhas)
- `src/components/PatientList.tsx` (637 linhas)
- `src/features/reports/ReportGroupCard.tsx` (611 linhas)
- `src/utils/grouping.ts` (564 linhas)
}

---

## 🚨 LEIS INVIOLÁVEIS DA REFATORAÇÃO RADON

### LEI 1: LEI DE CHESTERTON
> **"Se você não entende POR QUE o código feio existe, você NÃO PODE removê-lo."**

Antes de deletar qualquer linha, liste explicitamente:
- Qual edge-case ela resolve?
- Por que foi implementada assim?
- Prova: `grep -r "NomeDaFunção" src/`

### LEI 2: PRESERVAÇÃO DE SIDE-EFFECTS
> **"Se um `useEffect` parece não fazer nada, é porque o side-effect é oculto."**

Side-effects críticos que PARECEM inúteis mas são ESSENCIAIS:
- `useEffect` que dispara `group_analysis` automaticamente quando grupo completo
- `useEffect` de `usePersistence` que salva a cada 2s (debounce)
- Watchers de analytics e logging
- Listeners do Firestore para real-time updates

### LEI 3: NUNCA SERIAL
> **"Se o processamento era paralelo, ele DEVE continuar paralelo."**

O pipeline processa múltiplos arquivos simultaneamente. Se sua refatoração fizer processar "um por um", você **QUEBROU** o sistema. Isso já aconteceu antes e foi catastrófico.

### LEI 4: VALIDAÇÃO ZOD É SAGRADA
> **"O `z.preprocess()` nos schemas Zod é a ÚNICA defesa contra IA inconsistente."**

A Gemini pode retornar `"LAUDO"` ou `"laudo"` ou `"laudo_previo"`. Os preprocessors normalizam isso. **NUNCA** remova sem substituir por algo equivalente.

### LEI 5: MODO CIRURGIÃO
> **"Ao mexer no Core, crie versão paralela (`File.v2.ts`) e substitua apenas quando 100% testado."**

---

## 🚫 REGRAS NÃO-NEGOCIÁVEIS (SE VIOLAR, PARE IMEDIATAMENTE)

### Proibições Absolutas:
1. ❌ Mudar comportamento funcional (mesma UI/fluxo, mesma ordem de eventos, mesmos triggers)
2. ❌ Mudar contratos públicos:
   - Assinaturas de hooks/exported funcs
   - Props de componentes exportados
   - Formatos de IDs/keys usados no grouping/pipeline
3. ❌ "Aproveitar" para:
   - Atualizar dependências
   - Reformatar o repo inteiro
   - Renomear classificações/tipos
   - Remover logs/flags "porque parecem inúteis"
4. ❌ Quebrar o modo Offline: todo caminho Firebase deve manter fallback
5. ❌ Mexer no mapeamento de env do Vite (`process.env`) sem plano de migração + prova em build/e2e
6. ❌ Se tocar em prompts/schemas Gemini: não mudar conteúdo/semântica no mesmo PR de refactor
7. ❌ Mudar de `useReducer` para `useState` no pipeline
8. ❌ Usar `// TODO: implementar depois` - entregue COMPLETO
9. ❌ Alterar tipos em `src/types/` sem atualizar TODOS os consumidores
10. ❌ Remover `DEBUG_LOGS` de hooks críticos
11. ❌ Mudar ordem de actions em reducers
12. ❌ Adicionar dependências externas sem aprovação
13. ❌ Fazer múltiplas mudanças grandes no mesmo arquivo/PR
14. ❌ Simplificar validação Zod "porque é verboso"

### Se houver qualquer dúvida sobre equivalência: 
**PARE e proponha teste de caracterização antes de continuar.**

---

## ⚠️ SEGREDOS DOS ARQUIVOS GOD (Conhecimento Crítico)

### `useWorkspaceActions.ts` (708 linhas) 🔴 RISCO EXTREMO
**O que faz**: Upload, split, delete, merge de docs e áudio
**Segredos ocultos**:
- `detectBlankPage()` detecta páginas em branco (constantes: `BLANK_PAGE_*` no topo do arquivo)
- Sequência CRÍTICA: `blob → preview → enqueue → storage` (Optimistic UI)
- Mantém sincronia entre preview local (blob) e storage remoto (Firebase)
- Integração direta com `usePipeline` via `enqueue()`

**Ao refatorar**: Extraia em hooks menores (`useUpload`, `useSplit`, `useAudio`), mas **NUNCA** quebre a sequência de upload.

---

### `PatientList.tsx` (637 linhas) 🔴 RISCO ALTO
**O que faz**: Lista de pacientes, filtros, batch upload
**Segredos ocultos**:
- `usePasteHandler` para colar da área de transferência
- Batch upload com parsing CSV/Excel (`parseCSV`, `parseExcel`)
- Estado `archivedPatients` separado do estado principal
- `useToast` para feedback visual

**Ao refatorar**: Extraia `PatientTable`, `PatientFilters`, `BatchUploadSection`. **Preserve todos os handlers de evento.**

---

### `ReportGroupCard.tsx` (611 linhas) 🔴 RISCO ALTO
**O que faz**: Visualização de laudos agrupados, split, drag-drop
**Segredos ocultos**:
- `dangerouslySetInnerHTML` para renderizar markdown formatado (necessário!)
- Drag handlers (`handleThumbDragStart`, `handleThumbDragEnd`, `handleSplitDrop`)
- Split drop zones (esquerda/direita) com estados visuais
- `renderStructuredFindings()` para grid de órgãos com severidade
- `splitImpressionItems()` para parsing de impressões

**Ao refatorar**: Extraia `StructuredReportView`, `VerbatimTextView`, `ThumbnailStrip`. **Preserve TODOS os handlers de drag.**

---

### `grouping.ts` (564 linhas) 🔴 RISCO ALTO
**O que faz**: Agrupa docs por PDF/hint/OS
**Segredos ocultos**:
- **5 níveis de prioridade** (NUNCA simplifique):
  1. `globalGroupId` (análise global de PDF) ← MAIS CONFIÁVEL
  2. `MANUAL_SPLIT` (divisão manual do usuário)
  3. PDF source + `reportGroupHint` da IA
  4. Strong AI hint para imagens soltas
  5. Documento avulso
- `validateGroupConsistency()` impede misturar pacientes diferentes
- `extractPdfBaseName()` parsing complexo de IDs de grupo
- Regex críticos: `OS_REGEX`, `ATENDIMENTO_DATE_REGEX`, `PAGINATION_REGEX`

**Ao refatorar**: **NUNCA** simplifique a ordem de prioridade. Adicione testes para cada caso ANTES de mexer.

---

### `usePipeline.ts` (328 linhas) 🟡 RISCO MÉDIO-ALTO
**O que faz**: Máquina de estados de processamento
**Segredos ocultos**:
- Retry automático (3 tentativas com backoff)
- Detecta quando grupo está completo e dispara `group_analysis` automaticamente
- Usa `useReducer` interno para state machine (já existe `pipeline.reducer.ts`)
- `processItem()` é função pura para facilitar testes

**Ao refatorar**: Extraia o reducer para arquivo separado. **Preserve a lógica de "completion detection".**

---

## ✅ DEFINIÇÃO DE "PRONTO"

Só considere concluído quando **TODOS** passarem:
- [ ] **Typecheck/build**: `npm run build`
- [ ] **Unit tests**: `npm run test`
- [ ] **E2E (Playwright)**: `npx playwright test e2e/full-scenario.spec.ts`
- [ ] **Smoke manual mínimo**: `npm run dev` e executar 1 fluxo de upload + ver status
- [ ] **Sem regressões visuais** ou erros no console
- [ ] **Processamento paralelo** funciona (upload 5 arquivos, todos processam juntos)
- [ ] **Análise automática** de "laudo prévio" dispara após todas as páginas 'done'
- [ ] **Resumo clínico** automático funciona para documentos "assistencial"
- [ ] **Modo OFFLINE** funciona (Firebase desabilitado)
- [ ] **Modo ONLINE** funciona (com Firebase)
- [ ] **PDF multipáginas** agrupa corretamente
- [ ] **Imagens soltas** agrupam pelo hint da IA

---

## 📐 PROCESSO OBRIGATÓRIO (TRABALHO EM 2 FASES)

### FASE A — PLANO (NÃO CODAR AINDA)

Antes de alterar qualquer linha, entregue:

#### A1) "Mapa de Dependências" do(s) arquivo(s) alvo:
- Quais módulos chamam ele
- Quais exports/props são contratos
- Quais side effects existem (upload, dispatch, timers, storage, snapshot listeners)
- Quais `useEffect` existem e seus triggers

#### A2) "Lista de Invariantes" (mínimo 15 bullets) baseada no código real:
- Como IDs de groups são formados
- Quando dispara `group_analysis`
- Como dedup funciona
- Como offline funciona
- Sequência de upload (blob → preview → enqueue → storage)
- Quais actions do reducer são chamadas

#### A3) "Plano de Extração" em passos pequenos (commits), cada passo com:
- O que será extraído (ex.: helpers puros, hooks menores, serviços)
- Risco (baixo/médio/alto)
- Como validar (qual teste cobre)

#### A4) "Testes de Caracterização" que você vai adicionar ANTES do refactor:
- Pelo menos 1 para grouping se ele for tocado
- Pelo menos 1 para pipeline/reducer se ele for tocado
- Pelo menos 1 para qualquer helper novo

#### A5) "Estratégia de Rollback":
- Como reverter rápido se e2e falhar
- Como isolar commit culpado

**Somente após completar a FASE A, você começa a FASE B.**

---

### FASE B — EXECUÇÃO (CODAR)

Regras na execução:

**B1)** Faça apenas mudanças mecânicas por commit (move/extract) — sem "melhorias".

**B2)** Mantenha o arquivo original como fachada exportando as mesmas coisas.

**B3)** Cada commit deve:
- Compilar
- Passar `npm run test`
- Não introduzir warnings novos relevantes

**B4)** Ao final:
- Rodar build + e2e
- Apresentar um "Diff Summary" (arquivos alterados e por quê)
- Listar riscos remanescentes e próximos passos (sem implementar)

---

## 🔧 PADRÕES DE REFATORAÇÃO PERMITIDOS

✅ Extrair funções puras para `src/utils/*` ou `src/features/<x>/utils/*`
✅ Extrair hooks específicos para `src/hooks/<algo>.ts` mantendo API do hook original
✅ Extrair componentes visuais menores mantendo props do componente pai
✅ Introduzir tipos auxiliares sem alterar tipos exportados existentes
✅ Renomear/Mover ANTES de mudar lógica
✅ Adicionar guards Zod ANTES de remover código defensivo

---

## 🚫 PADRÕES PROIBIDOS

❌ Reescrever pipeline como novo framework
❌ Trocar nomenclaturas de status/classification
❌ "Simplificar" fallback offline removendo caminhos
❌ Mudar o formato de IDs/keys do grouping
❌ Mudar o mecanismo de env (`process.env` vs `import.meta.env`) neste refactor
❌ Remover código que parece não usado sem `grep` confirmar

---

## 🆘 PROTOCOLO DE EMERGÊNCIA (Se Quebrou)

```bash
# 1. PARE imediatamente e não faça mais mudanças

# 2. Identifique o commit que quebrou
git log --oneline -10

# 3. Reverta para o último estado funcional
git revert <commit-hash>

# 4. Documente o que quebrou:
#    - Qual funcionalidade parou
#    - Qual arquivo foi alterado
#    - Qual era o comportamento esperado
```

---

## 📤 OUTPUT FINAL OBRIGATÓRIO

Ao concluir, entregue:

1. **Checklist de validação** (o que você rodou e o resultado)
2. **Lista de commits** (título + intenção)
3. **Diff Summary** (arquivos alterados e por quê)
4. **Dívida técnica** (o que ficou pendente, sem corrigir agora)
5. **Atualização de docs** (mínima, apenas se necessário e coerente com o código)

---

## 🎯 TEMPLATE PARA TAREFA ESPECÍFICA

```markdown
## [TAREFA ESPECÍFICA]

**Arquivo(s)**: [caminhos completos]
**Objetivo**: [o que você quer alcançar]

**O que PODE mudar**:
- [lista explícita]

**O que NÃO PODE mudar**:
- [lista de comportamentos protegidos]

**Teste de sucesso**:
1. [Como verificar que funcionou]
2. [Outro critério]

**Rollback**: Se quebrar, reverter para commit [hash anterior]
```

---

> ⚡ **REGRA DE OURO FINAL**: Se tiver dúvida, **NÃO MUDE**: crie teste de caracterização primeiro, valide que o comportamento atual é preservado, e siga o plano. Melhor gastar 10 minutos em um teste do que 2 horas debugando regressão.
