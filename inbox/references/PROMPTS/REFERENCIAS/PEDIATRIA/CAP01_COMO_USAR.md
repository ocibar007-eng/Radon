# MANUAL TÉCNICO DE BIOMETRIA EM RADIOLOGIA DE ABDOME E PELVE

**Versão 1.0** | **Janeiro 2026**

---

## CAPÍTULO 1 — COMO USAR ESTE MANUAL

### 1.1 O que este manual entrega (e o que ele não tenta fazer)

Este manual foi desenhado para transformar "medidas comuns de abdome e pelve" em um **sistema operacional**: técnica padronizada, parâmetros técnicos que interferem, valores de referência com fonte e um texto de laudo reutilizável.

#### Entrega do manual:

Um catálogo de medidas por modalidade (USG, Doppler, TC, RM), com:

- Passo a passo de aquisição/medição
- Tabelas de referência/cutoffs com fonte rastreável
- Exemplos resolvidos completos
- Checklists operacionais
- Textos prontos para laudo

#### Não é objetivo:

- Substituir guidelines oficiais (apenas compilá-los)
- Criar "novos" cutoffs (apenas usar os publicados)
- Fazer recomendações terapêuticas (foco: imagem + medida + relatório)
- Ensinar anatomia básica (assume conhecimento prévio)

---

### 1.2 Como ler: dois modos de uso (consulta e implementação)

#### Modo A — Consulta rápida (plantão/laudo)

**Cenário**: Você está laudando e precisa de um cutoff ou técnica específica.

**Fluxo**:
1. Ir direto ao capítulo da estrutura/modalidade (ex.: Cap 8 — USG Rins)
2. Localizar a medida específica (ex.: Comprimento longitudinal)
3. Executar o **Checklist rápido**
4. Copiar o **Texto pronto para laudo**
5. Ajustar valores específicos do caso

**Tempo estimado**: 60-90 segundos por medida

#### Modo B — Implementação (padronizar serviço)

**Cenário**: Você quer implementar um protocolo de biometria padronizado no serviço.

**Fluxo**:
1. Definir escopo: quais medidas entram no protocolo "padrão" do serviço
2. Preencher a **Tabela-Mestra de Extração** (uma linha por medida)
3. Treinar equipe com 3 etapas:
   - Técnica de aquisição (plano, referência)
   - Técnica de caliper/ROI (bordas, posicionamento)
   - "Passar a régua" com QA (amostragem de casos)
4. Implementar checklists em templates de laudo
5. Auditar periodicamente (ver Cap 26 — QA)

**Tempo estimado**: 2-4 semanas para implementação completa

---

### 1.3 O template fixo (10 itens) — "a unidade mínima do manual"

Todo item de medida no manual segue o mesmo esqueleto para permitir **auditoria e reutilização**:

| # | Elemento | Função |
|---|----------|--------|
| 1 | **O que medir** (definição) | Define exatamente qual medida |
| 2 | **Quando medir** (indicações) | Evita coleta desnecessária |
| 3 | **Como medir** (passo a passo) | Reprodutibilidade técnica |
| 4 | **Parâmetros técnicos** | Explica discrepâncias |
| 5 | **Valores de referência/cutoffs** | Números clínicos com fonte |
| 6 | **Interpretação prática** | O que muda no laudo |
| 7 | **Armadilhas e erros comuns** | Reduz falso±positivo/negativo |
| 8 | **Checklist rápido** | Versão de bolso |
| 9 | **Exemplo resolvido** | Demonstra conta completa |
| 10 | **Texto pronto para laudo** | Consistência e velocidade |

#### Exemplo de aplicação do template (resumo):

**Medida**: Volume prostático por USG

1. **O que**: Volume total da próstata em mL
2. **Quando**: HPB, planejamento de biópsia, cálculo PSA densidade
3. **Como**: Elipsoide (AP × T × L × π/6)
4. **Parâmetros**: Via transretal vs suprapúbica, bexiga repleta
5. **Valores**: Normal < 30 mL, aumento leve 30-50 mL
6. **Interpretação**: Volume > 30 mL sugere HPB
7. **Armadilhas**: Incluir vesículas, lobo mediano
8. **Checklist**: ☑ Bexiga repleta ☑ 3 eixos ☑ Cálculo executado
9. **Exemplo**: 4,5 × 3,8 × 4,0 cm → 36 mL
10. **Texto**: "Próstata aumentada, volume 36 mL"

---

### 1.4 Rastreabilidade: o "padrão ouro" mínimo

Quando você reporta um número clínico (faixa normal/cutoff), este manual exige que você consiga responder:

