# 🚧 PROTOCOLO DE DESENVOLVIMENTO PARALELO (Dictionary vs Web Recs)

**MUITO IMPORTANTE:** Duas frentes de trabalho estão ocorrendo simultaneamente neste repositório. Siga as regras abaixo estritamente para evitar conflitos de merge e lógica.

---

## 🗺️ Mapa de Zonas

### 🟩 Zona Verde (Pode mexer à vontade)
| Time | Diretórios Exclusivos |
| :--- | :--- |
| **Time Dicionário** | **PYTHON (Gerador):** `inbox/handoff_bundle_2026-01-31/` (scripts .py)<br>**TYPESCRIPT (Consumidor):** `src/core/reportGeneration/agents/dictionary.ts`<br>`src/core/reportGeneration/agents/assets/` (Onde o JSON final deve ser salvo) |
| **Time Web Recs** | `src/core/reportGeneration/agents/web-evidence.ts`<br>`src/core/reportGeneration/agents/recommendations.ts`<br>`services/recommendations/` |

### 🟥 Zona Vermelha (Perigo de Conflito - Cuidado!)
Ambos os times precisarão mexer aqui. **Não apague código existente.** Apenas adicione linhas novas.

1.  **`src/core/reportGeneration/orchestrator.ts`**
    - **Time Dicionário:** Insira sua chamada **DURANTE** ou **APÓS** a geração de achados (`generateFindings`), mas **ANTES** de `runRecommendationsAgent`.
    - **Time Web Recs:** Insira sua chamada DENTRO do bloco `Recommendations Agent` ou logo após ele.
    - **Regra:** Usem variáveis com nomes prefixados (ex: `dict_result`, `recs_result`).

2.  **`src/types/report-json.ts`**
    - **Time Dicionário:** Adicione campos como `glossary_terms`, `standardized_codes`.
    - **Time Web Recs:** Adicione campos como `consult_assist`, `web_evidence`.
    - **Regra:** NUNCA alterem a estrutura `Finding` ou `Indication` existente sem consultar.

---

## 🤖 Prompts de Segurança (Copie e mande para a IA)

### 👉 Para a IA do DICIONÁRIO:
> "ATENÇÃO: Você está trabalhando em um pipeline HÍBRIDO (Python gera -> TS consome).
> 1. Trabalhe livremente na pasta `inbox/handoff_bundle_...` com seus scripts Python.
> 2. O artefato final (`dictionary_full.json`) deve ser copiado para `src/core/reportGeneration/agents/assets/`.
> 3. NÃO edite `agents/recommendations.ts`.
> 4. Ao editar `orchestrator.ts`, insira a lógica de normalização antes das recomendações.
> 5. Respeite os campos `evidence_recommendations` criados pelo outro time."

### 👉 Para a IA de WEB EVIDENCES:
> "ATENÇÃO: Você está trabalhando em paralelo com outra IA que foca em 'Medical Dictionary Implementation'.
> 1. NÃO edite `agents/dictionary.ts` ou a pasta `services/dictionary`.
> 2. Ao editar `orchestrator.ts`, foque apenas no bloco `Recommendations Agent`. Assuma que os achados (findings) já podem vir normalizados pelo Dicionário.
> 3. No arquivo `types/report-json.ts`, respeite campos como `glossary` ou `cid_codes` se eles aparecerem. Adicione seus campos (`consult_assist`) de forma aditiva."

---

## 🔗 Ponto de Integração
O **Orchestrator** é o ponto de encontro.
- **Fluxo Ideal:** `OCR -> Dictionary (Padroniza) -> Recommendations (Usa termos padrão) -> Guard -> Renderer`
- Se o Dicionário mudar o `label` dos achados (ex: de "nodulo pulmao" para "Nódulo pulmonar"), isso AJUDA o time de recomendações. Mantenham essa sinergia.
