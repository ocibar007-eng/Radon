# MANUAL BIOMETRIA — RM + APÊNDICES (Cap 21–26)

Arquivo consolidado para reduzir número de arquivos (ex.: upload/integração em projeto).

Inclui:
- `CAP21_RM_ABDOME_PROTOCOLOS.md`
- `CAP22_RM_FIGADO_LIRADS_BIOMETRIA.md`
- `CAP23_RM_PROSTATA_PIRADS_BIOMETRIA.md`
- `CAP24_RM_ADRENAIS_RINS_PELVE.md`
- `CAP25_FORMULAS_E_VOLUMES.md`
- `CAP26_QA_GLOSSARIO_TEMPLATES.md`

---

# CAPÍTULO 21 — RM ABDOME: PROTOCOLOS E AQUISIÇÃO PARA BIOMETRIA

## 21.1 Objetivo do capítulo

Padronizar a ressonância magnética (RM) de abdome para medidas reprodutíveis, com foco em:

- Sequências mais confiáveis para medidas dimensionais
- Voxel, espessura de corte e MPR (impacto em bordas)
- Artefatos que invalidam medida (movimento, distorção, fat-sat irregular)
- Documentação mínima (metadados e técnica) para rastreabilidade (ver Cap 4)

---

## 21.2 Princípios centrais (o que mais muda o número)

### Tabela 21.1 — Variáveis críticas em RM para biometria

| Variável | Impacto em medidas | Mitigação |
|---------|---------------------|-----------|
| Tamanho do voxel (in-plane e slice) | Parcial volume e borda “borrada” | Preferir voxel in-plane pequeno; cortes finos quando possível |
| Sequência (T2 FSE vs DWI/EPI) | Distorção em EPI, borda instável | Medir em T2 FSE ou T1 3D, evitar medir em DWI |
| Movimento respiratório | Borramento e contornos falsos | Breath-hold quando possível; navigator/trigger quando indicado |
| Supressão de gordura (fat-sat) | Bordas podem “sumir” ou variar | Confirmar consistência; usar sequência alternativa se falhar |
| Campo magnético/suscetibilidade | Distorção geométrica | Reconhecer e evitar quantificar em áreas distorcidas |

---

## 21.3 Sequências recomendadas para medir (regra do manual)

### 21.3.1 Regra operacional

- **Medidas dimensionais**: preferir
  - **T2 FSE** (alta resolução, menos distorção)
  - **T1 3D** pré e pós-contraste (quando aplicável) com reconstruções multiplanares
- **Evitar medidas em DWI (EPI)** quando houver distorção visível (ver Cap 4)

### Tabela 21.2 — Uso prático por sequência

| Sequência | Uso biométrico | Observação |
|----------|-----------------|------------|
| T2 FSE axial/coronal | Medidas de órgãos e lesões | Geralmente mais estável |
| T1 3D (GRE) | Medidas em pós-contraste e MPR | Útil para maior eixo em MPR |
| DWI (EPI) | Qualitativo | Não usar para diâmetro se houver distorção |
| In/out-of-phase | Apoio (gordura) | Bordas podem variar; não priorizar para medidas seriadas |

---

## 21.4 Espessura, gap e reconstruções (para comparar follow-up)

### 21.4.1 Regras práticas

- Evitar medir em séries com cortes grossos quando a variação esperada é pequena
- Se o maior eixo é oblíquo, usar **MPR alinhada ao eixo** (princípio do Cap 19)

### Checklist 21.1 — “Posso comparar este número?”

- [ ] Mesma sequência (ou equivalente) usada para medir
- [ ] Resolução/voxel compatíveis
- [ ] Sem distorção/artefato no local da medida
- [ ] Plano alinhado ao maior eixo (MPR se necessário)
- [ ] Mesma fase (se pós-contraste) quando aplicável

---

## 21.5 Contraste e timing (impacto em bordas)

Em RM, a borda de lesões pode variar com:

- fase pós-contraste (arterial/portal/tardia/hepatobiliar, quando usada)
- saturação de gordura
- ruído e subtração

