# Caçador de Código Morto - Radon Lite

Relatório de suspeitos de obsolescência para limpeza segura.

## 🕵️ Suspeitos Nível 1: Arquivos Órfãos

| Arquivo | Por que é suspeito? | Risco de Apagar | Como Confirmar |
| :--- | :--- | :--- | :--- |
| `src/components/ui/ConfirmDialog.tsx` | O `App.tsx` e outros usam o `ConfirmModal.tsx`. Este parece ser um duplicata antiga. | **Baixo** | `grep -r "ConfirmDialog" src` |
| `src/components/ui/Toast.tsx` | Referenciado no `PatientList`, mas a lógica de feedback visual parece ter migrado para status chips. | **Médio** (Checar se há toasts de erro) | `grep -r "Toast" src` |
| `src/components/BatchUploadModal.tsx` | Com a inclusão da extração de tabelas via IA direto no `IntakeCard`, este modal de upload de CSV/Excel pode estar obsoleto. | **Alto** | Verificar se há botão de "Upload em Lote" ativo na UI. |

## 🧪 Suspeitos Nível 2: Utilitários Obsoletos

| Arquivo | Por que é suspeito? | Risco de Apagar | Como Confirmar |
| :--- | :--- | :--- | :--- |
| `src/utils/batch-parsers.ts` | Contém lógica para `papaparse` e `xlsx`. Se o projeto agora foca em OCR de tabelas via Gemini, esses parsers manuais são peso morto. | **Médio** | Checar se `BatchUploadModal` ainda é usado. |
| `src/services/patient-service.ts` (L90-142) | Funções de listagem "One-shot" (`listPatients`). O app usa `usePatients` (subscrição em tempo real). | **Baixo** | Verificar se algo além de testes unitários usa `listPatients`. |

## 🧹 Suspeitos Nível 3: Comentários e TODOs

- **`src/hooks/usePersistence.ts`**: Contém referências ao "Fase 3.1" que já foi completada ou é comentário de debug antigo.
- **`src/app/App.tsx`**: Comentários de correção de race condition ("FIX:") que agora estão obsoletos pela nova estrutura do `usePipeline`.

---

## 🚫 Recomedação: NÃO APAGAR AINDA
- **`src/utils/pdf.ts`**: Parece simples, mas é crítico para o pipeline de imagens.
- **`src/styles/components.css`**: Contém muitos estilos globais, apagar módulos dele pode quebrar componentes UI isolados.
