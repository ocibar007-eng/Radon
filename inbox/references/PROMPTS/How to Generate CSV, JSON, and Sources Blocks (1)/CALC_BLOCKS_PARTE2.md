# CALC_BLOCKS - PARTE 2 (35 Itens)

## ABD-0016: Bile Duct Diameter

```
CALC_BLOCK:
  ItemID: ABD-0016
  FunctionName: measure_bile_duct_diameter
  
  Inputs:
    - name: d_ducto_biliar
      type: number
      unit: mm
      required: true
      valid_range: 0-20
      notes: Diâmetro máximo ducto biliar
  
  Preprocessing:
    - Validar d_ducto_biliar > 0
    - Medir eixo transversal máximo
    - Usar US ou TC
    - Evitar confundir com veia porta
  
  Formula:
    d_ducto = diâmetro máximo (mm)
    
    Passo 1: Localizar ducto biliar
    Passo 2: Medir no eixo transversal
    Passo 3: Resultado é diâmetro (mm)
  
  Output:
    primary_value:
      name: bile_duct_diameter
      unit: mm
      precision: 1 casa decimal
    derived_values:
      - name: dilatation_status
        value: "Normal / Borderline / Dilatado"
  
  Interpretation:
    rules:
      - if: d_ducto < 6
        then: "Normal"
      - if: 6 <= d_ducto <= 7
        then: "Borderline; considerar contexto clínico"
      - if: 7 < d_ducto <= 10
        then: "Dilatado leve; investigar causa (obstrução, pós-colecistectomia)"
      - if: d_ducto > 10
        then: "Dilatado moderado-grave; sugerir obstrução"
  
  QA_Checks:
    - Alertar se d_ducto < 2 mm (possível erro)
    - Alertar se d_ducto > 20 mm (possível erro)
    - Validar medição em eixo transversal
    - Verificar se não confunde com veia porta
    - Considerar idade (aumenta ligeiramente com idade)
  
  Evidence:
    primary_source: "Laing FC, Jacobs RP. Ultrasonic evaluation common bile duct. Radiology. 1981;139(1):161-165."
    radiopaedia_link: "https://radiopaedia.org/articles/common-bile-duct-diameter"
    notes: "Valor normal <6 mm. Aumenta ligeiramente com idade (até 8 mm em >60 anos)."
```

---

## ABD-0017: Gallbladder Wall Thickness

```
CALC_BLOCK:
  ItemID: ABD-0017
  FunctionName: measure_gallbladder_wall_thickness
  
  Inputs:
    - name: espessura_parede
      type: number
      unit: mm
      required: true
      valid_range: 0-10
      notes: Espessura máxima parede vesicular
  
  Preprocessing:
    - Validar espessura > 0
    - Medir parede anterior ou posterior
    - Usar US em jejum
    - Evitar artefatos de reverberação
  
  Formula:
    espessura = medição máxima parede (mm)
    
    Passo 1: Localizar vesícula biliar
    Passo 2: Medir parede anterior ou posterior
    Passo 3: Resultado é espessura (mm)
  
  Output:
    primary_value:
      name: gb_wall_thickness
      unit: mm
      precision: 1 casa decimal
    derived_values:
      - name: cholecystitis_likelihood
        value: "Normal / Borderline / Sugestivo colecistite"
  
  Interpretation:
    rules:
      - if: espessura < 3
        then: "Normal"
      - if: 3 <= espessura <= 3.5
        then: "Borderline; considerar contexto clínico"
      - if: 3.5 < espessura <= 5
        then: "Espessado; sugerir colecistite aguda"
      - if: espessura > 5
        then: "Muito espessado; colecistite aguda provável"
  
  QA_Checks:
    - Alertar se espessura < 1 mm (possível erro)
    - Alertar se espessura > 10 mm (possível erro)
    - Validar medição em parede anterior/posterior
    - Verificar se não confunde com artefato
    - Considerar contexto clínico (febre, Murphy positivo)
  
  Evidence:
    primary_source: "Ralls PW et al. Real-time sonography suspected acute cholecystitis. AJR. 1982;139(1):75-79."
    radiopaedia_link: "https://radiopaedia.org/articles/gallbladder-wall-thickness"
    notes: "Valor normal <3 mm. Espessura >3.5 mm sugerir colecistite aguda."
```

---

## ABD-0018: Hepatic Steatosis Ultrasound

```
CALC_BLOCK:
  ItemID: ABD-0018
  FunctionName: grade_hepatic_steatosis_ultrasound
  
  Inputs:
    - name: ecogenicidade_figado
      type: enum
      required: true
      valid_values: ["normal", "levemente_aumentada", "moderadamente_aumentada", "acentuadamente_aumentada"]
      notes: Ecogenicidade fígado
    
    - name: visibilidade_diafragma
      type: enum
      required: true
      valid_values: ["normal", "reduzida", "ausente"]
      notes: Visualização diafragma
    
    - name: atenuacao_posterior
      type: enum
      required: true
      valid_values: ["ausente", "leve", "moderada", "acentuada"]
      notes: Atenuação posterior
  
  Preprocessing:
    - Validar cada parâmetro
    - Usar US em jejum
    - Medir em ROI ≥1 cm
    - Comparar com rim direito
  
  Formula:
    Grau = f(ecogenicidade, diafragma, atenuação)
    
    Passo 1: Avaliar ecogenicidade
    Passo 2: Avaliar visibilidade diafragma
    Passo 3: Avaliar atenuação posterior
    Passo 4: Aplicar tabela grau esteatose
  
  Output:
    primary_value:
      name: steatosis_grade
      value: "0 (Normal) / 1 (Leve) / 2 (Moderada) / 3 (Grave)"
    derived_values:
      - name: steatosis_percent_estimate
        value: "Estimativa percentual gordura (%)"
  
  Interpretation:
    rules:
      - if: steatosis_grade = 0
        then: "Sem esteatose"
      - if: steatosis_grade = 1
        then: "Esteatose leve (<30% gordura)"
      - if: steatosis_grade = 2
        then: "Esteatose moderada (30-60% gordura)"
      - if: steatosis_grade = 3
        then: "Esteatose grave (>60% gordura)"
  
  QA_Checks:
    - Validar cada parâmetro
    - Verificar se US em jejum
    - Alertar se cirrose presente (invalida grau)
    - Alertar se ferro hepático presente
    - Considerar contexto clínico (obesidade, diabetes)
  
  Evidence:
    primary_source: "Hamaguchi M et al. Severity ultrasonographic findings NAFLD. AJR. 2007;188(6):1490-1496."
    radiopaedia_link: "https://radiopaedia.org/articles/diffuse-hepatic-steatosis"
    notes: "Grau US para esteatose. Correlaciona com biópsia e RM."
```

---

## ABD-0019: Pancreatic Echogenicity

```
CALC_BLOCK:
  ItemID: ABD-0019
  FunctionName: grade_pancreatic_echogenicity
  
  Inputs:
    - name: ecogenicidade_pancreas
      type: enum
      required: true
      valid_values: ["normal", "levemente_aumentada", "moderadamente_aumentada", "acentuadamente_aumentada"]
      notes: Ecogenicidade pâncreas
    
    - name: comparacao_figado
      type: enum
      required: true
      valid_values: ["hipoecóica", "isoecóica", "hiperecóica"]
      notes: Comparação com fígado
  
  Preprocessing:
    - Validar cada parâmetro
    - Usar US em jejum
    - Medir em ROI ≥1 cm
    - Comparar com fígado e rim
  
  Formula:
    Grau = f(ecogenicidade, comparação)
    
    Passo 1: Avaliar ecogenicidade pâncreas
    Passo 2: Comparar com fígado
    Passo 3: Aplicar tabela grau
  
  Output:
    primary_value:
      name: pancreatic_echogenicity_grade
      value: "Normal / Leve / Moderada / Grave"
    derived_values:
      - name: chronic_pancreatitis_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: ecogenicidade = "normal"
        then: "Normal; sem fibrose significativa"
      - if: ecogenicidade = "levemente_aumentada"
        then: "Pancreatite crônica leve"
      - if: ecogenicidade = "moderadamente_aumentada"
        then: "Pancreatite crônica moderada"
      - if: ecogenicidade = "acentuadamente_aumentada"
        then: "Pancreatite crônica grave"
  
  QA_Checks:
    - Validar cada parâmetro
    - Verificar se US em jejum
    - Alertar se gases intestinais limitam visualização
    - Considerar contexto clínico (álcool, tabagismo)
    - Documentar dilatação ductal se presente
  
  Evidence:
    primary_source: "Garg PK et al. Pancreatic echogenicity marker chronic pancreatitis. Pancreatology. 2006;6(4):334-341."
    radiopaedia_link: "https://radiopaedia.org/articles/chronic-pancreatitis"
    notes: "Ecogenicidade aumentada sugerir fibrose pancreática."
```

---

## ABD-0020: Psoas Muscle Index