**Regra do manual**:
> Em follow-up, priorizar comparar medidas na mesma fase e sequência, quando possível.

---

## 21.6 Limitações técnicas (como relatar)

### Tabela 21.3 — Limitações frequentes e texto sugerido

| Limitação | Impacto | Texto sugerido |
|----------|---------|----------------|
| Movimento | Medida imprecisa | "Avaliação limitada por artefatos de movimento." |
| Fat-sat irregular | Borda instável | "Supressão de gordura heterogênea limitando a análise em parte do estudo." |
| Distorção em DWI | Número não confiável | "DWI com distorção; análise quantitativa dimensional não priorizada nessa sequência." |

---

## 21.7 Documentação mínima (RM)

**Ver Cap 4** para tags e auditoria. Na prática, registrar:

- Sequência usada para medir (T2 FSE, T1 3D, etc.)
- Voxel/espessura e plano
- Fase pós-contraste (se aplicável)
- Limitações relevantes (movimento, distorção)

### Checklist 21.2 — Registro mínimo (RM)

- [ ] Sequência e plano da medida
- [ ] Voxel/espessura (quando disponível)
- [ ] Fase (se pós-contraste)
- [ ] Método de medida (maior eixo, short axis, etc.)
- [ ] Limitações técnicas

---

## 21.8 Exemplos resolvidos

### Exemplo Resolvido 21.1 — DWI distorceu o diâmetro

**Cenário**:
- Lesão renal medida como 24 mm em T2 FSE
- Em DWI/EPI aparenta 28 mm por distorção

**Conduta do manual**:
- Manter medida do T2 FSE/T1 3D como referência seriada
- Relatar DWI apenas qualitativamente

---

### Exemplo Resolvido 21.2 — Maior eixo em MPR (T1 3D)

**Cenário**:
- Lesão hepática oblíqua: axial subestima maior eixo

**Conduta**:
- Medir em MPR alinhada ao eixo, preferencialmente na mesma fase pós-contraste em follow-up

---

## 21.9 Checklist rápido

### Checklist 21.3 — RM Abdome (biometria)

- [ ] Priorizar T2 FSE ou T1 3D para medidas
- [ ] Evitar medir em DWI com distorção
- [ ] Usar MPR para maior eixo quando necessário
- [ ] Comparar com mesma fase/seq em follow-up
- [ ] Documentar limitações técnicas

---

## 21.10 Textos prontos para laudo (biometria em RM)

### Comparabilidade:
> "Medidas realizadas preferencialmente em sequências de maior estabilidade geométrica (T2 FSE/T1 3D). Diferenças técnicas podem influenciar pequenas variações dimensionais."

---

## Referências:

1. Recomendações institucionais de protocolo de RM (quando disponíveis).
2. Capítulo 4 deste manual (DICOM/metadados e distorções em RM).

---

**FIM DO CAPÍTULO 21**

*Próximo: Capítulo 22 — RM Fígado (biometria e critérios operacionais; LI-RADS como referência do serviço)*

---

# CAPÍTULO 22 — RM FÍGADO: BIOMETRIA E CRITÉRIOS OPERACIONAIS (LI-RADS COMO REFERÊNCIA)

## 22.1 Objetivo do capítulo

Padronizar medidas e descrições reprodutíveis de lesões hepáticas em RM, com foco em:

- Como medir lesões (plano, sequência e fase)
- Como registrar crescimento de forma rastreável (comparabilidade)
- Quais descritores operacionais devem ser consistentes (realce, cápsula, washout)

**Nota**: LI-RADS possui regras formais. Este capítulo foca na **metrologia e rastreabilidade**; quando o caso exigir categorização formal, seguir a versão LI-RADS adotada pelo serviço.

---

## 22.2 O que medir

### Medidas padronizadas:

1. **Maior diâmetro da lesão** (mm) no plano mais representativo (MPR se necessário)
2. **Segundo diâmetro ortogonal** (quando útil para follow-up)
3. **Número e localização segmentar** (Couinaud), quando aplicável
4. **Crescimento** (comparando técnica equivalente)

---

