# MANUAL BIOMETRIA — DOPPLER (Cap 12–16)

Arquivo consolidado para reduzir número de arquivos (ex.: upload/integração em projeto).

Inclui:
- `CAP12_DOPPLER_PRINCIPIOS.md`
- `CAP13_DOPPLER_RENAL.md`
- `CAP14_DOPPLER_HEPATICO_PORTA_SPLENICO.md`
- `CAP15_DOPPLER_AORTA_MESENTERICO_ILIAQUAS.md`
- `CAP16_DOPPLER_PELVICO.md`

---

# CAPÍTULO 12 — DOPPLER: PRINCÍPIOS OPERACIONAIS (ÂNGULO, PRF, GAIN, GATE)

## 12.1 Objetivo do capítulo

Este capítulo padroniza o uso do Doppler (colorido, power e espectral) para medidas reprodutíveis em abdome e pelve, com foco em:

- Ajustes que **mudam o número** (ângulo, PRF/Nyquist, gate, wall filter, ganho)
- Como evitar erros sistemáticos (ângulo > 60°, aliasing, “blooming”)
- Documentação mínima necessária para rastreabilidade e QA

---

## 12.2 O que é medido no Doppler (e o que é qualitativo)

### 12.2.1 Medidas quantitativas (com número)

- **Velocidades** (cm/s): PSV (pico sistólico), EDV (velocidade diastólica final), Vmean (média, quando aplicável)
- **Índices derivados**:
  - **IR (Índice de Resistividade)**:
    ```
    IR = (PSV - EDV) / PSV
    ```
  - **IP (Índice de Pulsatilidade)** (quando usado pelo serviço):
    ```
    IP = (PSV - EDV) / Vmean
    ```

### 12.2.2 Avaliações qualitativas (sem número obrigatório)

- Presença/ausência de fluxo ao Doppler colorido
- Direção do fluxo (ex.: hepatopetal vs hepatofugal)
- Padrão de onda (tripásica, monopásica, alta/baixa resistência)
- Simetria de perfusão (ex.: ovário com fluxo reduzido vs preservado)

---

## 12.3 Regra de ouro do ângulo (erro que mais “altera o número”)

### 12.3.1 Por que o ângulo importa

O Doppler mede a componente da velocidade alinhada ao feixe. Na prática:

- Ângulos maiores aumentam o erro
- **Acima de 60°**, pequenas variações de alinhamento geram grande variação de velocidade

### 12.3.2 Regra operacional do manual

- **Velocidades (PSV/EDV)**: usar **correção de ângulo ≤ 60°** (ideal 45–60°), com o cursor alinhado ao eixo do vaso.
- **Índices (IR/IP)**: são menos sensíveis ao ângulo se o traçado for correto, mas dependem de espectro limpo (sem saturação/ruído).

### Checklist 12.1 — Ângulo (antes de medir)

- [ ] Cursor de ângulo alinhado ao fluxo (não à parede)
- [ ] Ângulo ≤ 60°
- [ ] Gate no centro do lúmen
- [ ] Espectro sem “corte” (clipping) de pico

---

## 12.4 PRF / Escala (Nyquist) e aliasing

### 12.4.1 Conceitos práticos

- **PRF/Scale baixo**: mais sensível para fluxos lentos, mas favorece **aliasing** em fluxos rápidos
- **PRF/Scale alto**: reduz aliasing, mas pode “apagar” fluxos lentos

### 12.4.2 Aliasing (como reconhecer)

Sinais típicos:
- Inversão de cor dentro do vaso (“mosaico”)
- Espectro “dobrado” atravessando a linha de base

### 12.4.3 Como corrigir aliasing (ordem prática)

1. Aumentar **PRF/Scale**
2. Deslocar a **linha de base**
3. Reduzir a **profundidade** (melhora PRF efetivo)
4. Usar frequência Doppler menor (se disponível)
5. Ajustar **ângulo** e diminuir a caixa de cor (frame rate)

### Tabela 12.1 — PRF/Scale: erro comum e correção

| Situação | Erro típico | Correção preferencial |
|---------|-------------|-----------------------|
| Fluxo alto (estenose) | Aliasing → PSV subestimada | Aumentar PRF + corrigir ângulo |
| Fluxo muito lento (veias) | Sem cor (underfill) | Reduzir PRF + aumentar ganho com cuidado |
| Órgão profundo/obeso | PRF limitado, ruído | Reduzir profundidade + harmônica + caixa menor |

---

## 12.5 Ganho (color e espectral), “blooming” e ruído

### 12.5.1 Ganho do color (Color Gain)

