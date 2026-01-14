# 📁 PR-ORG5: Mover hooks/ + core/ → src/

**Data:** 06/01/2026  
**Tipo:** Repository Organization  
**Risco:** ⭐⭐ BAIXO  
**Status:** ✅ CONCLUÍDO E VALIDADO

---

## 📋 Sumário
Moveu `hooks/` (~10 arquivos) e `core/` (~6 arquivos) para `src/`, consolidando toda lógica de negócio em um único diretório.

## 📊 Estatísticas
| Métrica | Valor |
|---------|-------|
| Diretórios movidos | 2 (hooks/, core/) |
| Arquivos movidos | ~16 |
| Imports atualizados | ~30 |
| Testes | 21/21 ✅ |
| Build | ✅ 1.46s |

## 🔍 Mudanças

### 1. Movimentação
```bash
mv hooks/ src/
mv core/ src/
```

### 2. App.tsx
```diff
- from '../hooks/useStats'
- from '../core/sorting'
+ from './hooks/useStats'
+ from './core/sorting'
```

### 3. Components (src/components/)
```diff
- from '../../hooks/useTheme'
- from '../../core/history'
+ from '../hooks/useTheme'
+ from '../core/history'
```

### 4. Hooks/Core Internos
```diff
- from '../src/types'
- from '../src/adapters/'
- from '../utils/'
+ from '../types'
+ from '../adapters/'
+ from '../../utils/'
```

### 5. Tests
```diff
- from '../../core/sorting'
- from '../../hooks/useSessionManager'
+ from '../../src/core/sorting'
+ from '../../src/hooks/useSessionManager'
```

## ✅ Validação
### Testes: 21/21 ✅
### Build: ✅ 1.46s

## 🎯 Resultado
- ✅ Lógica de negócio consolidada em src/
- ✅ Imports simplificados (App.tsx e components/)
- ✅ Pronto para PR-Org6 (utils/ + styles/)

**Risco:** ⭐⭐ BAIXO
