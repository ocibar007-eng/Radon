# 📚 Repositório PROMPTS

> **Prompts e referências para laudos de radiologia**

---

## 📁 Estrutura

```
PROMPTS/
├── 📂 USG/                      # Ultrassonografia
│   ├── ABDOME/                  # USG abdominal
│   ├── PELVE/                   # USG pélvico
│   ├── DOPPLER/                 # Estudos Doppler
│   ├── OBSTETRICO/              # USG obstétrico
│   └── PARTES_MOLES/            # Partes moles, tireoide
│
├── 📂 TC/                       # Tomografia Computadorizada
│
├── 📂 RM/                       # Ressonância Magnética
│
├── 📂 REFERENCIAS/              # Referências e valores normais
│   ├── BIOMETRIA/               # Manual de biometria completo
│   ├── PEDIATRIA/               # Valores pediátricos
│   └── CALCULOS/                # Fórmulas e cálculos
│
├── 📂 INSTRUCOES/               # Instruções de uso dos prompts
│
├── 📂 ARCHIVE/                  # Versões antigas e backups
│
└── 📂 .agent/                   # Scripts e workflows de automação
    ├── workflows/               # Instruções para agentes AI
    └── scripts/                 # Scripts Python
```

---

## 🚀 Uso Rápido

### Para gerar laudos de USG Abdome:
1. Use `INSTRUCOES/INSTRUCAO_PROJETO.md` como system prompt
2. Anexe `REFERENCIAS/PEDIATRIA/USG_ABD_TOTAL_RUNTIME.md` para execução

### Referências de valores normais:
- **Biometria adulto**: `REFERENCIAS/BIOMETRIA/`
- **Pediatria**: `REFERENCIAS/PEDIATRIA/`

---

## 📋 Convenção de Nomenclatura

```
[MODALIDADE]_[REGIAO]_[TIPO].md

Exemplos:
- USG_ABDOME_TEMPLATE.md
- DOPPLER_RENAL_VALORES.md
- TC_TORAX_PROTOCOLO.md
```

**Regras:**
- ✅ CAIXA_ALTA_COM_UNDERSCORES
- ✅ Sem espaços
- ✅ Extensão `.md` (Markdown)
- ❌ Sem acentos ou caracteres especiais

---

## 🔧 Manutenção

### Reorganizar repositório:
```bash
python .agent/scripts/reorganizar_repo.py --dry-run   # Simular
python .agent/scripts/reorganizar_repo.py --execute   # Executar
```

### Workflows disponíveis:
- `/repo-organizer` - Reorganização completa

---

*Última reorganização: 2026-01-09*
