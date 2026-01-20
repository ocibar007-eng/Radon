# PROMPT RÁPIDO — LAUDO USG ABDOME TOTAL + AUDITORIA INTERNA (V1.0)

Este arquivo é uma versão **enxuta** do `USG_ABD_TOTAL_COMPLETO.md` para reduzir tempo de processamento e risco de contaminação.

Objetivo: gerar **(1) LAUDO** e **(2) AUDITORIA INTERNA** (fora do laudo).

---

## 1) TRAVA ANTI-CONTAMINAÇÃO (OBRIGATÓRIA)

- Usar **somente** dados do bloco “DADOS DO CASO” fornecido pelo usuário nesta execução.
- **Não ler** e **não usar** conteúdos de outros arquivos da pasta/projeto (ex.: laudos de outros pacientes), mesmo que existam no diretório.
- **Não pesquisar na internet**. Se o usuário pedir comparação com literatura e a referência não estiver nos dados do caso, registrar a limitação e usar `**<VERIFICAR>**` na auditoria (não no laudo, salvo dado essencial ausente).
- Para valores pediátricos, quando necessário e permitido, usar apenas `PEDIATRIA_REFERENCIAS/USG_ABDOME_REFERENCIAS_RAPIDAS.md`.

---

## 2) REGRAS DE FORMATAÇÃO DO LAUDO (INVIOLÁVEIS)

- Separador de seção principal: uma linha exclusiva com `---`, com uma linha em branco antes e depois.
- Títulos de seção principal: **CAIXA ALTA E NEGRITO** (ex.: `**INDICAÇÃO CLÍNICA**`).
- Em **ACHADOS ULTRASSONOGRÁFICOS** e **IMPRESSÃO**:
  - Cada item começa com `►` em **linha própria**.
  - Deve haver **uma linha em branco** entre itens `►`.
  - `►` nunca na mesma linha do título do órgão.
- Proibido inventar medidas. Linhas com medidas só entram se houver número explícito no input.
- Decimal com **vírgula** e unidade explícita (mm, cm, mL).

---

## 3) GATES INTERNOS (EXECUTAR, NÃO EXIBIR)

- Gate: sexo/anatomia pélvica (no abdome total, pelve é panorâmica).
- Gate: limitações técnicas (gás, biotipo, jejum, bexiga).
- Gate: exame prévio (se houver, usar apenas para comparação).
- Gate: medidas numéricas existentes (incluir só o que existir).

---

## 4) ESTRUTURA DO LAUDO (OBRIGATÓRIA)

---

**ULTRASSONOGRAFIA DE ABDOME TOTAL**

---

**INDICAÇÃO CLÍNICA**

---

(Reformular a indicação do input. Usar faixa etária OMS em minúscula; não usar idade numérica.)

---

**TÉCNICA E PROTOCOLO**

---

Exame de ultrassonografia do abdome total realizado após o preparo com jejum recomendado, em equipamento **Mindray® Resona I8**. Foram utilizados transdutores de banda larga, software com imagem harmônica e emprego de manobras posturais (decúbitos) para adequada avaliação das estruturas. A varredura panorâmica dos órgãos abdominais foi realizada com transdutor convexo de baixa frequência (1-5 MHz). A análise com Doppler colorido e espectral foi empregada de forma direcionada.

Se pediátrico: acrescentar a frase do uso combinado de transdutores.

Se houver limitação técnica: adicionar em nova linha:
**Nota de Limitação Técnica:** (texto simples, sem negrito).

---

**ACHADOS ULTRASSONOGRÁFICOS**

---

### Fígado

► Dimensões: normais ou aumentadas (hepatomegalia), conforme o caso.

► Contornos: regulares ou lobulados.

► Ecotextura: homogênea ou heterogênea.

► Ecogenicidade: preservada ou difusamente aumentada (sugestiva de esteatose).

► Veias hepáticas e ramos portais: descrever patência/fluxo somente se avaliado.

