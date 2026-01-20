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

