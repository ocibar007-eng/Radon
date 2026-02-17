# HANDOFF: Implementação de Fórmulas Radiológicas

**Data:** 2026-02-05
**Branch:** `feature/evidence-recommendations-db`
**Estado:** Pipeline funcionando, fórmulas existentes ativas

---

## 1. CONTEXTO DO PROJETO

Sistema de geração de laudos radiológicos com pipeline multiagente:
- **Gemini 3 Flash Preview** para extração de dados (OCR usa Gemini 2.0 Flash)
- **GPT-5.2 Extended Thinking** para revisão final
- **Fórmulas Python** para cálculos médicos (índices, volumes, scores)

---

## 2. ARQUITETURA DAS FÓRMULAS

### 2.1 Fluxo de Dados

```
[FindingsAgent] → extrai medidas do dictado
       ↓
[compute-inference.ts] → detecta fórmulas aplicáveis
       ↓
[calculator-client.ts] → envia requests para API
       ↓
[API /api/calculator] → executa Python no backend
       ↓
[attachComputeResults] → anexa resultados ao ReportJSON
       ↓
[Renderer] → formata no laudo final
```

### 2.2 Arquivos Chave

| Arquivo | Função |
|---------|--------|
| `data/compendium/calc_blocks.json` | **Definições das fórmulas** (inputs, formula, output, interpretation) |
| `data/compendium/compendio.json` | Metadados (categoria, sinônimos, status) |
| `data/compendium/synonyms.json` | Sinônimos por subárea |
| `scripts/generate_formula_registry.ts` | Gera TypeScript a partir dos JSON |
| `src/generated/formula-registry.ts` | **Registry gerado** (IDs, schemas, metas) |
| `src/services/calculator-client.ts` | Cliente HTTP para API de cálculos |
| `src/core/reportGeneration/compute-inference.ts` | Detecta fórmulas nos achados |
| `api/calculator/*.ts` | Endpoints Vercel (se houver) |

### 2.3 Estrutura de uma Fórmula em `calc_blocks.json`

```json
{
  "VASC-0001": {
    "ItemID": "VASC-0001",
    "FunctionName": "calculate_resistive_index",
    "inputs": [
      {
        "name": "PSV (Peak Systolic Velocity)",
        "type": "number",
        "unit": "m/s",
        "required": "true",
        "valid_range": "0-5",
        "notes": "Velocidade sistólica máxima"
      },
      {
        "name": "EDV (End-Diastolic Velocity)",
        "type": "number",
        "unit": "m/s",
        "required": "true",
        "valid_range": "0-5"
      }
    ],
    "preprocessing": [
      "Validar PSV > 0 e EDV >= 0"
    ],
    "formula": [
      "RI = (PSV - EDV) / PSV"
    ],
    "output": {
      "raw": [
        "primary_value:",
        "name: RI",
        "unit: ratio (0-1)",
        "precision: 2 casas decimais"
      ]
    },
    "interpretation": {
      "raw": [
        "rules:",
        "- if: RI < 0.55",
        "then: \"Normal\"",
        "- if: RI > 0.70",
        "then: \"Aumentado\""
      ]
    },
    "qa_checks": [
      "Validar PSV > EDV"
    ],
    "evidence": {
      "primary_source": "McNaughton D et al. Radiographics 2011",
      "radiopaedia_link": "https://radiopaedia.org/..."
    }
  }
}
```

---

## 3. FÓRMULAS JÁ IMPLEMENTADAS

Total: **88 fórmulas** registradas no sistema

### Por Categoria:

| Prefixo | Categoria | Qtd | Exemplos |
|---------|-----------|-----|----------|
| ABD | Abdome | 36 | Cramer hepatico, Spleen index, Volumes |
| GIN | Ginecologia | 3 | Volume ovariano, Volume uterino |
| PEL | Pelve | 20 | Volume prostático, PIRADS scoring |
| THX | Tórax | 10 | Volume pulmonar, Cardiothoracic ratio |
| TIR | Tireoide | 2 | Volume tireoidiano, TIRADS |
| URO | Urologia | 2 | Volume renal, Índice cortical |
| VASC | Vascular | 14 | RI, PI, NASCET, Aortic aneurysm |

### IDs Completos:
```
ABD-0001 a ABD-0036
GIN-0001 a GIN-0003
PEL-0001 a PEL-0020
THX-0001 a THX-0010
TIR-0001 a TIR-0002
URO-0001 a URO-0002
VASC-0001 a VASC-0014
```

---

## 4. TAREFA: IMPLEMENTAR NOVAS FÓRMULAS

### 4.1 Passos para Adicionar uma Fórmula

1. **Adicionar em `data/compendium/calc_blocks.json`:**
   ```json
   "NOVO-0001": {
     "ItemID": "NOVO-0001",
     "FunctionName": "calculate_nova_formula",
     "inputs": [...],
     "formula": [...],
     "output": {...},
     "interpretation": {...},
     "qa_checks": [...],
     "evidence": {...}
   }
   ```

