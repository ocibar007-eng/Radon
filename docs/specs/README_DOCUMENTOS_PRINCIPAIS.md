# DOCUMENTOS PRINCIPAIS — Sistema Multi-Agente Radon V3

**Data:** 20 de Janeiro de 2026
**Status:** PRONTO PARA EXECUÇÃO

---

> ⭐ **PRIMEIRA VEZ AQUI?** Leia [`COMECE_AQUI.md`](./COMECE_AQUI.md) primeiro (2 minutos de leitura).

---

## OS DOIS DOCUMENTOS QUE VOCÊ DEVE SEGUIR

Este projeto possui extensa documentação. Para não se perder, **foque nestes dois documentos**:

### 1️⃣ GUIA PRÁTICO DE EXECUÇÃO ⭐

**Arquivo:** [`GUIA_PRATICO_EXECUCAO.md`](./GUIA_PRATICO_EXECUCAO.md)

**Para quem:** Desenvolvedor executando a implementação

**O que é:** Checklist passo-a-passo com comandos prontos para copiar e colar. Blocos sequenciais de 1 a 10.

**Como usar:**
```bash
# Abra o arquivo
open docs/specs/GUIA_PRATICO_EXECUCAO.md

# Siga em ordem, marcando os checkboxes conforme completa
# NÃO pule blocos
# Quando travar, volte para o último checkpoint
```

**Estrutura:**
- **BLOCO 1:** Setup inicial (estrutura de pastas, SQLite, branch)
- **BLOCO 2:** Calculator Python (fórmulas, API, testes)
- **BLOCO 3:** Schemas TypeScript (tipos, Zod, cliente Calculator)
- **BLOCO 4:** QA Determinístico (banlist, blacklist)
- **BLOCO 5:** Golden Set v1 (10 casos de teste)
- **BLOCO 6:** Sandbox Streamlit (UI para radiologista)
- **BLOCO 7-10:** Agentes, rendering, orchestrator (próxima fase)

**Quando usar:** Todos os dias durante a implementação. É o seu mapa do dia a dia.

---

### 2️⃣ PLANO CONSOLIDADO (REFERÊNCIA) 📚

**Arquivo:** [`PLANO_CONSOLIDADO_MULTIAGENTE_V1.md`](./PLANO_CONSOLIDADO_MULTIAGENTE_V1.md)

**Para quem:** Radiologista (visão geral) + Desenvolvedor (referência técnica)

**O que é:** Documento consolidado com arquitetura, roadmap simplificado, e regras de negócio aprovadas.

**Como usar:**
```bash
# Consultar quando tiver dúvidas sobre:
# - Por que usar Node.js e não Python?
# - Qual é a ordem das seções do laudo?
# - O que é S1/S2/S3?
# - Quais fórmulas implementar?
# - O que NÃO fazer agora?
```

**Estrutura:**
- **RESUMO EXECUTIVO:** O que eu (radiologista) faço vs o que o sistema faz
- **PARTE A:** Arquitetura aprovada (6 camadas)
- **PARTE B:** ADENDO V2 (robustez, feedback loop, schema SQLite)
- **PARTE C:** Roadmap simplificado (MVP → Estabilização → Contínua)
- **Checklists:** 30 itens de implementação + 10 de operação
- **O que NÃO fazer agora:** Evitar scope creep

**Quando usar:** Como referência quando estiver implementando algo e precisar entender o "porquê" ou o contexto.

---

## COMPARAÇÃO RÁPIDA

| Aspecto | GUIA_PRATICO_EXECUCAO.md | PLANO_CONSOLIDADO_MULTIAGENTE_V1.md |
|---------|--------------------------|-------------------------------------|
| **Tipo** | Checklist operacional | Documentação de referência |
| **Foco** | Como fazer (HOW) | O que e por quê (WHAT/WHY) |
| **Uso** | Diário, sequencial | Consulta quando necessário |
| **Formato** | Blocos + comandos bash/python | Arquitetura + decisões técnicas |
| **Atualização** | Marcar checkboxes conforme avança | Não precisa mexer (referência fixa) |

---

## FLUXO DE TRABALHO RECOMENDADO

### Segunda de manhã (início de sprint)
1. Abrir `GUIA_PRATICO_EXECUCAO.md`
2. Ver qual bloco estou (ex: BLOCO 2 - Calculator Python)
3. Seguir os passos do bloco, marcando checkboxes