```
CALC_BLOCK:
  ItemID: ABD-0020
  FunctionName: calculate_psoas_muscle_index
  
  Inputs:
    - name: area_psoas
      type: number
      unit: cm²
      required: true
      valid_range: 0-100
      notes: Área total músculo psoas (ambos lados)
    
    - name: altura
      type: number
      unit: m
      required: true
      valid_range: 1.0-2.5
      notes: Altura do paciente em metros
  
  Preprocessing:
    - Validar area_psoas > 0
    - Validar altura > 0
    - Usar TC nível L3
    - Segmentar ambos psoas
  
  Formula:
    PMI (cm²/m²) = area_psoas / altura²
    
    Passo 1: Segmentar ambos psoas em L3
    Passo 2: Calcular área total
    Passo 3: Dividir por altura²
  
  Output:
    primary_value:
      name: psoas_muscle_index
      unit: cm²/m²
      precision: 1 casa decimal
    derived_values:
      - name: sarcopenia_status
        value: "Normal / Borderline / Sarcopenia"
  
  Interpretation:
    rules:
      - if: pmi >= 8.4 (homem) OR pmi >= 5.5 (mulher)
        then: "Normal"
      - if: pmi < 8.4 (homem) OR pmi < 5.5 (mulher)
        then: "Sarcopenia; associado com pior prognóstico"
  
  QA_Checks:
    - Alertar se area_psoas < 10 cm² (possível erro)
    - Alertar se area_psoas > 100 cm² (possível erro)
    - Validar segmentação em L3
    - Verificar se ambos psoas inclusos
    - Considerar sexo para interpretação
  
  Evidence:
    primary_source: "Prado CM et al. Prevalence clinical implications sarcopenia cancer. J Cachexia Sarcopenia Muscle. 2015;6(1):9-17."
    radiopaedia_link: "https://radiopaedia.org/articles/sarcopenia"
    notes: "Índice para detectar sarcopenia. Prediz prognóstico em câncer."
```

---

## ABD-0021: Visceral Fat Area

```
CALC_BLOCK:
  ItemID: ABD-0021
  FunctionName: measure_visceral_fat_area
  
  Inputs:
    - name: vfa_cm2
      type: number
      unit: cm²
      required: true
      valid_range: 0-500
      notes: Área gordura visceral em TC
  
  Preprocessing:
    - Validar vfa_cm2 > 0
    - Usar TC nível L4-L5
    - Segmentar gordura visceral (HU -150 a -50)
    - Usar threshold automático
  
  Formula:
    VFA = área gordura visceral (cm²)
    
    Passo 1: Localizar nível L4-L5
    Passo 2: Segmentar gordura visceral
    Passo 3: Resultado é VFA (cm²)
  
  Output:
    primary_value:
      name: visceral_fat_area
      unit: cm²
      precision: 0 casas decimais
    derived_values:
      - name: metabolic_risk
        value: "Baixo / Intermediário / Alto"
  
  Interpretation:
    rules:
      - if: vfa_cm2 < 100
        then: "Normal"
      - if: 100 <= vfa_cm2 <= 150
        then: "Aumentado; risco metabólico intermediário"
      - if: vfa_cm2 > 150
        then: "Muito aumentado; risco metabólico alto"
  
  QA_Checks:
    - Alertar se vfa < 20 cm² (possível erro)
    - Alertar se vfa > 500 cm² (possível erro)
    - Validar segmentação em L4-L5
    - Verificar se threshold correto
    - Considerar sexo e idade
  
  Evidence:
    primary_source: "Kvist H et al. Total visceral adipose-tissue volumes healthy adults. Am J Clin Nutr. 1988;48(5):1351-1361."
    radiopaedia_link: "https://radiopaedia.org/articles/visceral-fat"
    notes: "VFA >150 cm² associado com síndrome metabólica."
```

---

## ABD-0022: Abdominal Aorta Calcification Score

```
CALC_BLOCK:
  ItemID: ABD-0022
  FunctionName: calculate_aorta_calcification_score
  
  Inputs:
    - name: grau_calcificacao
      type: enum
      required: true
      valid_values: ["0", "1", "2", "3", "4"]
      notes: Grau calcificação (0-4 escala visual)
  
  Preprocessing:
    - Validar grau entre 0-4
    - Usar TC sem contraste
    - Avaliar segmento abdominal
    - Usar escala visual ou automática
  
  Formula:
    AAC Score = grau calcificação (0-4)
    
    Passo 1: Localizar aorta abdominal
    Passo 2: Avaliar calcificação visual
    Passo 3: Atribuir grau (0-4)
  
  Output:
    primary_value:
      name: aac_score
      value: "0 / 1 / 2 / 3 / 4"
    derived_values:
      - name: cardiovascular_risk
        value: "Baixo / Intermediário / Alto"
  
  Interpretation:
    rules:
      - if: aac_score = 0
        then: "Sem calcificação; risco cardiovascular baixo"
      - if: aac_score = 1
        then: "Calcificação leve; risco intermediário"
      - if: aac_score = 2
        then: "Calcificação moderada; risco intermediário-alto"
      - if: aac_score = 3 OR aac_score = 4
        then: "Calcificação grave; risco cardiovascular alto"
  
  QA_Checks:
    - Validar grau entre 0-4
    - Verificar se TC sem contraste
    - Alertar se calcificação em outros vasos
    - Considerar idade e comorbidades
    - Documentar localização calcificação
  
  Evidence:
    primary_source: "Kauppila LI et al. New indices quantify calcific atherosclerosis. Arterioscler Thromb Vasc Biol. 1994;14(7):1080-1087."
    radiopaedia_link: "https://radiopaedia.org/articles/vascular-calcification"
    notes: "AAC Score prediz risco cardiovascular. Score >2 = risco alto."
```

---

## ABD-0023: Bowel Wall Thickness

```
CALC_BLOCK:
  ItemID: ABD-0023
  FunctionName: measure_bowel_wall_thickness
  
  Inputs:
    - name: espessura_parede
      type: number
      unit: mm
      required: true
      valid_range: 0-10
      notes: Espessura máxima parede intestinal
  
  Preprocessing:
    - Validar espessura > 0
    - Medir em segmento inflamado
    - Usar TC ou US
    - Evitar confundir com contraste luminal
  
  Formula:
    espessura = medição máxima parede (mm)
    
    Passo 1: Localizar segmento intestinal
    Passo 2: Medir parede máxima
    Passo 3: Resultado é espessura (mm)
  
  Output:
    primary_value:
      name: bowel_wall_thickness
      unit: mm
      precision: 1 casa decimal
    derived_values:
      - name: inflammation_likelihood
        value: "Normal / Borderline / Inflamado"
  
  Interpretation:
    rules:
      - if: espessura < 2
        then: "Normal"
      - if: 2 <= espessura <= 3
        then: "Borderline; considerar contexto clínico"
      - if: 3 < espessura <= 5
        then: "Espessado; sugerir inflamação (Crohn, colite)"
      - if: espessura > 5
        then: "Muito espessado; inflamação grave ou neoplasia"
  
  QA_Checks:
    - Alertar se espessura < 1 mm (possível erro)
    - Alertar se espessura > 10 mm (possível erro)
    - Validar medição em parede máxima
    - Verificar se não confunde com contraste
    - Documentar localização e extensão
  
  Evidence:
    primary_source: "Hara AK et al. Diagnosis treatment mesenteric ischemia. AJR. 2009;192(2):408-416."
    radiopaedia_link: "https://radiopaedia.org/articles/bowel-wall-thickness"
    notes: "Espessura normal <2 mm. >3 mm sugerir inflamação."
```

---

## ABD-0024: Mesenteric Fat Stranding

```
CALC_BLOCK:
  ItemID: ABD-0024
  FunctionName: grade_mesenteric_fat_stranding
  
  Inputs:
    - name: grau_stranding
      type: enum
      required: true
      valid_values: ["ausente", "leve", "moderado", "acentuado"]
      notes: Grau estriamento gordura mesentérica
  
  Preprocessing:
    - Validar grau_stranding
    - Usar TC com contraste
    - Avaliar gordura mesentérica
    - Usar escala visual
  
  Formula:
    Grau = avaliação visual estriamento
    
    Passo 1: Localizar gordura mesentérica
    Passo 2: Avaliar estriamento visual
    Passo 3: Atribuir grau (ausente/leve/moderado/acentuado)
  
  Output:
    primary_value:
      name: mesenteric_stranding_grade
      value: "Ausente / Leve / Moderado / Acentuado"
    derived_values:
      - name: pathology_likelihood
        value: "Normal / Inflamação / Isquemia"
  
  Interpretation:
    rules:
      - if: grau_stranding = "ausente"
        then: "Normal"
      - if: grau_stranding = "leve"
        then: "Borderline; considerar contexto clínico"
      - if: grau_stranding = "moderado"
        then: "Inflamação mesentérica; considerar isquemia, diverticulite"
      - if: grau_stranding = "acentuado"
        then: "Inflamação acentuada; sugerir isquemia mesentérica aguda"
  
  QA_Checks:
    - Validar grau_stranding
    - Verificar se TC com contraste
    - Alertar se isquemia mesentérica (emergência)
    - Documentar localização
    - Considerar contexto clínico
  
  Evidence:
    primary_source: "Hara AK et al. Diagnosis treatment mesenteric ischemia. AJR. 2009;192(2):408-416."
    radiopaedia_link: "https://radiopaedia.org/articles/acute-mesenteric-ischemia"
    notes: "Estriamento moderado-acentuado sugerir isquemia mesentérica."
```

---

## ABD-0025: Hepatic Artery Resistive Index

```
CALC_BLOCK:
  ItemID: ABD-0025
  FunctionName: calculate_hepatic_artery_ri
  
  Inputs:
    - name: PSV
      type: number
      unit: m/s
      required: true
      valid_range: 0-2
      notes: Velocidade sistólica pico artéria hepática
    
    - name: EDV
      type: number
      unit: m/s
      required: true
      valid_range: 0-2
      notes: Velocidade diastólica final artéria hepática
  
  Preprocessing:
    - Validar PSV > 0 e EDV >= 0
    - Validar PSV >= EDV
    - Usar Doppler pulsado
    - Medir em segmento proximal
  
  Formula:
    RI = (PSV - EDV) / PSV
    
    Passo 1: Medir PSV artéria hepática
    Passo 2: Medir EDV artéria hepática
    Passo 3: Calcular RI
  
  Output:
    primary_value:
      name: hepatic_artery_ri
      unit: ratio (0-1)
      precision: 2 casas decimais
    derived_values:
      - name: cirrhosis_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: ri < 0.55
        then: "Normal; sem cirrose"
      - if: 0.55 <= ri <= 0.70
        then: "Borderline; possível cirrose leve"
      - if: ri > 0.70
        then: "Aumentado; sugerir cirrose avançada"
  
  QA_Checks:
    - Alertar se RI < 0.3 (possível erro)
    - Alertar se RI > 1.0 (erro matemático)
    - Validar ângulo Doppler <60°
    - Verificar se medições em segmento proximal
    - Considerar contexto clínico
  
  Evidence:
    primary_source: "McNaughton D, Abu-Yousef M. Doppler US Liver. Radiographics. 2011;31(1):161-188."
    radiopaedia_link: "https://radiopaedia.org/articles/resistive-index-vascular-ultrasound"
    notes: "RI >0.70 sugerir cirrose. Complementar com outros índices."
```

