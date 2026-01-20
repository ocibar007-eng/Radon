# MANUAL BIOMETRIA — TOMOGRAFIA (Cap 17–20)

Arquivo consolidado para reduzir número de arquivos (ex.: upload/integração em projeto).

Inclui:
- `CAP17_TC_PROTOCOLOS.md`
- `CAP18_TC_ATENUACAO_HU_ROI.md`
- `CAP19_TC_RM_CRITERIOS_DIMENSIONAIS.md`
- `CAP20_TC_ADRENAL.md`

---

# CAPÍTULO 17 — TC: PROTOCOLOS DE AQUISIÇÃO (ABDOME E PELVE) PARA BIOMETRIA

## 17.1 Objetivo do capítulo

Padronizar protocolos de tomografia computadorizada (TC) para que **medidas seriadas** sejam comparáveis, com foco em:

- Geometria de aquisição (espessura de corte, incremento, FOV, matriz)
- Reconstruções (kernel, MPR, espessuras para medida vs arquivo)
- Contraste (fases, timing) e impacto em contornos/lesões
- Registro mínimo de metadados para rastreabilidade (ver Cap 4)

---

## 17.2 Princípio central: “medida sem protocolo” não é comparável

**Regra do manual**:
> Para follow-up, a medida só é comparável se as condições essenciais forem semelhantes: **fase**, **espessura efetiva**, **kernel**, **plano/MPR** e **método de medida**.

---

## 17.3 Componentes do protocolo que alteram medidas

### Tabela 17.1 — Variáveis que mais mudam o número

| Variável | Como altera medidas | Mitigação |
|---------|----------------------|-----------|
| Espessura de corte (SliceThickness) | Parcial volume altera borda | Medir em reconstrução fina (≤ 1–2 mm) quando possível |
| Kernel (soft vs sharp) | Bordas mais “duras” vs suaves | Padronizar kernel para biometria (soft/standard) |
| Fase de contraste | Realce muda contorno de lesões | Comparar mesma fase (ex.: portal-venosa) |
| MPR vs axial | Maior eixo pode não estar no axial | Usar MPR alinhada ao maior eixo |
| Janela/nível | Bordas variam conforme WL/WW | Usar janelas padronizadas para medir (ver Cap 19) |

---

## 17.4 Reconstruções recomendadas (para medir e para arquivar)

### 17.4.1 Regra operacional

- **Para medir**: priorizar reconstrução **fina** (1–2 mm), kernel **soft/standard**, MPR quando necessário.
- **Para leitura geral**: séries adicionais (3–5 mm) podem ser úteis, mas não devem ser a única base de medida seriada.

### Tabela 17.2 — Reconstruções práticas (adulto)

| Uso | Espessura | Incremento | Kernel | Observação |
|-----|-----------|------------|--------|------------|
| Biometria/lesões (MPR) | 1–2 mm | 0,8–1,5 mm | Soft/standard | Melhor para contorno e reprodutibilidade |
| Abdome geral (axial) | 3–5 mm | 3–5 mm | Soft/standard | Leitura rápida |
| Osso (se necessário) | 1–2 mm | 1–2 mm | Sharp/bone | Não usar para medir parênquima |

---

## 17.5 Fases de contraste (impacto em biometria)

### 17.5.1 Regra prática

> Para follow-up de lesão sólida, comparar **a mesma fase** e preferir fase em que a borda é mais estável e reprodutível.

### Tabela 17.3 — Fases usuais e uso biométrico

| Fase | Timing típico (após contraste) | Melhor para | Risco para medida |
|------|-------------------------------|------------|-------------------|
| Sem contraste | — | HU base, gordura, cálculos | Menor contraste de borda em algumas lesões |
| Arterial | ~20–35 s | hiperrealce, vasos, pâncreas (depende) | Pode “aparecer” mais/menos extensão |
| Portal-venosa | ~60–80 s | fígado/baço/pâncreas, metástases | Geralmente mais estável para medidas seriadas |
| Tardia | ~3–5 min | fibrose, washout, urotélio (depende) | Bordas podem mudar por washout |