2. **Adicionar metadados em `data/compendium/compendio.json`:**
   ```json
   {
     "ItemID": "NOVO-0001",
     "Categoria": "Categoria",
     "Subcategoria": "Subcategoria",
     "Nome": "Nome da Fórmula",
     "Sinonimos": "sinonimo1; sinonimo2",
     "Status": "ativo",
     "tags": ["tag1", "tag2"]
   }
   ```

3. **Regenerar o registry:**
   ```bash
   npm run generate:formula-registry
   ```

4. **Implementar função Python no backend (se necessário):**
   - O backend Python precisa ter a função correspondente ao `FunctionName`

5. **Rebuild e testar:**
   ```bash
   npm run build
   ```

### 4.2 Convenções de Nomenclatura

| Categoria | Prefixo | Exemplo |
|-----------|---------|---------|
| Abdome | ABD | ABD-0037 |
| Ginecologia | GIN | GIN-0004 |
| Pelve | PEL | PEL-0021 |
| Tórax | THX | THX-0011 |
| Tireoide | TIR | TIR-0003 |
| Urologia | URO | URO-0003 |
| Vascular | VASC | VASC-0015 |
| Neuro | NEU | NEU-0001 |
| Musculoesquelético | MSK | MSK-0001 |
| Mama | MAM | MAM-0001 |

---

## 5. DETECÇÃO AUTOMÁTICA (compute-inference.ts)

O sistema detecta automaticamente quando uma fórmula deve ser aplicada baseado em:

1. **Sinônimos da fórmula** (definidos em `compendio.json`)
2. **Hooks de detecção** (definidos em `synonyms.json`)
3. **Medidas extraídas** pelo FindingsAgent

### Exemplo de detecção:
```typescript
// Se o achado menciona "índice resistivo" ou "RI" + tem medidas PSV/EDV
// → Sistema automaticamente adiciona compute_request para VASC-0001
```

---

## 6. API DE CÁLCULO

### Endpoint
```
POST /api/calculator/compute
```

### Request
```json
{
  "requests": [
    {
      "formula": "calculate_resistive_index",
      "inputs": { "psv": 1.2, "edv": 0.3 },
      "ref_id": "finding_123"
    }
  ]
}
```

### Response
```json
[
  {
    "ref_id": "finding_123",
    "formula": "VASC-0001",
    "result": {
      "value": 0.75,
      "interpretation": "Aumentado (alta resistência)",
      "unit": "ratio"
    },
    "success": true
  }
]
```

---

## 7. VARIÁVEIS DE AMBIENTE

```bash
# URL do serviço de cálculo (opcional - default: /api/calculator)
CALCULATOR_URL=/api/calculator
VITE_CALC_URL=/api/calculator

# Para serviço externo Python
CALCULATOR_URL=https://calc-service.example.com
```

---

## 8. TESTES

```bash
# Testar registry
npm run generate:formula-registry

# Testar client
npm test src/services/calculator-client.test.ts

# Build completo
npm run build
```

---

## 9. OBSERVAÇÕES IMPORTANTES

1. **Registry é gerado** - Nunca edite `src/generated/formula-registry.ts` diretamente
2. **FunctionName** deve corresponder exatamente à função Python no backend
3. **Inputs** devem ter nomes normalizados (snake_case no código)
4. **Evidências** são importantes para qualidade do laudo
5. **QA Checks** são executados após o cálculo para validar resultado

---

## 10. PRÓXIMOS PASSOS (PARA A OUTRA IA)

1. Receber lista das 20+ fórmulas a implementar do usuário
2. Para cada fórmula:
   - Adicionar em `calc_blocks.json`
   - Adicionar em `compendio.json`
3. Regenerar registry: `npm run generate:formula-registry`
4. Verificar se backend Python tem as funções correspondentes
5. Testar com `npm run build`
6. Deploy: `vercel --prod`

---

## 11. ESTADO ATUAL DO PIPELINE

```
✅ OCR → Gemini 2.0 Flash
✅ Clinical Agent → Gemini 3 Flash Preview
✅ Technical Agent → Gemini 3 Flash Preview
✅ Findings Agent → Gemini 3 Flash Preview (extrai medidas)
✅ Compute Inference → Detecta fórmulas aplicáveis
✅ Calculator Client → Chama API de cálculo
✅ Recommendations Agent → Biblioteca + Web Evidence
✅ Impression Agent → GPT-5.2 para síntese
✅ Revisor Agent → GPT-5.2 Extended Thinking (revisão final)
✅ VocabularyGate → Correções gramaticais
✅ Renderer → Markdown final
✅ QA Determinístico → Validação estrutural
```

---

**Deploy atual:** https://app-ocr-v6-a8jhxglzr-lucasclinicacru-7253s-projects.vercel.app