## 22.3 Sequências/fases para medir (regra do manual)

### 22.3.1 Escolha da sequência

- Preferir **T2 FSE** e **T1 3D** (pré e pós-contraste) para medidas dimensionais
- Evitar medir em DWI quando houver distorção (Cap 21/Cap 4)

### 22.3.2 Escolha da fase (pós-contraste)

**Regra prática**:
> Para follow-up, medir sempre na mesma fase e sequência quando possível (ex.: portal-venosa ou fase hepatobiliar, se o serviço usa).

---

## 22.4 Técnica de medida (passo a passo)

1. Identificar a lesão na sequência mais nítida
2. Confirmar em pelo menos 2 planos (axial + coronal/sagital)
3. Se o maior eixo é oblíquo, reconstruir **MPR alinhada ao eixo**
4. Medir borda a borda (outer-to-outer) no contorno mais estável
5. Registrar sequência/fase usada na medida

### Tabela 22.1 — Erros comuns em medidas hepáticas (RM)

| Erro | Consequência | Como evitar |
|------|--------------|-------------|
| Medir em DWI distorcida | Diâmetro falso | Medir em T2 FSE/T1 3D |
| Trocar fase entre exames | Variação de contorno | Comparar mesma fase |
| Medir só no axial | Subestima maior eixo oblíquo | Usar MPR alinhada |
| Fat-sat falhou | Borda instável | Usar sequência alternativa e documentar |

---

## 22.5 Descritores operacionais (para consistência)

### 22.5.1 Realce arterial (APHE)

Relatar como presente/ausente, descrevendo padrão (difuso, periférico, nodular), conforme observado.

### 22.5.2 Washout e cápsula

Relatar qualitativamente, sempre citando fase/seq em que foi observado.

### 22.5.3 DWI/ADC

Relatar qualitativamente (restrição presente/ausente), sem usar DWI para medida quando distorcida.

---

## 22.6 Crescimento: como comparar sem erro

**Regra do manual**:
> Só concluir crescimento se a técnica for comparável (mesma sequência/fase, qualidade adequada e plano equivalente).

### Texto padrão (diferença pequena/possivelmente técnica)
> "Observa-se discreta variação dimensional, possivelmente relacionada a diferenças técnicas (sequência/fase/plano)."

---

## 22.7 Exemplos resolvidos

### Exemplo Resolvido 22.1 — Medida em MPR (lesão oblíqua)

**Cenário**:
- Axial: 17 mm
- MPR alinhada: 22 mm

**Conduta**:
- Registrar 22 mm como maior eixo, citando que foi medido em MPR alinhada.

---

### Exemplo Resolvido 22.2 — “Crescimento” com fase diferente

**Cenário**:
- Exame anterior: medida em fase portal
- Exame atual: medida em fase arterial

**Conduta**:
- Re-medida na fase equivalente (se disponível). Se não, relatar limitação de comparabilidade.

---

## 22.8 Checklist rápido

### Checklist 22.1 — RM Fígado (biometria)

- [ ] Medir em T2 FSE/T1 3D (evitar DWI distorcida)
- [ ] Confirmar em 2 planos
- [ ] Usar MPR para maior eixo oblíquo
- [ ] Registrar sequência/fase da medida
- [ ] Evitar concluir crescimento com técnica não comparável

---

## 22.9 Textos prontos para laudo (lesão hepática em RM)

### Medida e rastreabilidade:
> "Lesão em segmento hepático [informado], medindo [X] mm no maior eixo, mensurada em [sequência/fase]."

### Comparação:
> "Comparação dimensional realizada em técnica equivalente quando disponível; pequenas variações podem ocorrer por diferenças técnicas."

---

## Referências:

1. LI-RADS (versão adotada pelo serviço).
2. Cap 21 e Cap 19 deste manual (sequência/plano e critérios dimensionais).

---

**FIM DO CAPÍTULO 22**

*Próximo: Capítulo 23 — RM Próstata (biometria e rastreabilidade; PI-RADS como referência do serviço)*

---