- **Ganho alto demais**: “blooming” (cor extravasa o vaso) → falso aumento de calibre/perfusão
- **Ganho baixo demais**: subestima fluxo (falso “sem fluxo”)

**Regra prática**:
> Aumentar o ganho até aparecer ruído em tecido adjacente e reduzir levemente.

### 12.5.2 Ganho do espectral (Spectral Gain)

- Ganho excessivo “engrossa” a banda espectral (broadening por ruído)
- Ganho baixo pode apagar EDV (IR falsamente alto)

---

## 12.6 Gate (sample volume) e local de amostragem

### 12.6.1 Tamanho do gate

- Gate muito grande: mistura fluxos (parede + turbulência) → espectro “sujo”
- Gate muito pequeno: perde sinal em fluxos lentos

**Regra prática**:
- Arterial: gate ~2–4 mm (ajustar ao vaso)
- Venoso: gate um pouco maior se necessário, priorizando estabilidade do traçado

### 12.6.2 Posição do gate

- Centro do lúmen, evitando parede (wall filter pode “comer” fluxo lento perto da parede)
- Evitar bifurcações para medida de PSV (turbulência)

---

## 12.7 Wall filter, escala e sweep speed (leitura correta do traçado)

### 12.7.1 Wall filter

- Muito alto: elimina fluxo diastólico → EDV falsamente baixo → IR falsamente alto
- Muito baixo: excesso de ruído de parede

### 12.7.2 Sweep speed

- Rápido: melhora leitura de PSV/EDV em ritmos irregulares
- Lento: útil para avaliar variabilidade respiratória (veias)

---

## 12.8 Documentação mínima (para rastreabilidade)

### Tabela 12.2 — O que salvar junto da medida Doppler

| Item | Por quê |
|------|---------|
| Local do vaso (segmento) | Reprodutibilidade (origem vs intraparenquimatoso) |
| Ângulo usado | Principal fonte de variação em velocidades |
| PRF/Scale | Impacta aliasing e detecção de fluxos lentos |
| Gate (tamanho) | Impacta broadening/ruído |
| Traçado com calipers | Auditoria do PSV/EDV |

---

## 12.9 Exemplos resolvidos

### Exemplo Resolvido 12.1 — Cálculo de IR

**Dados**:
- PSV = 82 cm/s
- EDV = 24 cm/s

**Cálculo**:
```
IR = (82 - 24) / 82
IR = 58 / 82
IR = 0,71
```

**Interpretação prática**: IR discretamente elevado (interpretar conforme território e clínica; ver capítulos específicos).

---

### Exemplo Resolvido 12.2 — Aliasing em estenose (correção)

**Cenário**: artéria com mosaico e espectro “dobrado”.

**Ações**:
1. Aumentar PRF/Scale
2. Deslocar baseline
3. Reajustar ângulo para ≤ 60°

**Resultado esperado**: espectro “desdobrado” com pico mensurável (PSV real).

---

## 12.10 Checklist rápido

### Checklist 12.2 — Doppler (antes de salvar medida)

- [ ] Plano adequado e vaso bem identificado
- [ ] Caixa de cor pequena (frame rate adequado)
- [ ] Ganho do color sem blooming
- [ ] PRF/Scale adequado (sem aliasing para PSV; sensível para fluxos lentos quando necessário)
- [ ] Gate central e tamanho apropriado
- [ ] Ângulo ≤ 60° para velocidades
- [ ] Wall filter adequado (não “apagar” EDV)
- [ ] Traçado estável por pelo menos 3 ciclos (ou conforme arritmia)

---

## 12.11 Textos prontos para laudo (genéricos)

### Fluxo preservado (qualitativo):
> "Fluxo preservado ao Doppler colorido, com padrão de onda compatível com o território avaliado."

### Limitação técnica (Doppler):
> "Avaliação ao Doppler limitada por interposição gasosa/biotipo desfavorável, com restrição na quantificação de velocidades."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018. (Capítulos de Doppler e técnica)
2. ACR–AIUM–SPR–SRU Practice Parameter for the Performance of Diagnostic Ultrasound Examinations (Revised 2023).

---

**FIM DO CAPÍTULO 12**

*Próximo: Capítulo 13 — Doppler Renal*

---

# CAPÍTULO 13 — DOPPLER RENAL (IR, PSV, RAR E CRITÉRIOS PRÁTICOS)

## 13.1 Objetivo do capítulo

Padronizar o Doppler renal para medidas reprodutíveis e comparáveis, incluindo:

- **IR intrarrenal** (índice de resistividade)
- **Velocidades na artéria renal principal** (PSV/EDV), quando indicado
- **RAR** (razão artéria renal/aorta) como apoio

**Fora do escopo v1.0**: Doppler de transplante renal e protocolos avançados com microvascularização.