---

## 17.6 Dose e qualidade: quando “não dá para medir”

**Situações que reduzem reprodutibilidade**:
- Ruído alto (baixa dose/obeso)
- Movimento respiratório (borramento)
- Artefatos metálicos
- Reconstrução inadequada (apenas 5 mm)

**Regra do manual**:
> Se a qualidade comprometer a medida, documentar como limitação e evitar conclusões de “crescimento” em variações pequenas.

### Texto de limitação (modelo)
> "Avaliação dimensional limitada por ruído/artefatos de movimento, reduzindo a confiabilidade para medidas seriadas."

---

## 17.7 Protocolo mínimo por cenário (templates)

### Tabela 17.4 — TC abdome/pelve: templates práticos (biometria)

| Cenário | Séries mínimas | Observação |
|--------|-----------------|------------|
| Abdome/pelve rotina com contraste | Sem contraste + portal-venosa | Medidas preferencialmente na portal-venosa |
| Pesquisa de urolitíase | Sem contraste | Evitar contraste se objetivo é cálculo |
| Lesão adrenal incidental | Sem contraste + (se indicado) tardia para washout | Ver Cap 20 |
| Oncologia (follow-up) | Padronizar fase (geralmente portal) + reconstrução fina | Evitar trocar fase/kernels entre exames |

---

## 17.8 DICOM: o que registrar obrigatoriamente

**Ver Cap 4** para tags e auditoria.

### Checklist 17.1 — Registro mínimo (TC)

- [ ] Fase (sem contraste/arterial/portal/tardia)
- [ ] SliceThickness e PixelSpacing
- [ ] Kernel
- [ ] Reconstrução usada para medir (espessura + MPR)
- [ ] Janela usada para medir (quando relevante)
- [ ] Limitações técnicas (movimento, ruído, metal)

---

## 17.9 Exemplos resolvidos

### Exemplo Resolvido 17.1 — “Cresceu” ou mudou o kernel?

**Cenário**:
- Lesão hepática medida como 12 mm em TC anterior (kernel soft)
- Na TC atual, medida 14 mm em série com kernel sharp

**Interpretação**:
- Diferença pode ser técnica (kernel/contorno) e não crescimento real

**Conduta do manual**:
- Re-medida na série soft/standard, mesma fase, reconstrução fina, e então comparar

---

### Exemplo Resolvido 17.2 — Medir em MPR para maior eixo

**Cenário**:
- Lesão renal alongada oblíqua: axial subestima maior eixo

**Conduta**:
- Medir maior eixo em MPR alinhada ao maior eixo da lesão

---

## 17.10 Textos prontos para laudo (técnica e comparação)

### Técnica (modelo):
> "TC de abdome e pelve realizada conforme protocolo institucional, com aquisições em [fases], reconstruções em [espessura] mm e MPR quando necessário para biometria."

### Comparabilidade (modelo):
> "Comparação dimensional realizada na mesma fase e técnica, quando disponível; variações técnicas podem influenciar pequenas diferenças de medida."

---

## Referências:

1. ACR Practice Parameters (TC Abdomen/Pelvis — última revisão disponível no serviço).
2. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018. (Referência geral do manual; para TC, seguir diretrizes do serviço)

---

**FIM DO CAPÍTULO 17**

*Próximo: Capítulo 18 — TC: Atenuação (HU) e ROI*

---

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

---

# CAPÍTULO 19 — TC/RM: CRITÉRIOS DIMENSIONAIS (COMO MEDIR E COMO COMPARAR)

## 19.1 Objetivo do capítulo

Padronizar **como medir** estruturas e lesões em TC e RM, e como comparar medidas seriadas com rastreabilidade, evitando os erros mais comuns de:

