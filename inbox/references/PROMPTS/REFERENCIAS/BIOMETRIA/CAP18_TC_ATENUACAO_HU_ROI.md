# CAPÍTULO 18 — TC: ATENUAÇÃO (HU) E ROI (COMO MEDIR SEM ERRO)

## 18.1 Objetivo do capítulo

Padronizar medições de atenuação em TC usando HU (Hounsfield Units) e ROIs, para reduzir variabilidade e evitar erros clássicos de:

- parcial volume
- ruído/artefato
- ROI mal posicionada
- comparação entre fases/séries inadequadas

---

## 18.2 Conceitos essenciais (práticos)

### 18.2.1 HU não é “absoluto” em qualquer condição

O valor de HU pode variar com:

- kVp, reconstrução (kernel), iterativa
- fase de contraste
- ruído/obesidade
- beam hardening (ex.: próximo a coluna/metal)

**Regra do manual**:
> HU só é comparável se a técnica for compatível e a ROI for padronizada.

---

### 18.2.2 Valores típicos de HU (apoio rápido)

- Água: ~0 HU
- Gordura: ~-10 a -100 HU
- Partes moles: ~+30 a +60 HU
- Sangue agudo: ~+50 a +75 HU
- Cálcio/osso: geralmente > +150 HU

---

## 18.3 Como posicionar ROI (padrão do manual)

### 18.3.1 Regras gerais

- ROI **grande o suficiente** para reduzir ruído, mas **sem encostar** em bordas
- Evitar vasos, ductos, calcificações e áreas necróticas
- Preferir área homogênea do parênquima/lesão

### Tabela 18.1 — Tamanho e posicionamento (regra prática)

| Estrutura | ROI recomendada | Evitar |
|----------|------------------|--------|
| Fígado/baço | 1–3 cm² (ou maior se homogêneo) | vasos, cápsula, lesões |
| Rim (córtex) | pequena-média (homogênea) | seios renais, cálices |
| Lesão sólida | maior ROI possível dentro da lesão | borda, necrose, calcificação |
| Adrenal (nódulo) | ROI dentro do nódulo | gordura adjacente, vasos |

---

## 18.4 Erros comuns e como corrigir

### Tabela 18.2 — Armadilhas de HU

| Armadilha | Resultado | Como evitar |
|----------|-----------|-------------|
| ROI encosta na borda | parcial volume → HU “puxa” para fora | afastar ROI da borda |
| Medir em série grossa (5 mm) | parcial volume e ruído | usar 1–2 mm quando possível |
| Comparar fases diferentes | HU muda por realce | comparar mesma fase |
| Beam hardening | HU falso alto/baixo | mudar nível, outra fatia, documentar |
| ROI pega calcificação | HU falsamente alto | excluir calcificações |

---

## 18.5 HU em fígado: aplicações práticas

### 18.5.1 Esteatose (apoio)

**Princípio**: em TC sem contraste, fígado com gordura tende a ter HU menor.

**Regra do manual**:
> Para triagem de esteatose em TC, usar preferencialmente **sem contraste**, com ROI padronizada em fígado e baço para comparação interna.

### Tabela 18.3 — Interpretação prática (sem contraste, apoio)

| Achado | Interpretação prática |
|--------|------------------------|
| HU hepático reduzido em relação ao baço (ex.: baço - fígado > 10 HU) | Sugestivo de esteatose |
| HU hepático muito baixo | Sugestivo de esteatose mais acentuada |

**Nota**: evitar “grau” baseado apenas em HU sem protocolo; correlacionar com clínica/labs.

---

## 18.6 HU em rim e trato urinário: uso cuidadoso

- HU no parênquima renal varia com fase e perfusão
- HU em cálculos (sem contraste) pode apoiar composição (apoio), mas é dependente de kVp e técnica

**Regra do manual**:
> Para cálculo, HU é complementar; a decisão clínica é multifatorial.

---

## 18.7 HU em adrenal (ponte para o Cap 20)

Em adrenal, HU sem contraste tem grande valor prático para diferenciar adenoma rico em gordura de lesões indeterminadas, mas deve ser medido corretamente (ROI dentro do nódulo, evitando parcial volume).

---

## 18.8 Exemplos resolvidos

### Exemplo Resolvido 18.1 — ROI mal posicionada (falso HU alto)

**Cenário**:
- Nódulo medido com ROI encostando na borda e pegando cápsula/vaso

**Efeito**:
- HU sobe e o nódulo parece “não gorduroso”

**Correção**:
- Repetir ROI central, menor, afastada da borda, em 3 fatias e reportar média/intervalo.

---

### Exemplo Resolvido 18.2 — Fígado vs baço (sem contraste)

**Dados**:
- ROI fígado: 38 HU
- ROI baço: 52 HU

**Interpretação**:
- HU hepático reduzido em relação ao baço → sugestivo de esteatose (no contexto).

---

## 18.9 Checklist rápido

### Checklist 18.1 — Medida de HU/ROI

- [ ] Confirmar fase (sem contraste vs contrastada)
- [ ] Preferir reconstrução fina (1–2 mm) quando disponível
- [ ] ROI não encosta em borda/cápsula
- [ ] Excluir vasos, calcificações, necrose
- [ ] Repetir em 2–3 fatias se a lesão for pequena/heterogênea
- [ ] Documentar limitações (ruído, artefatos)

---

## 18.10 Textos prontos para laudo (HU)

### Reportar HU com técnica:
> "Atenuação medida por ROI no estudo de TC [sem contraste/na fase portal], com valor de aproximadamente [X] HU, dentro das limitações técnicas."

---

## Referências:

1. ACR (parâmetros de TC — última revisão disponível no serviço).
2. Diretrizes locais de caracterização de adrenal/hepática (quando disponíveis no serviço).

---

**FIM DO CAPÍTULO 18**

*Próximo: Capítulo 19 — TC/RM: Critérios Dimensionais*
