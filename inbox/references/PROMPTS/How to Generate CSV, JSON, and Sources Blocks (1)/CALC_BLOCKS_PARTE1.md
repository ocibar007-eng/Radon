# CALC_BLOCKS - PARTE 1 (35 Itens)

## VASC-0001: Resistive Index (RI)

```
CALC_BLOCK:
  ItemID: VASC-0001
  FunctionName: calculate_resistive_index
  
  Inputs:
    - name: PSV (Peak Systolic Velocity)
      type: number
      unit: m/s
      required: true
      valid_range: 0-5
      notes: Velocidade sistólica máxima medida em Doppler pulsado
    
    - name: EDV (End-Diastolic Velocity)
      type: number
      unit: m/s
      required: true
      valid_range: 0-5
      notes: Velocidade diastólica final medida em Doppler pulsado
  
  Preprocessing:
    - Validar PSV > 0 e EDV >= 0
    - Validar PSV >= EDV (sempre verdadeiro em fluxo arterial)
    - Se PSV == 0, retornar erro "PSV inválido"
  
  Formula:
    RI = (PSV - EDV) / PSV
    Passo 1: Calcular diferença = PSV - EDV
    Passo 2: Dividir por PSV
    Passo 3: Resultado é RI (0-1)
  
  Output:
    primary_value:
      name: RI
      unit: ratio (0-1)
      precision: 2 casas decimais
    derived_values:
      - name: RI_percentage
        value: RI × 100
        unit: "%"
  
  Interpretation:
    rules:
      - if: RI < 0.55
        then: "Normal (baixa resistência vascular)"
      - if: 0.55 <= RI <= 0.70
        then: "Borderline (resistência moderada)"
      - if: RI > 0.70
        then: "Aumentado (alta resistência; sugerir estenose ou doença vascular)"
    
    category: "Resistência Vascular"
    clinical_context: "Carótida, renal, hepática, esplênica, mesentérica"
  
  QA_Checks:
    - Validar PSV > EDV (sempre em artérias)
    - Alertar se PSV < 0.1 m/s (possível erro de medição)
    - Alertar se RI > 1.0 (erro matemático ou medição invertida)
    - Verificar ângulo Doppler <60° (não validável por fórmula)
    - Alertar se EDV negativo (erro de medição)
  
  Evidence:
    primary_source: "McNaughton D, Abu-Yousef M. Doppler US of the Liver Made Simple. Radiographics. 2011;31(1):161-88."
    radiopaedia_link: "https://radiopaedia.org/articles/resistive-index-vascular-ultrasound"
    notes: "RI é independente de ângulo de insonação (razão adimensional). Validado em múltiplos territórios vasculares."
```

---

## VASC-0002: Pulsatility Index (PI)

```
CALC_BLOCK:
  ItemID: VASC-0002
  FunctionName: calculate_pulsatility_index
  
  Inputs:
    - name: PSV
      type: number
      unit: m/s
      required: true
      valid_range: 0-5
      notes: Velocidade sistólica máxima
    
    - name: EDV
      type: number
      unit: m/s
      required: true
      valid_range: 0-5
      notes: Velocidade diastólica final
    
    - name: V_mean
      type: number
      unit: m/s
      required: true
      valid_range: 0-5
      notes: Velocidade média (calculada pelo Doppler ou manual)
  
  Preprocessing:
    - Se V_mean não fornecido, calcular: V_mean ≈ (PSV + 2×EDV) / 3
    - Validar PSV > EDV >= 0
    - Validar V_mean > 0
  
  Formula:
    PI = (PSV - EDV) / V_mean
    Passo 1: Calcular diferença = PSV - EDV
    Passo 2: Dividir por V_mean
    Passo 3: Resultado é PI
  
  Output:
    primary_value:
      name: PI
      unit: ratio
      precision: 2 casas decimais
  
  Interpretation:
    rules:
      - if: PI < 1.0
        then: "Baixo (fluxo pouco pulsátil)"
      - if: 1.0 <= PI <= 2.0
        then: "Normal (pulsatilidade normal)"
      - if: PI > 2.0
        then: "Aumentado (alta pulsatilidade; sugerir estenose distal ou proximal)"
  
  QA_Checks:
    - Alertar se PI < 0.5 (possível erro)
    - Alertar se PI > 5.0 (possível erro)
    - Validar V_mean coerente com PSV/EDV
    - Comparar com RI para consistência
  
  Evidence:
    primary_source: "Boote E. AAPM/RSNA Physics Tutorial. Radiographics. 2003;23(5):1315-27."
    radiopaedia_link: "https://radiopaedia.org/articles/pulsatility-index-ultrasound"
    notes: "PI menos específico que RI; complementar com RI para diagnóstico."
```

---

## VASC-0003: NASCET Criteria

```
CALC_BLOCK:
  ItemID: VASC-0003
  FunctionName: calculate_nascet_stenosis
  
  Inputs:
    - name: d_stenosis
      type: number
      unit: mm
      required: true
      valid_range: 0-10
      notes: Diâmetro mínimo na estenose
    
    - name: d_distal
      type: number
      unit: mm
      required: true
      valid_range: 0-10
      notes: Diâmetro normal distal (ICA distal)
  
  Preprocessing:
    - Validar d_stenosis > 0 e d_distal > 0
    - Validar d_stenosis <= d_distal
    - Se d_stenosis > d_distal, inverter valores com aviso
  
  Formula:
    % Estenose NASCET = (1 - d_stenosis / d_distal) × 100
    Passo 1: Dividir d_stenosis por d_distal
    Passo 2: Subtrair de 1
    Passo 3: Multiplicar por 100
  
  Output:
    primary_value:
      name: stenosis_percent
      unit: "%"
      precision: 0 casas decimais
    derived_values:
      - name: stenosis_category
        value: Classificação (0-29% / 30-69% / ≥70%)
  
  Interpretation:
    rules:
      - if: stenosis_percent < 30
        then: "Sem estenose significativa"
      - if: 30 <= stenosis_percent <= 69
        then: "Estenose moderada (30-69%)"
      - if: stenosis_percent >= 70
        then: "Estenose grave (≥70%); indicação cirúrgica se sintomático"
  
  QA_Checks:
    - Alertar se stenosis_percent > 100 (erro matemático)
    - Alertar se d_stenosis == d_distal (sem estenose)
    - Validar medições em mesmo plano (axial)
    - Verificar se medições evitam trombo mural
  
  Evidence:
    primary_source: "NASCET Collaborators. NEJM. 1991;325(7):445-453."
    radiopaedia_link: "https://radiopaedia.org/articles/nascet-criteria"
    notes: "Padrão ouro para classificação estenose carotídea. Valores NASCET ~10% menores que ECST."
```

---

## VASC-0004: Renal Artery Stenosis Doppler Criteria

```
CALC_BLOCK:
  ItemID: VASC-0004
  FunctionName: calculate_ras_doppler_criteria
  
  Inputs:
    - name: PSV_renal
      type: number
      unit: cm/s
      required: true
      valid_range: 0-400
      notes: PSV artéria renal
    
    - name: PSV_aorta
      type: number
      unit: cm/s
      required: true
      valid_range: 0-200
      notes: PSV aorta proximal
  
  Preprocessing:
    - Converter m/s para cm/s se necessário (×100)
    - Validar PSV_renal > 0 e PSV_aorta > 0
    - Calcular RAR = PSV_renal / PSV_aorta
  
  Formula:
    Critério 1: PSV_renal (cm/s)
    Critério 2: RAR = PSV_renal / PSV_aorta
    
    Passo 1: Medir PSV renal proximal
    Passo 2: Medir PSV aorta proximal
    Passo 3: Calcular RAR
    Passo 4: Comparar com cutoffs
  
  Output:
    primary_value:
      name: RAS_probability
      value: "Sem estenose / Borderline / Provável estenose ≥60%"
    derived_values:
      - name: PSV_renal_value
        value: PSV_renal (cm/s)
      - name: RAR_value
        value: RAR (razão)
  
  Interpretation:
    rules:
      - if: PSV_renal < 180 AND RAR < 3.5
        then: "Sem estenose significativa"
      - if: (180 <= PSV_renal <= 200) OR (3.5 <= RAR <= 4.0)
        then: "Borderline; considerar confirmação por CTA/MRA"
      - if: PSV_renal > 200 OR RAR > 4.0
        then: "Provável estenose ≥60%; confirmar por CTA/MRA/angiografia"
  
  QA_Checks:
    - Alertar se PSV_renal < 50 cm/s (possível erro)
    - Alertar se RAR < 1.0 (PSV aorta > PSV renal; erro)
    - Validar ângulo Doppler <60°
    - Verificar se medições em segmento proximal
    - Alertar se débito cardíaco muito baixo (afeta PSV)
  
  Evidence:
    primary_source: "Olin JW et al. USRFMD Registry. Circ Cardiovasc Interv. 2012;5(3):432-438."
    radiopaedia_link: "https://radiopaedia.org/articles/renal-artery-stenosis"
    notes: "Critérios validados para estenose ≥60%. PSV >180 ou RAR >3.5 para estenose significativa."
```

---

## VASC-0005: AAA Growth Rate

```
CALC_BLOCK:
  ItemID: VASC-0005
  FunctionName: calculate_aaa_growth_rate
  
  Inputs:
    - name: d_atual
      type: number
      unit: mm
      required: true
      valid_range: 0-100
      notes: Diâmetro máximo AAA atual
    
    - name: d_anterior
      type: number
      unit: mm
      required: true
      valid_range: 0-100
      notes: Diâmetro máximo AAA anterior
    
    - name: intervalo_anos
      type: number
      unit: years
      required: true
      valid_range: 0.1-10
      notes: Intervalo entre exames (em anos)
  
  Preprocessing:
    - Validar d_atual > 0 e d_anterior > 0
    - Validar intervalo_anos > 0
    - Converter meses para anos se necessário (÷12)
    - Validar d_atual >= d_anterior (crescimento esperado)
  
  Formula:
    Taxa (mm/ano) = (d_atual - d_anterior) / intervalo_anos
    
    Passo 1: Calcular diferença = d_atual - d_anterior
    Passo 2: Dividir por intervalo_anos
    Passo 3: Resultado é taxa de crescimento (mm/ano)
  
  Output:
    primary_value:
      name: growth_rate
      unit: mm/ano
      precision: 1 casa decimal
    derived_values:
      - name: absolute_growth
        value: d_atual - d_anterior
        unit: mm
      - name: percent_growth
        value: ((d_atual - d_anterior) / d_anterior) × 100
        unit: "%"
  
  Interpretation:
    rules:
      - if: d_atual < 28
        then: "AAA pequeno; sem follow-up necessário"
      - if: 28 <= d_atual < 40
        then: "AAA moderado; follow-up anual recomendado"
      - if: 40 <= d_atual < 45
        then: "AAA grande; follow-up cada 3 meses"
      - if: 45 <= d_atual < 55
        then: "AAA muito grande; follow-up cada 1-2 meses; considerar cirurgia"
      - if: d_atual >= 55
        then: "AAA crítico; cirurgia recomendada"
      - if: growth_rate > 3.0
        then: "Crescimento rápido; considerar cirurgia mesmo se <55mm"
  
  QA_Checks:
    - Alertar se d_atual < d_anterior (possível erro de medição)
    - Alertar se growth_rate < -2 (regressão; verificar técnica)
    - Validar intervalo_anos > 0.25 (mínimo 3 meses)
    - Alertar se growth_rate > 10 mm/ano (crescimento muito rápido; verificar)
    - Verificar se medições em eixo transversal (AP)
  
  Evidence:
    primary_source: "Lederle FA et al. ADAM Trial. NEJM. 2002;346(19):1437-1444."
    radiopaedia_link: "https://radiopaedia.org/articles/abdominal-aortic-aneurysm"
    notes: "Estudo ADAM: taxa média ~1.9 mm/ano (2.8-3.9 cm); ~2.7 mm/ano (4.0-4.5 cm)."
```