# CAPÍTULO 23 — RM PRÓSTATA: BIOMETRIA E RASTREABILIDADE (PI-RADS COMO REFERÊNCIA)

## 23.1 Objetivo do capítulo

Padronizar medidas reprodutíveis na RM de próstata, com foco em:

- **Volume prostático** (para densidade de PSA, quando aplicável)
- Medidas dimensionais de lesões (quando reportadas)
- Registro mínimo de técnica para comparabilidade

**Nota**: PI-RADS tem regras formais de aquisição e interpretação. Este capítulo foca em biometria e rastreabilidade; a classificação deve seguir a versão PI-RADS adotada pelo serviço.

---

## 23.2 O que medir

### Medidas padronizadas:

1. **Volume prostático** (mL) por elipsoide
2. **Dimensões** (AP, transverso, crânio-caudal) usadas no volume
3. **Lesão index** (quando indicada): maior diâmetro (mm) no plano/seq apropriados
4. **Vesículas seminais**: avaliação qualitativa (invasão suspeita é avaliação morfológica, não biométrica)

---

## 23.3 Sequências para biometria (regra do manual)

- Volume: medir preferencialmente em **T2** (alta resolução), plano adequado
- Lesões: medir no plano/seq em que a borda é mais nítida e menos distorcida (geralmente T2; DWI/ADC pode apoiar, mas distorções devem ser reconhecidas)

**Regra**:
> Não usar sequência distorcida (EPI/DWI) como base primária para número de diâmetro se houver distorção evidente.

---

## 23.4 Volume prostático (fórmula do elipsoide)

### 23.4.1 Fórmula

```
Volume (mL) = AP × Transverso × Crânio-caudal × 0,52
```

### 23.4.2 Onde medir

- **AP**: maior diâmetro ântero-posterior no plano sagital/axial conforme o protocolo do serviço (manter consistência)
- **Transverso**: maior diâmetro latero-lateral no axial
- **Crânio-caudal**: maior diâmetro no sagital

**Regra de consistência**:
> Usar o mesmo padrão de planos/limites (base/apex) em exames seriados.

### Exemplo Resolvido 23.1 — Volume prostático (RM)

**Dados**:
- AP = 4,6 cm
- Transverso = 5,1 cm
- Crânio-caudal = 4,8 cm

**Cálculo**:
```
V = 4,6 × 5,1 × 4,8 × 0,52
V = 112,6 × 0,52
V = 58,6 mL ≈ 59 mL
```

---

## 23.4.3 Densidade do PSA (PSAD) — quando aplicável

Quando PSA sérico estiver disponível, pode-se calcular PSAD como apoio:

```
PSAD (ng/mL/cc) = PSA (ng/mL) / Volume prostático (mL)
```

**Regra prática (apoio)**:
- PSAD **> 0,15 ng/mL/cc** pode aumentar suspeição clínica no contexto apropriado.

---

## 23.5 Medida de lesão (quando reportada)

### 23.5.1 Técnica

1. Identificar lesão index
2. Confirmar em mais de um plano quando possível
3. Medir maior diâmetro no plano de melhor delimitação
4. Registrar sequência/plano usado para a medida

### Tabela 23.1 — Erros comuns

| Erro | Consequência | Como evitar |
|------|--------------|-------------|
| Medir em DWI distorcida | Diâmetro falso | Priorizar T2; usar DWI como apoio |
| Trocar plano/seq entre exames | “Crescimento” falso | Padronizar série/plano para follow-up |
| Incluir zona periuretral/artefato | Superestima | Confirmar em múltiplos planos |

---

## 23.6 Comparabilidade (follow-up e reprodutibilidade)

**Regra do manual**:
> Comparar dimensões e volume apenas se a técnica for equivalente (sequências/resolução similares e sem artefatos importantes).

---

## 23.7 Checklist rápido

### Checklist 23.1 — RM Próstata (biometria mínima)

- [ ] Medir AP, transverso e crânio-caudal (T2 preferencial)
- [ ] Calcular volume (mL) e registrar dimensões
- [ ] Se lesão reportada: medir maior diâmetro e registrar sequência/plano
- [ ] Documentar limitações (movimento, distorção, artefatos)

