# 💎 OCR Batch Processor - Master UI Specification

> **Version:** 2.1 (Master + Cloning Kit)
> **Status:** Reference / Living Document
> **Scope:** `frontend-ocr-batch-processor` (Standalone & Integrated)
> **Last Updated:** January 2026

## 1. Vision & Design Principles

This specification defines the "Premium Medical AI" aesthetic. The goal is to move away from "developer UI" to a "commercial-grade SaaS" feel.

### Core Principles
1.  **Dark-First & High Contrast:** Optimized for radiology reading rooms (dim lighting).
2.  **Glassmorphism & Depth:** Use of layers, translucency, and blurs to create hierarchy without clutter.
3.  **Amber Energy:** The `Amber-500` accent color provides warmth and energy against the clinical cool grays.
4.  **Micro-Interactions:** Every click, hover, and drag must have immediate visual feedback.
5.  **Information Density:** Showing detailed metadata (DICOM tags, EXIF) without overwhelming the user.

---

## 2. Global Design System (Tokens)

The implementation relies on CSS Variables defined in `src/styles/design-tokens.css` joined with Tailwind CSS.

### 2.1 Color Palette

#### Primary Scale (Accents)
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-accent-primary` | `#f59e0b` | `amber-500` | Primary actions, active states, focus rings |
| `(derived)` | `#d97706` | `amber-600` | Hover states, button gradients (end) |
| `(derived)` | `#fbbf24` | `amber-400` | Highlights, glints |
| `--shadow-glow` | `rgba(245, 158, 11, 0.3)` | - | Element glow effects |

#### Functional Colors
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-accent-secondary` | `#10b981` | `emerald-500` | Success, Completion (100%), Valid files |
| `--color-accent-danger` | `#ef4444` | `red-500` | Errors, Deletions, Critical alerts |
| `(warning)` | `#eab308` | `yellow-500` | Warnings, Non-critical issues |

#### Neutral Scale (Dark Mode)
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-bg-primary` | `#09090b` | `zinc-950` | Main application background |
| `--color-bg-secondary` | `#18181b` | `zinc-900` | Sidebars, Cards, Panels |
| `--color-bg-tertiary` | `#27272a` | `zinc-800` | Hover states, inputs, list items |
| `--color-bg-elevated` | `#3f3f46` | `zinc-700` | Modals, Dropdowns, Tooltips |
| `--color-border-default` | `#27272a` | `zinc-800` | Component borders |
| `--color-text-primary` | `#fafafa` | `zinc-50` | Headings, Main content |
| `--color-text-secondary` | `#a1a1aa` | `zinc-400` | Descriptions, Helpers, Icons |
| `--color-text-muted` | `#71717a` | `zinc-500` | Disabled text, placeholders |

#### Neutral Scale (Light Mode)
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-bg-primary` | `#ffffff` | `white` | Main background |
| `--color-bg-secondary` | `#f4f4f5` | `zinc-100` | Sidebar, Panels |
| `--color-border-default` | `#e4e4e7` | `zinc-200` | Borders |
| `--color-text-primary` | `#18181b` | `zinc-900` | Headings |

### 2.2 Typography

**Font Family:** `Inter (Sans)` for UI, `JetBrains Mono (Mono)` for IDs/Logs.

| Scale Token | Size (rem/px) | Line Height | Weight | Usage |
|-------------|---------------|-------------|--------|-------|
| `text-xs` | 0.75rem / 12px | 1rem | 400/500 | Metadata, Badges, Footer |
| `text-sm` | 0.875rem / 14px | 1.25rem | 400/500 | Body text, List items, Inputs |
| `text-base` | 1rem / 16px | 1.5rem | 500/600 | Buttons, Card Headers |
| `text-lg` | 1.125rem / 18px | 1.75rem | 600 | Modal Titles |
| `text-xl` | 1.25rem / 20px | 1.75rem | 700 | Section Headers |

### 2.3 Visual Effects & Depth

#### Glassmorphism
Used on sticky headers and floating overlays.
- **Class:** `.glass`
- **Specs:** `bg-opacity: 5%`, `blur: 12px`, `border: 1px solid rgba(255,255,255,0.1)`

#### Shadows
- **sm:** `shadow-sm` (Cards, Inputs)
- **lg:** `shadow-lg` (Dropdowns, Hover states)
- **glow:** `0 0 20px rgba(245, 158, 11, 0.3)` (Focused inputs, Primary buttons)

#### Border Radius
- **sm:** `0.375rem` (Badges)
- **md:** `0.5rem` (Inputs, Buttons)
- **lg:** `0.75rem` (Cards, Modals)
- **xl:** `1rem` (Large panels)

