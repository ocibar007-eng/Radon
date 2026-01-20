# CAPÍTULO 3 — METROLOGIA EM RADIOLOGIA (Regras Gerais e Fatores Técnicos)

## 3.1 Objetivo do capítulo

Antes de discutir "qual é o valor normal", é **obrigatório** padronizar **como medir** e **quais parâmetros mudam a medida**.

Este capítulo organiza o "porquê" de discrepâncias comuns:

- Por que uma lesão mudade 9 mm para 11 mm em exames diferentes?
- Por que um IR muda entre máquinas?
- Por que um HU muda com kernel/ROI?
- Por que um volume muda com espessura de corte?

---

## 3.2 Conceitos fundamentais (sem isso, não existe auditoria)

### 3.2.1 Definições Metrológicas

| Conceito | Definição | Exemplo Radiológico |
|----------|-----------|---------------------|
| **Acurácia** | Quão perto do valor verdadeiro | Medida USG 10 mm vs referência histológica 10,2 mm |
| **Precisão** | Quão consistente você mede (dispersão) | 3 medidas: 10, 10, 10 mm = alta precisão |
| **Repetibilidade** | Mesmo operador, mesmo cenário | Mesmo médico, mesmo paciente, mesmo dia |
| **Reprodutibilidade** | Operadores diferentes, cenários similares | Médico A vs B, equipamentos diferentes |
| **Viés** | Erro sistemático | Sempre medir "por fora" da borda |
| **Incerteza** | Intervalo plausível do valor real | Medida: 10 ± 1 mm (incerteza ±1 mm) |

### 3.2.2 Por que isso importa?

**Exemplo clínico**:
- follow-up de nódulo pulmonar: 8 mm → 10 mm
- **Questão**: Cresceu ou é variabilidade técnica?
- **Resposta**: Depende da incerteza/precisão do método

**Regra prática**:
> Variação < 2× incerteza = considerar estável
> Variação ≥ 2× incerteza = considerar mudança real

---

## 3.3 Fontes de variabilidade (por modalidade)

### Tabela 3.1 — Fontes comuns de variabilidade

| Modalidade | Variáveis que MAIS mexem | Como mitigar |
|------------|--------------------------|--------------|
| **USG** | Plano, compressão, respiração, ganho, foco, profundidade | Checklist de plano + padronizar respiração |
| **Doppler** | Ângulo, PRF, aliasing, gate, filtro de parede | Padronizar ângulo (≤ 60°) e ajustes mínimos |
| **TC** | Kernel, espessura, parcial volume, fase de contraste | Padronizar reconstrução/fase |
| ** RM** | Tamanho voxel, movimento, distorção, sequência | Protocolo mínimo + controle qualidade |

---

## 3.4 DICOM e geometria de voxel (TC/RM)

Para qualquer medida derivada de pixels/voxels, existem **três peças principais**:

1. **PixelSpacing** (mm × mm): Tamanho do pixel no plano
2. **SliceThickness** (mm): Espessura do corte
3. **SpacingBetweenSlices** (mm): Distância entre centros de fatias

### 3.4.1 Fórmula 3.1 — Converter pixels em mm (no plano)

```
Comprimento (mm) = N_pixels × PixelSpacing
```

**Variáveis**:
- `N_pixels` (pixels): número de pixels medidos
- `PixelSpacing` (mm/pixel): do header DICOM

#### Exemplo Resolvido 3.1 — Conversão pixel → mm

**Dados**:
- PixelSpacing = 0,78 mm/pixel
- Caliper marca 25 pixels

**Cálculo**:
```
Comprimento = 25 × 0,78
Comprimento = 19,5 mm
```

**Arredondamento** (padrão 1 mm para lesões):
```
19,5 mm → 20 mm
```

---

### 3.4.2 Fórmula 3.2 — Volume por voxel-count (conceito)

```
V (mm³) = N_voxels × (PSx × PSy × t)
```

**Onde**:
- `PSx, PSy` = PixelSpacing em x e y (mm)
- `t` = SliceThickness OU SpacingBetweenSlices (mm)

> ⚠️ **Armadilha**: SliceThickness ≠ SpacingBetweenSlices!

**Quando usar qual**:
- Com **sobreposição** (overlap): usar SpacingBetweenSlices
- Com **gap**: registrar qual parâmetro foi usado

**Regra do manual**: 
> Todo cálculo volumétrico deve registrar **qual parâmetro "t" foi usado** e por quê.

#### Exemplo Resolvido 3.2 — Sliceickness vs Spacing

**Cenário**:
- SliceThickness = 5 mm
- SpacingBetweenSlices = 2,5 mm (50% overlap)
- Segmentação: 100 voxels
- PixelSpacing = 0,7 × 0,7 mm