---

## 23.8 Textos prontos para laudo

### Volume:
> "Próstata com volume estimado em [V] mL (elipsoide), conforme medidas em [sequência/plano]."

### Lesão (biometria):
> "Lesão index em [localização], medindo [X] mm no maior eixo, mensurada em [sequência/plano]."

---

## Referências:

1. PI-RADS (versão adotada pelo serviço).
2. Cap 19 e Cap 21 deste manual (critério dimensional e sequência).

---

**FIM DO CAPÍTULO 23**

*Próximo: Capítulo 24 — RM Adrenais/Rins/Pelve (biometria e rastreabilidade)*

---

# CAPÍTULO 24 — RM: ADRENAIS, RINS E PELVE (BIOMETRIA E RASTREABILIDADE)

## 24.1 Objetivo do capítulo

Padronizar medidas reprodutíveis em RM para estruturas frequentemente acompanhadas em abdome/pelve:

- Adrenais (nódulo incidental)
- Rins (lesões/cistos; dimensões quando relevante)
- Pelve (achados incidentais; sem substituir exame dedicado)

---

## 24.2 Princípios (o que não fazer)

- Não medir dimensões em sequências com distorção geométrica evidente (DWI/EPI), quando o objetivo é número seriado (Cap 21/Cap 4)
- Não “forçar” avaliação pélvica detalhada se o estudo não é dedicado; relatar como panorâmico e registrar limitações

---

## 24.3 Adrenais em RM (biometria)

### 24.3.1 O que medir

- Maior eixo do nódulo (mm), no plano de melhor delimitação
- Avaliação qualitativa de sinal (ex.: queda de sinal em out-of-phase sugere gordura intracelular), quando aplicável e conforme protocolo do serviço

### Tabela 24.1 — RM adrenal: pontos operacionais

| Item | Regra prática |
|------|---------------|
| Medida | maior eixo, MPR se necessário |
| Sequência | T2 e T1 3D (estáveis) |
| In/out-of-phase | apoio para gordura intracelular (qualitativo) |

---

## 24.4 Rins em RM (biometria)

### 24.4.1 Lesões renais (cistos/massas)

**Medidas padronizadas**:

1. Maior diâmetro da lesão (mm)
2. Segundo diâmetro ortogonal (quando útil)
3. Localização (polo/terço, rim D/E)

**Sequências preferidas para medir**:
- T2 (cistos: borda nítida)
- T1 3D pós-contraste (massas: contorno e realce), conforme fase disponível

### 24.4.2 Dimensões renais (quando necessário)

Em RM, dimensões renais seriadas geralmente são menos solicitadas do que em USG/TC, mas podem ser reportadas quando objetivo clínico exigir (atrofia, rim policístico).

---

## 24.5 Pelve em RM (regra operacional)

### 24.5.1 Se não for exame dedicado

**Regra do manual**:
> Descrever como avaliação pélvica panorâmica e reportar apenas achados incidentais relevantes e/ou medidas fornecidas.

### 24.5.2 Se houver achado incidental

Medidas mínimas:
- 2–3 diâmetros ortogonais (mm)
- Localização (ex.: anexial, parede vesical, útero) quando a anatomia for clara no exame
- Limitações técnicas

---

## 24.6 Limitações técnicas frequentes

### Tabela 24.2 — Limitações e texto sugerido

| Limitação | Texto sugerido |
|----------|----------------|
| Movimento | "Avaliação limitada por artefatos de movimento." |
| Fat-sat irregular | "Supressão de gordura heterogênea limitando parte do estudo." |
| Exame não dedicado | "Avaliação pélvica panorâmica, não substituindo exame dedicado." |

---

## 24.7 Exemplos resolvidos

### Exemplo Resolvido 24.1 — Cisto renal simples (RM)

**Dados**:
- Cisto cortical no rim direito: 16 mm
- T2: hiperintenso homogêneo; sem realce (quando fase disponível)

**Texto (trecho)**:
> "Cisto cortical simples no rim direito, medindo 16 mm, sem sinais de complexidade."

