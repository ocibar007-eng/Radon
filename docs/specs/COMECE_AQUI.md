# ⭐ COMECE AQUI — Radon V3 Multi-Agente

**Data:** 20 de Janeiro de 2026

---

## 🎯 VOCÊ ESTÁ PRONTO PARA COMEÇAR

Todo o planejamento está completo. Agora é hora de **executar**.

---

## 📋 OS ÚNICOS 2 ARQUIVOS QUE VOCÊ PRECISA

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1️⃣  GUIA_PRATICO_EXECUCAO.md                              │
│      ↓                                                      │
│      Seu checklist diário                                  │
│      Siga bloco por bloco, marque os checkboxes           │
│      COMECE AQUI HOJE                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  2️⃣  PLANO_CONSOLIDADO_MULTIAGENTE_V1.md                   │
│      ↓                                                      │
│      Sua referência técnica                                │
│      Consulte quando tiver dúvidas                         │
│      (arquitetura, decisões, o que NÃO fazer)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 PRIMEIRO COMANDO (AGORA)

```bash
# Abra o guia e comece
open docs/specs/GUIA_PRATICO_EXECUCAO.md

# OU no terminal
cat docs/specs/GUIA_PRATICO_EXECUCAO.md
```

---

## 📊 ROADMAP VISUAL

```
MVP (4 semanas)
════════════════

Semana 1 │ Semana 2 │ Semana 3 │ Semana 4
─────────┼──────────┼──────────┼──────────
Bloco 1  │ Bloco 3  │ Bloco 5  │ Bloco 7
Bloco 2  │ Bloco 4  │ Bloco 6  │ Bloco 8
         │          │          │ Bloco 9
         │          │          │ Bloco 10

Setup    │ TS+QA    │ Testes+  │ Agentes+
Calculator│          │ UI       │ E2E
```

---

## ✅ CRITÉRIO DE SUCESSO DO MVP

Ao final de 4 semanas, você terá:

- [ ] Calculator Python rodando (18 fórmulas testadas)
- [ ] QA Determinístico bloqueando 100% dos termos proibidos
- [ ] Golden Set com 10 casos passando 100%
- [ ] Sandbox Streamlit operável por radiologista (1 comando)
- [ ] Pipeline E2E: input → agentes → cálculos → QA → output
- [ ] Zero meta-texto no output
- [ ] Sistema classificando risco (S1/S2/S3)

---

## 🧭 SE TIVER DÚVIDAS

| Pergunta | Resposta |
|----------|----------|
| Por onde começo? | GUIA_PRATICO_EXECUCAO.md, BLOCO 1 |
| Qual Python/Node usar? | Python 3.11+, Node 18+ |
| Posso pular blocos? | NÃO. São sequenciais. |
| Quanto tempo por bloco? | 2-3 dias em média |
| E se travar? | Anotar bloqueio ⚠️, consultar PLANO_CONSOLIDADO |
| Onde estão as fórmulas? | GUIA_PRATICO_EXECUCAO.md, BLOCO 2 |
| Onde roda o Sandbox? | `./scripts/run_sandbox.sh` |
| Como exportar métricas? | `./scripts/export_metrics_csv.sh` |

---

## 📁 ESTRUTURA DE PASTAS (será criada no BLOCO 1)

```
radon-lite/
├── src/
│   ├── core/reportGeneration/
│   │   ├── agents/           ← Agentes especializados
│   │   ├── qa/               ← QA determinístico + LLM
│   │   └── orchestrator.ts   ← Pipeline completo
│   ├── services/
│   │   └── calculator-client.ts
│   ├── types/
│   │   ├── report-json.ts
│   │   └── compute-request.ts
│   └── utils/
│       ├── banlist.ts
│       └── blacklist.ts
├── services/
│   └── calculator/           ← Python FastAPI
│       ├── main.py
│       ├── formulas.py
│       └── tests/
├── tools/
│   └── sandbox/              ← Streamlit UI
│       └── app.py
├── scripts/                  ← Comandos úteis
│   ├── run_sandbox.sh
│   ├── run_golden_tests.sh
│   └── export_metrics_csv.sh
├── data/
│   ├── metrics.sqlite        ← Logs automáticos
│   └── cases/
└── tests/
    └── golden-set/           ← 10 casos de teste
```

---

## 🔥 COMANDOS MAIS USADOS

```bash
# Rodar Calculator
cd services/calculator && source venv/bin/activate && uvicorn main:app --reload --port 8081

# Rodar Sandbox
./scripts/run_sandbox.sh

# Rodar Golden Tests
./scripts/run_golden_tests.sh

# Exportar métricas
./scripts/export_metrics_csv.sh

# Checar saúde do Calculator
curl http://localhost:8081/health
```

---

## 🎓 PRINCÍPIOS DO PROJETO

1. **LLM nunca calcula** → sempre via Calculator Python
2. **Zero meta-texto** → banlist bloqueia "conforme áudio", "neste laudo", etc.
3. **Dado faltante = `<VERIFICAR>`** → nunca inventar
4. **MAX_ATTEMPTS = 2** → depois vai para fila S1 (humano)
5. **Golden Set é lei** → mudanças não podem quebrar os testes
6. **Operável por radiologista** → 1 comando, sem DevOps

---

## 🚨 O QUE NÃO FAZER AGORA

- ❌ Fine-tuning (caro, precisa 200+ casos)
- ❌ Dashboard React (Streamlit resolve)
- ❌ PostgreSQL (SQLite resolve)
- ❌ Kubernetes (overkill para MVP)
- ❌ Integração RIS/PACS (depois da estabilização)

Foco: **MVP funcional em 4 semanas**.

---

## 📞 PRECISA DE AJUDA?

1. Consulte `PLANO_CONSOLIDADO_MULTIAGENTE_V1.md`
2. Veja `README_DOCUMENTOS_PRINCIPAIS.md` para contexto
3. Abra issue ou peça suporte técnico

---

## ▶️ AÇÃO IMEDIATA

```bash
# 1. Abra o guia prático
open docs/specs/GUIA_PRATICO_EXECUCAO.md

# 2. Execute o primeiro comando do BLOCO 1
git checkout -b feature/multi-agent-v3

# 3. Continue seguindo o guia
```

---

**Você está pronto. Comece agora. 🚀**