---

## VASC-0006: Stanford Classification Aortic Dissection

```
CALC_BLOCK:
  ItemID: VASC-0006
  FunctionName: classify_aortic_dissection_stanford
  
  Inputs:
    - name: envolve_ascendente
      type: boolean
      required: true
      notes: Dissecção envolve aorta ascendente?
    
    - name: localizacao_laceração
      type: enum
      required: true
      valid_values: ["ascendente", "descendente", "ambas"]
      notes: Localização da laceração intimal
  
  Preprocessing:
    - Validar presença de laceração intimal em TC/RM
    - Confirmar flap intimal (critério diagnóstico)
    - Documentar extensão (proximal/distal)
  
  Formula:
    Classificação Stanford:
    IF envolve_ascendente = true
      THEN Tipo A
    ELSE IF localizacao_laceração = "descendente"
      THEN Tipo B
    ELSE
      THEN Tipo B (limitada descendente)
  
  Output:
    primary_value:
      name: stanford_type
      value: "Type A" ou "Type B"
    derived_values:
      - name: envolve_ascendente_flag
        value: true/false
      - name: localizacao_principal
        value: string
  
  Interpretation:
    rules:
      - if: stanford_type = "Type A"
        then: "Envolve aorta ascendente; CIRURGIA URGENTE (mortalidade ~1%/hora não operada)"
      - if: stanford_type = "Type B"
        then: "Limitada descendente; MANEJO CLÍNICO (controle PA/FC); cirurgia se complicações"
  
  QA_Checks:
    - Verificar presença de flap intimal
    - Confirmar laceração intimal (não confundir com artefato)
    - Documentar extensão (proximal/distal)
    - Verificar malperfusão (ramos aórticos)
    - Alertar se dissecção intramural sem laceração visível (possível AIAD)
  
  Evidence:
    primary_source: "Daily PO et al. Management acute aortic dissections. Ann Thorac Surg. 1970;10(3):237-247."
    radiopaedia_link: "https://radiopaedia.org/articles/stanford-classification-of-aortic-dissection-1"
    notes: "Classificação clássica; determina urgência cirúrgica. Type A = emergência cirúrgica."
```

---

## VASC-0007: IVC Collapsibility Index

```
CALC_BLOCK:
  ItemID: VASC-0007
  FunctionName: calculate_ivc_collapsibility_index
  
  Inputs:
    - name: d_max_inspiracao
      type: number
      unit: mm
      required: true
      valid_range: 0-30
      notes: Diâmetro máximo VCI em inspiração
    
    - name: d_min_expiração
      type: number
      unit: mm
      required: true
      valid_range: 0-30
      notes: Diâmetro mínimo VCI em expiração
  
  Preprocessing:
    - Validar d_max_inspiracao > 0 e d_min_expiração > 0
    - Validar d_max_inspiracao >= d_min_expiração
    - Se d_max < d_min, inverter com aviso
    - Medir 2 cm abaixo confluência hepática
  
  Formula:
    CI (%) = (d_max - d_min) / d_max × 100
    
    Passo 1: Calcular diferença = d_max - d_min
    Passo 2: Dividir por d_max
    Passo 3: Multiplicar por 100
  
  Output:
    primary_value:
      name: collapsibility_index
      unit: "%"
      precision: 0 casas decimais
    derived_values:
      - name: pvc_estimate
        value: "Estimativa PVC (mmHg)"
  
  Interpretation:
    rules:
      - if: CI > 50
        then: "PVC baixa (<5 mmHg); colapsabilidade normal"
      - if: 25 <= CI <= 50
        then: "PVC normal (5-10 mmHg); colapsabilidade intermediária"
      - if: CI < 25
        then: "PVC elevada (>10 mmHg); colapsabilidade reduzida"
  
  QA_Checks:
    - Alertar se CI < 0 ou > 100 (erro matemático)
    - Verificar se medições em respiração espontânea
    - Alertar se paciente em ventilação mecânica (CI pode estar falsamente baixo)
    - Validar medição 2 cm abaixo confluência hepática
    - Alertar se arritmia presente (afeta medições)
  
  Evidence:
    primary_source: "Brennan JM et al. Handcarried ultrasound IVC diameter. Am J Emerg Med. 2007;25(2):155-161."
    radiopaedia_link: "https://radiopaedia.org/articles/inferior-vena-cava"
    notes: "Método não-invasivo para estimativa PVC. Sensibilidade ~80% para PVC elevada."
```

---

## VASC-0008: Portal Vein Congestion Index

```
CALC_BLOCK:
  ItemID: VASC-0008
  FunctionName: calculate_portal_vein_congestion_index
  
  Inputs:
    - name: V_max_portal
      type: number
      unit: cm/s
      required: true
      valid_range: 0-50
      notes: Velocidade máxima veia porta (pico sistólico)
    
    - name: V_min_portal
      type: number
      unit: cm/s
      required: true
      valid_range: 0-50
      notes: Velocidade mínima veia porta (pico diastólico)
  
  Preprocessing:
    - Validar V_max > 0 e V_min >= 0
    - Validar V_max >= V_min
    - Converter m/s para cm/s se necessário (×100)
  
  Formula:
    CI = (V_max - V_min) / V_max
    
    Passo 1: Calcular diferença = V_max - V_min
    Passo 2: Dividir por V_max
    Passo 3: Resultado é CI (0-1)
  
  Output:
    primary_value:
      name: congestion_index
      unit: ratio
      precision: 2 casas decimais
    derived_values:
      - name: CI_percentage
        value: CI × 100
        unit: "%"
  
  Interpretation:
    rules:
      - if: CI < 0.4
        then: "Normal; sem congestão portal"
      - if: 0.4 <= CI <= 0.6
        then: "Borderline; possível congestão leve"
      - if: CI > 0.6
        then: "Congestão portal; sugerir hipertensão portal avançada"
  
  QA_Checks:
    - Alertar se CI < 0 ou > 1 (erro matemático)
    - Validar fluxo hepatopetal (não hepatofugal)
    - Verificar se medições em veia porta proximal
    - Alertar se V_max < 10 cm/s (possível fluxo lento/reverso)
    - Validar ângulo Doppler <60°
  
  Evidence:
    primary_source: "Bolondi L et al. Ultrasonographic study portal venous system. Gastroenterology. 1988;95(3):714-720."
    radiopaedia_link: "https://radiopaedia.org/articles/portal-hypertension"
    notes: "Índice para avaliação hipertensão portal. Complementa avaliação clínica."
```

---

## VASC-0009: ECST Criteria

```
CALC_BLOCK:
  ItemID: VASC-0009
  FunctionName: calculate_ecst_stenosis
  
  Inputs:
    - name: d_estenose
      type: number
      unit: mm
      required: true
      valid_range: 0-10
      notes: Diâmetro mínimo na estenose
    
    - name: d_proximal
      type: number
      unit: mm
      required: true
      valid_range: 0-10
      notes: Diâmetro normal proximal (CCA)
  
  Preprocessing:
    - Validar d_estenose > 0 e d_proximal > 0
    - Validar d_estenose <= d_proximal
    - Se d_estenose > d_proximal, inverter com aviso
  
  Formula:
    % Estenose ECST = (1 - d_estenose / d_proximal) × 100
    
    Passo 1: Dividir d_estenose por d_proximal
    Passo 2: Subtrair de 1
    Passo 3: Multiplicar por 100
  
  Output:
    primary_value:
      name: stenosis_percent_ecst
      unit: "%"
      precision: 0 casas decimais
    derived_values:
      - name: stenosis_category
        value: Classificação (0-29% / 30-69% / ≥70%)
      - name: nascet_equivalent
        value: "Estimativa NASCET (aproximadamente -10%)"
  
  Interpretation:
    rules:
      - if: stenosis_percent_ecst < 30
        then: "Sem estenose significativa"
      - if: 30 <= stenosis_percent_ecst <= 69
        then: "Estenose moderada (30-69%)"
      - if: stenosis_percent_ecst >= 70
        then: "Estenose grave (≥70%); indicação cirúrgica se sintomático"
  
  QA_Checks:
    - Alertar se stenosis_percent_ecst > 100 (erro)
    - Alertar se d_estenose == d_proximal (sem estenose)
    - Validar medições em mesmo plano
    - Verificar se medições evitam trombo mural
    - Notar que ECST ~10% maior que NASCET
  
  Evidence:
    primary_source: "European Carotid Surgery Trial. Lancet. 1991;337(8752):1235-1243."
    radiopaedia_link: "https://radiopaedia.org/articles/ecst-criteria"
    notes: "Alternativa NASCET; valores ECST ~10% maiores. Menos usado que NASCET atualmente."
```

---

## VASC-0010: Mesenteric Artery Stenosis Doppler

```
CALC_BLOCK:
  ItemID: VASC-0010
  FunctionName: calculate_mesenteric_stenosis_doppler
  
  Inputs:
    - name: PSV_SMA
      type: number
      unit: cm/s
      required: true
      valid_range: 0-400
      notes: PSV artéria mesentérica superior
    
    - name: PSV_celiaca
      type: number
      unit: number
      required: false
      valid_range: 0-300
      notes: PSV artéria celíaca (opcional)
  
  Preprocessing:
    - Converter m/s para cm/s se necessário (×100)
    - Validar PSV_SMA > 0
    - Jejum obrigatório (reduz gases intestinais)
  
  Formula:
    Critério SMA: PSV_SMA (cm/s)
    Critério Celíaca: PSV_celiaca (cm/s)
    
    Passo 1: Medir PSV SMA proximal
    Passo 2: Medir PSV celíaca proximal (se possível)
    Passo 3: Comparar com cutoffs
  
  Output:
    primary_value:
      name: mesenteric_stenosis_probability
      value: "Sem estenose / Borderline / Provável estenose"
    derived_values:
      - name: PSV_SMA_value
        value: PSV_SMA (cm/s)
      - name: PSV_celiaca_value
        value: PSV_celiaca (cm/s) ou "não medido"
  
  Interpretation:
    rules:
      - if: PSV_SMA < 275 AND PSV_celiaca < 200
        then: "Sem estenose significativa"
      - if: (275 <= PSV_SMA <= 400) OR (200 <= PSV_celiaca <= 250)
        then: "Borderline; considerar confirmação por CTA/MRA/angiografia"
      - if: PSV_SMA > 400 OR PSV_celiaca > 250
        then: "Provável estenose significativa; confirmar por CTA/MRA/angiografia"
  
  QA_Checks:
    - Alertar se PSV_SMA < 50 cm/s (possível erro ou hipoperfusão)
    - Validar ângulo Doppler <60°
    - Verificar se medições em segmento proximal
    - Alertar se gases intestinais limitam visualização
    - Confirmar jejum do paciente
    - Considerar débito cardíaco baixo (afeta PSV)
  
  Evidence:
    primary_source: "Moneta GL et al. Screening for asymptomatic SMA stenosis. J Vasc Surg. 1993;17(1):143-150."
    radiopaedia_link: "https://radiopaedia.org/articles/mesenteric-artery-stenosis"
    notes: "Critérios Doppler para estenose mesentérica. Confirmação por CTA/MRA/angiografia recomendada."
```

