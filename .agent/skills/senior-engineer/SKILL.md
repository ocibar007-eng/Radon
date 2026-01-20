---
name: senior-engineer
description: Implementa protocolos de "Tech Lead" para garantir Código Limpo, Segurança e Robustez. Use para refatorações, reviews e arquitetura.
---

# Senior Engineer Protocols 🧠 🛡️

Use esta skill para garantir que qualquer mudança siga padrões de excelência técnica.

## ⚠️ PROTOCOLO OBRIGATÓRIO ANTES DE REFATORAR

**Se você vai refatorar qualquer arquivo GOD (>200 linhas), EXECUTE ESTE PROTOCOLO:**

### PASSO 1: Leitura Obrigatória (Use view_file)

```bash
# Execute este comando PRIMEIRO:
view_file docs/guides/REFACTORING_SUPER_PROMPT.md
```

**Caminho completo do arquivo:**
- `docs/guides/REFACTORING_SUPER_PROMPT.md`

### PASSO 2: Checklist de Confirmação

Após ler o guia, confirme que você entendeu:
- [ ] As **5 Leis Invioláveis** (Lei de Chesterton, Side-effects, etc)
- [ ] O processo **FASE A/B** (Plan → Execute → Validate)
- [ ] Os **"segredos"** específicos de cada arquivo GOD
- [ ] O protocolo de **testes de caracterização**
- [ ] O plano de **rollback de emergência**

### PASSO 3: Só Então Refatore

Agora sim você pode começar a refatoração seguindo o processo documentado.

---

### 🔴 Arquivos GOD do Projeto (NUNCA refatore sem ler o guia):
- `src/hooks/useWorkspaceActions.ts` (708 linhas) 🔴
- `src/components/PatientList.tsx` (637 linhas) 🔴
- `src/features/reports/ReportGroupCard.tsx` (611 linhas) 🔴
- `src/utils/grouping.ts` (564 linhas) 🔴
- `src/hooks/usePipeline.ts` (328 linhas) 🟡

> ⛔ **REGRA HARD:** Se você tentar refatorar esses arquivos sem executar o PASSO 1, você está VIOLANDO o protocolo.

---

## 1. 🛑 Protocolo Omega (Segurança Máxima)
Use em tarefas críticas ou refatorações arriscadas.
- **Lei de Chesterton:** Nunca remova código "feio" sem entender o edge-case que ele resolve.
- **Preservação Local:** Jamais sugira comandos destrutivos (`git reset --hard`) sem check de backup.
- **Segredos:** Chaves de API nunca devem ser hardcoded.
- **Modo Cirurgião:** Ao mexer no Core, crie versão paralela (`File.v2.ts`) e substitua apenas quando 100% testado.

---

## 2. 🚫 Protocolo Anti-Preguiça
- **Proibido Placeholders:** Nunca use `// resto do código...` ou `// ...implement logic`. Entregue código completo.
- **Prova de Leitura:** Antes de codar, liste 3 regras/restrições que vai respeitar.
- **Boy Scout Rule:** Se tocou no arquivo, melhore a tipagem ou documentação (sem quebrar comportamento).

---

## 3. 🔧 Refatoração Segura (Resumo)
1. **FASE A - PLANO:** Mapa de dependências + Lista de invariantes + Testes de caracterização
2. **FASE B - EXECUÇÃO:** Mudanças mecânicas por commit, manter fachada, validar a cada passo
3. **Validação:** `npm run build` + `npm run test` + smoke manual

> Para detalhes completos, consulte `docs/guides/REFACTORING_SUPER_PROMPT.md`

---

## 4. 🔥 Protocolo Hotfix (Produção Quebrou)
- **Patch Mínimo:** A menor mudança possível para estancar o sangue.
- **Sem Refactor:** Não é hora de limpar código.
- **Rollback:** Tenha sempre o comando de "desfazer" pronto: `git revert <hash>`

---

## 5. 📁 Convenções de Estrutura

### Onde criar arquivos:
| Tipo | Local | Exemplo |
|------|-------|---------|
| Feature completa | `src/features/<nome>/` | `src/features/clinical/` |
| Hook reutilizável | `src/hooks/` | `src/hooks/useUpload.ts` |
| Componente UI base | `src/components/ui/` | `src/components/ui/Button.tsx` |
| Componente de negócio | `src/components/` | `src/components/PatientCard.tsx` |
| Utilitário puro | `src/utils/` | `src/utils/date-helpers.ts` |
| Tipo/Interface | `src/types/` | `src/types/patient.ts` |
| Adapter de API | `src/adapters/` | `src/adapters/gemini-prompts.ts` |

### Barrel Exports:
- Toda pasta de feature DEVE ter `index.ts` exportando os itens públicos
- Nunca importe de arquivos internos de outra feature (use o barrel)

---

## 6. 🔄 PROTOCOLO DE CONTRATOS/MIGRAÇÃO

Se refatoração tocar em **shape persistido**:

1. Consultar skill `radon-data-contracts-migrations`
2. Verificar se precisa `schemaVersion`
3. Implementar migração se necessário
4. Testar com dados antigos

> Isso é parte do **Protocolo Omega** para mudanças em Core.

---

## 7. 📏 PR DISCIPLINE

### Limites de PR
| Métrica | Limite |
|---------|--------|
| Arquivos alterados | Max 10-15 |
| Linhas de diff | Max 400-500 |
| Tipos de mudança | 1 por PR |

### Um Eixo por PR
```markdown
# ✅ BOM - 1 eixo
feat: add contrast validation panel

# ❌ RUIM - múltiplos eixos
feat: add contrast + refactor grouping + update deps
```

---

## 8. ✅ CHECKLIST DE INVARIANTES POR ÁREA

### Pipeline (usePipeline.ts)
- [ ] Processamento continua paralelo?
- [ ] Retry funcionando (3x)?
- [ ] Auto-trigger de group_analysis funciona?
- [ ] Jobs têm type definido?

### Grouping (grouping.ts)
- [ ] Prioridades de agrupamento preservadas (5 níveis)?
- [ ] validateGroupConsistency funciona?
- [ ] Regex de parsing intactos?

### Env (vite.config.ts, .env)
- [ ] Mapeamento process.env correto?
- [ ] Variáveis no Vercel?
- [ ] Fallback offline funciona?

### Offline (patient-service.ts)
- [ ] Modo memória funciona sem Firebase?
- [ ] Dados persistem em IndexedDB?
- [ ] Sync volta quando online?

