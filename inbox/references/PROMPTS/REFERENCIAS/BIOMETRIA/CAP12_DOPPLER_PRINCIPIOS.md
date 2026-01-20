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