---

## 13.2 O que medir

### Medidas padronizadas:

1. **IR intrarrenal (bilateral)** — artérias interlobares/arqueadas
2. **PSV na artéria renal principal** (origem/proximal, quando possível)
3. **PSV na aorta abdominal** (para cálculo de RAR, se necessário)
4. **Sinais indiretos** de estenose: padrão tardus-parvus intrarrenal (qualitativo + tempos, quando aplicável)

### Fórmulas

**IR**:
```
IR = (PSV - EDV) / PSV
```

**RAR**:
```
RAR = PSV artéria renal / PSV aorta
```

---

## 13.3 Quando medir (indicações práticas)

- ✅ Suspeita de estenose de artéria renal (hipertensão resistente, piora de função renal)
- ✅ Assimetria renal significativa (ver Cap 8)
- ✅ Doença renal crônica: IR como marcador de resistência intrarrenal (interpretar com cautela)
- ✅ Avaliação de obstrução (hidronefrose) com dúvida clínica (IR pode ajudar, mas não substitui achados morfológicos)

---

## 13.4 Técnica (passo a passo)

### 13.4.1 Preparo e equipamento

- Jejum é útil para reduzir gás (não obrigatório, mas ajuda em vasos)
- Transdutor convexo 2–5 MHz
- Harmônica conforme necessidade

### 13.4.2 Posição e janelas

- Rim direito: janela subcostal/intercostal com fígado como janela
- Rim esquerdo: janela intercostal, decúbito lateral direito ajuda

### 13.4.3 Parâmetros Doppler (regras do Cap 12)

- Ângulo ≤ 60° para velocidades
- Gate central, 2–4 mm
- Ajustar PRF/Scale para evitar aliasing em estenoses
- Wall filter não deve “apagar” diástole

---

## 13.5 Como medir IR intrarrenal (padrão do manual)

### 13.5.1 Onde medir

Medir em artérias **interlobares/arqueadas** em três regiões por rim:

- Polo superior
- Terço médio
- Polo inferior

**Regra**:
> Registrar IR por região e/ou a média do rim (padrão do serviço), sempre de forma consistente.

### 13.5.2 Como medir

1. Identificar artéria intrarrenal com Doppler colorido
2. Posicionar gate no centro do vaso
3. Obter traçado estável
4. Medir PSV e EDV com calipers do equipamento (ou automático)
5. Registrar IR

### Tabela 13.1 — Erros comuns em IR e correção

| Erro | Impacto | Correção |
|------|---------|----------|
| Wall filter alto | EDV baixo → IR alto | Reduzir wall filter |
| Ganho espectral baixo | “Perde” EDV | Aumentar ganho até traçado legível |
| Gate na parede | Ruído/turbulência | Centralizar no lúmen |
| Vaso muito pequeno | Traçado instável | Usar vaso intrarrenal maior (interlobar) |

---

## 13.6 Como medir artéria renal principal (quando indicado)

### 13.6.1 Segmentos recomendados

- Origem na aorta
- Segmento proximal
- Segmento médio
- Segmento distal/hilo

**Regra**:
> Se não for possível documentar a origem por limitação técnica, registrar claramente a limitação e priorizar IR intrarrenal + sinais indiretos.

### 13.6.2 PSV na aorta (para RAR)

Medir PSV na aorta **no mesmo nível** aproximado das artérias renais, com ângulo ≤ 60°.

---

## 13.7 Valores de referência e critérios práticos

### Tabela 13.2 — IR intrarrenal (adultos, regra prática)

| IR | Interpretação prática |
|----|------------------------|
| **≤ 0,70** | Dentro do esperado |
| **0,71–0,75** | Limítrofe (interpretar com idade/clínica) |
| **> 0,75** | Elevado (sugere aumento de resistência intrarrenal) |

**Nota**: IR aumenta com idade e pode elevar em DRC, nefropatia parenquimatosa e obstrução. Não é específico.

### Tabela 13.3 — Critérios Doppler para estenose de artéria renal (apoio)

| Achado | Sugere estenose hemodinamicamente significativa |
|--------|-----------------------------------------------|
| PSV artéria renal muito elevada | Sugestivo (depende do serviço; documentar técnica) |
| RAR elevado | Comumente usado como critério auxiliar |
| Tardus-parvus intrarrenal | Sugere estenose proximal significativa |

**Regra do manual**: relatar como “sugestivo” e correlacionar com clínica/lab; confirmar por método dedicado quando indicado.

---

## 13.8 Interpretação prática