► Lesões focais: declarar ausência ou descrever achado fornecido.

---

### Vesícula biliar e vias biliares

► Vesícula: distensão e paredes.

► Conteúdo: anecoico, cálculo(s), lama biliar, conforme o caso.

► Vias biliares: calibre normal ou alterado; incluir colédoco em mm apenas se houver número no input.

---

### Pâncreas

► Descrever morfologia/ecogenicidade ou declarar limitação por interposição gasosa.

---

### Baço

► Dimensões: normais ou aumentadas.

► Eixo longitudinal em cm: incluir somente se houver número no input.

► Ecotextura: homogênea ou descrever alterações fornecidas.

---

### Rins e vias urinárias superiores

► **Rim direito:** topografia, dimensões/contornos; medida em cm apenas se houver número no input.

► Relação corticomedular: preservada ou alterada (se informado).

► Sistema pielocalicinal: sem/ com dilatação.

► Cálculos: ausentes ou descrever achado informado.

► **Rim esquerdo:** (mesmo padrão).

---

### Lojas adrenais

► Aspecto habitual, sem massas identificáveis (ou descrever achado informado).

---

### Bexiga

► Repleção, paredes e conteúdo.

Se houver números no input: incluir volume (mL) e/ou RPM (mL).

---

### Órgãos pélvicos (avaliação limitada)

► Avaliação pélvica panorâmica sem alterações evidentes pelo método.

Somente detalhar órgão pélvico se o pedido/ditado for pélvico/prostático OU se houver achado incidental pélvico documentado.

---

### Grandes vasos abdominais

► Aorta abdominal: trajeto e calibre (ou limitação).

► Veia cava inferior: trajeto e calibre (ou limitação).

► Veia porta: calibre e fluxo somente se avaliado.

---

### Cavidade peritoneal e retroperitônio

► Líquido livre: ausente ou presente (se informado).

► Linfonodomegalias: ausentes ou presentes (se informado).

---

**COMPARAÇÃO**

---

Se não houver exame prévio: "Não foram disponibilizados exames prévios para comparação."

Se houver: comparar conforme data/modalidade informadas, com cautela de técnica.

---

**IMPRESSÃO**

---

**Diagnóstico principal:**

► Conclusão mais relevante, respondendo à indicação clínica.

► Incluir achados relevantes quando presentes.

► Se aplicável: "Exame dentro dos limites da normalidade para o método."

**Diagnósticos diferenciais:**

► "Nenhum relevante a acrescentar." (se aplicável)

**Relação com a indicação clínica:**

► Texto curto correlacionando achados e indicação.

**Recomendações:**

► Texto adequado ao caso (ou: "Não há recomendações específicas de seguimento por imagem com base nos achados deste exame.")

**Achados incidentais:**

► Descrever incidental relevante ou: "Nenhum achado incidental clinicamente significativo identificado."

**Eventos adversos:**

► "Nenhum relatado durante o procedimento."

---

## 5) AUDITORIA INTERNA (FORA DO LAUDO)

Após finalizar o laudo acima, gerar um bloco separado, **não copiável** para o laudo, com o título:

AUDITORIA INTERNA (NÃO COPIAR PARA O LAUDO)

Formato (texto simples, pode usar hífen):

- Gates acionados: ...
- Dados ausentes relevantes: ...
- Itens marcados `**<VERIFICAR>**` no laudo (se houver): ...
- Limitações técnicas consideradas: ...
- Decisões de padronização (fase respiratória, inclusão/omissão de medidas): ...
- Risco de contaminação: confirmar “somente dados do caso” (sim/não)
- Pediatria (se aplicável): idade numérica usada internamente (se fornecida) e qual linha/tabela foi usada (não colocar idade numérica no laudo)
- Sugestão de melhoria do prompt (1 linha): ...
- Referências locais usadas (se houver): citar o nome do arquivo e o item (ex.: baço/veia porta/rim).
