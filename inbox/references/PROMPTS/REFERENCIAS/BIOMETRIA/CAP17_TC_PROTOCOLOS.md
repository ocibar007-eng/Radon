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