| Achado | Interpretação provável | Próximo passo |
|-------|-------------------------|--------------|
| IR bilateral elevado com rins pequenos | DRC/nefropatia parenquimatosa | Correlacionar com creatinina/TFG; ver Cap 8 |
| IR unilateral alto + assimetria renal | Nefropatia unilateral/estenose (possível) | Considerar Doppler dedicado/angioTC/RM |
| PSV/RAR elevados + tardus-parvus | Estenose significativa provável | Confirmar conforme protocolo do serviço |

---

## 13.9 Armadilhas

| Armadilha | Consequência | Como evitar |
|----------|--------------|-------------|
| Ângulo > 60° | PSV errada | Reposicionar janela, ajustar cursor |
| Medir em bifurcação | Turbulência | Medir em segmento reto |
| Confundir veia com artéria | IR inválido | Confirmar padrão pulsátil e direção |
| Arritmia | PSV/EDV variáveis | Medir mais ciclos e reportar limitação |

---

## 13.10 Exemplos resolvidos

### Exemplo Resolvido 13.1 — IR intrarrenal (média por rim)

**Rim direito (IR por região)**:
- Superior: 0,68
- Médio: 0,70
- Inferior: 0,72

**Média**:
```
(0,68 + 0,70 + 0,72) / 3 = 0,70
```

**Interpretação**: IR médio 0,70 → dentro do esperado.

---

### Exemplo Resolvido 13.2 — RAR

**Dados**:
- PSV artéria renal (proximal): 240 cm/s
- PSV aorta (mesmo nível): 70 cm/s

**Cálculo**:
```
RAR = 240 / 70 = 3,43
```

**Interpretação prática**: RAR elevado/limítrofe conforme critério do serviço; correlacionar com sinais indiretos e contexto clínico.

---

## 13.11 Checklist rápido

### Checklist 13.1 — Doppler Renal (mínimo reprodutível)

- [ ] Identificar rim direito e esquerdo (bilateral)
- [ ] Medir IR intrarrenal em 3 regiões por rim (ou padrão do serviço)
- [ ] Ângulo ≤ 60° para PSV/EDV quando medir velocidades
- [ ] Documentar limitações (gás, biotipo, janela)
- [ ] Se suspeita de estenose: tentar PSV na artéria renal principal + PSV aorta (RAR), quando factível

---

## 13.12 Textos prontos para laudo

### IR dentro do esperado:
> "Índices de resistividade intrarrenais dentro do esperado, sem sinais indiretos ao Doppler de estenose hemodinamicamente significativa no estudo realizado."

### IR elevado (inespecífico):
> "Índices de resistividade intrarrenais elevados, achado inespecífico que pode correlacionar-se a nefropatia parenquimatosa/DRC no contexto clínico."

### Suspeita de estenose:
> "Achados ao Doppler sugestivos de estenose hemodinamicamente significativa de artéria renal, recomendando-se correlação clínica e confirmação por método dedicado conforme protocolo."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018.
2. ACR–AIUM–SPR–SRU Practice Parameter for the Performance of Duplex Sonography of Native Renal Vessels (Revised 2023).
3. O'Neill WC. Sonographic evaluation of renal failure. Am J Kidney Dis. 2000;35(6):1021-38.

---

**FIM DO CAPÍTULO 13**

*Próximo: Capítulo 14 — Doppler Hepático/Porta/Esplênico*

---

# CAPÍTULO 14 — DOPPLER HEPÁTICO/PORTA/ESPLÊNICO (FLUXOS, DIÂMETROS E PADRÕES)

## 14.1 Objetivo do capítulo

Padronizar o Doppler do sistema porta e vasos hepáticos/esplênicos para:

- Descrever **direção e padrão de fluxo** (hepatopetal/hepatofugal; fásico/trifásico)
- Medir **calibres/velocidades** quando fornecidos/indicados
- Reconhecer achados sugestivos de **hipertensão portal**

---

## 14.2 O que avaliar/medir

### Estruturas-alvo (mínimo recomendado)

1. **Veia porta**: direção do fluxo (hepatopetal vs hepatofugal), padrão e, quando indicado, velocidade
2. **Veias hepáticas**: padrão (normalmente trifásico), patência
3. **Artéria hepática**: padrão de alta resistência relativa, PSV/IR quando indicado
4. **Veia esplênica** (quando acessível): patência e direção
5. **Colaterais portossistêmicas** (quando presentes): descrição e localização (qualitativo)

---

## 14.3 Quando fazer Doppler hepático/porta

- ✅ Doença hepática crônica/cirrose (suspeita ou seguimento)
- ✅ Suspeita de hipertensão portal (esplenomegalia, ascite, varizes)
- ✅ Trombose portal/hepática (suspeita)
- ✅ Avaliação de shunts/colaterais (quando sugeridos no B-mode)