1. **De onde veio?** (sociedade/ano/documento)
2. **Em que contexto técnico?** (fase/jejum/plano/ângulo/etc.)
3. **Em qual população?** (adulto/pediátrico, sexo, etnia se relevante)
4. **Qual é a definição operacional?** (como medir exatamente)
5. **Qual é a limitação?** (resolução, parcial volume, variabilidade)

#### Checklist 1.1 — Rastreabilidade mínima antes de "colar um cutoff"

- [ ] Sei citar sociedade + ano + documento (ID do manual)
- [ ] Sei citar seção/página quando for PDF
- [ ] Sei dizer como medir (plano/referência/ROI)
- [ ] Sei dizer em que fase/condição o cutoff vale
- [ ] Sei dizer quando ele NÃO vale (limitações)

#### Sistema de ID de Referências

Formato padrão: `SOCIEDADE_ANO_DOCUMENTO_SECAO_PAGINA`

**Exemplos**:
- `ACR_2024_LIRADS_Sec4_p12`
- `SRU_2023_Renal_Duplex_Appendix_A`
- `ESUR_2024_Prostate_MR_Table2`

---

### 1.5 Como auditar uma medida (passo a passo reprodutível)

Auditar não é "concordar com o colega"; é **provar que o número sai do método**.

#### 1.5.1 O fluxo de auditoria (imagem → número → laudo)

```
AQUISIÇÃO
    ↓
Protocolo correto (parâmetros mínimos)
    ↓
LOCALIZAÇÃO
    ↓
Escolher o corte/plano correto
    ↓
MEDIÇÃO
    ↓
Caliper/ROI conforme definição operacional
    ↓
REGISTRO
    ↓
Unidade correta + arredondamento padronizado
    ↓
INTERPRETAÇÃO
    ↓
Aplicar cutoffs com contexto e ressalvas
    ↓
LAUDO
    ↓
Texto pronto + (se necessário) nota de limitação
```

#### Checklist 1.2 — Auditoria rápida (repetir em 60-90s)

- [ ] Encontrei o mesmo plano descrito no manual
- [ ] Confirmei ponto anatômico de referência
- [ ] Caliper/ROI está no lugar certo
- [ ] Unidade correta (mm, mL, cm/s, HU)
- [ ] Arredondamento igual ao padrão
- [ ] Se usei cutoff, anexei fonte (ID) no meu registro interno

---

### 1.6 Como lidar com divergência entre fontes (sem "inventar o meio termo")

Quando duas fontes legítimas diferem, o manual **não tenta "chutar"**. Ele aplica o seguinte protocolo:

#### Protocolo de Divergência em 4 Passos

**1. Rotular explicitamente:**
> ⚠️ **VARIA ENTRE FONTES**

**2. Identificar por que diverge:**
- População diferente (adulto vs idoso)
- Técnica diferente (via transretal vs suprapúbica)
- Fase diferente (sem contraste vs portal)
- Equipamento diferente (resolução)
- Definição diferente (inner-to-inner vs outer-to-outer)
- Objetivo diferente (screening vs diagnóstico)

**3. Escolher uma regra operacional local:**
- Preferir diretriz institucional
- Na ausência, preferir sociedade de maior aderência ao cenário
- Documentar a decisão no registro mestre (Tabela-Mestra)

**4. Laudo: usar texto padronizado que reflita a incerteza**

#### Texto padrão para divergências

```
"Critérios dimensionais variam entre diretrizes; neste serviço, 
aplica-se o critério [ESPECIFICAR] (Fonte: [ID]) considerando 
o protocolo de aquisição utilizado."
```

#### Exemplo real de divergência

**Medida**: Calibre do colédoco normal

| Fonte | Valor | Contexto |
|-------|-------|----------|
| Kaim 2004 | ≤ 6-7 mm | Sem colecistectomia |
| Bowie 2000 | Até 8-9 mm | > 60 anos |
| Park 2009 | ≤ 10 mm | Pós-colecistectomia |

**Decisão operacional do manual**: Adotar Kaim 2004 (≤ 7 mm) como baseline, com nota de que aumenta 1 mm/década após 60 anos (Bowie) e pós-colecistectomia aceita até 10 mm (Park).

---

### 1.7 Exemplos resolvidos: como eles serão apresentados

Todos os exemplos vêm com:

- Unidades explícitas
- Conversões quando necessário
- Arredondamento aplicado
- Resultado final formatado

#### Exemplo Resolvido 1.1 — Arredondamento consistente

**Contexto**: Medida bruta de lesão hepática

**Dados**:
- Caliper 1: 47,6 mm
- Padrão do manual: arredondar para 1 mm

**Cálculo**:
```
47,6 mm → 48 mm (arredondamento padrão)
```

**Como reportar no laudo**:
> "Imagem nodular medindo 48 mm no maior eixo..."