---

### Exemplo Resolvido 24.2 — Nódulo adrenal com queda de sinal (qualitativo)

**Dados**:
- Nódulo adrenal esquerdo: 14 mm
- Queda de sinal em out-of-phase em relação ao in-phase

**Interpretação prática**:
- Achado favorece gordura intracelular (adenoma), no contexto e conforme protocolo.

---

## 24.8 Checklist rápido

### Checklist 24.1 — RM (adrenais/rins/pelve)

- [ ] Medir maior eixo em sequência estável (T2/T1 3D)
- [ ] Usar MPR se maior eixo for oblíquo
- [ ] Rins: registrar localização e diâmetros ortogonais quando útil
- [ ] Pelve: relatar como panorâmica se não dedicado; medir apenas achados incidentais
- [ ] Documentar limitações técnicas

---

## 24.9 Textos prontos para laudo

### Adrenal (indeterminado em RM não dedicada):
> "Nódulo adrenal [D/E] medindo [X] mm, de caracterização indeterminada no protocolo atual. Considerar estudo dedicado conforme indicação clínica."

### Rim (lesão):
> "Lesão renal [D/E] em [localização], medindo [X] mm no maior eixo, mensurada em [sequência/plano]."

### Pelve (panorâmica):
> "Avaliação pélvica panorâmica no estudo realizado, não substituindo exame dedicado; sem achados incidentais relevantes caracterizáveis."

---

## Referências:

1. Protocolos institucionais de RM de adrenais/rins/pelve (quando disponíveis).
2. Cap 19 e Cap 21 deste manual (critérios dimensionais e protocolos RM).

---

**FIM DO CAPÍTULO 24**

*Próximo: Capítulo 25 — Fórmulas e Volumes*

---

# CAPÍTULO 25 — FÓRMULAS E VOLUMES (CONSOLIDAÇÃO OPERACIONAL)

## 25.1 Objetivo do capítulo

Consolidar as fórmulas usadas no manual e padronizar:

- variáveis, unidades e arredondamento
- quando aplicar cada fórmula
- exemplos resolvidos (auditáveis)

---

## 25.2 Regras de unidade e arredondamento (padrão do manual)

### 25.2.1 Unidades

- Medidas lineares: **cm** (USG) ou **mm** (TC/RM), conforme capítulo
- Volumes: **mL**
- Velocidades Doppler: **cm/s**

### 25.2.2 Arredondamento prático

**Regra do manual**:
> Arredondar apenas no laudo final conforme padrão do serviço, mantendo o valor original medido para auditoria quando necessário.

---

## 25.3 Fórmulas geométricas (volumes por elipsoide)

### 25.3.1 Volume por elipsoide (regra geral)

Usada para estruturas aproximadamente elipsoidais (bexiga, próstata, ovário, rim, útero quando indicado).

```
Volume (mL) = Comprimento × Largura × AP × 0,52
```

**Unidades**:
- Se diâmetros em cm → resultado em mL (aproximação prática do equipamento; manter consistência)

### Tabela 25.1 — Onde aplicar no manual

| Estrutura | Capítulo |
|----------|----------|
| Bexiga (volume e RPM) | Cap 9 |
| Próstata (USG) | Cap 10 |
| Útero/ovários (USG) | Cap 11 |
| Rim (volume renal, quando indicado) | Cap 8 |

---

## 25.4 Índices e razões (USG e Doppler)

### 25.4.1 ILC (Índice do Lobo Caudado — fígado)

```
ILC = Lobo Caudado (AP) / Lobo Direito (AP)
```

Aplicação: apoio em hepatopatia crônica (ver Cap 6).

---

### 25.4.2 IE (Índice esplênico)

```
IE = Comprimento × Largura × Espessura
```

Aplicação: complemento em baço (ver Cap 7).

---

### 25.4.3 IR (Índice de resistividade)

```
IR = (PSV - EDV) / PSV
```

Unidades:
- PSV/EDV em cm/s
- IR é adimensional (0–1)

Aplicação: Doppler renal/hepático (Caps 12–14).

---