### Durante o dia (dúvidas)
1. Consultar `PLANO_CONSOLIDADO_MULTIAGENTE_V1.md`
2. Exemplo: "Quais são as 18 fórmulas?" → Buscar "Pilar 1" ou "Calculator"

### Sexta à tarde (revisão)
1. Ver quantos blocos completei esta semana
2. Atualizar status no `GUIA_PRATICO_EXECUCAO.md`
3. Se travou em algo, anotar bloqueio com ⚠️

---

## OUTROS DOCUMENTOS (NÃO PRECISA LER AGORA)

Estes documentos foram consolidados nos dois acima. Consulte apenas se precisar de detalhes históricos:

- [`PLANO_ARQUITETURA_MULTI_AGENTE_RADIOLOGIA.md`](./PLANO_ARQUITETURA_MULTI_AGENTE_RADIOLOGIA.md) (1550 linhas)
  - Versão detalhada da arquitetura
  - Inclui lições aprendidas Radon V3
  - Referência para casos complexos

- [`PLANO_EXECUCAO_DETALHADO_V1.md`](./PLANO_EXECUCAO_DETALHADO_V1.md) (560 linhas)
  - Versão original do plano de execução (12 sprints)
  - Foi simplificado para o GUIA_PRATICO_EXECUCAO.md

- [`MASTER_BUNDLE_MULTIAGENTE_RADIOLOGIA/`](./MASTER_BUNDLE_MULTIAGENTE_RADIOLOGIA/)
  - Bundle completo para enviar a outra IA
  - Contém ADENDO V2, prompts, testes

---

## QUICK START (HOJE)

Se você está lendo isso pela primeira vez, faça:

```bash
# 1. Abra o guia prático
open docs/specs/GUIA_PRATICO_EXECUCAO.md

# 2. Comece pelo BLOCO 1
git checkout -b feature/multi-agent-v3

# 3. Siga os comandos do bloco
# 4. Marque os checkboxes conforme completa
# 5. Quando terminar o bloco, vá para o próximo
```

**Não tente ler tudo de uma vez.** Foque nos dois documentos principais.

---

## PERGUNTAS FREQUENTES

### "Qual documento abro primeiro?"
`GUIA_PRATICO_EXECUCAO.md` — é o seu checklist do dia a dia.

### "Onde está a lista de fórmulas?"
`PLANO_CONSOLIDADO_MULTIAGENTE_V1.md` — busque por "Calculator" ou "fórmulas".

### "Como sei se terminei o MVP?"
`GUIA_PRATICO_EXECUCAO.md` — no final de cada bloco tem "Critérios de Conclusão".

### "O que fazer se travar?"
1. Anotar bloqueio com ⚠️ no guia
2. Consultar `PLANO_CONSOLIDADO_MULTIAGENTE_V1.md` para contexto
3. Se persistir, abrir issue ou pedir ajuda

### "Posso pular blocos?"
**NÃO.** Os blocos são sequenciais. Calculator (BLOCO 2) precisa existir antes dos agentes (BLOCO 7).

### "Quantos blocos por semana devo fazer?"
**MVP (4 semanas):** 1-2 blocos por semana.
- Semana 1: Blocos 1-2 (Setup + Calculator)
- Semana 2: Blocos 3-4 (TypeScript + QA)
- Semana 3: Blocos 5-6 (Golden Set + Sandbox)
- Semana 4: Blocos 7-8 (Agentes Core)

---

## VERSIONAMENTO DESTES DOCUMENTOS

| Documento | Versão | Última atualização |
|-----------|--------|-------------------|
| GUIA_PRATICO_EXECUCAO.md | 1.0 | 2026-01-20 |
| PLANO_CONSOLIDADO_MULTIAGENTE_V1.md | 1.0 | 2026-01-20 |
| README_DOCUMENTOS_PRINCIPAIS.md | 1.0 | 2026-01-20 |

Se houver mudanças significativas (novos blocos, arquitetura alterada), atualizar versão.

---

**RESUMO: Siga o GUIA_PRATICO_EXECUCAO.md no dia a dia, consulte o PLANO_CONSOLIDADO quando tiver dúvidas.**