---

## 14.4 Técnica (passo a passo)

### 14.4.1 Preparo e posição

- Jejum 6–8h (ajuda em janela e reduz fluxo pós-prandial mesentérico que pode confundir)
- Decúbito dorsal; usar intercostal/subcostal conforme janela

### 14.4.2 Parâmetros Doppler (Cap 12)

- Caixa de cor pequena
- Ajustar PRF para fluxo venoso (mais baixo) sem perder sinal
- Ganho sem blooming
- Gate central e ângulo ≤ 60° quando medir velocidade

---

## 14.5 Veia porta (padrões e medida)

### 14.5.1 Direção do fluxo

- **Hepatopetal**: direção fisiológica (para o fígado)
- **Hepatofugal**: reversão (sugere hipertensão portal significativa, no contexto)

### 14.5.2 Padrão e fasicidade

- Normal: fluxo **contínuo** com leve fasicidade respiratória
- Fluxo muito pulsátil pode ocorrer por transmissão cardíaca (avaliar contexto)

### 14.5.3 Medidas (quando houver valores no input)

- **Diâmetro** no hilo (B-mode) pode ser reportado quando fornecido
- **Velocidade média** ao Doppler espectral pode ser reportada quando fornecida

### Tabela 14.1 — Interpretação prática (apoio) para hipertensão portal

| Achado | Interpretação |
|--------|---------------|
| Veia porta dilatada | Sugere hipertensão portal (não específica) |
| Velocidade portal reduzida | Pode ocorrer em hipertensão portal |
| Fluxo hepatofugal | Sugere hipertensão portal significativa |
| Colaterais (recanalização paraumbilical, varizes) | Fortemente sugestivo no contexto |

**Regra do manual**: relatar com léxico de certeza (“sugestivo/compatível”) e correlacionar com sinais morfológicos (baço/ascite) e clínica.

---

## 14.6 Veias hepáticas (padrões)

### Padrão esperado

- Normalmente **trifásico** (influência cardíaca)

### Alterações relevantes (qualitativas)

- Monofásico/achatado: pode ocorrer em congestão/hepatopatia avançada (inespecífico)
- Ausência de fluxo/defeito de enchimento: suspeitar trombose (confirmar em planos múltiplos)

---

## 14.7 Artéria hepática (padrões e IR)

### O que relatar

- Patência ao color
- Padrão espectral
- Se houver números: PSV/EDV e IR

**IR**:
```
IR = (PSV - EDV) / PSV
```

**Nota**: valores variam com técnica e contexto; relatar número quando fornecido e interpretar no conjunto (não isolar).

---

## 14.8 Veia esplênica e colaterais

### Veia esplênica

- Patência e direção de fluxo, quando acessível
- Atenção a gás e profundidade (limitações comuns)

### Colaterais portossistêmicas (qualitativo)

Descrever quando presentes:

- Recanalização de veia paraumbilical
- Varizes gastroesofágicas (quando visualizáveis)
- Shunts esplenorrenais (suspeitos)

---

## 14.9 Armadilhas e erros comuns

| Armadilha | Consequência | Como evitar |
|----------|--------------|-------------|
| PRF alto para veias | “Sem fluxo” falso | Reduzir PRF e ajustar ganho |
| Ganho do color alto | Blooming e falso “turbilhão” | Reduzir ganho até desaparecer extravasamento |
| Ângulo ruim | Velocidade errada | Reposicionar e manter ≤ 60° |
| Confundir artéria/veia | Interpretação errada | Usar espectral (pulsátil vs contínuo) |

---

## 14.10 Exemplos resolvidos

### Exemplo Resolvido 14.1 — Fluxo portal hepatofugal

**Dados do exame**:
- Veia porta com fluxo **hepatofugal** ao Doppler colorido/espectral
- Esplenomegalia (ver Cap 7) e sinais morfológicos de hepatopatia crônica

**Interpretação**:
- Achados **sugestivos** de hipertensão portal significativa, no contexto clínico.

**Laudo (trecho)**:
> "Veia porta com fluxo hepatofugal ao Doppler, achado sugestivo de hipertensão portal significativa no contexto de hepatopatia crônica."

---

### Exemplo Resolvido 14.2 — IR da artéria hepática (quando fornecido)

**Dados**:
- PSV = 95 cm/s
- EDV = 28 cm/s

**Cálculo**:
```
IR = (95 - 28) / 95
IR = 67 / 95
IR = 0,71
```

**Interpretação prática**: reportar o IR e correlacionar com achados e indicação.

---

## 14.11 Checklist rápido

### Checklist 14.1 — Doppler Hepático/Porta (mínimo)