- medir em plano errado (axial quando maior eixo é oblíquo)
- trocar fase/série e gerar variação falsa
- medir borda “errada” por janela inadequada
- concluir progressão com variação dentro do erro técnico

---

## 19.2 O que medir (padrões gerais)

### 19.2.1 Lesões (massa/nódulo/cisto complexo)

- Preferir **maior diâmetro** no plano que melhor representa o maior eixo
- Registrar **plano** (axial/sagital/coronal/MPR oblíqua) quando relevante
- Em follow-up, manter **mesmo método** e, se possível, mesma série/fase

### 19.2.2 Linfonodos

- Medir no **menor eixo** (short axis) no plano mais adequado (geralmente axial)

### 19.2.3 Vasos (aorta, etc.)

- Medir **perpendicular ao eixo do vaso**, idealmente em MPR ortogonal ao vaso

---

## 19.3 Série/fase e janela: regras do manual

### 19.3.1 Série/fase

- TC: para onco/abdome, medidas seriadas geralmente são mais comparáveis na fase **portal-venosa** (se este for o padrão do serviço)
- RM: evitar medir em sequências com distorção (DWI/EPI) quando o objetivo é número reprodutível (ver Cap 4)

### 19.3.2 Janela (TC)

**Regra prática**:
> Medir na janela que melhor define a borda da estrutura (ex.: parênquima para lesão hepática), evitando extremos que mudem contorno aparente.

### Tabela 19.1 — Janela (apoio)

| Estrutura | Janela preferencial | Evitar |
|----------|----------------------|--------|
| Parênquima abdominal | Janela de partes moles | Janela óssea para medidas de lesões |
| Pulmão (fora do escopo) | Janela pulmonar | — |

---

## 19.4 Técnica de medida (passo a passo)

### 19.4.1 Escolha do plano

1. Identificar o maior eixo real (varrer MPR)
2. Alinhar MPR ao eixo da lesão/estrutura quando necessário
3. Medir no plano alinhado, com calipers bem posicionados

### 19.4.2 Bordas e parcial volume

- Preferir reconstrução fina (1–2 mm) para medida
- Evitar medir em séries grossas (3–5 mm) quando a diferença esperada é pequena

---

## 19.5 Arredondamento e “limiar de mudança”

### 19.5.1 Arredondamento

**Regra do manual**:
- Manter precisão consistente (ex.: 1 mm) e evitar alternar entre cm e mm sem necessidade

### 19.5.2 Não “fechar progressão” com variação mínima

Variação pequena pode ocorrer por:

- fase diferente
- kernel diferente
- obliquidade
- parcial volume

**Regra prática**:
> Se a diferença é pequena e a técnica não é comparável, reportar como “diferença possivelmente técnica” e evitar conclusões fortes.

---

## 19.6 Critérios dimensionais práticos (apoio)

### 19.6.1 Linfonodos (short axis)

**Regra operacional**:
> Linfonodos devem ser medidos no menor eixo e descritos por cadeia anatômica.

### 19.6.2 RECIST (onco) — visão operacional (quando o serviço usa)

**Nota**: RECIST tem regras formais; aqui fica o mínimo operacional para não errar:

- Lesões-alvo: medir **maior diâmetro** (exceto linfonodos: short axis)
- Manter consistência de série/fase e técnica
- Evitar incluir lesões não mensuráveis como “alvo”

**Regra do manual**:
> Se o caso exige RECIST formal, seguir protocolo institucional/oncologia do serviço.

---

## 19.7 Exemplos resolvidos

### Exemplo Resolvido 19.1 — Linfonodo: maior eixo vs menor eixo

**Dados**:
- Eixo longo: 18 mm
- Menor eixo: 9 mm

**Interpretação**:
- Para linfonodo, o número reprodutível é o **menor eixo** (9 mm).

---

### Exemplo Resolvido 19.2 — Lesão oblíqua medida no axial (erro)

**Cenário**:
- Medida no axial: 22 mm
- Medida em MPR alinhada ao eixo: 28 mm