---

## THX-0001: Pleural Effusion Volume (CT)

```
CALC_BLOCK:
  ItemID: THX-0001
  FunctionName: calculate_pleural_effusion_volume_ct
  
  Inputs:
    - name: profundidade_max
      type: number
      unit: mm
      required: true
      valid_range: 0-200
      notes: Profundidade máxima derrame (eixo transversal)
    
    - name: comprimento_max
      type: number
      unit: mm
      required: true
      valid_range: 0-300
      notes: Comprimento máximo derrame (eixo longitudinal)
  
  Preprocessing:
    - Converter cm para mm se necessário (×10)
    - Validar profundidade_max > 0 e comprimento_max > 0
    - Usar fórmula Goecke/Hazlinger (polinomial)
  
  Formula:
    Convertendo para cm: d = profundidade_max / 10, l = comprimento_max / 10
    
    V (mL) = 0.365×d³ - 4.529×d² + 159.723×d - 88.377
    
    Passo 1: Converter profundidade de mm para cm
    Passo 2: Aplicar fórmula polinomial
    Passo 3: Resultado em mL
  
  Output:
    primary_value:
      name: effusion_volume
      unit: mL
      precision: 0 casas decimais
    derived_values:
      - name: effusion_category
        value: "Pequeno / Moderado / Volumoso"
  
  Interpretation:
    rules:
      - if: effusion_volume < 500
        then: "Pequeno derrame (<500 mL)"
      - if: 500 <= effusion_volume <= 1000
        then: "Derrame moderado (500-1000 mL)"
      - if: effusion_volume > 1000
        then: "Derrame volumoso (>1000 mL)"
  
  QA_Checks:
    - Alertar se effusion_volume < 0 (erro matemático)
    - Validar medições em corte axial
    - Verificar se derrame unilateral ou bilateral
    - Alertar se profundidade > 200 mm (possível erro)
    - Considerar trombo mural que pode superestimar volume
  
  Evidence:
    primary_source: "Goecke T, Hazlinger B. New formula quantification pleural effusions CT. Eur Radiol. 1999;9(8):1547-1549."
    radiopaedia_link: "https://radiopaedia.org/articles/pleural-effusion-volume-ultrasound"
    notes: "Fórmula polinomial validada. Mais acurada que fórmula simples V = d² × l."
```

---

## THX-0002: RV:LV Ratio

```
CALC_BLOCK:
  ItemID: THX-0002
  FunctionName: calculate_rv_lv_ratio
  
  Inputs:
    - name: d_RV
      type: number
      unit: mm
      required: true
      valid_range: 0-100
      notes: Diâmetro RV (eixo transversal, nível 4 câmaras)
    
    - name: d_LV
      type: number
      unit: mm
      required: true
      valid_range: 0-100
      notes: Diâmetro LV (eixo transversal, nível 4 câmaras)
  
  Preprocessing:
    - Validar d_RV > 0 e d_LV > 0
    - Medir no corte axial nível átrio direito máximo
    - Usar eixo transversal (não reformatações)
  
  Formula:
    RV:LV = d_RV / d_LV
    
    Passo 1: Medir diâmetro RV transversal
    Passo 2: Medir diâmetro LV transversal
    Passo 3: Dividir RV por LV
  
  Output:
    primary_value:
      name: rv_lv_ratio
      unit: ratio
      precision: 2 casas decimais
    derived_values:
      - name: rv_dilatation_status
        value: "Normal / Borderline / Dilatado"
  
  Interpretation:
    rules:
      - if: rv_lv_ratio < 0.9
        then: "Normal; sem dilatação RV"
      - if: 0.9 <= rv_lv_ratio <= 1.0
        then: "Borderline; possível disfunção RV leve"
      - if: rv_lv_ratio > 1.0
        then: "Dilatação RV; disfunção RV presente (associado a pior prognóstico em TEP)"
  
  QA_Checks:
    - Alertar se rv_lv_ratio < 0.5 (possível erro)
    - Alertar se rv_lv_ratio > 2.0 (possível erro)
    - Validar medições no corte correto (axial, nível 4 câmaras)
    - Verificar se não há artefato de movimento
    - Confirmar que medições são transversais (não sagitais)
  
  Evidence:
    primary_source: "Qanadli SD et al. New CT index quantify arterial obstruction PE. AJR. 2001;176(6):1415-1420."
    radiopaedia_link: "https://radiopaedia.org/articles/right-heart-strain"
    notes: "RV:LV >1.0 associado a disfunção RV e pior prognóstico em TEP. Não diagnóstico isoladamente."
```

---

## THX-0003: PA:Aorta Ratio

```
CALC_BLOCK:
  ItemID: THX-0003
  FunctionName: calculate_pa_aorta_ratio
  
  Inputs:
    - name: d_PA
      type: number
      unit: mm
      required: true
      valid_range: 0-100
      notes: Diâmetro PA principal (nível bifurcação)
    
    - name: d_Ao
      type: number
      unit: mm
      required: true
      valid_range: 0-100
      notes: Diâmetro aorta ascendente (mesmo nível)
  
  Preprocessing:
    - Validar d_PA > 0 e d_Ao > 0
    - Medir no corte axial bifurcação PA
    - Medir aorta ascendente mesmo nível
  
  Formula:
    PA:Ao = d_PA / d_Ao
    
    Passo 1: Medir diâmetro PA principal
    Passo 2: Medir diâmetro aorta ascendente
    Passo 3: Dividir PA por Ao
  
  Output:
    primary_value:
      name: pa_aorta_ratio
      unit: ratio
      precision: 2 casas decimais
    derived_values:
      - name: ph_probability
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: pa_aorta_ratio < 0.9
        then: "Normal; sem sugestão de PH"
      - if: 0.9 <= pa_aorta_ratio <= 1.0
        then: "Borderline; possível PH leve"
      - if: pa_aorta_ratio > 1.0
        then: "Sugestivo de PH; considerar ecocardiografia para confirmação"
  
  QA_Checks:
    - Alertar se pa_aorta_ratio < 0.5 (possível erro)
    - Alertar se pa_aorta_ratio > 2.0 (possível erro)
    - Validar medições no corte correto (bifurcação PA)
    - Verificar se não há artefato de movimento
    - Complementar com avaliação clínica e ecocardiografia
  
  Evidence:
    primary_source: "Ng CS et al. Effect pulmonary hypertension PA diameter. Chest. 1999;115(3):646-651."
    radiopaedia_link: "https://radiopaedia.org/articles/pulmonary-hypertension-1"
    notes: "PA/Ao >0.9 é 90º percentil normal. Não diagnóstico isoladamente; complementar com ecocardiografia."
```

---

## THX-0004: Fleischner Nodule Follow-up 2017

```
CALC_BLOCK:
  ItemID: THX-0004
  FunctionName: classify_nodule_fleischner_2017
  
  Inputs:
    - name: tamanho_mm
      type: number
      unit: mm
      required: true
      valid_range: 0-30
      notes: Maior diâmetro nódulo
    
    - name: tipo_nodulo
      type: enum
      required: true
      valid_values: ["sólido", "subssólido", "vidro_fosco_puro"]
      notes: Classificação de densidade
    
    - name: risco_paciente
      type: enum
      required: true
      valid_values: ["baixo", "alto"]
      notes: Risco clínico (idade, tabagismo, etc)
  
  Preprocessing:
    - Validar tamanho_mm > 0
    - Classificar tipo_nodulo corretamente
    - Avaliar risco paciente (tabagismo, história familiar)
  
  Formula:
    Intervalo_follow_up = f(tamanho_mm, tipo_nodulo, risco_paciente)
    
    Passo 1: Medir maior diâmetro nódulo
    Passo 2: Classificar tipo (sólido/subssólido/vidro fosco)
    Passo 3: Avaliar risco paciente
    Passo 4: Aplicar tabela Fleischner 2017
  
  Output:
    primary_value:
      name: follow_up_interval
      value: "Sem follow-up / 12 meses / 6-8 semanas / 3-6 meses / 18-24 meses / PET-CT"
    derived_values:
      - name: nodule_category
        value: "Baixo risco / Intermediário / Alto risco"
  
  Interpretation:
    rules:
      - if: tamanho_mm < 4 AND tipo_nodulo = "sólido"
        then: "Sem follow-up necessário"
      - if: 4 <= tamanho_mm <= 6 AND tipo_nodulo = "sólido" AND risco_paciente = "baixo"
        then: "Follow-up 12 meses"
      - if: 4 <= tamanho_mm <= 6 AND tipo_nodulo = "sólido" AND risco_paciente = "alto"
        then: "Follow-up 6-8 semanas"
      - if: 6 < tamanho_mm <= 8
        then: "Follow-up 6-8 semanas depois 3-6 meses"
      - if: tamanho_mm > 8
        then: "PET-CT ou biópsia"
      - if: tipo_nodulo = "subssólido" AND tamanho_mm < 6
        then: "Sem follow-up"
      - if: tipo_nodulo = "subssólido" AND tamanho_mm >= 6
        then: "Follow-up 3-6 meses depois 18-24 meses"
  
  QA_Checks:
    - Alertar se tamanho_mm > 30 (possível massa, não nódulo)
    - Validar classificação tipo_nodulo
    - Verificar se nódulo em pulmão (não mediastino/pleura)
    - Considerar história tabagismo para risco
    - Documentar localização exata (lobo, segmento)
  
  Evidence:
    primary_source: "MacMahon H et al. Guidelines Management Incidental Pulmonary Nodules CT. Radiology. 2017;284(1):228-243."
    radiopaedia_link: "https://radiopaedia.org/articles/fleischner-society-pulmonary-nodule-recommendations-1"
    notes: "Diretrizes Fleischner 2017 atualizadas. Baseadas em risco malignidade."
```

---

## THX-0005: Emphysema Index LAA%