- [ ] Veia porta: patência + direção (hepatopetal/hepatofugal)
- [ ] Veias hepáticas: patência + padrão (qualitativo)
- [ ] Artéria hepática: patência; IR/PSV se indicado e obtido
- [ ] Procurar colaterais se suspeita de hipertensão portal
- [ ] Documentar limitações técnicas (gás/biotipo)

---

## 14.12 Textos prontos para laudo

### Fluxo portal preservado:
> "Veia porta pérvia, com fluxo hepatopetal ao Doppler, sem evidências de trombose no estudo realizado."

### Suspeita de hipertensão portal:
> "Achados ao Doppler sugestivos de hipertensão portal (incluindo [fluxo portal alterado/colaterais], no contexto), recomendando-se correlação clínica e laboratorial."

### Limitação técnica:
> "Avaliação ao Doppler do sistema porta limitada por interposição gasosa/biotipo desfavorável."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018.
2. Niederau C, et al. Sonographic measurements of the normal liver, spleen, pancreas, and portal vein. Radiology. 1983;149(2):537-40.

---

**FIM DO CAPÍTULO 14**

*Próximo: Capítulo 15 — Doppler Aorta/Mesentérico/Ilíacas*

---

# CAPÍTULO 15 — DOPPLER: AORTA, MESENTÉRICO E ILÍACAS (VELOCIDADES E CRITÉRIOS PRÁTICOS)

## 15.1 Objetivo do capítulo

Padronizar a avaliação Doppler de:

- **Aorta abdominal** (patência e, quando indicado, velocidades)
- **Tronco celíaco e artéria mesentérica superior (AMS/SMA)** (avaliação de estenose por velocidades)
- **Artérias ilíacas** (quando avaliadas no contexto abdominal/pélvico)

**Escopo**: critérios práticos para triagem/descrição. Exames vasculares dedicados seguem protocolos específicos do serviço.

---

## 15.2 Quando fazer Doppler desses territórios

- ✅ Suspeita de isquemia mesentérica crônica (dor pós-prandial, perda ponderal)
- ✅ Sopro abdominal ou suspeita de doença aterosclerótica significativa
- ✅ Avaliação complementar quando calcificações/placas são vistas no B-mode
- ✅ Suspeita de síndrome do ligamento arcuato mediano (MALS), quando aplicável (variação respiratória no tronco celíaco)

---

## 15.3 O que medir

### Tronco celíaco e AMS (mínimo)

- PSV (pico sistólico) e EDV (quando disponível)
- Relação com respiração no tronco celíaco (quando suspeita de MALS)

### Aorta/Ilíacas (quando indicado)

- PSV em segmento reto, com ângulo ≤ 60° (Cap 12)
- Descrição de placas/estenose (qualitativo + velocidades se obtidas)

---

## 15.4 Técnica (passo a passo)

### 15.4.1 Preparo

- Jejum 6–8h é recomendado (gás + influência pós-prandial no fluxo mesentérico)

### 15.4.2 Aquisição (regras do Cap 12)

- Ângulo ≤ 60° para velocidades
- Gate central e pequeno (2–4 mm) em vasos arteriais
- Ajustar PRF/Scale para evitar aliasing em estenose
- Evitar medir em bifurcação/turbulência

### 15.4.3 Pontos de amostragem sugeridos

- Aorta: segmento infrarrenal (ou conforme janela)
- Tronco celíaco: proximal (logo após origem) e, se necessário, no ponto de maior estreitamento
- AMS: proximal (origem) e segmento de maior estreitamento
- Ilíacas: comum proximal (quando incluídas)

---

## 15.5 Critérios práticos por velocidades (apoio)

### Tabela 15.1 — Tronco celíaco e AMS: cortes Doppler frequentemente usados (triagem)

| Vaso | Achado Doppler | Interpretação prática |
|------|----------------|------------------------|
| Tronco celíaco | PSV elevada | Sugere estenose (correlacionar com técnica e clínica) |
| AMS | PSV elevada | Sugere estenose (correlacionar com técnica e clínica) |

**Nota**: critérios exatos variam por protocolo e equipamento; no laudo, priorizar “sugestivo” e indicar correlação/confirmatório quando necessário.

### 15.5.1 MALS (síndrome do ligamento arcuato mediano) — regra prática

Quando suspeita clínica e janela adequada:

- Medir velocidades do tronco celíaco em **expiração** e **inspiração**
- Espera-se maior compressão e velocidades mais altas na **expiração**, com alívio na inspiração

---

## 15.6 Interpretação prática