**Cálculo ERRADO** (usando SliceThickness):
```
V = 100 × (0,7 × 0,7 × 5)
V = 100 × 2,45 = 245 mm³
```

**Cálculo CORRETO** (usando SpacingBetweenSlices, pois há overlap):
```
V = 100 × (0,7 × 0,7 × 2,5)
V = 100 × 1,225 = 122,5 mm³
```

**Diferença**: ~50% de erro!

---

## 3.5 USG modo B: caliper e plano (regras operacionais)

### 3.5.1 Regra "primeiro o plano, depois o caliper"

**Ordem obrigatória**:
1. Ajustar profundidade e foco (estrutura no centro útil)
2. Garantir que a maior dimensão está contida no plano
3. **Só então** medir

### 3.5.2 Bordas: o que é "borda"?

Em USG, borda depende de:
- **Ganho**: borda "engorda" com ganho alto
- **Compressão**: órgão muda de tamanho
- **Anisotropia**: tendões/vasos mudam com ângulo
- **Sombra**: artefato pode esconder borda

#### Regra do manual (bordas)

Descrever o método quando a medida tiver **impacto clínico**.

**Exemplo**: Aorta abdominal
- **Inner-to-inner**: diâmetro luminaldireto)
- **Outer-to-outer**: diâmetro total (parede inclusa)
- **Leading-edge**: borda anterior a borda anterior

**Regra para aneurisma**: Usar outer-to-outer [ACR-PPTS-AAA-US-2025]

### Checklist 3.1 — USG: checklist metrológico rápido

- [ ] Plano correto (longitudinal/transversal/oblíquo declarado)
- [ ] Estrutura inteira no campo (sem "cortar" extremidade)
- [ ] Ganho/foco ajustados (borda nítida)
- [ ] Sem compressão excessiva (quando relevante)
- [ ] Unidade padronizada (mm ou cm)
- [ ] Método de borda documentado (se crítico)

---

## 3.6 Doppler: parâmetros técnicos que mudam velocidades/índices

### 3.6.1 Ângulo e correção

A velocidade calculada depende do **cosseno do ângulo**. Pequenos erros de ângulo, especialmente em ângulos altos, geram **grandes erros**.

#### Fórmula 3.3 — Relação básica (conceitual) do Doppler

```
v ∝ 1 / cos(θ)
```

(mantendo demais variáveis constantes)

**Tradução**: Quanto maior o ângulo (θ), maior o erro na velocidade (v).

#### Exemplo Resolvido 3.3 — Erro de ângulo

**Situação**: Mesma onda, operadores usam ângulos diferentes

**Dados**:
- Operador A: θ = 50°
- Operador B: θ = 60°

**Cálculo**:
```
cos(50°) ≈ 0,64
cos(60°) = 0,50

Razão (v_B / v_A) ≈ 0,64 / 0,50 = 1,28
```

**Resultado**: Só pelo ângulo, a velocidade pode "subir" ~28%!

**Moral operacional**:
> Em Doppler, anotar o ângulo e padronizar técnica **importa tanto quanto o número final**.

#### Regra do manual (ângulo Doppler)

- Ângulo ideal: **0°-60°** [ACR-PPTS-RENAL-DUPLEX-2023]
- Preferir: **< 60°**
- Registrar: sempre documentar ângulo usado

---

### 3.6.2 PRF (Pulse Repetition Frequency) e aliasing

| PRF | Consequência | Quando usar |
|-----|--------------|-------------|
| **Baixo** | Aliasing em altas velocidades | Fluxo lento (veias, portal) |
| **Alto** | Perde sensibilidade para fluxo lento | Fluxo rápido (arterial) |

**Regra prática**: Ajustar PRF para que o espectro fique **dentro da escala**, sem aliasing.

---

### 3.6.3 Gate (volume de amostra) e posição

| Gate | Problema | Solução |
|------|----------|---------|
| **Grande demais** | Mistura perfis (turbulência + laminar) | Reduzir para 1-2 mm |
| **Off-center** | Altera PSV/EDV | Posicionar no centro do vaso |

### Checklist 3.2 — Doppler: checklist metrológico

- [ ] Ângulo de insonação ≤ 60° (documentado)
- [ ] PRF adequado (sem aliasing no espectro)
- [ ] Gate posicionado no centro do vaso
- [ ] Filtro de parede ajustado (não "come" diástole)
- [ ] Medida repetida em 2-3 ciclos (média)
- [ ] Respiração suspensa (se aplicável)

---

## 3.7 TC: HU/ROI e efeitos de reconstrução

### 3.7.1 ROI: regras práticas

#### O que EVITAR incluir no ROI:

- ❌ Vasos (contrastados ou calcificados)
- ❌ Calcificações puntiformes
- ❌ Bordas (parcial volume)
- ❌ Artefatos (streak, beam hardening)

#### O que FAZER:

- ✅ ROI circular > 1 cm² (se lesão permitir)
- ✅ Múltiplas ROIs (pelo menos 3)
- ✅ Registrar média ± desvio padrão

#### Exemplo Resolvido 3.4 — Média de HU em 3 ROIs

**Dados**: Lesão hepática em fase sem contraste

**Medidas**:
- ROI 1 = 38 HU
- ROI 2 = 41 HU
- ROI 3 = 36 HU

**Cálculo**:
```
Média = (38 + 41 + 36) / 3
Média = 115 / 3
Média = 38,3 HU
```

**Arredondamento** (HU = inteiro):
```
38,3 HU → 38 HU
```

**Registro operacional**:
> Sempre registrar a **fase** (sem contraste/arterial/portal/tardio) junto do HU.

---

### 3.7.2 Kernel e efeito em bordas

| Kernel | Aplicação | Efeito em Medida |
|--------|-----------|------------------|
| **Soft tissue** (standard) | Parênquima | Boa para HU, bordas suaves |
| **Bone/sharp** | Pulmão, osso | Bordas acentuadas, pode alterar diâmetro |

**Regra do manual**: Usar kernel **standard** para medidas de parênquima e **documentar** se usar outro.

---

## 3.8 RM: voxel, distorção e movimento

### 3.8.1 Voxel grande e bordas borradas

| Voxel | Efeito |
|-------|--------|
| Grande (ex.: 2×2×5 mm) | Bordas borradas, sub/superestima diâmetros |
| Pequeno (ex.: 0,5×0,5×3 mm) | Melhor definição, mas maior tempo/ruído |

**Regra prática**: Para medidas precisas, voxel in-plane ≤ 1 mm.

---

### 3.8.2 Movimento e artefatos

| Fonte | Efeito | Mitigação |
|-------|--------|-----------|
| Respiração | Perda de nitidez | Breath-hold, navigator |
| Peristalse | Borramento | Antiespasmódico |
| Fluxo | Artefato vascular | Saturação vascular |

---

### 3.8.3 Distorção (EPI/difusão)

**Regra do manual**:
> Quando a difusão tiver **artefatos de distorção**, relatar restrição à difusão de forma **qualitativa**, sem valores numéricos de ADC em áreas distorcidas.

---

## 3.9 Arredondamento: por que ele é parte da metrologia

Arredondar "no olho" cria **viés invisível** no follow-up.

#### Exemplo Resolvido 3.5 — follow-up com arredondamento inconsistente

**Contexto**: Nódulo hepático em 2 exames

**Exame A**:
- Medida bruta: 9,6 mm
- Arredondamento: 10 mm (para cima)

**Exame B**:
- Medida bruta: 10,4 mm
- Arredondamento: 10 mm (para baixo)

**Problema**:
> O laudo pode parecer "estável" quando há **variação real** de 0,8 mm.

**Regra do manual**:
- Usar **sempre o mesmo padrão** de arredondamento
- Em follow-up crítico, registrar o valor com **1 casa decimal** quando o voxel permitir

---

## 3.10 QA mínimo de medidas (o que medir do processo, não do paciente)

### Tabela 3.2 — Indicadores de QA de metrologia (sugestão prática)

| Indicador | Como medir | Finalidade |
|-----------|------------|------------|
| Variabilidade **intraobservador** | Repetir medida em 10 casos | Treinar e calibrar |
| Variabilidade **interobservador** | 2 operadores em 10 casos | Padronizar técnica |
| Drift por equipamento | Comparar medidas em phantom/rotina | Detectar mudança de calibração |
| Conformidade de protocolo | Checklist por exame | Reduzir erro sistemático |

---

### Checklist 3.3 — QA básico (mensal)

- [ ] Selecionar 10 casos aleatórios por modalidade
- [ ] Repetir 1-2 medidas-chave por caso
- [ ] Registrar discrepâncias e causa provável
- [ ] Atualizar treinamento/rotina se necessário
- [ ] Atualizar registro mestre (se mudou técnica local)

---

## 3.11 Tabela resumo: Fatores críticos por modalidade

### Tabela 3.3 — Fatores Técnicos Críticos (Resumo Executivo)

| Modalidade | Fator #1 | Fator #2 | Fator #3 | Impacto |
|------------|----------|----------|----------|---------|
| **USG** | Plano | Compressão | Ganho | ±10-20% |
| **Doppler** | Ângulo | PRF | Gate | ±20-30% |
| **TC** | Kernelfornecido | Fase | ROI | ±5-15% |
| **RM** | Voxel size | Movimento | Distorção | ±10-25% |

---

## 3.12 Exemplo completo de auditoria

### Exemplo Resolvido 3.6 — Auditoria de medida renal (USG)

**Cenário**: Revisar medida de comprimento renal em USG