```
CALC_BLOCK:
  ItemID: THX-0005
  FunctionName: calculate_emphysema_index_laa
  
  Inputs:
    - name: voxels_950_HU
      type: number
      unit: count
      required: true
      valid_range: 0-1000000
      notes: Número de voxels ≤-950 HU
    
    - name: voxels_totais_pulmao
      type: number
      unit: count
      required: true
      valid_range: 0-1000000
      notes: Número total de voxels pulmão
  
  Preprocessing:
    - Validar voxels_950_HU > 0 e voxels_totais_pulmao > 0
    - Validar voxels_950_HU <= voxels_totais_pulmao
    - Usar TC baixa dose inspiração completa
    - Aplicar segmentação automática pulmão
  
  Formula:
    LAA% = (voxels ≤-950 HU / voxels totais pulmão) × 100
    
    Passo 1: Contar voxels ≤-950 HU
    Passo 2: Contar voxels totais pulmão
    Passo 3: Dividir e multiplicar por 100
  
  Output:
    primary_value:
      name: laa_percentage
      unit: "%"
      precision: 1 casa decimal
    derived_values:
      - name: emphysema_severity
        value: "Normal / Leve / Moderado / Grave"
  
  Interpretation:
    rules:
      - if: laa_percentage < 5
        then: "Normal; sem enfisema significativo"
      - if: 5 <= laa_percentage < 25
        then: "Enfisema leve"
      - if: 25 <= laa_percentage < 50
        then: "Enfisema moderado"
      - if: laa_percentage >= 50
        then: "Enfisema grave"
  
  QA_Checks:
    - Alertar se laa_percentage < 0 ou > 100 (erro)
    - Validar TC baixa dose (não pode ser dose alta)
    - Verificar se inspiração completa (não expiração)
    - Confirmar segmentação pulmão correta
    - Alertar se outras doenças presentes (fibrose, aspergiloma)
  
  Evidence:
    primary_source: "Gevenois PA et al. Comparison computed density macroscopic morphometry emphysema. AJR. 1995;165(3):553-558."
    radiopaedia_link: "https://radiopaedia.org/articles/emphysema"
    notes: "Threshold -950 HU padrão para enfisema. Correlaciona com função pulmonar (FEV1)."
```

---

## THX-0006: PESI Score

```
CALC_BLOCK:
  ItemID: THX-0006
  FunctionName: calculate_pesi_score
  
  Inputs:
    - name: idade
      type: number
      unit: years
      required: true
      valid_range: 0-120
      notes: Idade do paciente
    
    - name: sexo
      type: enum
      required: true
      valid_values: ["M", "F"]
      notes: Sexo (M=masculino, F=feminino)
    
    - name: FC
      type: number
      unit: bpm
      required: true
      valid_range: 0-200
      notes: Frequência cardíaca
    
    - name: PAS
      type: number
      unit: mmHg
      required: true
      valid_range: 0-300
      notes: Pressão arterial sistólica
    
    - name: FR
      type: number
      unit: respiracoes/min
      required: true
      valid_range: 0-100
      notes: Frequência respiratória
    
    - name: temperatura
      type: number
      unit: °C
      required: true
      valid_range: 30-45
      notes: Temperatura corporal
    
    - name: consciencia_alterada
      type: boolean
      required: true
      notes: Consciência alterada?
    
    - name: SaO2
      type: number
      unit: "%"
      required: true
      valid_range: 0-100
      notes: Saturação O2
    
    - name: ICC
      type: boolean
      required: true
      notes: Insuficiência cardíaca?
    
    - name: DPOC
      type: boolean
      required: true
      notes: DPOC?
  
  Preprocessing:
    - Validar todos os inputs > 0
    - Converter temperatura Fahrenheit para Celsius se necessário
    - Validar SaO2 <= 100%
  
  Formula:
    PESI = idade + (10 se sexo=M) + (30 se FC≥110) + (20 se PAS<100) + (20 se FR≥30) + (20 se T<36) + (60 se consciência alterada) + (20 se ICC) + (10 se DPOC)
    
    Passo 1: Começar com idade
    Passo 2: Adicionar pontos por sexo masculino (+10)
    Passo 3: Adicionar pontos por FC≥110 (+30)
    Passo 4: Adicionar pontos por PAS<100 (+20)
    Passo 5: Adicionar pontos por FR≥30 (+20)
    Passo 6: Adicionar pontos por T<36°C (+20)
    Passo 7: Adicionar pontos por consciência alterada (+60)
    Passo 8: Adicionar pontos por ICC (+20)
    Passo 9: Adicionar pontos por DPOC (+10)
  
  Output:
    primary_value:
      name: pesi_score
      unit: points
      precision: 0 casas decimais
    derived_values:
      - name: pesi_class
        value: "I / II / III / IV / V"
      - name: mortality_30days_percent
        value: "Percentual mortalidade 30 dias"
  
  Interpretation:
    rules:
      - if: pesi_score <= 65
        then: "Classe I; mortalidade <2%; candidato a tratamento ambulatorial"
      - if: 66 <= pesi_score <= 85
        then: "Classe II; mortalidade 2-7%; considerar internação"
      - if: 86 <= pesi_score <= 105
        then: "Classe III; mortalidade 3-7%; internação recomendada"
      - if: 106 <= pesi_score <= 125
        then: "Classe IV; mortalidade 4-11%; internação em unidade intensiva"
      - if: pesi_score > 125
        then: "Classe V; mortalidade >11%; internação em unidade intensiva"
  
  QA_Checks:
    - Alertar se pesi_score < 0 (erro)
    - Validar FC entre 0-200 bpm
    - Validar PAS entre 0-300 mmHg
    - Validar FR entre 0-100 respirações/min
    - Validar temperatura entre 30-45°C
    - Validar SaO2 entre 0-100%
  
  Evidence:
    primary_source: "Aujesky D et al. Derivation validation prognostic model PE. Am J Respir Crit Care Med. 2005;172(8):1041-1046."
    radiopaedia_link: "https://radiopaedia.org/articles/pulmonary-embolism-severity-index-pesi"
    notes: "Score clínico validado para estratificar risco TEP. Existe sPESI (simplificada)."
```

---

## ABD-0001: Hepatorenal Index

```
CALC_BLOCK:
  ItemID: ABD-0001
  FunctionName: calculate_hepatorenal_index
  
  Inputs:
    - name: atenuacao_figado
      type: number
      unit: dB/cm
      required: true
      valid_range: 0-100
      notes: Atenuação fígado medida em US
    
    - name: atenuacao_rim
      type: number
      unit: dB/cm
      required: true
      valid_range: 0-100
      notes: Atenuação rim direito medida em US
  
  Preprocessing:
    - Validar atenuacao_figado > 0 e atenuacao_rim > 0
    - Usar ROI ≥1 cm parênquima hepático
    - Usar ROI ≥1 cm cortex renal direita
    - Evitar vasos e estruturas adjacentes
  
  Formula:
    HRI = (A_fígado - A_rim) / A_rim
    
    Passo 1: Medir atenuação fígado
    Passo 2: Medir atenuação rim
    Passo 3: Calcular diferença
    Passo 4: Dividir por atenuação rim
  
  Output:
    primary_value:
      name: hepatorenal_index
      unit: ratio
      precision: 2 casas decimais
    derived_values:
      - name: steatosis_grade
        value: "Sem / Leve / Moderada / Grave"
  
  Interpretation:
    rules:
      - if: hri < 0.5
        then: "Sem esteatose significativa"
      - if: 0.5 <= hri < 1.5
        then: "Esteatose leve"
      - if: 1.5 <= hri < 2.5
        then: "Esteatose moderada"
      - if: hri >= 2.5
        then: "Esteatose grave"
  
  QA_Checks:
    - Alertar se hri < 0 (erro)
    - Validar ROI adequado (≥1 cm)
    - Verificar se evita vasos
    - Alertar se cirrose/fibrose presente (invalida índice)
    - Alertar se ferro hepático presente (aumenta atenuação)
  
  Evidence:
    primary_source: "Hamaguchi M et al. Severity ultrasonographic findings NAFLD. AJR. 2007;188(6):1490-1496."
    radiopaedia_link: "https://radiopaedia.org/articles/diffuse-hepatic-steatosis"
    notes: "Índice US para quantificar esteatose. HRI >1.5 sugere esteatose >5%."
```

---

## ABD-0002: Bosniak Classification 2019

```
CALC_BLOCK:
  ItemID: ABD-0002
  FunctionName: classify_renal_cyst_bosniak_2019
  
  Inputs:
    - name: realce_HU
      type: number
      unit: HU
      required: true
      valid_range: -20-100
      notes: Realce em unidades Hounsfield (≥20 HU = realce)
    
    - name: componentes_solidos
      type: boolean
      required: true
      notes: Presença de componentes sólidos?
    
    - name: septos
      type: boolean
      required: true
      notes: Presença de septos?
    
    - name: calcificacao
      type: boolean
      required: true
      notes: Presença de calcificação?
    
    - name: numero_septos
      type: number
      unit: count
      required: false
      valid_range: 0-10
      notes: Número de septos (se presentes)
  
  Preprocessing:
    - Validar presença de realce (≥20 HU = realce)
    - Usar TC com contraste (NC + arterial + portal + tardia)
    - Classificar cada componente
  
  Formula:
    Categoria Bosniak = f(realce, sólido, septos, calcificação)
    
    Passo 1: Avaliar realce (ausente/presente)
    Passo 2: Avaliar componentes sólidos
    Passo 3: Avaliar septos
    Passo 4: Avaliar calcificação
    Passo 5: Aplicar tabela Bosniak 2019
  
  Output:
    primary_value:
      name: bosniak_category
      value: "I / II / IIF / III / IV / V"
    derived_values:
      - name: malignancy_risk
        value: "Risco malignidade (%)"
  
  Interpretation:
    rules:
      - if: bosniak_category = "I"
        then: "Simples; sem risco malignidade; sem follow-up"
      - if: bosniak_category = "II"
        then: "Benigno; <5% risco; sem follow-up"
      - if: bosniak_category = "IIF"
        then: "Intermediário; 5-10% risco; follow-up 5 anos"
      - if: bosniak_category = "III"
        then: "Complexo ambíguo; 10-50% risco; follow-up ou biópsia"
      - if: bosniak_category = "IV"
        then: "Sólido com realce; >50% risco; considerar cirurgia"
      - if: bosniak_category = "V"
        then: "Completamente sólido; >90% risco; cirurgia recomendada"
  
  QA_Checks:
    - Validar TC com contraste (NC + fases)
    - Verificar realce ≥20 HU
    - Alertar se realce <20 HU (não significativo)
    - Confirmar presença de septos (não confundir com artefato)
    - Documentar localização exata (rim D/E, pólo)
  
  Evidence:
    primary_source: "Silverman SG et al. Management incidental adrenal mass. Radiology. 2019;292(2):251-260."
    radiopaedia_link: "https://radiopaedia.org/articles/bosniak-classification-of-cystic-renal-masses-version-2019"
    notes: "Classificação Bosniak 2019 atualizada. Baseada em risco malignidade."
```

---

## ABD-0003: RENAL Nephrometry Score