**Conduta do manual**:
- Registrar a medida em MPR alinhada (28 mm) como referência seriada, descrevendo plano.

---

## 19.8 Checklist rápido

### Checklist 19.1 — Medida Dimensional (TC/RM)

- [ ] Confirmar fase/série adequada para comparação
- [ ] Reconstrução fina disponível para medir (ideal 1–2 mm)
- [ ] Escolher plano correto (usar MPR se necessário)
- [ ] Lesão: maior diâmetro; linfonodo: menor eixo; vaso: perpendicular ao eixo
- [ ] Evitar conclusões fortes com técnica não comparável
- [ ] Documentar limitações técnicas (movimento, ruído, metal)

---

## 19.9 Textos prontos para laudo

### Comparabilidade:
> "Medidas realizadas preferencialmente na mesma fase e técnica; pequenas variações podem ocorrer por diferenças de reconstrução, fase ou plano de medida."

### Diferença pequena/possivelmente técnica:
> "Observa-se discreta variação dimensional, possivelmente relacionada a diferenças técnicas (fase/reconstrução/plano de medida)."

---

## Referências:

1. RECIST 1.1 (quando aplicável conforme protocolo do serviço).
2. ACR (parâmetros de TC/RM — última revisão disponível no serviço).

---

**FIM DO CAPÍTULO 19**

*Próximo: Capítulo 20 — TC: Adrenal*

---

# CAPÍTULO 20 — TC: ADRENAL (NÓDULO INCIDENTAL, HU, WASHOUT E MEDIDAS)

## 20.1 Objetivo do capítulo

Padronizar a biometria e caracterização básica de nódulos adrenais em TC, com foco em:

- Medida dimensional reprodutível (plano, maior eixo)
- Medida de HU por ROI (Cap 18)
- Conceitos operacionais de **washout** (quando protocolo inclui fase tardia)
- Textos prontos e limitações

**Regra do manual**: caracterização adrenal depende de protocolo adequado; quando faltarem séries, relatar como indeterminado e sugerir estudo dedicado conforme indicação.

---

## 20.2 O que medir e registrar (mínimo)

### Medidas padronizadas:

1. **Maior diâmetro** do nódulo (mm) no plano de melhor representação (axial ou MPR)
2. **Atenuação (HU) sem contraste** por ROI dentro do nódulo (se disponível)
3. Se houver protocolo com tardia: **washout** (APW/RPW) quando aplicável
4. Lateralidade (direita/esquerda) e morfologia (homogêneo/heterogêneo; calcificações; necrose)

---

## 20.3 Quando aplicar este capítulo

- ✅ Nódulo adrenal incidental em TC de abdome
- ✅ Follow-up de nódulo adrenal
- ✅ Avaliação dirigida de adrenal (quando protocolo dedicado é realizado)

---

## 20.4 Técnica de medida (dimensão)

### 20.4.1 Plano correto

- Medir no plano onde o nódulo apresenta **maior eixo** (axial pode subestimar lesão oblíqua)
- Preferir reconstrução fina (1–2 mm) para medida (Cap 17)

### 20.4.2 Como medir

- Caliper de borda a borda do nódulo (outer-to-outer)
- Evitar incluir gordura periadrenal e estruturas adjacentes

---

## 20.5 HU por ROI (sem contraste): regra prática

### 20.5.1 Padrão do manual

- Medir HU em **TC sem contraste**, com ROI dentro do nódulo, afastada da borda (Cap 18)

### Tabela 20.1 — HU sem contraste (apoio prático)

| HU no nódulo (sem contraste) | Interpretação prática |
|------------------------------|-----------------------|
| Baixo (compatível com gordura intracelular) | Sugestivo de adenoma rico em gordura |
| Intermediário/alto | Indeterminado; pode exigir washout ou RM |

**Nota**: não usar linguagem absoluta quando técnica é limitada (ruído/artefato/lesão pequena).

---

## 20.6 Washout (quando há protocolo com tardia)