**Passo 1: Localizar imagem**
- Exam ID: 12345
- Série: 3 (RIM DIREITO LONGITUDINAL)

**Passo 2: Verificar plano**
- ✅ Plano sagital oblíquo
- ✅ Polo superior e inferior visíveis
- ✅ Sem obliquidade excessiva

**Passo 3: Avaliar caliper**
- Posição: Polo a polo (correto)
- Medida DICOM: 114 mm
- Conversão: 114 mm = 11,4 cm

**Passo 4: Aplicar arredondamento**
- Padrão para órgãos: 0,1 cm
- 11,4 cm → mantém 11,4 cm (já está correto)

**Passo 5: Comparar com referência**
- Referência: 9-12 cm [ACR-PPTS-RENAL-DUPLEX-2023]
- 11,4 cm → dentro da normalidade

**Passo 6: Validar laudo**
- Texto atual: "Rim direito medindo 11 cm"
- Sugestão: "Rim direito medindo 11,4 cm (normal: 9-12 cm)"

**Resultado da auditoria**:
- ✅ Técnica correta
- ⚠️ Laudo arredondou desnecessariamente (11,4 → 11)
- **Recomendação**: Manter 1 decimal

---

## 3.13 Glossário de termos metrológicos

| Termo | Definição |
|-------|-----------|
| **Acurácia** | Proximidade ao valor verdadeiro |
| **Precisão** | Repetibilidade/consistência |
| **Viés** | Erro sistemático (sempre para um lado) |
| **Incerteza** | Intervalo de confiança do valor |
| **Parcial volume** | Efeito de bordas em voxels grossos |
| **Aliasing** | Artefato Doppler (velocidade fora da escala) |
| **ROI** | Region of Interest |
| **HU** | Hounsfield Unit (atenuação TC) |
| **voxel** | Elemento de volume 3D (equivalente a pixel em 3D) |

---

## Referências bibliográficas do capítulo

1. ACR–SPR–SRU Practice Parameter for the Performance and Interpretation of Diagnostic Ultrasound Examinations (Revised 2023).
2. ACR–AIUM–SPR–SRU Practice Parameter for the Performance of Duplex Sonography of Native Renal Vessels (Revised 2023).
3. ACR–AIUM–SRU Practice Parameter for the Performance of Diagnostic and Screening Ultrasound of the Abdominal Aorta in Adults (Revised 2025).
4. Quantitative Imaging Biomarkers Alliance (QIBA). RSNA. Disponível em: qibawiki.rsna.org
5. European Society of Radiology (ESR). Quality and Safety Committee statements and guidelines. Insights Imaging, 2023.

---

**FIM DO CAPÍTULO 3**

*Próximo: Capítulo 4 — DICOM e Metadados Críticos para Medidas*

---

## ANEXO 3A — Tabela de Conversão Rápida

### Comprimentos

| mm | cm | Arredondamento Sugerido |
|----|----|-----------------------|
| 1-30 | 0,1-3,0 | 1 mm ou 0,1 cm |
| 31-100 | 3,1-10,0 | 1 mm ou 0,1 cm |
| > 100 | > 10 | 1 cm |

### Volumes

| mL | Arredondamento |
|----|----------------|
| < 10 | 0,1 mL |
| 10-100 | 1 mL |
| > 100 | 10 mL (ou 1 mL se crítico) |

### Velocidades (Doppler)

| cm/s | Arredondamento |
|------|----------------|
| < 100 | 1 cm/s |
| ≥ 100 | 5 cm/s |

### HU (TC)

| Faixa | Arredondamento |
|-------|----------------|
| Todas | Inteiro (sem decimal) |

---

## ANEXO 3B — Template de Registro de Medida para Auditoria

```
═══════════════════════════════════════════════════════════
REGISTRO DE MEDIDA - TEMPLATE DE AUDITORIA
═══════════════════════════════════════════════════════════

Data: ___/___/______
Revisor: _________________
Modalidade: [ ] USG  [ ] Doppler  [ ] TC  [ ] RM

Identificação do Exame:
  - Exam ID: _______________
  - Série/Sequência: _______________
  - Estrutura medida: _______________

Técnica:
  - Plano/Orientação: _______________
  - Referência anatômica: _______________
  - Parâmetros críticos: _______________

Medição:
  - Valor bruto: ________ [unidade]
  - Valor arredondado: ________ [unidade]
  - Método de caliper: [ ] Inner-inner  [ ] Outer-outer  [ ] Leading-edge

Conformidade:
  - Técnica conforme manual: [ ] Sim  [ ] Não
  - Arredondamento conforme manual: [ ] Sim  [ ] Não
  - Fonte de referência citada: [ ] Sim  [ ] Não

Discrepâncias (se houver):
___________________________________________
___________________________________________

Ação corretiva:
___________________________________________
___________________________________________

═══════════════════════════════════════════════════════════
```