```
CALC_BLOCK:
  ItemID: ABD-0003
  FunctionName: calculate_renal_nephrometry_score
  
  Inputs:
    - name: radius_cm
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Maior diâmetro lesão
    
    - name: exophytic_percent
      type: number
      unit: "%"
      required: true
      valid_range: 0-100
      notes: Percentual exofítico (0-25% / 26-50% / 51-100%)
    
    - name: nearness_mm
      type: number
      unit: mm
      required: true
      valid_range: 0-100
      notes: Distância sistema coletor (mm)
    
    - name: anterior_posterior
      type: enum
      required: true
      valid_values: ["anterior", "posterior", "ambos"]
      notes: Localização (anterior/posterior/ambos)
    
    - name: location_polar
      type: enum
      required: true
      valid_values: ["superior", "meio", "inferior"]
      notes: Localização polar (superior/meio/inferior)
  
  Preprocessing:
    - Validar radius_cm > 0
    - Validar exophytic_percent entre 0-100
    - Validar nearness_mm > 0
    - Medir em TC/RM
  
  Formula:
    RENAL = R + E + N + A + L
    
    R (Radius):
      - <4 cm = 1 ponto
      - 4-7 cm = 2 pontos
      - >7 cm = 3 pontos
    
    E (Exophytic):
      - 0-25% = 1 ponto
      - 26-50% = 2 pontos
      - 51-100% = 3 pontos
    
    N (Nearness):
      - ≥7 mm = 1 ponto
      - 4-6 mm = 2 pontos
      - <4 mm = 3 pontos
    
    A (Anterior/Posterior):
      - Anterior = 1 ponto
      - Posterior = 1 ponto
      - Ambos = 2 pontos
    
    L (Location):
      - Superior/Inferior = 1 ponto
      - Meio = 2 pontos
  
  Output:
    primary_value:
      name: renal_score
      unit: points
      precision: 0 casas decimais
    derived_values:
      - name: complexity_category
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: renal_score <= 6
        then: "Baixa complexidade; cirurgia conservadora viável"
      - if: 7 <= renal_score <= 9
        then: "Complexidade intermediária; cirurgia parcial possível"
      - if: renal_score >= 10
        then: "Alta complexidade; considerar nefrectomia radical"
  
  QA_Checks:
    - Validar medições em TC/RM
    - Verificar localização exata lesão
    - Confirmar distância sistema coletor
    - Documentar percentual exofítico
    - Alertar se lesão muito complexa (RENAL >12)
  
  Evidence:
    primary_source: "Kutikov A, Uzzo RG. R.E.N.A.L. nephrometry score. J Urol. 2009;182(3):844-853."
    radiopaedia_link: "https://radiopaedia.org/articles/renal-nephrometry-scoring-system-2"
    notes: "Score para estratificar complexidade anatômica massas renais. Guia decisão cirúrgica."
```

---

## ABD-0004: Height-Adjusted TKV

```
CALC_BLOCK:
  ItemID: ABD-0004
  FunctionName: calculate_height_adjusted_tkv
  
  Inputs:
    - name: volume_renal_total
      type: number
      unit: mL
      required: true
      valid_range: 0-5000
      notes: Volume renal total (ambos rins)
    
    - name: altura
      type: number
      unit: m
      required: true
      valid_range: 1.0-2.5
      notes: Altura do paciente em metros
  
  Preprocessing:
    - Validar volume_renal_total > 0
    - Validar altura > 0
    - Usar segmentação manual/automática ambos rins
    - Usar TC/RM
  
  Formula:
    ht-TKV (mL/m) = volume renal total / altura
    
    Passo 1: Segmentar ambos rins
    Passo 2: Calcular volume total (soma)
    Passo 3: Dividir por altura em metros
  
  Output:
    primary_value:
      name: ht_tkv
      unit: mL/m
      precision: 1 casa decimal
    derived_values:
      - name: mayo_class
        value: "1A / 1B / 2 / 3 / 4"
      - name: progression_risk
        value: "Lenta / Intermediária / Rápida"
  
  Interpretation:
    rules:
      - if: ht_tkv < 1.5
        then: "Mayo Class 1A (idade 15-39); progressão lenta"
      - if: 1.5 <= ht_tkv < 2.2
        then: "Mayo Class 1B (idade 15-39); progressão lenta"
      - if: 2.2 <= ht_tkv < 2.6
        then: "Mayo Class 2; progressão intermediária"
      - if: 2.6 <= ht_tkv < 3.1
        then: "Mayo Class 3; progressão intermediária-rápida"
      - if: ht_tkv >= 3.1
        then: "Mayo Class 4; progressão rápida"
  
  QA_Checks:
    - Validar segmentação renal correta
    - Alertar se volume < 100 mL (possível erro)
    - Alertar se volume > 3000 mL (possível erro)
    - Validar altura entre 1.0-2.5 m
    - Confirmar que volume é ambos rins (não unilateral)
  
  Evidence:
    primary_source: "Irazabal MV et al. Imaging classification ADPKD. J Am Soc Nephrol. 2015;26(1):160-172."
    radiopaedia_link: "https://radiopaedia.org/articles/adpkd-classification"
    notes: "Classificação Mayo para DRPAD. Prediz progressão doença e necessidade diálise."
```

---

## ABD-0005: Adrenal Absolute Washout

```
CALC_BLOCK:
  ItemID: ABD-0005
  FunctionName: calculate_adrenal_absolute_washout
  
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
      notes: Atenuação fase portal (60-90 seg)
    
    - name: HU_tardia
      type: number
      unit: HU
      required: true
      valid_range: -50-150
      notes: Atenuação fase tardia (15 min)
  
  Preprocessing:
    - Validar HU_nc > -100 e HU_nc < 100
    - Validar HU_portal > 0
    - Validar HU_tardia > -50
    - Usar ROI ≥1 cm evitando necrose/vasos
    - Protocolo: NC + portal (60-90 seg) + tardia (15 min)
  
  Formula:
    AW (%) = (HU_portal - HU_tardia) / (HU_portal - HU_nc) × 100
    
    Passo 1: Calcular washout = HU_portal - HU_tardia
    Passo 2: Calcular denominador = HU_portal - HU_nc
    Passo 3: Dividir e multiplicar por 100
  
  Output:
    primary_value:
      name: absolute_washout
      unit: "%"
      precision: 0 casas decimais
    derived_values:
      - name: adenoma_probability
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: absolute_washout > 60
        then: "Adenoma (alta especificidade ~98%)"
      - if: 40 <= absolute_washout <= 60
        then: "Borderline; considerar complementação (RM, follow-up)"
      - if: absolute_washout < 40
        then: "Sugestivo não-adenoma; considerar RM/follow-up"
  
  QA_Checks:
    - Alertar se absolute_washout < 0 ou > 100 (erro)
    - Validar ROI ≥1 cm
    - Verificar se evita necrose/vasos
    - Alertar se insuficiência renal (afeta clearance contraste)
    - Confirmar protocolo TC correto (NC + portal + tardia)
  
  Evidence:
    primary_source: "Caoili EM et al. Adrenal masses characterization. Radiology. 2002;222(3):629-633."
    radiopaedia_link: "https://radiopaedia.org/articles/adrenal-washout"
    notes: "Protocolo TC para caracterização adenoma. Washout >60% = adenoma com alta especificidade."
```

---

## ABD-0006: Adrenal Signal Intensity Index

```
CALC_BLOCK:
  ItemID: ABD-0006
  FunctionName: calculate_adrenal_signal_intensity_index
  
  Inputs:
    - name: sinal_in_phase
      type: number
      unit: intensity
      required: true
      valid_range: 0-1000
      notes: Sinal in-phase (TE ~2.3 ms em 1.5T)
    
    - name: sinal_opposed_phase
      type: number
      unit: intensity
      required: true
      valid_range: 0-1000
      notes: Sinal opposed-phase (TE ~4.6 ms em 1.5T)
  
  Preprocessing:
    - Validar sinal_in_phase > 0 e sinal_opposed_phase > 0
    - Usar sequências T1 in-phase e opposed-phase
    - Usar ROI ≥1 cm evitando artefatos
    - Usar RM 1.5T ou 3T
  
  Formula:
    SII (%) = (S_in - S_opp) / S_in × 100
    
    Passo 1: Calcular diferença = S_in - S_opp
    Passo 2: Dividir por S_in
    Passo 3: Multiplicar por 100
  
  Output:
    primary_value:
      name: signal_intensity_index
      unit: "%"
      precision: 1 casa decimal
    derived_values:
      - name: adenoma_probability
        value: "Baixa / Intermediária / Alta"
  
  Interpretation:
    rules:
      - if: signal_intensity_index > 16.5
        then: "Adenoma (sensibilidade ~80%, especificidade ~95%)"
      - if: 10 <= signal_intensity_index <= 16.5
        then: "Borderline; considerar complementação"
      - if: signal_intensity_index < 10
        then: "Sugestivo não-adenoma"
  
  QA_Checks:
    - Alertar se sii < 0 ou > 100 (erro)
    - Validar sequências corretas (in-phase e opposed-phase)
    - Verificar se ROI ≥1 cm
    - Alertar se artefatos presentes
    - Confirmar que é adenoma sem gordura (SII pode ser baixo)
  
  Evidence:
    primary_source: "Halefoglu AM, Baskan O. Diffusion-weighted MR imaging adrenal masses. Diagn Interv Radiol. 2012;18(1):99-105."
    radiopaedia_link: "https://radiopaedia.org/articles/adrenal-adenoma"
    notes: "Índice RM para detectar gordura em adenomas. SII >16.5% = adenoma lipídico."
```

---

## ABD-0007: LI-RADS Threshold Growth

```
CALC_BLOCK:
  ItemID: ABD-0007
  FunctionName: calculate_lirads_threshold_growth
  
  Inputs:
    - name: d_anterior
      type: number
      unit: mm
      required: true
      valid_range: 0-200
      notes: Diâmetro nódulo anterior
    
    - name: d_atual
      type: number
      unit: mm
      required: true
      valid_range: 0-200
      notes: Diâmetro nódulo atual
    
    - name: intervalo_meses
      type: number
      unit: months
      required: true
      valid_range: 0-24
      notes: Intervalo entre exames (meses)
  
  Preprocessing:
    - Validar d_anterior > 0 e d_atual > 0
    - Validar intervalo_meses > 0
    - Usar mesmo plano em ambos exames quando possível
    - Medir maior diâmetro nódulo
  
  Formula:
    % Crescimento = (d_atual - d_anterior) / d_anterior × 100
    
    Threshold Growth = % Crescimento ≥ 50% em ≤ 6 meses
    
    Passo 1: Calcular diferença = d_atual - d_anterior
    Passo 2: Dividir por d_anterior
    Passo 3: Multiplicar por 100
    Passo 4: Verificar se ≥50% e intervalo ≤6 meses
  
  Output:
    primary_value:
      name: threshold_growth_present
      value: true/false
    derived_values:
      - name: growth_percent
        value: "Percentual crescimento (%)"
      - name: lirads_major_feature
        value: "Sim/Não"
  
  Interpretation:
    rules:
      - if: (growth_percent >= 50) AND (intervalo_meses <= 6)
        then: "Threshold growth presente; major feature LI-RADS; contribui para LR-4 ou LR-5"
      - if: (growth_percent < 50) OR (intervalo_meses > 6)
        then: "Threshold growth ausente"
  
  QA_Checks:
    - Alertar se d_atual < d_anterior (regressão; verificar medições)
    - Validar intervalo_meses > 0
    - Verificar se medições em mesmo plano
    - Alertar se intervalo > 6 meses (não qualifica como threshold)
    - Confirmar que nódulo em cirrose (contexto LI-RADS)
  
  Evidence:
    primary_source: "Chernyak V et al. Liver Imaging Reporting Data System v2018. Radiology. 2018;289(3):816-830."
    radiopaedia_link: "https://radiopaedia.org/articles/ctmri-li-rads"
    notes: "LI-RADS v2018: ≥50% aumento diâmetro em ≤6 meses = major feature."
```

---

## ABD-0008: Modified CT Severity Index