---

## ABD-0026: Hepatic Vein Doppler Waveform

```
CALC_BLOCK:
  ItemID: ABD-0026
  FunctionName: classify_hepatic_vein_doppler
  
  Inputs:
    - name: padrão_fluxo
      type: enum
      required: true
      valid_values: ["normal_trifásico", "bifásico", "monofásico", "reverso"]
      notes: Padrão fluxo veia hepática
  
  Preprocessing:
    - Validar padrão_fluxo
    - Usar Doppler pulsado
    - Medir em veia hepática proximal
    - Avaliar durante respiração
  
  Formula:
    Padrão = classificação visual fluxo
    
    Passo 1: Localizar veia hepática
    Passo 2: Avaliar padrão Doppler
    Passo 3: Classificar padrão
  
  Output:
    primary_value:
      name: hepatic_vein_pattern
      value: "Normal / Alterado / Reverso"
    derived_values:
      - name: portal_hypertension_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: padrão_fluxo = "normal_trifásico"
        then: "Normal; sem hipertensão portal"
      - if: padrão_fluxo = "bifásico"
        then: "Borderline; possível hipertensão portal leve"
      - if: padrão_fluxo = "monofásico"
        then: "Alterado; sugerir hipertensão portal"
      - if: padrão_fluxo = "reverso"
        then: "Reverso; hipertensão portal avançada"
  
  QA_Checks:
    - Validar padrão_fluxo
    - Verificar se medições em veia proximal
    - Alertar se fluxo reverso (emergência)
    - Documentar padrão durante respiração
    - Considerar contexto clínico
  
  Evidence:
    primary_source: "Bolondi L et al. Sonographic assessment hepatic hemodynamics. Semin Ultrasound CT MR. 1992;13(1):40-56."
    radiopaedia_link: "https://radiopaedia.org/articles/portal-hypertension"
    notes: "Padrão monofásico/reverso sugerir hipertensão portal."
```

---

## ABD-0027: Renal Artery Peak Systolic Velocity

```
CALC_BLOCK:
  ItemID: ABD-0027
  FunctionName: measure_renal_artery_psv
  
  Inputs:
    - name: PSV_cm_s
      type: number
      unit: cm/s
      required: true
      valid_range: 0-400
      notes: Velocidade sistólica pico artéria renal
  
  Preprocessing:
    - Validar PSV > 0
    - Usar Doppler pulsado
    - Medir em segmento proximal
    - Converter m/s para cm/s se necessário
  
  Formula:
    PSV = velocidade sistólica pico (cm/s)
    
    Passo 1: Localizar artéria renal proximal
    Passo 2: Medir PSV
    Passo 3: Resultado é PSV (cm/s)
  
  Output:
    primary_value:
      name: renal_artery_psv
      unit: cm/s
      precision: 0 casas decimais
    derived_values:
      - name: stenosis_likelihood
        value: "Sem estenose / Borderline / Provável estenose"
  
  Interpretation:
    rules:
      - if: PSV < 180
        then: "Normal; sem estenose significativa"
      - if: 180 <= PSV <= 200
        then: "Borderline; considerar RAR"
      - if: PSV > 200
        then: "Aumentado; sugerir estenose ≥60%"
  
  QA_Checks:
    - Alertar se PSV < 50 cm/s (possível erro)
    - Alertar se PSV > 400 cm/s (possível erro)
    - Validar ângulo Doppler <60°
    - Verificar se medições em segmento proximal
    - Considerar débito cardíaco
  
  Evidence:
    primary_source: "Olin JW et al. USRFMD Registry. Circ Cardiovasc Interv. 2012;5(3):432-438."
    radiopaedia_link: "https://radiopaedia.org/articles/renal-artery-stenosis"
    notes: "PSV >180 cm/s sugerir estenose. Complementar com RAR."
```

---

## ABD-0028: Renal Artery End-Diastolic Velocity

```
CALC_BLOCK:
  ItemID: ABD-0028
  FunctionName: measure_renal_artery_edv
  
  Inputs:
    - name: EDV_cm_s
      type: number
      unit: cm/s
      required: true
      valid_range: 0-200
      notes: Velocidade diastólica final artéria renal
  
  Preprocessing:
    - Validar EDV >= 0
    - Usar Doppler pulsado
    - Medir em segmento proximal
    - Converter m/s para cm/s se necessário
  
  Formula:
    EDV = velocidade diastólica final (cm/s)
    
    Passo 1: Localizar artéria renal proximal
    Passo 2: Medir EDV
    Passo 3: Resultado é EDV (cm/s)
  
  Output:
    primary_value:
      name: renal_artery_edv
      unit: cm/s
      precision: 0 casas decimais
    derived_values:
      - name: severe_stenosis_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: EDV > 45
        then: "Normal; sem estenose grave"
      - if: 20 <= EDV <= 45
        then: "Borderline; possível estenose moderada"
      - if: EDV < 20
        then: "Reduzido; sugerir estenose grave (>80%)"
  
  QA_Checks:
    - Alertar se EDV < 0 cm/s (erro)
    - Alertar se EDV > 200 cm/s (possível erro)
    - Validar ângulo Doppler <60°
    - Verificar se medições em segmento proximal
    - Considerar débito cardíaco
  
  Evidence:
    primary_source: "Olin JW et al. USRFMD Registry. Circ Cardiovasc Interv. 2012;5(3):432-438."
    radiopaedia_link: "https://radiopaedia.org/articles/renal-artery-stenosis"
    notes: "EDV <20 cm/s sugerir estenose grave. Complementar com PSV/RAR."
```

---

## ABD-0029: Resistive Index Renal Transplant

```
CALC_BLOCK:
  ItemID: ABD-0029
  FunctionName: calculate_renal_transplant_ri
  
  Inputs:
    - name: PSV
      type: number
      unit: m/s
      required: true
      valid_range: 0-2
      notes: Velocidade sistólica pico artéria renal transplante
    
    - name: EDV
      type: number
      unit: m/s
      required: true
      valid_range: 0-2
      notes: Velocidade diastólica final artéria renal transplante
  
  Preprocessing:
    - Validar PSV > 0 e EDV >= 0
    - Validar PSV >= EDV
    - Usar Doppler pulsado
    - Medir em segmento proximal
  
  Formula:
    RI = (PSV - EDV) / PSV
    
    Passo 1: Medir PSV artéria renal transplante
    Passo 2: Medir EDV artéria renal transplante
    Passo 3: Calcular RI
  
  Output:
    primary_value:
      name: transplant_ri
      unit: ratio (0-1)
      precision: 2 casas decimais
    derived_values:
      - name: rejection_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: ri < 0.70
        then: "Normal; sem rejeição"
      - if: 0.70 <= ri <= 0.80
        then: "Borderline; considerar contexto clínico"
      - if: ri > 0.80
        then: "Aumentado; sugerir rejeição ou disfunção"
  
  QA_Checks:
    - Alertar se RI < 0.3 (possível erro)
    - Alertar se RI > 1.0 (erro matemático)
    - Validar ângulo Doppler <60°
    - Verificar se medições em segmento proximal
    - Considerar creatinina sérica
  
  Evidence:
    primary_source: "Radermecker RP et al. Renal resistive index assessment renal transplant. Nephrol Dial Transplant. 2002;17(8):1409-1417."
    radiopaedia_link: "https://radiopaedia.org/articles/renal-transplant-doppler"
    notes: "RI >0.80 sugerir rejeição. Complementar com creatinina."
```

---

## ABD-0030: Adrenal Gland Size

```
CALC_BLOCK:
  ItemID: ABD-0030
  FunctionName: measure_adrenal_size
  
  Inputs:
    - name: diametro_max
      type: number
      unit: mm
      required: true
      valid_range: 0-50
      notes: Maior diâmetro glândula adrenal
  
  Preprocessing:
    - Validar diametro_max > 0
    - Medir eixo transversal máximo
    - Usar TC ou RM
    - Medir ambas adrenais
  
  Formula:
    d_adrenal = diâmetro máximo (mm)
    
    Passo 1: Localizar glândula adrenal
    Passo 2: Medir no eixo transversal
    Passo 3: Resultado é diâmetro (mm)
  
  Output:
    primary_value:
      name: adrenal_diameter
      unit: mm
      precision: 0 casas decimais
    derived_values:
      - name: hyperplasia_status
        value: "Normal / Borderline / Hiperplasia"
  
  Interpretation:
    rules:
      - if: diametro_max < 10
        then: "Normal"
      - if: 10 <= diametro_max <= 12
        then: "Borderline; considerar contexto clínico"
      - if: 12 < diametro_max <= 15
        then: "Aumentado; sugerir hiperplasia"
      - if: diametro_max > 15
        then: "Muito aumentado; hiperplasia provável"
  
  QA_Checks:
    - Alertar se diametro < 5 mm (possível erro)
    - Alertar se diametro > 50 mm (possível erro ou massa)
    - Validar medição em eixo transversal
    - Medir ambas adrenais para comparação
    - Considerar contexto clínico (Cushing, Addison)
  
  Evidence:
    primary_source: "Boland GW et al. Characterization adrenal masses. Radiology. 1998;209(1):131-138."
    radiopaedia_link: "https://radiopaedia.org/articles/adrenal-gland-size"
    notes: "Tamanho normal <10 mm. >12 mm sugerir hiperplasia."
```

