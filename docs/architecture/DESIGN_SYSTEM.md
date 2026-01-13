
# Design System

A interface utiliza um sistema de design proprietário baseado em tokens CSS e variáveis globais, sem frameworks utilitários como Tailwind. O foco é uma interface profissional, de alta densidade de informação e com tema escuro para ambientes de radiologia (salas escuras).

## Design Tokens (`src/styles/design-tokens.css`)

### Cores
A paleta é construída sobre tons de cinza neutro (Zinc/Slate) com um acento principal Âmbar/Laranja.

*   **Backgrounds:**
    *   `--bg-app`: `#09090b` (Fundo absoluto)
    *   `--bg-surface`: `#18181b` (Cartões)
    *   `--bg-surface-elevated`: `#27272a` (Modais, hovers)
*   **Accent (Amber):**
    *   `--accent-primary`: `#f59e0b` (Ações principais, foco)
    *   `--accent-glow`: `rgba(245, 158, 11, 0.3)` (Efeitos de luz)
*   **Status:**
    *   `--status-success`: `#10b981` (Verde)
    *   `--status-warning`: `#f59e0b` (Laranja)
    *   `--status-error`: `#ef4444` (Vermelho)
    *   `--status-info`: `#3b82f6` (Azul)
    *   `--status-auto`: `#a855f7` (Roxo - Usado para ações da IA)

### Tipografia
*   **Sans:** 'Inter' (Interface geral).
*   **Mono:** 'JetBrains Mono' (Dados técnicos, OS, Texto OCR Verbatim).

## Componentes UI Base

### Glassmorphism
Usamos classes utilitárias para criar profundidade sem sombras pesadas.
```css
.glass {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
}
```

### Cards (`src/components/ui/Card.tsx`)
O bloco de construção fundamental. Suporta efeitos de hover e bordas sutis.

### Buttons (`src/components/ui/Button.tsx`)
Variantes: `primary` (Gradient), `secondary` (Outline/Glass), `danger`.

### Chips (`src/components/ClassificationChip.tsx`)
Pílulas de status coloridas. Inclui lógica para exibir o ícone "Auto" (Bot) quando a classificação foi inferida por heurística ou IA.

## Layouts

### App Shell
Layout de aplicação desktop com sidebar fixa à esquerda (`72px`) e área de conteúdo rolável.
*   **Sidebar:** Navegação entre contextos (Lista vs Workspace).
*   **Main:** Grid responsivo que se adapta a monitores largos (comum em radiologia).

### Documents Gallery
Grid responsivo (`repeat(auto-fill, minmax(110px, 1fr))`) para exibir miniaturas de documentos.
