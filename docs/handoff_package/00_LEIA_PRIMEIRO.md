# 📦 Pacote de Handoff para IA Gerente

**Data:** 2026-01-31  
**Projeto:** Radon - Sistema de Laudos Radiológicos com IA  
**Objetivo:** Integrar biblioteca de recomendações baseadas em evidência ao pipeline de laudo

---

## 🎯 Contexto Executivo

### O que é o Radon?
Sistema de IA para gerar laudos radiológicos. Um pipeline de múltiplos agentes processa documentos médicos e gera relatórios estruturados.

### O que foi feito pela "IA das Recomendações"?
Criou uma **biblioteca de recomendações médicas** extraídas de guidelines oficiais (ACR, Fleischner, LI-RADS, PI-RADS, etc.) com:
- 2,923 recomendações
- 431 tabelas estruturadas
- 360 definições de staging (TNM/FIGO)
- 245 cutoffs numéricos
- API de busca pronta

### O que precisa ser feito?
Integrar essa biblioteca no pipeline de laudo, de forma que:
1. A IA consulte recomendações quando encontrar achados relevantes
2. Nunca invente recomendações (só use se vier da biblioteca)
3. Cite a fonte no final do laudo

---

## 📁 Arquivos Incluídos neste Pacote

### Documentação Principal
| Arquivo | Descrição |
|---------|-----------|
| `00_LEIA_PRIMEIRO.md` | Este arquivo |
| `01_PIPELINE_ATUAL.md` | Como o laudo é formado hoje |
| `02_RECOMENDACOES_BIBLIOTECA.md` | O que foi criado pela outra IA |
| `03_ESPECIFICACAO_INTEGRACAO.md` | Regras anti-alucinação e spec completo |
| `04_PERGUNTAS_PENDENTES.md` | Perguntas que precisam de resposta |
| `05_API_USO.md` | Como usar a API de busca |

### Código de Referência
| Arquivo | Descrição |
|---------|-----------|
| `code/query_api.ts` | API de busca de recomendações |
| `code/orchestrator_sample.ts` | Trecho do orchestrator atual |
| `code/impression_guard.ts` | Guard de impressão existente |

### Dados de Exemplo
| Arquivo | Descrição |
|---------|-----------|
| `data/sample_query_results.json` | Exemplo de retorno da API |
| `data/database_schema.sql` | Schema do banco de dados |

---

## ⚠️ Regra Fundamental (CRÍTICO)

> **"Recomendação só entra no laudo se for recuperada da biblioteca + aplicável ao caso"**

### Erros que NUNCA podem acontecer:
- ❌ Inventar guideline, ano ou citação
- ❌ Trocar números (mm, meses, intervalos)
- ❌ Aplicar guideline errado (adulto vs pediátrico)
- ❌ Inferir risco quando não informado

### Comportamento correto:
- ✅ Sem retorno da biblioteca → Sem número no laudo
- ✅ Dado faltante → Condicionar ("depende do perfil de risco")
- ✅ Múltiplas opções → Listar ambas ou preferir mais recente

---

## 📋 Decisões que Você (IA Gerente) Precisa Tomar

1. **Onde inserir o Recommendations Agent no pipeline?**
   - Opção A: Após Findings, antes de Impression
   - Opção B: Dentro do Impression Agent
   - Opção C: Como pós-processamento

2. **Estrutura do ReportJSON**
   - Adicionar campo `recommendations`?
   - Adicionar campo `references`?

3. **Formato de citação no laudo final**
   - Seção separada "REFERÊNCIAS"?
   - Inline com numeração?

4. **Guard de verificação**
   - Implementar duplo verificador?
   - Ou confiar no Impression Guard existente?

---

## 🔗 Próximos Passos

1. Você analisa este pacote
2. Toma as decisões arquiteturais
3. Me passa as especificações
4. Eu (IA das Recs) implemento o Agent compatível
5. Você integra no orchestrator
6. Testamos juntos