---

## ABD-0031: Adrenal Lipid Content Index

```
CALC_BLOCK:
  ItemID: ABD-0031
  FunctionName: calculate_adrenal_lipid_index
  
  Inputs:
    - name: HU_nc
      type: number
      unit: HU
      required: true
      valid_range: -100-100
      notes: Atenuação fase NC (não contraste)
    
    - name: HU_portal
      type: number
      unit: HU
      required: true
      valid_range: 0-200
      notes: Atenuação fase portal
  
  Preprocessing:
    - Validar HU_nc entre -100 e 100
    - Validar HU_portal > 0
    - Usar ROI ≥1 cm
    - Protocolo: NC + portal
  
  Formula:
    Lipid Index = HU_nc
    
    Passo 1: Medir HU fase NC
    Passo 2: Se HU_nc < 0, sugere gordura (lipídico)
    Passo 3: Resultado é índice lipídico
  
  Output:
    primary_value:
      name: lipid_index
      unit: HU
      precision: 0 casas decimais
    derived_values:
      - name: adenoma_probability
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: lipid_index < -10
        then: "Muito lipídico; adenoma (alta especificidade)"
      - if: -10 <= lipid_index <= 10
        then: "Borderline; considerar complementação"
      - if: lipid_index > 10
        then: "Pouco lipídico; considerar não-adenoma"
  
  QA_Checks:
    - Alertar se lipid_index < -100 (possível erro)
    - Alertar se lipid_index > 100 (possível erro)
    - Validar ROI ≥1 cm
    - Verificar se evita necrose/vasos
    - Considerar insuficiência renal
  
  Evidence:
    primary_source: "Caoili EM et al. Adrenal masses characterization. Radiology. 2002;222(3):629-633."
    radiopaedia_link: "https://radiopaedia.org/articles/adrenal-adenoma"
    notes: "HU <-10 = adenoma lipídico com alta especificidade."
```

---

## ABD-0032: Splenic Artery Resistive Index

```
CALC_BLOCK:
  ItemID: ABD-0032
  FunctionName: calculate_splenic_artery_ri
  
  Inputs:
    - name: PSV
      type: number
      unit: m/s
      required: true
      valid_range: 0-2
      notes: Velocidade sistólica pico artéria esplênica
    
    - name: EDV
      type: number
      unit: m/s
      required: true
      valid_range: 0-2
      notes: Velocidade diastólica final artéria esplênica
  
  Preprocessing:
    - Validar PSV > 0 e EDV >= 0
    - Validar PSV >= EDV
    - Usar Doppler pulsado
    - Medir em segmento proximal
  
  Formula:
    RI = (PSV - EDV) / PSV
    
    Passo 1: Medir PSV artéria esplênica
    Passo 2: Medir EDV artéria esplênica
    Passo 3: Calcular RI
  
  Output:
    primary_value:
      name: splenic_artery_ri
      unit: ratio (0-1)
      precision: 2 casas decimais
    derived_values:
      - name: portal_hypertension_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: ri < 0.55
        then: "Normal; sem hipertensão portal"
      - if: 0.55 <= ri <= 0.70
        then: "Borderline; possível hipertensão portal leve"
      - if: ri > 0.70
        then: "Aumentado; sugerir hipertensão portal"
  
  QA_Checks:
    - Alertar se RI < 0.3 (possível erro)
    - Alertar se RI > 1.0 (erro matemático)
    - Validar ângulo Doppler <60°
    - Verificar se medições em segmento proximal
    - Considerar contexto clínico
  
  Evidence:
    primary_source: "Bolondi L et al. Sonographic assessment hepatic hemodynamics. Semin Ultrasound CT MR. 1992;13(1):40-56."
    radiopaedia_link: "https://radiopaedia.org/articles/portal-hypertension"
    notes: "RI >0.70 sugerir hipertensão portal."
```

---

## ABD-0033: Spleen Doppler Flow Direction

```
CALC_BLOCK:
  ItemID: ABD-0033
  FunctionName: classify_spleen_doppler_flow
  
  Inputs:
    - name: direcao_fluxo
      type: enum
      required: true
      valid_values: ["hepatopetal", "hepatofugal", "bifásico"]
      notes: Direção fluxo veia porta/esplênica
  
  Preprocessing:
    - Validar direcao_fluxo
    - Usar Doppler pulsado
    - Medir em veia esplênica/porta
    - Avaliar durante respiração
  
  Formula:
    Direção = classificação visual fluxo
    
    Passo 1: Localizar veia esplênica/porta
    Passo 2: Avaliar direção Doppler
    Passo 3: Classificar direção
  
  Output:
    primary_value:
      name: spleen_flow_direction
      value: "Hepatopetal / Hepatofugal / Bifásico"
    derived_values:
      - name: portal_hypertension_severity
        value: "Ausente / Leve / Grave"
  
  Interpretation:
    rules:
      - if: direcao_fluxo = "hepatopetal"
        then: "Normal; sem hipertensão portal"
      - if: direcao_fluxo = "bifásico"
        then: "Borderline; possível hipertensão portal leve"
      - if: direcao_fluxo = "hepatofugal"
        then: "Reverso; hipertensão portal avançada"
  
  QA_Checks:
    - Validar direcao_fluxo
    - Verificar se medições em veia esplênica/porta
    - Alertar se fluxo reverso (emergência)
    - Documentar padrão durante respiração
    - Considerar contexto clínico
  
  Evidence:
    primary_source: "Bolondi L et al. Sonographic assessment hepatic hemodynamics. Semin Ultrasound CT MR. 1992;13(1):40-56."
    radiopaedia_link: "https://radiopaedia.org/articles/portal-hypertension"
    notes: "Fluxo hepatofugal = hipertensão portal avançada."
```

---

## ABD-0034: Bile Duct Stone Diameter

```
CALC_BLOCK:
  ItemID: ABD-0034
  FunctionName: measure_bile_duct_stone_diameter
  
  Inputs:
    - name: d_calcul
      type: number
      unit: mm
      required: true
      valid_range: 0-50
      notes: Maior diâmetro cálculo biliar
  
  Preprocessing:
    - Validar d_calcul > 0
    - Medir eixo transversal máximo
    - Usar US ou TC
    - Documentar localização (CBD, vesícula)
  
  Formula:
    d_calcul = diâmetro máximo (mm)
    
    Passo 1: Localizar cálculo
    Passo 2: Medir no eixo transversal
    Passo 3: Resultado é diâmetro (mm)
  
  Output:
    primary_value:
      name: stone_diameter
      unit: mm
      precision: 0 casas decimais
    derived_values:
      - name: obstruction_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: d_calcul < 5
        then: "Pequeno; risco obstrução baixo"
      - if: 5 <= d_calcul <= 10
        then: "Moderado; risco obstrução intermediário"
      - if: d_calcul > 10
        then: "Grande; risco obstrução alto"
  
  QA_Checks:
    - Alertar se d_calcul < 2 mm (possível erro)
    - Alertar se d_calcul > 50 mm (possível erro)
    - Validar medição em eixo transversal
    - Documentar localização (CBD vs vesícula)
    - Considerar número de cálculos
  
  Evidence:
    primary_source: "Aerts M et al. Bile duct stones. Eur J Radiol. 2011;80(2):441-450."
    radiopaedia_link: "https://radiopaedia.org/articles/choledocholithiasis"
    notes: "Cálculos >10 mm = risco obstrução aumentado."
```

---

## ABD-0035: Hepatic Steatosis Grading

```
CALC_BLOCK:
  ItemID: ABD-0035
  FunctionName: grade_hepatic_steatosis_ct
  
  Inputs:
    - name: HU_figado
      type: number
      unit: HU
      required: true
      valid_range: -200-100
      notes: Atenuação fígado em TC
    
    - name: HU_rim
      type: number
      unit: HU
      required: true
      valid_range: 0-100
      notes: Atenuação rim direito em TC
  
  Preprocessing:
    - Validar HU_figado > -200 e HU_figado < 100
    - Validar HU_rim > 0
    - Usar TC fase portal
    - Usar ROI ≥1 cm
  
  Formula:
    Diferença = HU_figado - HU_rim
    
    Passo 1: Medir HU fígado
    Passo 2: Medir HU rim
    Passo 3: Calcular diferença
    Passo 4: Aplicar tabela grau
  
  Output:
    primary_value:
      name: steatosis_grade_ct
      value: "0 (Normal) / 1 (Leve) / 2 (Moderada) / 3 (Grave)"
    derived_values:
      - name: steatosis_percent_estimate
        value: "Estimativa percentual gordura (%)"
  
  Interpretation:
    rules:
      - if: diferenca > -10
        then: "Sem esteatose"
      - if: -10 >= diferenca > -20
        then: "Esteatose leve (<30%)"
      - if: -20 >= diferenca > -30
        then: "Esteatose moderada (30-60%)"
      - if: diferenca <= -30
        then: "Esteatose grave (>60%)"
  
  QA_Checks:
    - Alertar se HU_figado < -200 (possível erro)
    - Alertar se HU_figado > 100 (possível erro)
    - Validar fase portal (não arterial)
    - Verificar se ROI ≥1 cm
    - Considerar cirrose/fibrose
  
  Evidence:
    primary_source: "Piekarski J et al. Difference liver spleen CT numbers. Radiology. 1989;171(1):149-151."
    radiopaedia_link: "https://radiopaedia.org/articles/diffuse-hepatic-steatosis"
    notes: "Diferença HU fígado-rim para grau esteatose. Correlaciona com biópsia."
```

---

## PEL-0001: Prostate PSA Density