### 25.4.4 IP (Índice de pulsatilidade)

```
IP = (PSV - EDV) / Vmean
```

Aplicação: quando usado pelo serviço (Cap 12).

---

### 25.4.5 RAR (Razão artéria renal/aorta)

```
RAR = PSV artéria renal / PSV aorta
```

Aplicação: apoio em suspeita de estenose de artéria renal (Cap 13).

---

### 25.4.6 PSAD (Densidade do PSA)

```
PSAD (ng/mL/cc) = PSA (ng/mL) / Volume prostático (mL)
```

Aplicação: apoio em contexto prostático (Caps 10 e 23), quando PSA e volume estiverem disponíveis.

---

## 25.5 TC: washout adrenal (quando protocolo inclui tardia)

### 25.5.1 APW (washout absoluto)

```
APW (%) = ((E - D) / (E - U)) × 100
```

### 25.5.2 RPW (washout relativo)

```
RPW (%) = ((E - D) / E) × 100
```

Onde:
- U = HU sem contraste
- E = HU na fase contrastada (ex.: portal)
- D = HU na fase tardia

Aplicação: Cap 20 (apenas com protocolo adequado).

---

## 25.6 Exemplos resolvidos (auditoria rápida)

### Exemplo Resolvido 25.1 — Volume vesical (mL)

**Dados**:
- C = 10,8 cm
- L = 8,2 cm
- AP = 6,5 cm

**Cálculo**:
```
V = 10,8 × 8,2 × 6,5 × 0,52
V = 575,6 × 0,52
V = 299,3 mL ≈ 299 mL
```

---

### Exemplo Resolvido 25.2 — IR

**Dados**:
- PSV = 82 cm/s
- EDV = 24 cm/s

**Cálculo**:
```
IR = (82 - 24) / 82
IR = 0,71
```

---

### Exemplo Resolvido 25.3 — Washout adrenal (APW e RPW)

**Dados**:
- U = 18 HU
- E = 92 HU
- D = 40 HU

**Cálculos**:
```
APW = ((92 - 40) / (92 - 18)) × 100 = 70,3%
RPW = ((92 - 40) / 92) × 100 = 56,5%
```

---

## 25.7 Checklist rápido

### Checklist 25.1 — Antes de aplicar fórmula

- [ ] Unidades consistentes (cm, mm, mL, cm/s, HU)
- [ ] Medidas obtidas no plano correto (evitar obliquidade)
- [ ] Técnica comparável em follow-up (fase/seq/espessura)
- [ ] Documentar limitações quando a fórmula não se aplica

---

**FIM DO CAPÍTULO 25**

*Próximo: Capítulo 26 — QA, Glossário e Templates*

---

# CAPÍTULO 26 — QA, GLOSSÁRIO E TEMPLATES (PADRÕES FINAIS DO MANUAL)

## 26.1 Objetivo do capítulo

Encerrar o manual consolidando:

- QA (controle de qualidade) por modalidade
- Glossário padronizado (terminologia e abreviações)
- Templates mínimos de registro e laudo (biometria)

---

## 26.2 QA por modalidade (checklists operacionais)

### 26.2.1 QA — Ultrassonografia (USG)

**Checklist 26.1 — QA USG antes de medir**

- [ ] Preparo adequado (jejum/bexiga) ou limitação documentada
- [ ] Preset e transdutor corretos (convexo/linear conforme alvo)
- [ ] Profundidade e foco na estrutura alvo
- [ ] Ganho sem “engordar” bordas
- [ ] Plano anatômico correto (maior eixo)
- [ ] Sem compressão indevida para medidas de volume
- [ ] Calipers visíveis e unidade correta (cm/mm)

**Checklist 26.2 — QA USG (documentação)**

- [ ] Labels/anatomia identificados em imagens-chave
- [ ] Medidas bilaterais quando aplicável (rins)
- [ ] Textos padrão de limitação quando necessário (Cap 5)

---

### 26.2.2 QA — Doppler

**Checklist 26.3 — QA Doppler antes de salvar traçado**