```
CALC_BLOCK:
  ItemID: ABD-0008
  FunctionName: calculate_modified_ct_severity_index
  
  Inputs:
    - name: grau_inflamacao
      type: enum
      required: true
      valid_values: ["A", "B", "C", "D", "E"]
      notes: Grau inflamação pancreática (Balthazar A-E)
    
    - name: percentual_necrose
      type: number
      unit: "%"
      required: true
      valid_range: 0-100
      notes: Percentual necrose pancreática
  
  Preprocessing:
    - Validar grau_inflamacao entre A-E
    - Validar percentual_necrose entre 0-100
    - Usar TC com contraste fase portal
  
  Formula:
    Pontos Inflamação (Balthazar):
      A = 0 pontos
      B = 1 ponto
      C = 2 pontos
      D = 3 pontos
      E = 4 pontos
    
    Pontos Necrose:
      0% = 0 pontos
      1-30% = 2 pontos
      >30% = 4 pontos
    
    MCTSI = Pontos Inflamação + Pontos Necrose
  
  Output:
    primary_value:
      name: mctsi_score
      unit: points
      precision: 0 casas decimais
    derived_values:
      - name: severity_category
        value: "Leve / Moderada / Grave"
      - name: mortality_estimate
        value: "Percentual mortalidade (%)"
  
  Interpretation:
    rules:
      - if: mctsi_score <= 2
        then: "Pancreatite leve; mortalidade ~0%"
      - if: 4 <= mctsi_score <= 6
        then: "Pancreatite moderada; mortalidade ~3%"
      - if: mctsi_score >= 8
        then: "Pancreatite grave; mortalidade ~17%"
  
  QA_Checks:
    - Validar grau_inflamacao correto (A-E)
    - Verificar percentual_necrose entre 0-100
    - Confirmar TC com contraste
    - Alertar se pancreatite fulminante (mortalidade >30%)
    - Documentar complicações (pseudocisto, abscessos)
  
  Evidence:
    primary_source: "Mortele KJ et al. Modified Marshall score assessing severity acute pancreatitis. AJR. 2004;183(6):1519-1524."
    radiopaedia_link: "https://radiopaedia.org/articles/modified-ct-severity-index-pancreatitis"
    notes: "Score para avaliar gravidade pancreatite aguda. Prediz mortalidade e complicações."
```

---

## ABD-0009: Pancreatic Duct Diameter

```
CALC_BLOCK:
  ItemID: ABD-0009
  FunctionName: measure_pancreatic_duct_diameter
  
  Inputs:
    - name: diametro_cabeca
      type: number
      unit: mm
      required: false
      valid_range: 0-10
      notes: Diâmetro ducto pancreático na cabeça
    
    - name: diametro_corpo
      type: number
      unit: mm
      required: false
      valid_range: 0-10
      notes: Diâmetro ducto pancreático no corpo
    
    - name: diametro_cauda
      type: number
      unit: mm
      required: false
      valid_range: 0-10
      notes: Diâmetro ducto pancreático na cauda
  
  Preprocessing:
    - Validar diâmetros > 0
    - Medir eixo transversal maior diâmetro
    - Usar RM (MRCP) para melhor visualização
    - Evitar medições em confluência
  
  Formula:
    Valores Normais por Localização:
    Cabeça: 3-4 mm
    Corpo: 2-3 mm
    Cauda: 1-2 mm
    
    Passo 1: Medir diâmetro cabeça
    Passo 2: Medir diâmetro corpo
    Passo 3: Medir diâmetro cauda
    Passo 4: Comparar com valores normais
  
  Output:
    primary_value:
      name: duct_diameter_status
      value: "Normal / Borderline / Dilatado"
    derived_values:
      - name: dilatacao_localizacao
        value: "Localização da dilatação (se presente)"
  
  Interpretation:
    rules:
      - if: diametro_cabeca < 3 AND diametro_corpo < 2 AND diametro_cauda < 1
        then: "Normal"
      - if: (3 <= diametro_cabeca <= 5) OR (2 <= diametro_corpo <= 3) OR (1 <= diametro_cauda <= 2)
        then: "Borderline; considerar contexto clínico"
      - if: diametro_cabeca > 5 OR diametro_corpo > 3 OR diametro_cauda > 2
        then: "Dilatado; sugerir pancreatite crônica ou obstrução"
  
  QA_Checks:
    - Alertar se diâmetro < 0.5 mm (possível erro)
    - Alertar se diâmetro > 10 mm (possível erro ou dilatação massiva)
    - Validar medições em eixo transversal
    - Verificar se evita confluência
    - Alertar se dilatação pós-prandial (fisiológica)
  
  Evidence:
    primary_source: "Elgasim M et al. Pancreatic duct imaging aging. Endosc Ultrasound. 2023;12(2):118-125."
    radiopaedia_link: "https://radiopaedia.org/articles/pancreatic-duct-diameter"
    notes: "Valores normais variam ligeiramente entre estudos (1-3.5 mm). RM (MRCP) mais sensível que TC."
```

---

## ABD-0010: Splenic Volume Ellipsoid

```
CALC_BLOCK:
  ItemID: ABD-0010
  FunctionName: calculate_splenic_volume_ellipsoid
  
  Inputs:
    - name: comprimento
      type: number
      unit: cm
      required: true
      valid_range: 0-20
      notes: Comprimento baço (eixo longitudinal)
    
    - name: largura
      type: number
      unit: cm
      required: true
      valid_range: 0-15
      notes: Largura baço (eixo transversal)
    
    - name: espessura
      type: number
      unit: cm
      required: true
      valid_range: 0-15
      notes: Espessura baço (eixo ântero-posterior)
  
  Preprocessing:
    - Validar comprimento > 0, largura > 0, espessura > 0
    - Usar maior diâmetro cada dimensão
    - Medir em TC/RM/US
  
  Formula:
    V (mL) = L × W × H × 0.52
    
    Passo 1: Medir comprimento (L)
    Passo 2: Medir largura (W)
    Passo 3: Medir espessura (H)
    Passo 4: Multiplicar por 0.52 (fator elipsoide)
  
  Output:
    primary_value:
      name: splenic_volume
      unit: mL
      precision: 0 casas decimais
    derived_values:
      - name: splenomegaly_status
        value: "Normal / Borderline / Esplenomegalia"
  
  Interpretation:
    rules:
      - if: splenic_volume < 150
        then: "Normal"
      - if: 150 <= splenic_volume <= 200
        then: "Borderline"
      - if: 200 <= splenic_volume <= 400
        then: "Esplenomegalia leve"
      - if: splenic_volume > 400
        then: "Esplenomegalia moderada-grave"
  
  QA_Checks:
    - Alertar se volume < 50 mL (possível erro)
    - Alertar se volume > 1000 mL (possível erro)
    - Validar medições em três planos perpendiculares
    - Verificar se fórmula elipsoide apropriada
    - Alertar se baço muito irregular (fórmula menos acurada)
  
  Evidence:
    primary_source: "Bezerra AS et al. Determination splenomegaly CT ultrasound volumetry. Eur J Radiol. 2004;53(2):268-274."
    radiopaedia_link: "https://radiopaedia.org/articles/splenomegaly"
    notes: "Fórmula elipsoide validada. Volume >200 mL sugere esplenomegalia."
```

---

## URO-0001: Prostate Volume Ellipsoid

```
CALC_BLOCK:
  ItemID: URO-0001
  FunctionName: calculate_prostate_volume_ellipsoid
  
  Inputs:
    - name: comprimento
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Comprimento próstata (eixo sagital)
    
    - name: largura
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Largura próstata (eixo transversal)
    
    - name: altura
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Altura próstata (eixo ântero-posterior)
  
  Preprocessing:
    - Validar comprimento > 0, largura > 0, altura > 0
    - Usar maior diâmetro cada dimensão
    - TRUS: medir eixo transversal (W H) e sagital (L)
    - RM: T2 sagital e transversal
  
  Formula:
    V (mL) = L × W × H × π/6
    
    Passo 1: Medir comprimento (L)
    Passo 2: Medir largura (W)
    Passo 3: Medir altura (H)
    Passo 4: Multiplicar por π/6 (fator elipsoide)
  
  Output:
    primary_value:
      name: prostate_volume
      unit: mL
      precision: 0 casas decimais
    derived_values:
      - name: bph_severity
        value: "Normal / Leve / Moderada / Grave"
      - name: psa_density
        value: "PSA (ng/mL) / Volume (mL)"
  
  Interpretation:
    rules:
      - if: prostate_volume < 25
        then: "Normal"
      - if: 25 <= prostate_volume <= 50
        then: "Hiperplasia leve"
      - if: 50 < prostate_volume <= 100
        then: "Hiperplasia moderada"
      - if: prostate_volume > 100
        then: "Hiperplasia grave"
  
  QA_Checks:
    - Alertar se volume < 10 mL (possível erro)
    - Alertar se volume > 200 mL (possível erro)
    - Validar medições em três planos perpendiculares
    - Verificar se fórmula elipsoide apropriada
    - Alertar se próstata muito irregular (fórmula menos acurada)
  
  Evidence:
    primary_source: "Roehrborn CG et al. Efficacy safety dual inhibitor 5-alpha reductase. J Urol. 2002;169(6):2399-2405."
    radiopaedia_link: "https://radiopaedia.org/articles/benign-prostatic-hyperplasia"
    notes: "Fórmula padrão volume prostático. Importante para cálculo PSA density."
```

---

## URO-0002: PI-RADS v2.1 Score

```
CALC_BLOCK:
  ItemID: URO-0002
  FunctionName: classify_prostate_pirads_v2_1
  
  Inputs:
    - name: t2_score
      type: number
      unit: points
      required: true
      valid_range: 1-5
      notes: Score T2 (1-5)
    
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
      notes: Score DCE (0-3; 0=ausente)
    
    - name: localizacao
      type: enum
      required: true
      valid_values: ["zona_periferica", "zona_transicao", "zona_central"]
      notes: Localização lesão
  
  Preprocessing:
    - Validar T2 entre 1-5
    - Validar DWI entre 1-5
    - Validar DCE entre 0-3
    - Usar RM 1.5T ou 3T
    - Sequências: T2, DWI (b=0 800-1000), DCE
  
  Formula:
    PI-RADS v2.1 = f(T2, DWI, DCE, localização)
    
    Zona Periférica:
      - DWI é dominante
      - T2 é secundário
      - DCE complementar
    
    Zona Transição/Central:
      - T2 é dominante
      - DWI é secundário
      - DCE complementar
  
  Output:
    primary_value:
      name: pirads_score
      value: "1 / 2 / 3 / 4 / 5"
    derived_values:
      - name: cancer_probability
        value: "Percentual risco câncer clinicamente significativo (%)"
  
  Interpretation:
    rules:
      - if: pirads_score = 1
        then: "Muito baixo risco (<5%); sem biopsia"
      - if: pirads_score = 2
        then: "Baixo risco (5-10%); sem biopsia"
      - if: pirads_score = 3
        then: "Intermediário (10-25%); considerar biopsia"
      - if: pirads_score = 4
        then: "Alto risco (25-75%); biopsia recomendada"
      - if: pirads_score = 5
        then: "Muito alto risco (>75%); biopsia recomendada"
  
  QA_Checks:
    - Validar scores T2, DWI, DCE corretos
    - Verificar se RM multiparamétrica completa
    - Confirmar localização lesão (zona)
    - Alertar se artefatos presentes
    - Documentar número e localização lesões
  
  Evidence:
    primary_source: "Turkbey B et al. Prostate Imaging Reporting Data System v2.1. Eur Urol. 2019;76(3):340-351."
    radiopaedia_link: "https://radiopaedia.org/articles/prostate-imaging-reporting-and-data-system-pi-rads-2"
    notes: "PI-RADS v2.1 versão atualizada. Guia decisão biopsia em câncer próstata."
```