```
CALC_BLOCK:
  ItemID: PEL-0001
  FunctionName: calculate_prostate_psa_density
  
  Inputs:
    - name: PSA
      type: number
      unit: ng/mL
      required: true
      valid_range: 0-100
      notes: Nível PSA sérico
    
    - name: volume_prostata
      type: number
      unit: mL
      required: true
      valid_range: 0-200
      notes: Volume próstata (TC/RM/US)
  
  Preprocessing:
    - Validar PSA > 0 e volume > 0
    - PSA deve ser recente (<3 meses)
    - Volume deve ser recente (<3 meses)
  
  Formula:
    PSAD (ng/mL²) = PSA / volume
    
    Passo 1: Obter PSA sérico
    Passo 2: Medir volume próstata
    Passo 3: Dividir PSA por volume
  
  Output:
    primary_value:
      name: psa_density
      unit: ng/mL²
      precision: 2 casas decimais
    derived_values:
      - name: cancer_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: psad < 0.15
        then: "Normal; risco câncer baixo"
      - if: 0.15 <= psad <= 0.25
        then: "Borderline; considerar biopsia"
      - if: psad > 0.25
        then: "Aumentado; biopsia recomendada"
  
  QA_Checks:
    - Alertar se PSA < 0 ou > 100 (possível erro)
    - Alertar se volume < 10 mL (possível erro)
    - Validar que PSA e volume são recentes
    - Considerar história familiar
    - Documentar idade
  
  Evidence:
    primary_source: "Karakiewicz PI et al. Prognostic role PSA density. Eur Urol. 2007;51(2):352-359."
    radiopaedia_link: "https://radiopaedia.org/articles/prostate-specific-antigen-density"
    notes: "PSAD >0.25 ng/mL² aumenta risco câncer clinicamente significativo."
```

---

## PEL-0002: Transition Zone PSA Density

```
CALC_BLOCK:
  ItemID: PEL-0002
  FunctionName: calculate_transition_zone_psa_density
  
  Inputs:
    - name: PSA
      type: number
      unit: ng/mL
      required: true
      valid_range: 0-100
      notes: Nível PSA sérico
    
    - name: volume_tz
      type: number
      unit: mL
      required: true
      valid_range: 0-100
      notes: Volume zona transição (RM)
  
  Preprocessing:
    - Validar PSA > 0 e volume_tz > 0
    - PSA deve ser recente (<3 meses)
    - Volume TZ deve ser de RM multiparamétrica
  
  Formula:
    TZ-PSAD (ng/mL²) = PSA / volume_tz
    
    Passo 1: Obter PSA sérico
    Passo 2: Medir volume zona transição
    Passo 3: Dividir PSA por volume TZ
  
  Output:
    primary_value:
      name: tz_psa_density
      unit: ng/mL²
      precision: 2 casas decimais
    derived_values:
      - name: cancer_likelihood
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: tz_psad < 0.10
        then: "Normal; risco câncer baixo"
      - if: 0.10 <= tz_psad <= 0.20
        then: "Borderline; considerar biopsia"
      - if: tz_psad > 0.20
        then: "Aumentado; biopsia recomendada"
  
  QA_Checks:
    - Alertar se PSA < 0 ou > 100 (possível erro)
    - Alertar se volume_tz < 5 mL (possível erro)
    - Validar que PSA e volume são recentes
    - Confirmar que volume é zona transição (não total)
    - Considerar história familiar
  
  Evidence:
    primary_source: "Karakiewicz PI et al. Prognostic role PSA density. Eur Urol. 2007;51(2):352-359."
    radiopaedia_link: "https://radiopaedia.org/articles/prostate-specific-antigen-density"
    notes: "TZ-PSAD >0.20 ng/mL² aumenta especificidade para câncer."
```

---

## PEL-0003: Endometrial Thickness

```
CALC_BLOCK:
  ItemID: PEL-0003
  FunctionName: measure_endometrial_thickness
  
  Inputs:
    - name: espessura_endometrio
      type: number
      unit: mm
      required: true
      valid_range: 0-30
      notes: Espessura máxima endométrio
    
    - name: fase_ciclo
      type: enum
      required: true
      valid_values: ["proliferativa", "secretória", "menstrual"]
      notes: Fase do ciclo menstrual
  
  Preprocessing:
    - Validar espessura > 0
    - Usar US transvaginal
    - Documentar fase ciclo
    - Medir em corte sagital
  
  Formula:
    espessura = medição máxima endométrio (mm)
    
    Passo 1: Localizar endométrio
    Passo 2: Medir em corte sagital
    Passo 3: Resultado é espessura (mm)
  
  Output:
    primary_value:
      name: endometrial_thickness
      unit: mm
      precision: 1 casa decimal
    derived_values:
      - name: pathology_likelihood
        value: "Normal / Borderline / Sugestivo patologia"
  
  Interpretation:
    rules:
      - if: fase_ciclo = "proliferativa" AND espessura < 8
        then: "Normal"
      - if: fase_ciclo = "secretória" AND espessura < 14
        then: "Normal"
      - if: espessura > 16 AND fase_ciclo != "menstrual"
        then: "Espessado; considerar hiperplasia/carcinoma"
      - if: espessura > 20
        then: "Muito espessado; carcinoma provável"
  
  QA_Checks:
    - Alertar se espessura < 1 mm (possível erro)
    - Alertar se espessura > 30 mm (possível erro)
    - Validar medição em corte sagital
    - Documentar fase ciclo
    - Considerar sangramento pós-menopausa
  
  Evidence:
    primary_source: "Karlsson B et al. Transvaginal ultrasonography endometrium postmenopausal bleeding. Ultrasound Obstet Gynecol. 1995;6(3):160-164."
    radiopaedia_link: "https://radiopaedia.org/articles/endometrial-thickness"
    notes: "Espessura >16 mm pós-menopausa = investigar. Valor cutoff 5 mm em sangramento pós-menopausa."
```

---

## PEL-0004: Uterine Fibroid Volume

```
CALC_BLOCK:
  ItemID: PEL-0004
  FunctionName: calculate_uterine_fibroid_volume
  
  Inputs:
    - name: comprimento
      type: number
      unit: cm
      required: true
      valid_range: 0-20
      notes: Comprimento mioma
    
    - name: largura
      type: number
      unit: cm
      required: true
      valid_range: 0-20
      notes: Largura mioma
    
    - name: altura
      type: number
      unit: cm
      required: true
      valid_range: 0-20
      notes: Altura mioma
  
  Preprocessing:
    - Validar comprimento > 0, largura > 0, altura > 0
    - Usar RM T2
    - Medir maior diâmetro cada dimensão
  
  Formula:
    V (mL) = L × W × H × 0.52
    
    Passo 1: Medir comprimento
    Passo 2: Medir largura
    Passo 3: Medir altura
    Passo 4: Multiplicar por 0.52
  
  Output:
    primary_value:
      name: fibroid_volume
      unit: mL
      precision: 0 casas decimais
    derived_values:
      - name: treatment_indication
        value: "Conservador / Intervenção"
  
  Interpretation:
    rules:
      - if: fibroid_volume < 100
        then: "Pequeno; observação"
      - if: 100 <= fibroid_volume <= 500
        then: "Moderado; considerar tratamento"
      - if: fibroid_volume > 500
        then: "Grande; tratamento recomendado"
  
  QA_Checks:
    - Alertar se volume < 10 mL (possível erro)
    - Alertar se volume > 2000 mL (possível erro)
    - Validar medições em três planos
    - Documentar localização (submucoso/intramural/subseroso)
    - Considerar sintomas
  
  Evidence:
    primary_source: "Garcia-Solares J et al. Pathogenesis uterine adenomyosis. Fertil Steril. 2018;109(3):371-387."
    radiopaedia_link: "https://radiopaedia.org/articles/uterine-fibroids"
    notes: "Volume >500 mL = indicação tratamento. Fórmula elipsoide validada."
```

---

## PEL-0005: Adenomyosis Junctional Zone

```
CALC_BLOCK:
  ItemID: PEL-0005
  FunctionName: measure_adenomyosis_junctional_zone
  
  Inputs:
    - name: espessura_jz
      type: number
      unit: mm
      required: true
      valid_range: 0-30
      notes: Espessura máxima zona de junção
    
    - name: irregularidade_jz
      type: boolean
      required: true
      notes: Zona de junção irregular?
  
  Preprocessing:
    - Validar espessura_jz > 0
    - Usar RM T2
    - Medir em corte sagital
    - Avaliar regularidade
  
  Formula:
    espessura = medição máxima zona junção (mm)
    
    Passo 1: Localizar zona de junção
    Passo 2: Medir em corte sagital
    Passo 3: Avaliar regularidade
    Passo 4: Resultado é espessura (mm)
  
  Output:
    primary_value:
      name: junctional_zone_thickness
      unit: mm
      precision: 1 casa decimal
    derived_values:
      - name: adenomyosis_likelihood
        value: "Ausente / Leve / Moderada / Grave"
  
  Interpretation:
    rules:
      - if: espessura_jz < 8 AND NOT irregularidade_jz
        then: "Normal; sem adenomiose"
      - if: 8 <= espessura_jz <= 12 AND irregularidade_jz
        then: "Adenomiose leve"
      - if: 12 < espessura_jz <= 16 AND irregularidade_jz
        then: "Adenomiose moderada"
      - if: espessura_jz > 16 AND irregularidade_jz
        then: "Adenomiose grave"
  
  QA_Checks:
    - Alertar se espessura < 2 mm (possível erro)
    - Alertar se espessura > 30 mm (possível erro)
    - Validar medição em corte sagital
    - Avaliar regularidade JZ
    - Considerar fase ciclo
  
  Evidence:
    primary_source: "Garcia-Solares J et al. Pathogenesis uterine adenomyosis. Fertil Steril. 2018;109(3):371-387."
    radiopaedia_link: "https://radiopaedia.org/articles/adenomyosis"
    notes: "Espessura JZ >12 mm + irregularidade = adenomiose. Afeta fertilidade."
```

