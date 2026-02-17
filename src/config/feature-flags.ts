/**
 * Feature Flags — Controle centralizado de features novas.
 * Toda feature nova entra atrás de flag e só liga após validação E2E.
 */
export const FEATURE_FLAGS = {
    /** Aba "Pré-Laudo IA" no workspace */
    aiDraftTab: true,
} as const;
