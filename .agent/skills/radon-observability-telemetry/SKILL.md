---
name: radon-observability-telemetry
description: Padroniza logs, métricas e rastreabilidade ponta-a-ponta. Use ao mexer em pipeline, storage, IA e fluxos críticos.
---

# Radon Observability & Telemetry 📈 🧭

Use esta skill para garantir **rastreabilidade ponta-a-ponta** em todos os fluxos críticos.

---

## 🛑 REGRAS TRANSVERSAIS (NÃO QUEBRE)

1. **Sem Trace = Sem Merge**: Todo fluxo crítico deve ter `correlationId`.
2. **Logs Estruturados**: Scopes fixos, formato JSON-like.
3. **Zero PHI**: Nunca logar dados de paciente (use hash).
4. **Handoff**: "Eventos adicionados / como rastrear / como ajuda debug".

---

## 🎯 QUANDO USAR

- Mudanças em pipeline de processamento
- Mudanças em grouping
- Integração com IA (Gemini)
- Upload/download de arquivos
- Persistência (IndexedDB, Firestore)
- Qualquer fluxo que precise de troubleshooting

---

## 🔗 CORRELATION ID (OBRIGATÓRIO)

### Conceito
Todo fluxo tem um ID único que conecta todos os logs/eventos:

```
traceId → jobId → groupId → docId
   │         │        │        └── Documento individual
   │         │        └── Grupo de documentos
   │         └── Job no pipeline
   └── Trace da sessão/upload
```

### Implementação
```typescript
// Gerar no início do fluxo
const traceId = crypto.randomUUID().slice(0, 8);

// Passar para todos os handlers
async function processUpload(file: File, traceId: string) {
  console.log('[Upload] start', { traceId, fileName: file.name });
  
  const jobId = await enqueue({ file, traceId });
  console.log('[Pipeline] enqueued', { traceId, jobId });
  
  // ...
}
```

### Padrão de Uso
```typescript
// Sempre incluir IDs relevantes
console.log('[Pipeline] processing', { 
  traceId,
  jobId, 
  groupId,
  docId,
  status: 'started'
});
```

---

## 📋 SCOPES DE LOG PADRONIZADOS

| Scope | Quando usar | Exemplo |
|-------|-------------|---------|
| `[Upload]` | Upload de arquivos | `[Upload] file_received` |
| `[Pipeline]` | Processamento de jobs | `[Pipeline] job_started` |
| `[Grouping]` | Agrupamento de docs | `[Grouping] group_created` |
| `[Gemini]` | Chamadas à IA | `[Gemini] request_sent` |
| `[OCR]` | Extração de texto | `[OCR] text_extracted` |
| `[Storage]` | Persistência | `[Storage] session_saved` |
| `[Auth]` | Autenticação | `[Auth] user_logged_in` |
| `[Error]` | Erros | `[Error] parse_failed` |

### Formato Padrão
```typescript
console.log('[Scope] event_name', {
  traceId,
  // IDs relevantes
  jobId,
  groupId,
  docId,
  // Dados do evento (sem PHI)
  status: 'success',
  duration: 1234,
  // Metadata
  timestamp: Date.now()
});
```

---

## 🏷️ CATEGORIAS DE ERRO

| Categoria | Código | Quando usar |
|-----------|--------|-------------|
| `PARSE_FAIL` | JSON/Zod inválido | IA retornou lixo |
| `RATE_LIMIT` | 429 | Gemini throttled |
| `STORAGE_FAIL` | Erro de persistência | IndexedDB/Firebase |
| `GROUPING_CONFLICT` | Inconsistência | Pacientes misturados |
| `NETWORK_ERROR` | Conectividade | Offline/timeout |
| `VALIDATION_ERROR` | Input inválido | Schema rejeitou |
| `UNKNOWN` | Não categorizado | Fallback |

### Uso
```typescript
console.error('[Error] PARSE_FAIL', {
  traceId,
  jobId,
  error: error.message,
  rawResponse: sanitize(response), // Sem PHI
});
```

---

## 📊 MÉTRICAS MÍNIMAS

### O que medir
```typescript
// Duração por etapa
const start = performance.now();
// ... processar
const duration = performance.now() - start;
console.log('[Pipeline] step_completed', { traceId, step: 'ocr', duration });

// Taxa de falha
console.log('[Metrics] job_result', { traceId, success: true/false });

// Retries
console.log('[Pipeline] retry', { traceId, attempt: 2, maxAttempts: 3 });

// Rate limits
console.log('[Gemini] rate_limit_hit', { traceId, retryAfter: 60 });
```

### Eventos Importantes
- `upload_started` / `upload_completed`
- `job_enqueued` / `job_started` / `job_completed` / `job_failed`
- `group_created` / `group_analysis_started` / `group_analysis_completed`
- `gemini_request` / `gemini_response` / `gemini_error`
- `storage_save` / `storage_load` / `storage_error`

---

## 🔍 COMO RASTREAR UM CASO

### Do início ao fim
```bash
# 1. Filtrar por traceId no console
[Upload] file_received { traceId: 'abc123', ... }
[Pipeline] job_enqueued { traceId: 'abc123', jobId: 'job-1', ... }
[OCR] text_extracted { traceId: 'abc123', jobId: 'job-1', ... }
[Grouping] group_created { traceId: 'abc123', groupId: 'grp-1', ... }
[Gemini] analysis_complete { traceId: 'abc123', groupId: 'grp-1', ... }
[Storage] session_saved { traceId: 'abc123', ... }
```

### Debug de erro
```bash
# Filtrar por ERROR ou categoria específica
[Error] PARSE_FAIL { traceId: 'abc123', jobId: 'job-1', ... }
# → Ir para logs anteriores com mesmo traceId
# → Ver o que aconteceu antes do erro
```

---

## 🛠️ HELPER DE LOG ESTRUTURADO

```typescript
// src/utils/logger.ts

type Scope = 'Upload' | 'Pipeline' | 'Grouping' | 'Gemini' | 'OCR' | 'Storage' | 'Error';

interface LogContext {
  traceId?: string;
  jobId?: string;
  groupId?: string;
  docId?: string;
  [key: string]: any;
}

export function log(scope: Scope, event: string, context: LogContext) {
  console.log(`[${scope}] ${event}`, {
    ...context,
    timestamp: Date.now()
  });
}

export function logError(category: string, context: LogContext) {
  console.error(`[Error] ${category}`, {
    ...context,
    timestamp: Date.now()
  });
}

// Uso
log('Pipeline', 'job_started', { traceId, jobId, type: 'ocr' });
logError('PARSE_FAIL', { traceId, jobId, error: e.message });
```

---

## 🚫 PROIBIÇÕES

1. ❌ Fluxo crítico sem correlationId
2. ❌ Log sem scope padronizado
3. ❌ Logar PHI (nomes, OS, CPF)
4. ❌ Ignorar erros silenciosamente (`catch (e) {}`)
5. ❌ Console.log sem contexto estruturado

---

## 📤 OUTPUTS OBRIGATÓRIOS

Ao adicionar/modificar logs:

```markdown
## Observability Update

**Eventos adicionados:**
- [Lista de novos logs/eventos]

**Como rastrear um caso:**
- [Passo a passo com traceId]

**Como isso ajuda o debugger:**
- [1 parágrafo explicando o valor]
```

---

> 💡 **Regra de Ouro:** Se você não consegue rastrear um fluxo do início ao fim só olhando os logs, adicione mais contexto.