---

## PEL-0006: Bladder Wall Thickness

```
CALC_BLOCK:
  ItemID: PEL-0006
  FunctionName: measure_bladder_wall_thickness
  
  Inputs:
    - name: espessura_parede
      type: number
      unit: mm
      required: true
      valid_range: 0-10
      notes: Espessura máxima parede vesical
    
    - name: volume_bexiga
      type: number
      unit: mL
      required: true
      valid_range: 0-500
      notes: Volume bexiga (mL)
  
  Preprocessing:
    - Validar espessura > 0 e volume > 0
    - Usar US ou TC
    - Medir em bexiga cheia
    - Evitar artefatos
  
  Formula:
    espessura = medição máxima parede (mm)
    
    Passo 1: Medir espessura parede
    Passo 2: Medir volume bexiga
    Passo 3: Resultado é espessura (mm)
  
  Output:
    primary_value:
      name: bladder_wall_thickness
      unit: mm
      precision: 1 casa decimal
    derived_values:
      - name: obstruction_likelihood
        value: "Normal / Borderline / Obstruído"
  
  Interpretation:
    rules:
      - if: espessura < 3 AND volume > 300
        then: "Normal"
      - if: 3 <= espessura <= 5
        then: "Borderline; considerar contexto"
      - if: espessura > 5
        then: "Espessado; sugerir obstrução"
  
  QA_Checks:
    - Alertar se espessura < 1 mm (possível erro)
    - Alertar se espessura > 10 mm (possível erro)
    - Validar medição em bexiga cheia
    - Verificar se não confunde com artefato
    - Considerar volume bexiga
  
  Evidence:
    primary_source: "Oelke M et al. EAU Guidelines Management Overactive Bladder. Eur Urol. 2013;63(3):405-426."
    radiopaedia_link: "https://radiopaedia.org/articles/bladder-wall-thickness"
    notes: "Espessura >5 mm sugerir obstrução. Correlaciona com sintomas."
```

---

## PEL-0007: Post-Void Residual Volume

```
CALC_BLOCK:
  ItemID: PEL-0007
  FunctionName: measure_post_void_residual_volume
  
  Inputs:
    - name: volume_residuo
      type: number
      unit: mL
      required: true
      valid_range: 0-500
      notes: Volume urina residual pós-miccional
  
  Preprocessing:
    - Validar volume_residuo >= 0
    - Usar US ou TC
    - Medir imediatamente após micção
    - Usar fórmula elipsoide ou planimetria
  
  Formula:
    V_residuo = volume medido (mL)
    
    Passo 1: Medir bexiga pós-miccional
    Passo 2: Calcular volume (elipsoide ou planimetria)
    Passo 3: Resultado é volume residual (mL)
  
  Output:
    primary_value:
      name: post_void_residual
      unit: mL
      precision: 0 casas decimais
    derived_values:
      - name: retention_status
        value: "Normal / Borderline / Retenção"
  
  Interpretation:
    rules:
      - if: volume_residuo < 50
        then: "Normal; sem retenção"
      - if: 50 <= volume_residuo <= 100
        then: "Borderline; considerar contexto"
      - if: volume_residuo > 100
        then: "Retenção; investigar causa"
  
  QA_Checks:
    - Alertar se volume < 0 mL (erro)
    - Alertar se volume > 500 mL (possível erro ou retenção massiva)
    - Validar medição pós-miccional
    - Confirmar que paciente esvaziou bexiga
    - Repetir medição se resultado inesperado
  
  Evidence:
    primary_source: "Poston GJ et al. Ultrasound measurement post-void residual volume. Br J Urol. 1994;73(3):294-298."
    radiopaedia_link: "https://radiopaedia.org/articles/post-void-residual-volume"
    notes: "PVR >100 mL = retenção. Valor normal <50 mL."
```

---

## PEL-0008: Rectal Wall Thickness

```
CALC_BLOCK:
  ItemID: PEL-0008
  FunctionName: measure_rectal_wall_thickness
  
  Inputs:
    - name: espessura_parede
      type: number
      unit: mm
      required: true
      valid_range: 0-10
      notes: Espessura máxima parede retal
  
  Preprocessing:
    - Validar espessura > 0
    - Usar TC ou RM
    - Medir em segmento tumor
    - Evitar confundir com artefato
  
  Formula:
    espessura = medição máxima parede (mm)
    
    Passo 1: Localizar tumor retal
    Passo 2: Medir parede máxima
    Passo 3: Resultado é espessura (mm)
  
  Output:
    primary_value:
      name: rectal_wall_thickness
      unit: mm
      precision: 1 casa decimal
    derived_values:
      - name: tumor_stage
        value: "T1 / T2 / T3 / T4"
  
  Interpretation:
    rules:
      - if: espessura < 5
        then: "T1 (submucosa)"
      - if: 5 <= espessura <= 10
        then: "T2 (muscular própria)"
      - if: espessura > 10
        then: "T3-T4 (além muscular própria)"
  
  QA_Checks:
    - Alertar se espessura < 2 mm (possível erro)
    - Alertar se espessura > 15 mm (possível erro)
    - Validar medição em segmento tumor
    - Documentar localização exata
    - Considerar estadiamento TNM completo
  
  Evidence:
    primary_source: "Beets-Tan RG et al. Magnetic resonance imaging rectum staging. Eur Radiol. 2000;10(12):1886-1895."
    radiopaedia_link: "https://radiopaedia.org/articles/rectal-cancer-staging"
    notes: "Espessura parede correlaciona com T-stage. Importante para prognóstico."
```

---

## PEL-0009: Rectal Cancer TNM Staging

```
CALC_BLOCK:
  ItemID: PEL-0009
  FunctionName: classify_rectal_cancer_tnm
  
  Inputs:
    - name: t_stage
      type: enum
      required: true
      valid_values: ["T0", "T1", "T2", "T3", "T4a", "T4b"]
      notes: T-stage (profundidade invasão)
    
    - name: n_stage
      type: enum
      required: true
      valid_values: ["N0", "N1a", "N1b", "N1c", "N2a", "N2b"]
      notes: N-stage (linfonodos)
    
    - name: m_stage
      type: enum
      required: true
      valid_values: ["M0", "M1a", "M1b", "M1c"]
      notes: M-stage (metástases)
  
  Preprocessing:
    - Validar cada stage
    - Usar RM ou TC
    - Avaliar profundidade, linfonodos, metástases
  
  Formula:
    TNM = combinação T + N + M
    
    Passo 1: Determinar T-stage
    Passo 2: Determinar N-stage
    Passo 3: Determinar M-stage
    Passo 4: Combinar para TNM
  
  Output:
    primary_value:
      name: tnm_stage
      value: "Stage I / II / III / IV"
    derived_values:
      - name: prognosis
        value: "5-year survival (%)"
  
  Interpretation:
    rules:
      - if: t_stage = "T1" AND n_stage = "N0" AND m_stage = "M0"
        then: "Stage I; prognóstico bom"
      - if: (t_stage in ["T2","T3","T4"]) AND n_stage = "N0" AND m_stage = "M0"
        then: "Stage II; prognóstico intermediário"
      - if: n_stage in ["N1","N2"] AND m_stage = "M0"
        then: "Stage III; prognóstico reservado"
      - if: m_stage != "M0"
        then: "Stage IV; prognóstico ruim"
  
  QA_Checks:
    - Validar cada stage
    - Confirmar estadiamento completo
    - Documentar critérios para cada stage
    - Considerar terapia neoadjuvante
    - Correlacionar com patologia
  
  Evidence:
    primary_source: "Beets-Tan RG et al. Magnetic resonance imaging rectum staging. Eur Radiol. 2000;10(12):1886-1895."
    radiopaedia_link: "https://radiopaedia.org/articles/rectal-cancer-staging"
    notes: "TNM 8ª edição (2017). Importante para decisão terapêutica."
```

---

## PEL-0010: Circumferential Resection Margin

```
CALC_BLOCK:
  ItemID: PEL-0010
  FunctionName: measure_circumferential_resection_margin
  
  Inputs:
    - name: distancia_crm
      type: number
      unit: mm
      required: true
      valid_range: 0-50
      notes: Distância tumor até margem circunferencial
  
  Preprocessing:
    - Validar distancia_crm >= 0
    - Usar RM
    - Medir distância mínima
    - Usar cortes axiais
  
  Formula:
    CRM = distância mínima tumor até margem (mm)
    
    Passo 1: Localizar tumor retal
    Passo 2: Medir distância até margem circunferencial
    Passo 3: Resultado é CRM (mm)
  
  Output:
    primary_value:
      name: circumferential_margin
      unit: mm
      precision: 0 casas decimais
    derived_values:
      - name: margin_status
        value: "Negativo / Borderline / Positivo"
  
  Interpretation:
    rules:
      - if: distancia_crm >= 2
        then: "Negativo; margem adequada"
      - if: 1 <= distancia_crm < 2
        then: "Borderline; risco recorrência"
      - if: distancia_crm < 1
        then: "Positivo; alto risco recorrência"
  
  QA_Checks:
    - Alertar se distancia < 0 mm (erro)
    - Alertar se distancia > 50 mm (possível erro)
    - Validar medição em cortes axiais
    - Documentar localização mínima
    - Considerar terapia neoadjuvante
  
  Evidence:
    primary_source: "Beets-Tan RG et al. Magnetic resonance imaging rectum staging. Eur Radiol. 2000;10(12):1886-1895."
    radiopaedia_link: "https://radiopaedia.org/articles/circumferential-resection-margin"
    notes: "CRM <2 mm = risco recorrência. Importante para decisão terapêutica."
```

---

## PEL-0011: Ovarian Torsion Criteria