| Achado | Interpretação provável | Próximo passo |
|-------|-------------------------|--------------|
| PSV muito elevada em tronco celíaco/AMS | Estenose hemodinamicamente significativa (sugestivo) | AngioTC/angioRM ou Doppler vascular dedicado |
| Turbulência + aliasing focal | Estenose local provável | Reavaliar ângulo/PRF e documentar melhor ponto |
| Difícil janela por gás | Limitação técnica | Documentar limitação, sugerir método alternativo se necessário |

---

## 15.7 Armadilhas

| Armadilha | Consequência | Como evitar |
|----------|--------------|-------------|
| Medir com ângulo alto | PSV errada | Ajustar para ≤ 60° |
| Medir pós-prandial | Velocidades elevadas fisiológicas | Preferir jejum |
| Confundir artéria com veia | Diagnóstico incorreto | Confirmar padrão pulsátil no espectral |
| Medir em curvatura/bifurcação | Turbulência | Escolher segmento reto |

---

## 15.8 Exemplos resolvidos

### Exemplo Resolvido 15.1 — Suspeita de estenose de AMS (triagem)

**Dados**:
- AMS proximal com mosaico ao color e aceleração focal
- PSV medida (ângulo ≤ 60°): 320 cm/s

**Interpretação prática**:
- Achado Doppler sugestivo de estenose hemodinamicamente significativa, no contexto e com técnica adequada.

**Laudo (trecho)**:
> "Achados ao Doppler sugestivos de estenose hemodinamicamente significativa da artéria mesentérica superior, recomendando-se correlação clínica e avaliação confirmatória por método dedicado conforme indicação."

---

### Exemplo Resolvido 15.2 — Variação respiratória no tronco celíaco (MALS)

**Dados**:
- PSV em expiração: 310 cm/s
- PSV em inspiração: 170 cm/s

**Interpretação prática**:
- Variação respiratória significativa no tronco celíaco, podendo ser compatível com compressão extrínseca (correlacionar com clínica e exame dedicado).

---

## 15.9 Checklist rápido

### Checklist 15.1 — Doppler Mesentérico (mínimo)

- [ ] Confirmar jejum (quando possível)
- [ ] Tronco celíaco e AMS identificados (origens)
- [ ] Medir PSV (e EDV se disponível) com ângulo ≤ 60°
- [ ] Ajustar PRF/Scale para evitar aliasing na região de pico
- [ ] Documentar limitações (gás/biotipo)

---

## 15.10 Textos prontos para laudo

### Sem estenose significativa no estudo realizado:
> "Sem achados ao Doppler sugestivos de estenose hemodinamicamente significativa em tronco celíaco e artéria mesentérica superior no estudo realizado, dentro das limitações técnicas."

### Suspeita de estenose mesentérica:
> "Achados ao Doppler sugestivos de estenose hemodinamicamente significativa em [tronco celíaco/AMS], recomendando-se correlação clínica e avaliação confirmatória por método dedicado conforme indicação."

### Limitação técnica:
> "Avaliação ao Doppler do território mesentérico limitada por interposição gasosa/biotipo desfavorável."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018.
2. ACR–AIUM–SPR–SRU Practice Parameter for the Performance of Diagnostic Ultrasound Examinations (Revised 2023).

---

**FIM DO CAPÍTULO 15**

*Próximo: Capítulo 16 — Doppler Pélvico*

---

# CAPÍTULO 16 — DOPPLER PÉLVICO (TRIAGEM, PADRÕES E ACHADOS INCIDENTAIS)

## 16.1 Objetivo do capítulo

Padronizar o uso do Doppler na pelve como **complemento** (em contexto de abdome/pelve) para:

- Documentar **presença/ausência** e **padrões** de fluxo em estruturas pélvicas quando houver **indicação** ou **achado incidental**
- Evitar superinterpretação em exame não dedicado

**Regra do manual**: Doppler pélvico “dedicado” (ginecológico/prostático) segue protocolo próprio e, quando indicado, deve ser solicitado como exame específico.

---

## 16.2 Quando aplicar Doppler na pelve (situações práticas)

- ✅ Pedido/dictado com foco pélvico (dor pélvica, sangramento, massa anexial)
- ✅ Achado incidental em pelve ao B-mode (massa, cisto complexo, espessamento focal de parede vesical, etc.)
- ✅ Suspeita de obstrução urinária distal (como complemento: jatos ureterais, quando solicitado/útil)

---

## 16.3 O que avaliar (padrões)

### 16.3.1 Regra de priorização (não inventar)

- Em Doppler pélvico, priorizar **qualitativo**:
  - “fluxo presente/ausente ao Doppler colorido”
  - “padrão de baixa/alta resistência”
  - “hiperemia”
- Só incluir números (PSV/EDV/IR) se forem **explicitamente fornecidos** no input.