---

## GIN-0001: Hadlock EFW Formula

```
CALC_BLOCK:
  ItemID: GIN-0001
  FunctionName: calculate_hadlock_efw
  
  Inputs:
    - name: AC
      type: number
      unit: cm
      required: true
      valid_range: 0-40
      notes: Circunferência abdominal
    
    - name: FL
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Comprimento fêmur
    
    - name: BPD
      type: number
      unit: cm
      required: false
      valid_range: 0-12
      notes: Diâmetro biparietal (opcional)
    
    - name: HC
      type: number
      unit: cm
      required: false
      valid_range: 0-40
      notes: Circunferência cefálica (opcional)
  
  Preprocessing:
    - Validar AC > 0 e FL > 0
    - Converter cm para cm se necessário
    - Usar medições padrão planos específicos
    - Usar US ou RM
  
  Formula:
    Hadlock 1 (AC + FL):
    Log10(peso) = 1.304 + 0.05281×AC + 0.1938×FL - 0.004×AC×FL
    
    Passo 1: Medir AC (circunferência abdominal)
    Passo 2: Medir FL (comprimento fêmur)
    Passo 3: Aplicar fórmula Hadlock 1
    Passo 4: Calcular antilog10 para obter peso em gramas
  
  Output:
    primary_value:
      name: estimated_fetal_weight
      unit: g
      precision: 0 casas decimais
    derived_values:
      - name: percentile
        value: "Percentil de peso para idade gestacional"
      - name: margin_error
        value: "±10-15% (margem de erro típica)"
  
  Interpretation:
    rules:
      - if: percentile < 10
        then: "Restrição crescimento intrauterino (RCIU)"
      - if: 10 <= percentile <= 90
        then: "Crescimento normal"
      - if: percentile > 90
        then: "Macrossomia fetal"
  
  QA_Checks:
    - Alertar se peso < 500 g (possível erro)
    - Alertar se peso > 5000 g (possível erro)
    - Validar medições em planos corretos
    - Verificar se idade gestacional consistente
    - Alertar se múltiplas gestações (fórmula para singleton)
  
  Evidence:
    primary_source: "Hadlock FP et al. In utero analysis fetal weight estimation birth weight. Obstet Gynecol. 1991;77(5):662-667."
    radiopaedia_link: "https://radiopaedia.org/articles/fetal-biometry"
    notes: "Hadlock é equação padrão ouro EFW. Acurácia ±10-15% terceiro trimestre."
```

---

## GIN-0002: Ovarian Volume Ellipsoid

```
CALC_BLOCK:
  ItemID: GIN-0002
  FunctionName: calculate_ovarian_volume_ellipsoid
  
  Inputs:
    - name: comprimento
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Comprimento ovário
    
    - name: largura
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Largura ovário
    
    - name: espessura
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Espessura ovário
  
  Preprocessing:
    - Validar comprimento > 0, largura > 0, espessura > 0
    - Usar maior diâmetro cada dimensão
    - US transvaginal preferido
    - Medir ambos ovários
  
  Formula:
    V (mL) = L × W × H × 0.52
    
    Passo 1: Medir comprimento (L)
    Passo 2: Medir largura (W)
    Passo 3: Medir espessura (H)
    Passo 4: Multiplicar por 0.52 (fator elipsoide)
  
  Output:
    primary_value:
      name: ovarian_volume
      unit: mL
      precision: 0 casas decimais
    derived_values:
      - name: pcos_status
        value: "Normal / Borderline / PCOS (se bilateral e múltiplos folículos)"
  
  Interpretation:
    rules:
      - if: ovarian_volume < 9
        then: "Normal"
      - if: 9 <= ovarian_volume <= 12
        then: "Borderline"
      - if: ovarian_volume > 12
        then: "Aumentado; considerar PCOS se bilateral + múltiplos folículos"
  
  QA_Checks:
    - Alertar se volume < 3 mL (possível erro)
    - Alertar se volume > 50 mL (possível erro ou cisto)
    - Validar medições em três planos perpendiculares
    - Verificar se fórmula elipsoide apropriada
    - Medir ambos ovários para comparação
  
  Evidence:
    primary_source: "Amer SA et al. Ovarian volume women polycystic ovaries. Hum Reprod. 2004;19(1):122-126."
    radiopaedia_link: "https://radiopaedia.org/articles/polycystic-ovary-syndrome"
    notes: "Fórmula elipsoide para volume ovariano. Volume >12 mL sugere SOP se bilateral."
```

---

## GIN-0003: O-RADS US

```
CALC_BLOCK:
  ItemID: GIN-0003
  FunctionName: classify_ovarian_lesion_orads_us
  
  Inputs:
    - name: tamanho_mm
      type: number
      unit: mm
      required: true
      valid_range: 0-150
      notes: Maior diâmetro lesão
    
    - name: composicao
      type: enum
      required: true
      valid_values: ["cística_simples", "cística_complexa", "sólida", "mista"]
      notes: Composição lesão
    
    - name: vascularizacao
      type: enum
      required: true
      valid_values: ["ausente", "presente"]
      notes: Vascularização ao Doppler
    
    - name: achados_adicionais
      type: string
      required: false
      notes: Outros achados (ex: ascite, derrame pleural)
  
  Preprocessing:
    - Validar tamanho_mm > 0
    - Usar US transvaginal preferido
    - Avaliar composição e vascularização
    - Documentar achados adicionais
  
  Formula:
    O-RADS = f(tamanho, composição, vascularização, achados)
    
    Passo 1: Avaliar tamanho
    Passo 2: Avaliar composição
    Passo 3: Avaliar vascularização
    Passo 4: Aplicar tabela O-RADS
  
  Output:
    primary_value:
      name: orads_category
      value: "1 / 2 / 3 / 4 / 5"
    derived_values:
      - name: malignancy_risk
        value: "Risco malignidade (%)"
  
  Interpretation:
    rules:
      - if: orads_category = 1
        then: "Benigno (<1% risco); sem follow-up"
      - if: orads_category = 2
        then: "Benigno (1-2% risco); sem follow-up"
      - if: orads_category = 3
        then: "Benigno (2-5% risco); follow-up 1 ano"
      - if: orads_category = 4
        then: "Intermediário (5-50% risco); considerar RM/follow-up"
      - if: orads_category = 5
        then: "Maligno (>50% risco); considerar cirurgia"
  
  QA_Checks:
    - Validar tamanho_mm > 0
    - Verificar composição correta
    - Confirmar vascularização ao Doppler
    - Documentar achados adicionais
    - Alertar se achados sugestivos malignidade (ascite, derrame)
  
  Evidence:
    primary_source: "Amor F et al. Differentiate benign malignant ovarian masses. Ultrasound Obstet Gynecol. 2002;20(5):467-472."
    radiopaedia_link: "https://radiopaedia.org/articles/ovarian-adnexal-reporting-and-data-system-ultrasound-o-rads-us"
    notes: "O-RADS US para classificação lesões ovarianas. Baseado em risco malignidade."
```

---

## TIR-0001: ACR TI-RADS

```
CALC_BLOCK:
  ItemID: TIR-0001
  FunctionName: classify_thyroid_nodule_tirads
  
  Inputs:
    - name: composicao
      type: enum
      required: true
      valid_values: ["cística", "cística_com_sólido", "sólida", "quase_completamente_cística"]
      notes: Composição nódulo
    
    - name: ecogenicidade
      type: enum
      required: true
      valid_values: ["anecoica", "hipoecóica", "isoecóica", "hiperecóica"]
      notes: Ecogenicidade relativa
    
    - name: forma
      type: enum
      required: true
      valid_values: ["mais_larga_que_alta", "tão_larga_quanto_alta"]
      notes: Forma (wider-than-tall vs taller-than-wide)
    
    - name: margens
      type: enum
      required: true
      valid_values: ["bem_definidas", "mal_definidas", "lobuladas", "espiculadas"]
      notes: Margens nódulo
    
    - name: focos_ecogenicos
      type: enum
      required: true
      valid_values: ["ausentes", "pontos_grandes", "pontos_pequenos_comet_tail"]
      notes: Focos ecogênicos (calcificação)
  
  Preprocessing:
    - Validar cada característica
    - Usar US tempo real
    - Avaliar cada componente
    - Documentar tamanho nódulo
  
  Formula:
    TI-RADS = soma pontos características
    
    Composição (0-2 pontos)
    Ecogenicidade (1-3 pontos)
    Forma (0-3 pontos)
    Margens (0-3 pontos)
    Focos Ecogênicos (1-3 pontos)
  
  Output:
    primary_value:
      name: tirads_level
      value: "TR1 / TR2 / TR3 / TR4 / TR5"
    derived_values:
      - name: malignancy_risk
        value: "Risco malignidade (%)"
      - name: fna_recommendation
        value: "Recomendação PAAF (sim/não; tamanho cutoff)"
  
  Interpretation:
    rules:
      - if: tirads_level = "TR1"
        then: "Muito baixo risco (<1%); sem PAAF"
      - if: tirads_level = "TR2"
        then: "Baixo risco (1-3%); sem PAAF"
      - if: tirads_level = "TR3"
        then: "Intermediário (10-20%); PAAF se >2.5 cm"
      - if: tirads_level = "TR4"
        then: "Alto risco (20-50%); PAAF se >1.5 cm"
      - if: tirads_level = "TR5"
        then: "Muito alto risco (>50%); PAAF se >1.0 cm"
  
  QA_Checks:
    - Validar cada característica
    - Verificar se avaliação completa
    - Documentar tamanho nódulo
    - Alertar se múltiplos nódulos
    - Confirmar que é nódulo tireoidiano (não linfonodo)
  
  Evidence:
    primary_source: "Tessler FN et al. ACR Thyroid Nodule Imaging Reporting Data System. J Am Coll Radiol. 2017;14(5):587-595."
    radiopaedia_link: "https://radiopaedia.org/articles/acr-thyroid-imaging-reporting-and-data-system-acr-ti-rads"
    notes: "ACR TI-RADS para classificação nódulos tireoidianos. Baseado em risco malignidade."
```

---

## TIR-0002: Thyroid Volume Ellipsoid