```
CALC_BLOCK:
  ItemID: PEL-0011
  FunctionName: diagnose_ovarian_torsion
  
  Inputs:
    - name: doppler_fluxo
      type: enum
      required: true
      valid_values: ["presente", "ausente", "reduzido"]
      notes: Fluxo Doppler ovariano
    
    - name: volume_ovario
      type: number
      unit: mL
      required: true
      valid_range: 0-100
      notes: Volume ovário
    
    - name: edema_estroma
      type: boolean
      required: true
      notes: Edema estromal presente?
  
  Preprocessing:
    - Validar cada parâmetro
    - Usar US Doppler
    - Comparar com lado contralateral
    - Avaliar contexto clínico
  
  Formula:
    Diagnóstico = f(doppler, volume, edema)
    
    Passo 1: Avaliar fluxo Doppler
    Passo 2: Medir volume
    Passo 3: Avaliar edema estromal
    Passo 4: Aplicar critérios diagnósticos
  
  Output:
    primary_value:
      name: torsion_diagnosis
      value: "Provável torsão / Não torsão"
    derived_values:
      - name: urgency
        value: "Emergência / Urgência"
  
  Interpretation:
    rules:
      - if: doppler_fluxo = "ausente" AND volume > 20 AND edema_estroma
        then: "Provável torsão; EMERGÊNCIA CIRÚRGICA"
      - if: doppler_fluxo = "reduzido" AND edema_estroma
        then: "Possível torsão; considerar cirurgia"
      - if: doppler_fluxo = "presente" AND NOT edema_estroma
        then: "Não torsão"
  
  QA_Checks:
    - Validar fluxo Doppler bilateral
    - Confirmar edema estromal
    - Documentar volume
    - Considerar contexto clínico (dor aguda)
    - Alertar se torsão provável (emergência)
  
  Evidence:
    primary_source: "Pena JA et al. Sonography ovarian torsion. AJR. 1992;159(3):539-541."
    radiopaedia_link: "https://radiopaedia.org/articles/ovarian-torsion"
    notes: "Ausência fluxo Doppler + edema = torsão. Emergência cirúrgica."
```

---

## PEL-0012: Ovarian Reserve Anti-Müllerian Hormone

```
CALC_BLOCK:
  ItemID: PEL-0012
  FunctionName: assess_ovarian_reserve_amh
  
  Inputs:
    - name: AMH_ng_mL
      type: number
      unit: ng/mL
      required: true
      valid_range: 0-15
      notes: Hormônio Anti-Mülleriano (laboratorial)
  
  Preprocessing:
    - Validar AMH >= 0
    - Usar teste laboratorial padrão
    - Coletar em dia 3 ciclo (ideal)
    - Considerar idade
  
  Formula:
    AMH = nível sérico (ng/mL)
    
    Passo 1: Obter nível AMH
    Passo 2: Comparar com valores normais por idade
    Passo 3: Resultado é AMH (ng/mL)
  
  Output:
    primary_value:
      name: amh_level
      unit: ng/mL
      precision: 2 casas decimais
    derived_values:
      - name: ovarian_reserve_status
        value: "Normal / Reduzido / Muito reduzido"
  
  Interpretation:
    rules:
      - if: AMH_ng_mL >= 1.0
        then: "Normal; boa reserva ovariana"
      - if: 0.5 <= AMH_ng_mL < 1.0
        then: "Reduzido; possível dificuldade fertilidade"
      - if: AMH_ng_mL < 0.5
        then: "Muito reduzido; reserva ovariana baixa"
  
  QA_Checks:
    - Alertar se AMH < 0 (erro)
    - Alertar se AMH > 15 (possível erro ou SOP)
    - Validar que coleta em dia 3 ciclo
    - Considerar idade
    - Correlacionar com contagem folículos antrais
  
  Evidence:
    primary_source: "Broer SL et al. Anti-Müllerian hormone predicts ovarian response. Fertil Steril. 2009;92(6):1868-1874."
    radiopaedia_link: "https://radiopaedia.org/articles/anti-mullerian-hormone"
    notes: "AMH prediz resposta ovariana. Valores variam por idade e laboratório."
```

---

## PEL-0013: Extraprostatic Extension

```
CALC_BLOCK:
  ItemID: PEL-0013
  FunctionName: diagnose_extraprostatic_extension
  
  Inputs:
    - name: epe_presente
      type: boolean
      required: true
      notes: Extensão extraprostática presente?
    
    - name: lateralidade
      type: enum
      required: true
      valid_values: ["unilateral", "bilateral"]
      notes: Lateralidade EPE
  
  Preprocessing:
    - Validar cada parâmetro
    - Usar RM multiparamétrica
    - Avaliar em T2 e DWI
    - Documentar localização
  
  Formula:
    EPE = presença extensão além cápsula
    
    Passo 1: Avaliar integridade cápsula
    Passo 2: Avaliar extensão tumor
    Passo 3: Documentar lateralidade
  
  Output:
    primary_value:
      name: epe_status
      value: "Ausente / Presente (unilateral/bilateral)"
    derived_values:
      - name: t_stage_impact
        value: "T2 / T3a"
  
  Interpretation:
    rules:
      - if: NOT epe_presente
        then: "Sem EPE; T2"
      - if: epe_presente AND lateralidade = "unilateral"
        then: "EPE unilateral; T3a"
      - if: epe_presente AND lateralidade = "bilateral"
        then: "EPE bilateral; T3a"
  
  QA_Checks:
    - Validar presença EPE
    - Documentar lateralidade
    - Confirmar em T2 e DWI
    - Considerar estadiamento completo
    - Correlacionar com PSA/Gleason
  
  Evidence:
    primary_source: "Turkbey B et al. Prostate Imaging Reporting Data System v2.1. Eur Urol. 2019;76(3):340-351."
    radiopaedia_link: "https://radiopaedia.org/articles/prostate-cancer-staging"
    notes: "EPE = T3a. Importante para decisão terapêutica (cirurgia vs radiação)."
```

---

## PEL-0014: Seminal Vesicle Invasion

```
CALC_BLOCK:
  ItemID: PEL-0014
  FunctionName: diagnose_seminal_vesicle_invasion
  
  Inputs:
    - name: svi_presente
      type: boolean
      required: true
      notes: Invasão vesícula seminal presente?
    
    - name: lateralidade
      type: enum
      required: true
      valid_values: ["unilateral", "bilateral"]
      notes: Lateralidade SVI
  
  Preprocessing:
    - Validar cada parâmetro
    - Usar RM multiparamétrica
    - Avaliar em T2 e DWI
    - Documentar localização
  
  Formula:
    SVI = presença invasão vesícula seminal
    
    Passo 1: Avaliar integridade vesícula seminal
    Passo 2: Avaliar invasão tumor
    Passo 3: Documentar lateralidade
  
  Output:
    primary_value:
      name: svi_status
      value: "Ausente / Presente (unilateral/bilateral)"
    derived_values:
      - name: t_stage_impact
        value: "T2 / T3b"
  
  Interpretation:
    rules:
      - if: NOT svi_presente
        then: "Sem SVI; T2-T3a"
      - if: svi_presente AND lateralidade = "unilateral"
        then: "SVI unilateral; T3b"
      - if: svi_presente AND lateralidade = "bilateral"
        then: "SVI bilateral; T3b"
  
  QA_Checks:
    - Validar presença SVI
    - Documentar lateralidade
    - Confirmar em T2 e DWI
    - Considerar estadiamento completo
    - Correlacionar com PSA/Gleason
  
  Evidence:
    primary_source: "Turkbey B et al. Prostate Imaging Reporting Data System v2.1. Eur Urol. 2019;76(3):340-351."
    radiopaedia_link: "https://radiopaedia.org/articles/prostate-cancer-staging"
    notes: "SVI = T3b. Pior prognóstico que EPE. Importante para decisão terapêutica."
```

---

## PEL-0015: Gleason Score Imaging

```
CALC_BLOCK:
  ItemID: PEL-0015
  FunctionName: estimate_gleason_score_mri
  
  Inputs:
    - name: dwi_score
      type: number
      unit: points
      required: true
      valid_range: 1-5
      notes: Score DWI (1-5)
    
    - name: dce_score
      type: number
      unit: points
      required: true
      valid_range: 0-3
      notes: Score DCE (0-3)
    
    - name: t2_score
      type: number
      unit: points
      required: true
      valid_range: 1-5
      notes: Score T2 (1-5)
  
  Preprocessing:
    - Validar cada score
    - Usar RM multiparamétrica
    - Avaliar DWI, DCE, T2
    - Documentar localização
  
  Formula:
    Gleason = f(DWI, DCE, T2)
    
    Passo 1: Avaliar DWI
    Passo 2: Avaliar DCE
    Passo 3: Avaliar T2
    Passo 4: Estimar Gleason
  
  Output:
    primary_value:
      name: estimated_gleason
      value: "Gleason 6 / 7 / 8 / 9 / 10"
    derived_values:
      - name: gleason_group
        value: "Grupo 1-5"
  
  Interpretation:
    rules:
      - if: dwi_score <= 2 AND dce_score <= 1
        then: "Gleason 6-7; baixo-intermediário risco"
      - if: dwi_score = 3 OR dce_score = 2
        then: "Gleason 7; intermediário risco"
      - if: dwi_score >= 4 OR dce_score = 3
        then: "Gleason 8-10; alto risco"
  
  QA_Checks:
    - Validar cada score
    - Confirmar em DWI, DCE, T2
    - Documentar localização
    - Considerar PI-RADS score
    - Correlacionar com PSA/biópsia
  
  Evidence:
    primary_source: "Turkbey B et al. Prostate Imaging Reporting Data System v2.1. Eur Urol. 2019;76(3):340-351."
    radiopaedia_link: "https://radiopaedia.org/articles/prostate-cancer-gleason-grading"
    notes: "Estimativa Gleason por RM. Correlaciona com biópsia ~70-80%."
```

---

## PEL-0016: Prostate Cancer Gleason Grading

