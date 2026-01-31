# Especificação de Integração: Sistema de Recomendações Radon

**Data:** 2026-01-31  
**Status:** 📋 Especificação Aprovada  
**Objetivo:** Integrar biblioteca de recomendações no pipeline de laudo SEM alucinação

---

## 🛡️ Regra-Mãe

> **"Recomendação só entra se for recuperada + aplicável"**

### Erros que NUNCA podem acontecer:
- ❌ Aplicar guideline errado (adulto vs pediátrico, imunossuprimido, risco alto/baixo)
- ❌ Trocar intervalo/threshold (mm, volume, categorias)
- ❌ "Completar" recomendação quando texto não veio completo
- ❌ Inventar citação ou ano

### Guardrails Obrigatórios:
1. IA **não pode** escrever recomendação se não houver retorno da biblioteca
2. IA **não pode** "ajustar" números (se quiser adaptar, tem que estar explícito no retorno)
3. Se faltar dado para aplicar (ex.: risco tabágico):
   - Pedir a variável (se fluxo permitir), OU
   - Versão "incerta": "Conforme diretriz X, a conduta depende do perfil de risco"

---

## 📦 Estrutura do Retorno da API

A ponte deve retornar **dados estruturados**, não só texto:

```typescript
interface RecommendationResult {
  guideline_id: string;           // ex: "FLEISCHNER_2017"
  finding_type: string;           // ex: "pulmonary_nodule_solid"
  applicability: {
    age_group: "adult" | "pediatric";
    immunosuppressed: boolean;
    oncologic_context: boolean;
    // outros critérios...
  };
  inputs_required: string[];      // ex: ["size_mm", "risk_category", "count"]
  recommendation_text: string;    // texto pronto para uso
  numerical_rules: {
    thresholds: Record<string, number>;
    intervals: Record<string, string>;
  };
  citation: string;               // formato final pronto
  evidence_grade?: string;        // força da evidência
  version_date: string;
}
```

**Por que estruturado?** A IA deixa de "fazer medicina" e passa a "preencher lacunas" e verificar aplicabilidade.

---

## 🔄 Workflow do Agente (4 Passos)

### Passo A — Normalizar o Achado

Extrair e padronizar:
- **Tipo:** nódulo pulmonar, lesão hepática, cisto renal
- **Medidas:** mm/cm, maior diâmetro, volume se aplicável
- **Contexto:** idade, tabagismo, imunossupressão, oncologia, incidental vs sintomático
- **Características:** único/múltiplo, sólido/subsólido, localização

### Passo B — Consultar Biblioteca (Query Parametrizada)

Em vez de texto livre, enviar:
```json
{
  "finding_type": "pulmonary_nodule",
  "morphology": "solid",
  "size_mm": 8,
  "count": "single",
  "patient_age": 55,
  "risk_category": "low",
  "context": "incidental",
  "constraints": ["adult", "non-immunosuppressed"]
}
```

### Passo C — Validar Aplicabilidade

Se critérios não batem:
1. Escolher outra recomendação retornada (top-2/3), OU
2. Dizer "não aplicável" (ou "avaliar clinicamente", se vier da biblioteca)

### Passo D — Inserir Recomendação + Referência

- Recomendação entra na Impressão/Conclusão
- Citações: **somente na seção REFERÊNCIAS** (nunca no meio do texto)

---

## 📝 Prompt Mestre para o Radon

```
## REGRAS OBRIGATÓRIAS PARA RECOMENDAÇÕES

1. Você DEVE consultar a biblioteca de recomendações para achados relevantes.
2. Só inclua recomendações que forem RETORNADAS pela biblioteca.
3. NUNCA invente guideline, ano, thresholds, intervalos ou citações.
4. Antes de aplicar, VERIFIQUE critérios de aplicabilidade.
5. Se faltar dado crítico (ex.: risco baixo vs alto):
   - Declare a dependência do dado
   - Apresente as opções conforme a diretriz
6. Citações: acumule e liste ao final na seção "REFERÊNCIAS", numeradas.
7. Se nenhuma recomendação aplicável for encontrada:
   - NÃO crie uma
   - Use: "considerar seguimento conforme diretrizes institucionais"
   - SEM números

## Mini-Checklist por Achado (interno)
Para cada achado que possa gerar conduta:
□ Classificar achado em taxonomia
□ Extrair variáveis obrigatórias
□ Chamar biblioteca com variáveis
□ Checar aplicabilidade
□ Escrever recomendação EXATAMENTE como retornada
□ Registrar referência para seção final
```

---

## 🚫 Regras Anti-Alucinação (Políticas Duras)

| Regra | Comportamento |
|-------|---------------|
| Sem retorno da biblioteca | → Sem número no laudo |
| Retorno mas falta variável obrigatória | → Sem escolha arbitrária, condicionar |
| Múltiplas diretrizes divergentes | → Preferir mais recente OU listar 2 opções |
| Risco não informado | → É "desconhecido", nunca inferir |
| Conversão de unidade | → Só determinística (0.8cm = 8mm OK), logar |

---

## 📄 Formato de Saída no Laudo

### Na Conclusão:
```
**Recomendação baseada em diretrizes:** [texto exato da biblioteca]

*Aplicabilidade:* Adultos, achado incidental, sem imunossupressão.
```

### No Final:
```
## REFERÊNCIAS

1. [citação formatada exatamente como veio da biblioteca]
2. ...
```

---

## ✅ Critérios de Aceitação (Testes)

### Obrigatórios (0% tolerância):
- [ ] 0% citações inventadas
- [ ] 0% números inventados
- [ ] Aplicabilidade correta (imunossuprimido → não aplica Fleischner)
- [ ] Consistência de unidade
- [ ] Dados faltantes → condicionar, não escolher

### Desejáveis:
- [ ] Cobertura ≥X% para achados clássicos

---

## 🧪 Suite de Testes Mínima (12 Casos)

| # | Cenário | Verificar |
|---|---------|-----------|
| 1 | Nódulo sólido 5mm, adulto, baixo risco | Recomendação correta |
| 2 | Nódulo sólido 8mm, adulto, baixo risco | Intervalo correto |
| 3 | Nódulo 8mm, risco desconhecido | Condiciona risco |
| 4 | Nódulo subsólido | Diretriz diferente |
| 5 | Múltiplos nódulos pequenos | Regra de multiplicidade |
| 6 | Paciente imunossuprimido | Bloqueia Fleischner |
| 7 | Lesão hepática LI-RADS completo | Aplica corretamente |
| 8 | Lesão hepática dados incompletos | Condiciona |
| 9 | PI-RADS cenário típico | Aplica corretamente |
| 10 | Achado não coberto | NÃO inventa |
| 11 | Guideline duplicada | Escolhe preferred/latest |
| 12 | Unidade em cm | Converte corretamente |

---

## 🔍 Verificador Duplo (Opcional, Alta Segurança)

```
1. Gerador escreve recomendação
2. Verificador recebe:
   - Recomendação final
   - Payload da biblioteca usado
3. Verificador responde: PASS ou FAIL + motivo
   Ex: "intervalo 12-24 não existe no guideline retornado"
```

---

## 📋 Próximos Passos de Implementação

1. [ ] Criar API de busca estruturada (`/api/recommendations/query`)
2. [ ] Normalizar schema da biblioteca para match com spec
3. [ ] Implementar Recommendations Agent no pipeline
4. [ ] Criar Recommendations Guard (verificador)
5. [ ] Implementar formatador de citações
6. [ ] Criar suite de testes (12 casos)
7. [ ] Integrar com Renderer para seção REFERÊNCIAS