---

## 3. Component Specifications

### 3.1 Button Component
Located in: `components/ui/Button.tsx`

**Variants:**
1.  **Primary**:
    -   **Bg:** `linear-gradient(135deg, amber-500, amber-600)`
    -   **Text:** `white`
    -   **Shadow:** `shadow-lg shadow-amber-500/20`
    -   **Hover:** Lift -2px, brighten gradient.
    -   **Active:** Scale 0.98.
2.  **Secondary**:
    -   **Bg:** `zinc-800` (Dark), `zinc-100` (Light)
    -   **Text:** `zinc-100` (Dark), `zinc-900` (Light)
    -   **Border:** `1px solid zinc-700/200`
3.  **Ghost**:
    -   **Bg:** Transparent
    -   **Hover:** `zinc-800/50`
4.  **Danger**:
    -   **Bg:** `linear-gradient(red-500, red-600)`

**Loading State:**
-   Replaces icon with `Loader2` (animate-spin).
-   Opacity locked to 100% (not faded), but cursor `not-allowed`.

### 3.2 Upload Area
Located in: `components/UploadArea.tsx`

**Dimensions:** Fixed height `9rem` (144px).

**States:**
1.  **Idle**:
    -   **Border:** `2px dashed zinc-700` (Dark), `zinc-300` (Light).
    -   **Bg:** Transparent.
    -   **Icon:** `Upload` (Gray).
2.  **Dragging (Hover)**:
    -   **Border:** `amber-500`.
    -   **Bg:** `amber-500/10` (Dark), `amber-50` (Light).
    -   **Icon:** `Upload` turns `amber-500` + Scale 1.1 + Rotate 3deg.
    -   **Animation:** Corner `Plus` icon appears/pulses.
3.  **Reading/Processing**:
    -   **Content:** Replaced by `Loader2` + "Reading files...".
    -   **Cursor:** Wait.

### 3.3 Progress Bar
Located in: `components/ui/ProgressBar.tsx`

**Anatomy:**
-   **Track:** `h-2` rounded-full `bg-zinc-800`.
-   **Indicator:** `h-full` rounded-full `bg-amber-500` (or variants).
-   **Effect:** `animate-shimmer` overlay (linear-gradient transparent -> white/10% -> transparent) moving infinitely.

---

## 4. Complex Layouts & Interactions

### 4.1 Sidebar Layout
Located in: `components/Sidebar.tsx`

**Specs:**
-   **Width:** `16rem` (256px) Expanded, `4rem` (64px) Collapsed.
-   **Transition:** `duration-300 ease-out`.
-   **Sticky:** `top-14` (Below header).
-   **Border:** Right border `1px solid zinc-800`.

**Session Item (List):**
-   **Container:** `rounded-xl p-3`.
-   **Active State:** `bg-gradient-to-r from-zinc-800 to-zinc-800/50`, `border-zinc-700`.
-   **Stats:** Tiny progress bar inside item.
-   **Mini Mode:** Shows only a square box with initial letter or status icon.

### 4.2 Main File List (Virtual List Concept)
Located in: `components/FileList.tsx`

**Item Anatomy:**
```text
[Icon] [Filename ............] [Size] [Status Badge] [Actions]
```
-   **Hover:** `bg-zinc-800/50` (Dark).
-   **Selection:**
    -   Currently: Highlighted background.
    -   **Wishlist:** Checkmark circle on left.
-   **Status Badges:**
    -   *Pending:* Gray dot.
    -   *Processing:* Amber Spinner.
    -   *Completed:* Emerald Check.
    -   *Error:* Red X.

---

## 5. Animations & Motion Design

All animations defined in `src/styles/animations.css`.

| Name | Duration | Curve | Usage |
|------|----------|-------|-------|
| `fade-in` | 200ms | `ease-out` | Page loads, tab switches |
| `fade-in-up` | 300ms | `ease-out` | Content cards entering |
| `scale-in` | 200ms | `spring` | Modals, Tooltips |
| `hover-lift` | 150ms | `ease` | Buttons, Cards |

**Reduced Motion:**
-   `@media (prefers-reduced-motion: reduce)` sets all durations to `0ms`.

---

## 6. Accessibility (A11y) Standards

1.  **Focus Management:**
    -   All interactive elements must have `.focus-ring` class: `outline-offset-2 outline-amber-500`.
2.  **Color Contrast:**
    -   Text on Amber buttons is White (High contrast).
    -   Muted text (`zinc-500`) must be at least 4.5:1 against black background.