- [ ] Caixa de cor pequena e sem blooming
- [ ] PRF/Scale adequado (sem aliasing para PSV quando objetivo é velocidade)
- [ ] Gate central e tamanho adequado
- [ ] Ângulo ≤ 60° para velocidades
- [ ] Wall filter não elimina EDV
- [ ] Traçado estável (≥ 3 ciclos quando possível)

---

### 26.2.3 QA — TC

**Checklist 26.4 — QA TC para biometria**

- [ ] Fase adequada e comparável (quando follow-up)
- [ ] Reconstrução usada para medir (ideal 1–2 mm, kernel soft/standard)
- [ ] Plano/MPR alinhado ao maior eixo, quando necessário
- [ ] Janela apropriada para borda (partes moles para parênquima)
- [ ] Registro mínimo: fase, espessura, kernel, limitações (Cap 17)

---

### 26.2.4 QA — RM

**Checklist 26.5 — QA RM para biometria**

- [ ] Medida em sequência estável (T2 FSE/T1 3D)
- [ ] Evitar DWI/EPI para número se houver distorção
- [ ] Voxel/espessura compatíveis para follow-up
- [ ] Plano/MPR alinhado ao maior eixo
- [ ] Limitações (movimento/fat-sat/distorção) documentadas (Cap 21)

---

## 26.3 Glossário (termos e abreviações do manual)

### Tabela 26.1 — Abreviações

| Termo | Significado |
|------|-------------|
| LMC | Linha medioclavicular |
| ILC | Índice do lobo caudado |
| IE | Índice esplênico |
| RPM / PVR | Resíduo pós-miccional (post-void residual) |
| IR | Índice de resistividade |
| IP | Índice de pulsatilidade |
| PRF | Pulse Repetition Frequency (escala/Nyquist) |
| MPR | Reconstrução multiplanar |
| HU | Hounsfield Units (atenuação em TC) |
| APW/RPW | Washout absoluto/relativo (adrenal) |

### Tabela 26.2 — Termos padronizados (USG)

| Termo | Uso |
|------|-----|
| Anecoico/hipoecoico/isoecoico/hiperecóico | Ecogenicidade em USG |
| Reforço acústico posterior | Descritor de cisto/conteúdo líquido |
| Sombra acústica posterior | Descritor de cálculo/calcificação |
| Relação corticomedular | Termo preferencial para rim |

---

## 26.4 Templates mínimos (registro e laudo)

### 26.4.1 Template — Registro de medida (qualquer modalidade)

**Tabela 26.3 — Registro mínimo de biometria (padrão)**

| Campo | Exemplo |
|------|---------|
| Estrutura | Rim esquerdo (comprimento) |
| Valor + unidade | 10,8 cm |
| Plano | Sagital oblíquo |
| Método | Polo a polo |
| Modalidade | USG |
| Técnica relevante | Inspiração profunda; sem compressão |
| Limitação | Interposição gasosa (se presente) |
| Data e comparação | Comparar com exame de data informada (se aplicável) |

---

### 26.4.2 Template — USG Abdome Total (biometria mínima)

**Checklist 26.6 — Itens mínimos**

- [ ] Fígado: dimensões (qualitativo) e, se medido, eixo LMC (cm)
- [ ] Baço: dimensões (qualitativo) e, se medido, eixo (cm)
- [ ] Rins: comprimento bilateral (cm) quando disponível + relação corticomedular
- [ ] Vias biliares: calibre do colédoco em mm quando fornecido
- [ ] Bexiga/pelve: apenas panorâmico, salvo indicação/achado incidental

---

### 26.4.3 Template — TC/RM (lesão)

**Modelo (texto)**

> "Lesão em [órgão/localização], medindo [X] mm no maior eixo, mensurada em [fase/seq/plano]. Comparação com exame anterior de data informada, quando técnica comparável."

---

## 26.5 Encerramento (como manter o manual vivo)

**Regra do manual**:
> Qualquer mudança de referência (cutoffs, diretrizes, versões) deve ser registrada como versão e aplicada de forma consistente a partir de uma data.

---

**FIM DO CAPÍTULO 26**