---

#### Exemplo Resolvido 1.2 — Conversão cm ↔ mm

**Contexto**: USG do serviço mede em cm

**Dados**:
- Medida do equipamento: 12,4 cm
- Padrão do manual: registrar em mm

**Conversão**:
```
12,4 cm × 10 = 124 mm
```

**Como padronizar**:
- Registrar: 124 mm
- Observação: "Valor original: 12,4 cm (equipamento)"

---

### 1.8 Convenções de unidades e arredondamento (regras globais)

#### Tabela 1.1 — Unidades Padronizadas

| Grandeza | Unidade Padrão | Alternativa | Conversão |
|----------|----------------|-------------|-----------|
| Comprimento (lesões) | mm | cm | 1 cm = 10 mm |
| Comprimento (órgãos) | cm | mm | 1 cm = 10 mm |
| Área | mm² ou cm² | — | 1 cm² = 100 mm² |
| Volume | mL | cm³ | 1 mL = 1 cm³ |
| Velocidade (Doppler) | cm/s | m/s | 1 m/s = 100 cm/s |
| Atenuação (TC) | HU | — | — |
| Intensidade (RM) | Qualitativa | — | — |

#### Tabela 1.2 — Regras de Arredondamento

| Situação | Regra | Exemplo |
|----------|-------|---------|
| Comprimento ≤ 30 mm | 1 decimal ou inteiro | 12,3 mm ou 12 mm |
| Comprimento > 30 mm | 0,1 cm | 12,4 cm |
| Volume < 10 mL | 1 decimal | 8,5 mL |
| Volume 10-100 mL | Inteiro | 45 mL |
| Volume > 100 mL | Inteiro | 250 mL |
| Índice Doppler (IR/PI) | 2 decimais | 0,68 |
| Velocidade Doppler | Inteiro | 45 cm/s |
| HU | Inteiro | -10 HU |

---

### 1.9 Política de versões e atualizações

#### Versionamento Semântico

Formato: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.x.x): Mudança de cutoffs importantes ou técnica
- **MINOR** (x.1.x): Adição de novos capítulos/medidas
- **PATCH** (x.x.1): Correções menores, typos, clarificações

#### Log de Mudanças (Exemplo)

| Versão | Data | Mudanças Principais |
|--------|------|---------------------|
| 1.0 | Jan/2026 | Versão inicial completa |
| 1.1 | *Futuro* | Adição LI-RADS v2025 |
| 2.0 | *Futuro* | Mudança critérios PI-RADS v3 |

---

### 1.10 Estrutura do manual (navegação)

#### Parte I: Fundamentos (Cap 1-4)
- Cap 1: Como usar
- Cap 2: Biblioteca de diretrizes
- Cap 3: Metrologia em radiologia
- Cap 4: DICOM e metadados

#### Parte II: Ultrassonografia (Cap 5-11)
- Cap 5: Protocolo USG biometria
- Cap 6: USG Fígado
- Cap 7: USG Baço
- Cap 8: USG Rins
- Cap 9: USG Bexiga
- Cap 10: USG Próstata
- Cap 11: USG Pelve feminina

#### Parte III: Doppler (Cap 12-16)
- Cap 12: Princípios Doppler
- Cap 13: Doppler renal
- Cap 14: Doppler hepático/portal
- Cap 15: Doppler aorta/mesentérico
- Cap 16: Doppler pélvico

#### Parte IV: TC (Cap 17-20)
- Cap 17: Protocolos TC
- Cap 18: HU/ROI
- Cap 19: Critérios dimensionais
- Cap 20: TC Adrenal

#### Parte V: RM (Cap 21-24)
- Cap 21: RM Abdome
- Cap 22: RM Fígado (LI-RADS)
- Cap 23: RM Próstata (PI-RADS)
- Cap 24: RM Adrenais/Rins/Pelve

#### Parte VI: Apêndices (Cap 25-26)
- Cap 25: Fórmulas e volumes
- Cap 26: QA, glossário, templates

---

### Checklist 1.3 — Uso eficiente do manual (autoavaliação)

Após implementar medidas do manual, verifique:

- [ ] Defini quais medidas entram no meu protocolo padrão
- [ ] Treinei a equipe na técnica de cada medida
- [ ] Implementei checklists nos templates de laudo
- [ ] Auditei uma amostra de casos (pelo menos 10)
- [ ] Registrei divergências encontradas
- [ ] Atualizei a Tabela-Mestra local
- [ ] Documentei mudanças de protocolo no serviço

---

**FIM DO CAPÍTULO 1**

*Próximo: Capítulo 2 — Biblioteca de Diretrizes e Consensos 2023-2026*