```
CALC_BLOCK:
  ItemID: TIR-0002
  FunctionName: calculate_thyroid_volume_ellipsoid
  
  Inputs:
    - name: L_RD
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Comprimento lobo direito
    
    - name: W_RD
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Largura lobo direito
    
    - name: H_RD
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Espessura lobo direito
    
    - name: L_LD
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Comprimento lobo esquerdo
    
    - name: W_LD
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Largura lobo esquerdo
    
    - name: H_LD
      type: number
      unit: cm
      required: true
      valid_range: 0-10
      notes: Espessura lobo esquerdo
    
    - name: V_istmo
      type: number
      unit: mL
      required: false
      valid_range: 0-5
      notes: Volume istmo (opcional)
  
  Preprocessing:
    - Validar todos os comprimentos > 0
    - Usar maior diâmetro cada dimensão
    - US: medir cada lobo eixo transversal e longitudinal
    - Incluir istmo se presente
  
  Formula:
    V_RD = L_RD × W_RD × H_RD × 0.52
    V_LD = L_LD × W_LD × H_LD × 0.52
    V_thyroid = V_RD + V_LD + V_istmo
    
    Passo 1: Calcular volume lobo direito
    Passo 2: Calcular volume lobo esquerdo
    Passo 3: Adicionar volume istmo
    Passo 4: Soma = volume tireoidiano total
  
  Output:
    primary_value:
      name: thyroid_volume
      unit: mL
      precision: 0 casas decimais
    derived_values:
      - name: goiter_status
        value: "Normal / Borderline / Bócio"
  
  Interpretation:
    rules:
      - if: thyroid_volume < 18
        then: "Normal (mulher)"
      - if: 18 <= thyroid_volume <= 25
        then: "Borderline (mulher)"
      - if: thyroid_volume > 25
        then: "Bócio (mulher)"
      - if: thyroid_volume < 25
        then: "Normal (homem)"
      - if: 25 <= thyroid_volume <= 35
        then: "Borderline (homem)"
      - if: thyroid_volume > 35
        then: "Bócio (homem)"
  
  QA_Checks:
    - Alertar se volume < 5 mL (possível erro)
    - Alertar se volume > 100 mL (possível erro)
    - Validar medições em três planos perpendiculares
    - Verificar se fórmula elipsoide apropriada
    - Considerar ingestão iodo e idade
  
  Evidence:
    primary_source: "Knobel M, Medeiros-Neto G. Outline inherited disorders thyroid hormone pathway. Thyroid. 2003;13(8):771-801."
    radiopaedia_link: "https://radiopaedia.org/articles/thyroid-volume"
    notes: "Fórmula elipsoide para volume tireoidiano. Valores variam por idade, sexo e ingestão iodo."
```

---

## VASC-0011: Carotid Intima-Media Thickness

```
CALC_BLOCK:
  ItemID: VASC-0011
  FunctionName: measure_carotid_intima_media_thickness
  
  Inputs:
    - name: imt_mm
      type: number
      unit: mm
      required: true
      valid_range: 0-3
      notes: Espessura íntima-média carotídea
  
  Preprocessing:
    - Validar imt_mm > 0
    - Medir parede posterior carotida comum
    - 1 cm antes bifurcação
    - Usar Doppler pulsado
  
  Formula:
    IMT = espessura máxima camada íntima-média
    
    Passo 1: Localizar carotida comum distal
    Passo 2: Medir parede posterior
    Passo 3: Resultado é IMT (mm)
  
  Output:
    primary_value:
      name: imt_value
      unit: mm
      precision: 2 casas decimais
    derived_values:
      - name: atherosclerosis_risk
        value: "Baixo / Intermediário / Alto"
  
  Interpretation:
    rules:
      - if: imt_mm < 0.7
        then: "Normal; sem aterosclerose subclínica"
      - if: 0.7 <= imt_mm <= 0.9
        then: "Borderline; possível aterosclerose leve"
      - if: imt_mm > 0.9
        then: "Aumentado; aterosclerose subclínica; risco cardiovascular aumentado"
  
  QA_Checks:
    - Alertar se imt < 0.3 mm (possível erro)
    - Alertar se imt > 2.0 mm (possível erro ou placa)
    - Validar medição parede posterior
    - Verificar se 1 cm antes bifurcação
    - Alertar se placa presente (não é IMT puro)
  
  Evidence:
    primary_source: "Bots ML et al. Common carotid intima-media thickness. Stroke. 1997;28(10):1877-1882."
    radiopaedia_link: "https://radiopaedia.org/articles/carotid-intima-media-thickness"
    notes: "Marcador de aterosclerose subclínica. IMT >0.9 mm = risco cardiovascular aumentado."
```

---

## VASC-0012: Deep Vein Thrombosis Compression

```
CALC_BLOCK:
  ItemID: VASC-0012
  FunctionName: diagnose_dvt_compression_criteria
  
  Inputs:
    - name: compressibilidade
      type: enum
      required: true
      valid_values: ["compressível", "incompressível"]
      notes: Veia comprime com transdutor?
    
    - name: lado_contralateral
      type: enum
      required: true
      valid_values: ["normal", "também_incompressível"]
      notes: Lado contralateral normal?
  
  Preprocessing:
    - Validar compressibilidade
    - Aplicar pressão transdutor gradualmente
    - Comparar com lado contralateral
    - Usar Doppler transversal e longitudinal
  
  Formula:
    Critério DVT:
    IF compressibilidade = "incompressível" AND lado_contralateral = "normal"
      THEN DVT presente
    ELSE
      THEN sem TVP
  
  Output:
    primary_value:
      name: dvt_diagnosis
      value: "DVT presente / Sem DVT"
    derived_values:
      - name: sensitivity_specificity
        value: "Sensibilidade >95% / Especificidade >95%"
  
  Interpretation:
    rules:
      - if: dvt_diagnosis = "DVT presente"
        then: "Trombose venosa profunda confirmada; iniciar anticoagulação; confirmação por venografia se dúvida"
      - if: dvt_diagnosis = "Sem DVT"
        then: "Sem evidência TVP; considerar outras causas sintomas"
  
  QA_Checks:
    - Validar compressibilidade adequada
    - Verificar se comparação com lado contralateral
    - Alertar se TVP recanalizada (pode parecer compressível)
    - Considerar edema/cicatrizes que podem limitar compressão
    - Documentar localização exata (se TVP)
  
  Evidence:
    primary_source: "Kearon C et al. Antithrombotic therapy VTE disease. Chest. 2012;141(2 Suppl):e419S-e494S."
    radiopaedia_link: "https://radiopaedia.org/articles/deep-vein-thrombosis"
    notes: "Critério compressibilidade para TVP. Sensibilidade/especificidade >95%."
```

---

## VASC-0013: Ankle-Brachial Index

```
CALC_BLOCK:
  ItemID: VASC-0013
  FunctionName: calculate_ankle_brachial_index
  
  Inputs:
    - name: P_tornozelo
      type: number
      unit: mmHg
      required: true
      valid_range: 0-300
      notes: Pressão sistólica tornozelo (máxima)
    
    - name: P_braquial
      type: number
      unit: mmHg
      required: true
      valid_range: 0-300
      notes: Pressão sistólica braquial (máxima)
  
  Preprocessing:
    - Validar P_tornozelo > 0 e P_braquial > 0
    - Usar Doppler pulsado artérias tibial anterior/posterior
    - Medir pressão sistólica máxima
    - Usar ambos lados (calcular ABI bilateral)
  
  Formula:
    ABI = P_tornozelo / P_braquial
    
    Passo 1: Medir pressão sistólica máxima tornozelo
    Passo 2: Medir pressão sistólica máxima braquial
    Passo 3: Dividir tornozelo por braquial
  
  Output:
    primary_value:
      name: abi_value
      unit: ratio
      precision: 2 casas decimais
    derived_values:
      - name: pad_severity
        value: "Normal / Borderline / Leve-Moderada / Moderada-Grave / Grave/Crítica"
  
  Interpretation:
    rules:
      - if: abi_value >= 1.0
        then: "Normal; sem estenose arterial significativa"
      - if: 0.91 <= abi_value < 1.0
        then: "Borderline; possível estenose leve"
      - if: 0.71 <= abi_value <= 0.90
        then: "PAD leve-moderada; estenose 50-69%"
      - if: 0.41 <= abi_value <= 0.70
        then: "PAD moderada-grave; estenose 70-99%"
      - if: abi_value <= 0.40
        then: "PAD grave/crítica; estenose crítica ou oclusão"
  
  QA_Checks:
    - Alertar se abi < 0.5 (possível erro ou oclusão crítica)
    - Alertar se abi > 1.3 (possível calcificação arterial; falso elevado)
    - Validar medições em repouso
    - Comparar bilateral para assimetria
    - Considerar calcificação em diabetes (ABI falsamente elevado)
  
  Evidence:
    primary_source: "Hirsch AT et al. ACC/AHA Guidelines PAD. Circulation. 2006;113(11):e463-e654."
    radiopaedia_link: "https://radiopaedia.org/articles/ankle-brachial-index"
    notes: "Índice padrão para PAD. ABI <0.9 sugere estenose ≥50%."
```

---

## VASC-0014: Aortic Diameter Measurement

```
CALC_BLOCK:
  ItemID: VASC-0014
  FunctionName: measure_aortic_diameter
  
  Inputs:
    - name: d_aorta
      type: number
      unit: mm
      required: true
      valid_range: 0-100
      notes: Diâmetro máximo aorta
    
    - name: localizacao
      type: enum
      required: true
      valid_values: ["raiz", "ascendente", "descendente", "abdominal"]
      notes: Localização medição
  
  Preprocessing:
    - Validar d_aorta > 0
    - Medir eixo transversal maior diâmetro
    - Evitar incluir trombo mural
    - Usar TC/RM/US
  
  Formula:
    d_aorta = diâmetro máximo (mm)
    
    Passo 1: Localizar segmento aórtico
    Passo 2: Medir no eixo transversal
    Passo 3: Resultado é diâmetro (mm)
  
  Output:
    primary_value:
      name: aortic_diameter
      unit: mm
      precision: 0 casas decimais
    derived_values:
      - name: aneurysm_status
        value: "Normal / Borderline / Aneurisma"
  
  Interpretation:
    rules:
      - if: localizacao = "raiz" AND d_aorta < 40
        then: "Normal"
      - if: localizacao = "raiz" AND 40 <= d_aorta <= 50
        then: "Borderline"
      - if: localizacao = "raiz" AND d_aorta > 50
        then: "Aneurisma aórtico"
      - if: localizacao = "ascendente" AND d_aorta < 37
        then: "Normal"
      - if: localizacao = "ascendente" AND d_aorta > 50
        then: "Aneurisma aórtico"
      - if: localizacao = "abdominal" AND d_aorta < 30
        then: "Normal"
      - if: localizacao = "abdominal" AND 30 <= d_aorta <= 50
        then: "Aneurisma abdominal"
      - if: localizacao = "abdominal" AND d_aorta > 50
        then: "AAA grande; cirurgia recomendada"
  
  QA_Checks:
    - Alertar se d_aorta < 10 mm (possível erro)
    - Alertar se d_aorta > 100 mm (possível erro)
    - Validar medição no eixo transversal
    - Verificar se evita trombo mural
    - Documentar localização exata
  
  Evidence:
    primary_source: "Hiratzka LF et al. 2010 ACCF/AHA Guidelines Aorta. Circulation. 2010;121(13):e266-e369."
    radiopaedia_link: "https://radiopaedia.org/articles/abdominal-aortic-aneurysm"
    notes: "Medições seriadas para avaliar crescimento. Cirurgia indicada se >55 mm ou crescimento rápido."
```

---

**FIM DO CALC_BLOCKS_PARTE1.md**

Total: 35 CALC_BLOCKS (VASC-0001 a TIR-0002)
