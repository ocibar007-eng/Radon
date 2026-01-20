---
name: radon-data-contracts-migrations
description: Dono de contratos de dados, versionamento e migrações. Use ao mudar shapes persistidos, schemas e objetos que cruzam módulos.
---

# Radon Data Contracts & Migrations 🧾 🔁

Use esta skill quando mexer em **shapes de dados** que são persistidos ou cruzam módulos (UI ↔ storage ↔ pipeline ↔ IA).

---

## 🛑 REGRAS TRANSVERSAIS (NÃO QUEBRE)

1. **Backward Compatibility**: Dado antigo NÃO PODE quebrar app novo.
2. **Escopo por PR**: Mudança de contrato é 1 PR separado.
3. **Invariantes**: Nunca renomear campo sem mapear TODOS consumidores.
4. **Handoff**: "O que mudou / como migrar / como reverter".

---

## 🎯 QUANDO USAR

- Mudança em tipos/shape de `session`, `docs`, `reportGroups`, análises estruturadas
- Mudança em payloads de IA (input ou output)
- Refactor que toque em IDs/keys, enums/status
- Mudança em persistência (IndexedDB, Firestore, localStorage)
- Qualquer mudança que possa quebrar dados existentes

---

## ⚖️ LEIS INVIOLÁVEIS

### 1. Todo Dado Persistido Tem `schemaVersion`
```typescript
interface PersistedData {
  schemaVersion: number;  // OBRIGATÓRIO
  // ... resto dos campos
}
```

### 2. Código Novo Lê Dados Antigos
> **Backward Compatible** ou **Migra na Entrada**

```typescript
// Exemplo de migração na entrada
function loadSession(raw: unknown): Session {
  const version = raw.schemaVersion ?? 1;
  
  if (version < CURRENT_VERSION) {
    return migrateSession(raw, version, CURRENT_VERSION);
  }
  
  return SessionSchema.parse(raw);
}
```

### 3. Mudança de Contrato Exige Migração + Teste + Doc
Não existe "mudança rápida" de shape. Sempre:
1. Migração
2. Teste com dados antigos
3. Atualização de doc (se aplicável)

---

## 📋 PROCESSO OBRIGATÓRIO

### PASSO 1: Mapear Consumidores
Antes de mudar qualquer campo:
```bash
# Onde o campo é usado?
grep -r "fieldName" src/

# Quem importa este tipo?
grep -r "import.*TypeName" src/
```

Lista obrigatória:
- [ ] UI (componentes)
- [ ] Hooks (estado)
- [ ] Pipeline (processamento)
- [ ] Storage (persistência)
- [ ] Adapters (IA)

### PASSO 2: Definir Migração
```typescript
// src/migrations/session.migrations.ts

export function migrateSession(
  data: unknown, 
  fromVersion: number, 
  toVersion: number
): Session {
  let current = data;
  
  if (fromVersion < 2) {
    current = migrateV1toV2(current);
  }
  if (fromVersion < 3) {
    current = migrateV2toV3(current);
  }
  
  return SessionSchema.parse(current);
}

// Cada migração deve ser IDEMPOTENTE
function migrateV1toV2(data: any): any {
  return {
    ...data,
    schemaVersion: 2,
    // Novo campo com default
    newField: data.newField ?? 'default',
    // Renomeação com fallback
    renamedField: data.renamedField ?? data.oldFieldName,
  };
}
```

### PASSO 3: Teste de Caracterização (Golden)
```typescript
// tests/migrations/session.test.ts

describe('Session Migration', () => {
  it('migrates v1 data to current version', () => {
    const v1Data = require('./fixtures/session_v1.json');
    const migrated = migrateSession(v1Data, 1, CURRENT_VERSION);
    
    expect(migrated.schemaVersion).toBe(CURRENT_VERSION);
    expect(migrated.newField).toBeDefined();
    // ... validações
  });
  
  it('current version data passes without migration', () => {
    const currentData = require('./fixtures/session_current.json');
    const result = migrateSession(currentData, CURRENT_VERSION, CURRENT_VERSION);
    
    expect(result).toEqual(currentData);
  });
});
```

### PASSO 4: Implementar e Validar
```bash
npm run build
npm run test
npm run e2e
```

---

## 🗂️ TIPOS DE MUDANÇA E RISCO

| Tipo de Mudança | Risco | Migração Necessária |
|-----------------|-------|---------------------|
| Adicionar campo opcional | 🟢 Baixo | Não (se `.nullable()` ou default) |
| Adicionar campo obrigatório | 🟡 Médio | Sim (precisa default) |
| Renomear campo | 🔴 Alto | Sim (mapear antigo → novo) |
| Remover campo | 🔴 Alto | Sim (verificar consumidores) |
| Mudar tipo de campo | 🔴 Alto | Sim (converter valor) |
| Mudar formato de ID/key | 🔴 Crítico | Sim + revisar grouping |

---

## 📁 CONTRATOS CRÍTICOS DO PROJETO

| Contrato | Arquivo | Persistido em |
|----------|---------|---------------|
| `Session` | `src/types/session.ts` | IndexedDB, Firestore |
| `AttachmentDoc` | `src/types/document.ts` | Session |
| `ReportGroup` | `src/types/group.ts` | Derivado (não persistido) |
| `Patient` | `src/types/patient.ts` | Firestore |
| `StructuredAnalysis` | `src/types/analysis.ts` | Session |

---

## 🚫 PROIBIÇÕES

1. ❌ Renomear campo sem verificar TODOS os consumidores
2. ❌ Mudar enum/status sem atualizar pipeline + grouping
3. ❌ Remover campo sem verificar dados em produção
4. ❌ Mudar formato de ID/key do grouping sem testes exaustivos
5. ❌ Fazer mudança "breaking" sem migração

---

## 📤 OUTPUTS OBRIGATÓRIOS

Ao concluir mudança de contrato:

```markdown
## Mudança de Contrato

**Contratos tocados:**
- [Lista de tipos/interfaces alterados]

**Estratégia de compatibilidade:**
- [Como dados antigos serão tratados]

**Migração:**
- [Arquivo e função de migração]
- [Testes adicionados]

**Como reverter (rollback):**
- [Passos para voltar se quebrar]
```

---

> 💡 **Regra de Ouro:** Se você não tem certeza se um dado antigo vai quebrar, escreva um teste com payload antigo ANTES de mudar o código.