### 20.6.1 Pré-requisitos

- Série **sem contraste** (U)
- Série **contrastada** (geralmente portal) (E)
- Série **tardia** (D), tipicamente 10–15 minutos (conforme protocolo)

### 20.6.2 Fórmulas (operacionais)

**Washout absoluto (APW)**:
```
APW (%) = ((E - D) / (E - U)) × 100
```

**Washout relativo (RPW)**:
```
RPW (%) = ((E - D) / E) × 100
```

### 20.6.3 Interpretação prática

**Regra do manual**:
> Usar washout como suporte quando o protocolo é adequado; caso contrário, não “forçar” caracterização.

---

## 20.7 Sinais de alerta (para não “perder” lesão suspeita)

### Tabela 20.2 — Red flags (qualitativos)

| Achado | Preocupação | Conduta sugerida |
|--------|-------------|------------------|
| Crescimento significativo em follow-up comparável | Possível lesão não-adenoma | Estudo dedicado / correlação clínica |
| Heterogeneidade, necrose, hemorragia | Lesão complexa | Complementar conforme indicação |
| Invasão/contato agressivo | Possível malignidade | Avaliação urgente conforme contexto |

---

## 20.8 Exemplos resolvidos

### Exemplo Resolvido 20.1 — HU baixo sem contraste (sugestivo de adenoma)

**Dados**:
- Nódulo adrenal esquerdo: 18 mm
- HU (sem contraste, ROI central): 6 HU

**Interpretação prática**:
- Atenuação baixa em TC sem contraste → sugestivo de adenoma rico em gordura (no contexto).

**Texto (trecho)**:
> "Nódulo adrenal esquerdo de 18 mm, com baixa atenuação na TC sem contraste (aprox. 6 HU), achado sugestivo de adenoma."

---

### Exemplo Resolvido 20.2 — Cálculo de washout (APW e RPW)

**Dados**:
- U (sem contraste) = 18 HU
- E (contrastada) = 92 HU
- D (tardia) = 40 HU

**Cálculos**:
```
APW = ((92 - 40) / (92 - 18)) × 100
APW = (52 / 74) × 100
APW = 70,3%

RPW = ((92 - 40) / 92) × 100
RPW = (52 / 92) × 100
RPW = 56,5%
```

**Interpretação prática**:
- Washout alto no protocolo adequado favorece adenoma (relatar como sugestivo/compatível conforme padrão do serviço).

---

## 20.9 Checklist rápido

### Checklist 20.1 — Adrenal em TC

- [ ] Registrar lado (D/E) e tamanho (maior eixo em mm)
- [ ] Preferir reconstrução fina (1–2 mm) para medir
- [ ] Medir HU por ROI em série sem contraste, afastada da borda
- [ ] Se houver tardia: calcular washout (APW/RPW) com HU consistentes
- [ ] Procurar sinais de alerta (heterogeneidade, invasão, crescimento)
- [ ] Documentar limitações técnicas (ruído, lesão pequena, ausência de séries)

---

## 20.10 Textos prontos para laudo

### Sugestivo de adenoma (HU baixo, sem contraste):
> "Nódulo adrenal [direito/esquerdo] medindo [X] mm, com baixa atenuação na TC sem contraste (aprox. [Y] HU), achado sugestivo de adenoma."

### Indeterminado (sem sem-contraste ou sem condições):
> "Nódulo adrenal [direito/esquerdo] medindo [X] mm, de caracterização indeterminada no protocolo atual. A critério clínico, considerar estudo dedicado para caracterização (TC com washout ou RM)."

### Com washout (quando calculado):
> "Nódulo adrenal [direito/esquerdo] com washout (APW/RPW) calculado no protocolo adequado, favorecendo adenoma no contexto."

---

## Referências:

1. ACR (white papers/guidelines de incidentalomas adrenais — seguir protocolo institucional).
2. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018. (Referência geral do manual)

---

**FIM DO CAPÍTULO 20**