```
CALC_BLOCK:
  ItemID: PEL-0016
  FunctionName: grade_prostate_cancer_gleason
  
  Inputs:
    - name: gleason_primary
      type: number
      unit: points
      required: true
      valid_range: 3-5
      notes: Padrão primário Gleason (3-5)
    
    - name: gleason_secondary
      type: number
      unit: points
      required: true
      valid_range: 3-5
      notes: Padrão secundário Gleason (3-5)
  
  Preprocessing:
    - Validar gleason_primary entre 3-5
    - Validar gleason_secondary entre 3-5
    - Usar resultado biópsia/prostatectomia
  
  Formula:
    Gleason Score = gleason_primary + gleason_secondary
    
    Passo 1: Identificar padrão primário
    Passo 2: Identificar padrão secundário
    Passo 3: Somar para obter score
  
  Output:
    primary_value:
      name: gleason_score
      unit: points
      precision: 0 casas decimais
    derived_values:
      - name: gleason_group
        value: "Grupo 1-5"
      - name: risk_stratification
        value: "Baixo / Intermediário / Alto"
  
  Interpretation:
    rules:
      - if: gleason_score <= 6
        then: "Grupo 1; baixo risco"
      - if: gleason_score = 7
        then: "Grupo 2-3; intermediário risco"
      - if: gleason_score = 8
        then: "Grupo 4; alto risco"
      - if: gleason_score >= 9
        then: "Grupo 5; muito alto risco"
  
  QA_Checks:
    - Validar padrões entre 3-5
    - Confirmar que primário >= secundário
    - Documentar localização
    - Considerar número fragmentos
    - Correlacionar com PSA/estadiamento
  
  Evidence:
    primary_source: "Turkbey B et al. Prostate Imaging Reporting Data System v2.1. Eur Urol. 2019;76(3):340-351."
    radiopaedia_link: "https://radiopaedia.org/articles/prostate-cancer-gleason-grading"
    notes: "Gleason 2017 (grupos 1-5). Importante para prognóstico e decisão terapêutica."
```

---

## PEL-0017: Uterine Artery Doppler

```
CALC_BLOCK:
  ItemID: PEL-0017
  FunctionName: measure_uterine_artery_doppler
  
  Inputs:
    - name: RI_arteria_uterina
      type: number
      unit: ratio
      required: true
      valid_range: 0-1
      notes: Índice resistência artéria uterina
    
    - name: notch_diastolico
      type: boolean
      required: true
      notes: Notch diastólico presente?
  
  Preprocessing:
    - Validar RI entre 0-1
    - Usar Doppler pulsado
    - Medir em artéria uterina proximal
    - Avaliar bilateralmente
  
  Formula:
    RI = (PSV - EDV) / PSV
    
    Passo 1: Medir PSV artéria uterina
    Passo 2: Medir EDV artéria uterina
    Passo 3: Calcular RI
    Passo 4: Avaliar notch diastólico
  
  Output:
    primary_value:
      name: uterine_artery_ri
      unit: ratio (0-1)
      precision: 2 casas decimais
    derived_values:
      - name: placental_insufficiency_risk
        value: "Baixo / Intermediário / Alto"
  
  Interpretation:
    rules:
      - if: ri < 0.58 AND NOT notch_diastolico
        then: "Normal; sem risco insuficiência placentária"
      - if: ri >= 0.58 OR notch_diastolico
        then: "Aumentado; risco insuficiência placentária"
  
  QA_Checks:
    - Validar RI entre 0-1
    - Confirmar medições bilaterais
    - Documentar presença/ausência notch
    - Considerar idade gestacional
    - Correlacionar com sintomas
  
  Evidence:
    primary_source: "Steer CV et al. Transvaginal color flow doppler ultrasound oocyte retrieval. Lancet. 1992;339(8788):213-216."
    radiopaedia_link: "https://radiopaedia.org/articles/uterine-artery-doppler"
    notes: "RI >0.58 ou notch = risco insuficiência placentária."
```

---

## PEL-0018: Bladder Outlet Obstruction Index

```
CALC_BLOCK:
  ItemID: PEL-0018
  FunctionName: calculate_bladder_outlet_obstruction_index
  
  Inputs:
    - name: pressao_detrusor_max
      type: number
      unit: cmH2O
      required: true
      valid_range: 0-200
      notes: Pressão detrusor máxima (urodinâmica)
    
    - name: fluxo_urinario_max
      type: number
      unit: mL/s
      required: true
      valid_range: 0-50
      notes: Fluxo urinário máximo
  
  Preprocessing:
    - Validar pressao > 0 e fluxo > 0
    - Usar estudo urodinâmico
    - Medir durante micção
  
  Formula:
    BOO Index = Pdet(Qmax) - 2×Qmax
    
    Passo 1: Obter pressão detrusor máxima
    Passo 2: Obter fluxo urinário máximo
    Passo 3: Calcular BOO Index
  
  Output:
    primary_value:
      name: boo_index
      unit: cmH2O
      precision: 0 casas decimais
    derived_values:
      - name: obstruction_grade
        value: "Sem obstrução / Borderline / Obstruído"
  
  Interpretation:
    rules:
      - if: boo_index < 20
        then: "Sem obstrução"
      - if: 20 <= boo_index <= 40
        then: "Borderline; possível obstrução leve"
      - if: boo_index > 40
        then: "Obstruído; obstrução moderada-grave"
  
  QA_Checks:
    - Validar pressao > 0 cmH2O
    - Validar fluxo > 0 mL/s
    - Confirmar estudo urodinâmico completo
    - Considerar sintomas (LUTS)
    - Documentar contexto clínico
  
  Evidence:
    primary_source: "Abrams P et al. Standardisation terminology lower urinary tract function. Neurourol Urodynam. 1998;17(5):443-447."
    radiopaedia_link: "https://radiopaedia.org/articles/bladder-outlet-obstruction"
    notes: "BOO Index >40 = obstrução. Padrão ICS para diagnóstico urodinâmico."
```

---

## PEL-0019: Rectal Cancer Depth of Invasion

```
CALC_BLOCK:
  ItemID: PEL-0019
  FunctionName: measure_rectal_cancer_depth
  
  Inputs:
    - name: profundidade_invasao
      type: number
      unit: mm
      required: true
      valid_range: 0-50
      notes: Profundidade invasão tumor além muscular própria
  
  Preprocessing:
    - Validar profundidade >= 0
    - Usar RM
    - Medir em cortes axiais
    - Documentar localização
  
  Formula:
    Profundidade = distância invasão (mm)
    
    Passo 1: Localizar tumor retal
    Passo 2: Medir profundidade além muscular própria
    Passo 3: Resultado é profundidade (mm)
  
  Output:
    primary_value:
      name: invasion_depth
      unit: mm
      precision: 0 casas decimais
    derived_values:
      - name: t_stage_impact
        value: "T3 / T4"
  
  Interpretation:
    rules:
      - if: profundidade_invasao <= 5
        then: "T3a (≤5 mm)"
      - if: 5 < profundidade_invasao <= 10
        then: "T3b (5-10 mm)"
      - if: 10 < profundidade_invasao <= 15
        then: "T3c (10-15 mm)"
      - if: profundidade_invasao > 15
        then: "T3d (>15 mm) ou T4"
  
  QA_Checks:
    - Validar profundidade >= 0 mm
    - Validar medição em cortes axiais
    - Documentar localização exata
    - Considerar estadiamento completo
    - Correlacionar com CRM
  
  Evidence:
    primary_source: "Beets-Tan RG et al. Magnetic resonance imaging rectum staging. Eur Radiol. 2000;10(12):1886-1895."
    radiopaedia_link: "https://radiopaedia.org/articles/rectal-cancer-staging"
    notes: "Profundidade >5 mm = T3. Importante para decisão terapêutica."
```

---

## PEL-0020: Lymph Node Staging

```
CALC_BLOCK:
  ItemID: PEL-0020
  FunctionName: classify_lymph_node_staging
  
  Inputs:
    - name: numero_linfonodos
      type: number
      unit: count
      required: true
      valid_range: 0-50
      notes: Número linfonodos regionais envolvidos
    
    - name: diametro_max
      type: number
      unit: mm
      required: true
      valid_range: 0-50
      notes: Maior diâmetro linfonodo (eixo curto)
  
  Preprocessing:
    - Validar numero_linfonodos >= 0
    - Validar diametro_max > 0
    - Usar RM ou TC
    - Documentar localização
  
  Formula:
    N-stage = f(número, localização, tamanho)
    
    Passo 1: Contar linfonodos envolvidos
    Passo 2: Medir maior diâmetro
    Passo 3: Documentar localização
    Passo 4: Aplicar critérios N-stage
  
  Output:
    primary_value:
      name: n_stage
      value: "N0 / N1 / N2"
    derived_values:
      - name: lymph_node_count
        value: "Número linfonodos envolvidos"
  
  Interpretation:
    rules:
      - if: numero_linfonodos = 0
        then: "N0; sem linfonodos regionais"
      - if: 1 <= numero_linfonodos <= 3
        then: "N1; 1-3 linfonodos regionais"
      - if: numero_linfonodos >= 4
        then: "N2; ≥4 linfonodos regionais"
  
  QA_Checks:
    - Validar contagem linfonodos
    - Documentar localização
    - Confirmar critérios tamanho (>9 mm eixo curto)
    - Considerar estadiamento completo
    - Correlacionar com T-stage
  
  Evidence:
    primary_source: "Beets-Tan RG et al. Magnetic resonance imaging rectum staging. Eur Radiol. 2000;10(12):1886-1895."
    radiopaedia_link: "https://radiopaedia.org/articles/rectal-cancer-staging"
    notes: "N-stage baseado em número linfonodos. Importante para prognóstico."
```

---

**FIM DO CALC_BLOCKS_PARTE2.md**

Total: 35 CALC_BLOCKS (ABD-0016 a PEL-0020)