### 16.3.2 Estruturas pélvicas comuns (dependem da anatomia e do objetivo)

- **Jatos ureterais** (bexiga): presença/assimetria (qualitativo)
- **Vasos uterinos/ovariano** (anatomia feminina) — quando o exame for direcionado ou houver achado anexial
- **Vascularização de massa pélvica**: presença, distribuição (periférica/central), hiperemia (qualitativo)

---

## 16.4 Técnica (prática e reprodutível)

### 16.4.1 Bexiga/jatos ureterais (quando aplicável)

- Bexiga moderadamente repleta (Cap 9)
- Doppler colorido com PRF baixo/moderado para fluxos lentos
- Observar região dos meatos ureterais por tempo suficiente para capturar jato (varia; documentar limitações)

**Interpretação prática**:
- Jato presente é um achado a favor de patência naquele momento
- Ausência de jato isolada é inespecífica (hidratação, ritmo, técnica)

### 16.4.2 Massa pélvica (quando incidental)

- Color para mapear vascularização sem blooming
- Power Doppler pode ajudar em fluxos lentos, quando disponível
- Registrar se há vascularização **central** (mais suspeita) vs **periférica** (depende do padrão), sempre com cautela e correlação

---

## 16.5 Limitações (mensagens que devem entrar no laudo quando aplicável)

### Tabela 16.1 — Limitações frequentes em Doppler pélvico

| Limitação | Impacto | Texto sugerido |
|----------|---------|----------------|
| Bexiga pouco repleta | Jatos e pelve prejudicados | "Avaliação pélvica limitada por repleção vesical subótima." |
| Interposição gasosa | Ovários/massas mal vistos | "Avaliação limitada por interposição gasosa." |
| Biotipo | Perda de sinal Doppler | "Avaliação limitada por biotipo desfavorável." |
| Exame não dedicado | Sem protocolo completo | "Estudo pélvico realizado de forma panorâmica, não substituindo exame dedicado." |

---

## 16.6 Armadilhas e erros comuns

| Armadilha | Consequência | Como evitar |
|----------|--------------|-------------|
| Ganho do color alto | Blooming e falsa vascularização | Ajustar ganho até sumir extravasamento |
| PRF alto demais | “Sem fluxo” falso | Reduzir PRF para fluxos lentos |
| Concluir obstrução por “ausência de jato” isolada | Erro clínico | Relatar como inespecífico e correlacionar |
| Extrapolar para “exame pélvico completo” | Inconsistência | Manter linguagem panorâmica (abdome total) |

---

## 16.7 Exemplos resolvidos

### Exemplo Resolvido 16.1 — Jatos ureterais (com cautela)

**Achado**:
- Jato ureteral direito visualizado
- Jato esquerdo não visualizado durante observação

**Redação sugerida (qualitativa)**:
> "Jato ureteral direito visualizado ao Doppler colorido. Jato ureteral esquerdo não caracterizado durante a observação, achado inespecífico e dependente de técnica/tempo de observação, no contexto."

---

### Exemplo Resolvido 16.2 — Massa anexial incidental com Doppler

**Achado**:
- Lesão anexial incidental ao B-mode
- Doppler com vascularização periférica discreta, sem sinal claro de vascularização central no estudo realizado

**Redação sugerida**:
> "Lesão anexial com vascularização ao Doppler colorido conforme descrito, recomendando-se correlação clínica e, a critério, exame pélvico dedicado para melhor caracterização."

---

## 16.8 Checklist rápido

### Checklist 16.1 — Doppler Pélvico (quando indicado)

- [ ] Confirmar se há objetivo pélvico ou achado incidental (senão, não “forçar” Doppler)
- [ ] Ajustar PRF/ganho para fluxos lentos (sem blooming)
- [ ] Registrar qualitativamente presença/padrão de fluxo
- [ ] Incluir números apenas se fornecidos (não inventar)
- [ ] Documentar limitações (repleção, gás, biotipo, exame não dedicado)

---

## 16.9 Textos prontos para laudo

### Exame panorâmico (abdome total):
> "Avaliação pélvica panorâmica, não substituindo exame pélvico dedicado."

### Jatos ureterais:
> "Jatos ureterais visualizados ao Doppler colorido, quando avaliados no estudo realizado."

### Limitação:
> "Avaliação pélvica ao Doppler limitada por repleção vesical subótima e/ou interposição gasosa."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018.
2. ACR–AIUM–SPR–SRU Practice Parameter for the Performance of Diagnostic Ultrasound Examinations (Revised 2023).

---

**FIM DO CAPÍTULO 16**

*Próximo: Capítulo 17 — TC: Protocolos de Aquisição*
