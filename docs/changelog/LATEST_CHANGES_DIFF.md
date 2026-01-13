
# Handoff V3: Persistência em Nuvem e Storage

**Data:** 25/05/2024
**Status:** Implementado (Fase 3.1, 3.2, 3.3)
**Foco:** Upload de arquivos para Firebase Storage, Salvamento Automático de Estado (Firestore) e Hidratação de Sessão.

---

## 1. Visão Geral

Nesta fase, transformamos o app de uma ferramenta "efêmera" (dados perdidos ao recarregar) em uma ferramenta persistente.
1.  **Arquivos:** Imagens e Áudios agora vão para o **Google Cloud Storage**.
2.  **Estado:** O JSON da sessão (textos, classificações) é salvo dentro do documento do paciente no **Firestore**.
3.  **Continuidade:** Ao abrir um paciente, o sistema baixa o estado anterior e restaura a tela exatamente como estava.

---

## 2. Infraestrutura de Arquivos (`src/services/storage-service.ts`)

**Novo Serviço:** Gerencia o ciclo de vida dos arquivos binários.

*   **Modo Online:** Faz upload via `uploadBytes` e retorna a URL pública (`getDownloadURL`).
*   **Modo Offline:** Gera uma `blob:URL` local para não travar o desenvolvimento.
*   **Estrutura:** `patients/{patientId}/docs/{uuid}_{filename}`.

```typescript
+ export const StorageService = {
+   async uploadFile(patientId: string, file: File): Promise<StorageUploadResult> {
+     // 1. Tenta Firebase
+     if (isFirebaseEnabled()) {
+        const ref = ref(storage, `patients/${patientId}/docs/...`);
+        await uploadBytes(ref, file);
+        return { downloadUrl: await getDownloadURL(ref), ... };
+     }
+     // 2. Fallback
+     return { downloadUrl: URL.createObjectURL(file), storagePath: 'memory://...' };
+   }
+ };
```

---

## 3. Persistência de Estado (`src/types/patient.ts` & `src/services/patient-service.ts`)

**Alteração no Modelo:** O documento do paciente agora carrega um payload pesado opcional chamado `workspace`.

```typescript
  export interface Patient {
    id: string;
    // ... campos leves para listagem
    name: string;
    status: PatientStatus;
    
+   // O Estado Completo da Aplicação (JSON Gigante)
+   workspace?: Partial<AppSession>; 
  }
```

**Método de Salvamento:**
O `saveWorkspaceState` atualiza apenas o campo `workspace` e estatísticas, sem tocar nos dados cadastrais básicos.

---

## 4. UI Otimista e Upload (`src/app/App.tsx`)

Refatoramos o `handleFileUpload` para garantir responsividade imediata.

**Fluxo Anterior:**
1. Ler Arquivo -> 2. Adicionar na Sessão.

**Fluxo Novo (Optimistic UI):**
1. Ler Arquivo -> Cria `blob:URL` temporária.
2. **Renderiza Imediatamente** na tela (Usuário vê a imagem).
3. Dispara `StorageService.uploadFile` em Background.
4. Quando o upload termina -> Substitui a `blob:URL` pela `https://firebasestorage...`.

```typescript
  const addDocToSessionAndUpload = async (...) => {
    // 1. Feedback Imediato
    const tempUrl = URL.createObjectURL(file);
    const newDoc = { ..., previewUrl: tempUrl, status: 'pending' };
    dispatch({ type: 'ADD_DOC', payload: newDoc });

    // 2. Persistência em Background
    if (patient) {
      StorageService.uploadFile(patient.id, file).then(result => {
         // 3. Atualiza com URL definitiva (segura para salvar no banco)
         dispatch({ 
           type: 'UPDATE_DOC', 
           payload: { id, updates: { previewUrl: result.downloadUrl } } 
         });
      });
    }
  };
```

---

## 5. Hidratação de Sessão (Load)

Ao entrar no Workspace, o sistema agora verifica se há dados salvos.

```typescript
// src/app/App.tsx

  useEffect(() => {
    async function hydrate() {
      // Busca dados completos (incluindo o campo 'workspace')
      const fullPatient = await PatientService.getPatient(patient.id);
      
      if (fullPatient?.workspace) {
        // Restaura estado anterior
+       dispatch({ type: 'RESTORE_SESSION', payload: fullPatient.workspace });
      } else {
        // Inicia novo estado
        dispatch({ type: 'SET_PATIENT', ... });
      }
    }
    hydrate();
  }, [patient.id]);
```

---

## 6. Auto-Save Inteligente (`src/hooks/usePersistence.ts`)

O hook foi atualizado para sanitizar os dados antes de salvar (Removendo objetos `File` e URLs `blob:` que não podem ir para o banco).

```typescript
  // Removemos objetos File (não serializáveis)
  const sessionToSave = {
    ...session,
    docs: session.docs.map(d => ({
      ...d,
      file: undefined, // Não salva o binário no JSON
      previewUrl: sanitizeUrl(d.previewUrl) // Garante que só URLs http vão pro banco
    }))
  };
  
  await PatientService.saveWorkspaceState(patientId, sessionToSave);
```

---

## Resumo para QA/Testes

1.  **Criar Paciente:** Crie um paciente na lista.
2.  **Upload:** Entre no workspace, faça upload de uma imagem. Veja se ela aparece instantaneamente.
3.  **Verificar Console:** Veja se o log indica upload para Firebase (se configurado) ou "Offline Mode".
4.  **Sair e Voltar:** Volte para a lista e abra o paciente novamente. **A imagem e os textos devem reaparecer** (Hidratação).