3.  **Keyboard Nav:**
    -   `Tab` to navigate inputs.
    -   `Enter` to confirm/open.
    -   `Esc` to close Modals.
    -   Global Hotkeys: `Ctrl+Enter` (Run), `Ctrl+N` (New), `Ctrl+S` (Save).

---

## 7. Future UI/UX Roadmap (Detailed)

*These are specific design specifications for requested features.*

### 7.1 Selection Indicators (Checkmarks)
-   **Design:** Add a 20px x 20px clickable area to the left of the file icon.
-   **State - Unselected:** `border-2 border-zinc-600 rounded-md bg-transparent`.
-   **State - Hover:** `border-zinc-400`.
-   **State - Selected:** `bg-amber-500 border-amber-500 text-white` with a `Check` icon (12px).
-   **Interaction:** Clicking row selects file (single). Clicking Checkmark toggles selection (multi available).

### 7.2 Micro-Thumbnails
-   **Problem:** Generic icons don't identify scans.
-   **Solution:** Replace `FileText` icon with actual image.
-   **Spec:** `w-10 h-10` (40px) square, `object-cover`, `rounded-md`.
-   **Loading:** Gray skeleton while generating.
-   **DICOM:** Render middle frame of series.

### 7.3 Drag-Select (Marquee)
-   **Visual:** `border-1px border-amber-500 bg-amber-500/20`.
-   **Behavior:**
    -   On `mousedown` (if not on item): Start coordinate.
    -   On `mousemove`: Update dimensions.
    -   On `mouseup`: Calculate intersection with list items -> Set `selected=true`.

### 7.4 Double-Click Preview
-   **Trigger:** Double click anywhere on a list row.
-   **Action:** Opens `ImageViewer` modal directly.
-   **Transition:** `zoom-in` from the clicked row position.

---

## 9. Kit de Clonagem (Copy-Paste Implementation)

> **Use this section to replicate the exact look & feel in another project.**

### 9.1 Tailwind Configuration (`tailwind.config.js`)
If you are using a standard Vite/Next.js setup (not CDN), use this config to map the theme keys.

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Crucial for manual theme toggling
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic variable mapping
        amber: {
          50:  'rgba(var(--color-accent-rgb), 0.05)',
          100: 'rgba(var(--color-accent-rgb), 0.1)',
          200: 'rgba(var(--color-accent-rgb), 0.2)',
          300: 'rgba(var(--color-accent-rgb), 0.3)',
          400: 'rgba(var(--color-accent-rgb), 0.4)',
          500: 'var(--color-accent-primary)',   // Main Action
          600: 'var(--color-accent-secondary)', // Hover
          700: 'var(--color-accent-secondary)',
          800: 'var(--color-accent-primary)',
          900: 'var(--color-accent-primary)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

### 9.2 Fonts (`index.html`)
Add this to your `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 9.3 Global CSS Tokens (`design-tokens.css`)
Create `src/styles/design-tokens.css` with this EXACT content:

```css
:root {
  /* Colors - Default Theme (Amber) */
  --color-bg-primary: #09090b;
  --color-bg-secondary: #18181b;
  --color-bg-tertiary: #27272a;
  --color-bg-elevated: #3f3f46;

  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;

  --color-border-default: #27272a;
  --color-border-subtle: #3f3f46;

  --color-accent-primary: #f59e0b;
  --color-accent-rgb: 245, 158, 11;
  --color-accent-secondary: #10b981;
  --color-accent-danger: #ef4444;

  /* Spacing Scale (4px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Light Mode Overrides */
:root.light {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f4f4f5;
  --color-bg-tertiary: #e4e4e7;
  --color-bg-elevated: #fafafa;
  
  --color-text-primary: #18181b;
  --color-text-secondary: #52525b;
  --color-text-muted: #71717a;
  
  --color-border-default: #e4e4e7;
  --color-border-subtle: #d4d4d8;
}

/* Theme Variant: Ocean */
[data-theme="ocean"] {
  --color-accent-primary: #0ea5e9;
  --color-accent-rgb: 14, 165, 233;
  --color-accent-secondary: #06b6d4;
}

/* Theme Variant: Forest */
[data-theme="forest"] {
  --color-accent-primary: #22c55e;
  --color-accent-rgb: 34, 197, 94;
  --color-accent-secondary: #16a34a;
}
```

### 9.4 Animations (`animations.css`)
Create `src/styles/animations.css`:

```css
@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

@keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-shimmer {
    animation: shimmer 2s infinite;
}

.animate-fade-in-up {
    animation: fade-in-up 300ms ease-out;
}

.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

> This document is the absolute source of truth for UI/UX development. Any deviation must be approved by the design lead (or User).
