# Plano de Implementação — Resumo Clínico Escaneável (UI + Conteúdo)

## Objetivo
Entregar um resumo clínico ultra-escaneável para radiologistas, com compreensão do caso em ~5 segundos. O layout deve ser moderno, minimalista e consistente com o design system atual (tema escuro Zinc, acento âmbar), destacando de forma inequívoca o nome do paciente e a pergunta clínica.

## Escopo
### Inclui
- Reestruturação da UI do “Resumo Clínico” para layout em cards e hierarquia visual clara.
- Ajustes no prompt de IA para garantir campos-chave (médico solicitante, convênio, tipo de exame, contraste, preparo, etc.).
- Regras para sinalizar informações divergentes com chip/flag visual.
- Seção de texto legível do pedido manuscrito, com marcação de trechos ilegíveis.

### Não inclui (por enquanto)
- Mudanças de backend ou persistência fora do fluxo atual do resumo.
- Revisão do pipeline de OCR ou modelos de visão.
- Nova tipografia ou paleta de cores (manter tokens existentes).

## Contexto Atual (Pontos de Modificação)
- Prompt de resumo clínico: `src/adapters/gemini/prompts.ts`.
- Schema do resumo clínico: `src/adapters/schemas.ts` (estrutura atual já suporta textos por seção).
- UI da aba: `src/features/clinical/ClinicalTab.tsx`.
- Estilos: `src/styles/clinical.css`, `src/styles/markdown.css`, `src/styles/components.css`.

## Arquitetura de Informação (Nova Estrutura)
Ordem e foco devem priorizar a leitura instantânea do caso:

1. **Identificação e contexto** (hero superior)
   - Nome + ID/prontuário (muito destacado)
   - Idade/sexo, convênio, tipo de exame
   - Data/hora e local/serviço
   - Médico solicitante (nome/CRM)

2. **Pergunta clínica** (card principal, destaque máximo)
   - Dúvida principal (curta e objetiva)
   - Indicação literal
   - Sintoma principal + tempo de evolução

3. **Resumo executivo** (1–2 linhas, opcional)
   - “O essencial do caso e por que o exame foi pedido”

4. **Segurança / contraste** (card com badges)
   - Alergia a contraste iodado (badge vermelho)
   - Função renal (creatinina/eTFG + data) (badge verde)
   - Contraste (tipo/via/quantidade) (badge azul/ciano)
   - Pré-medicações: Buscopan, manitol, gel vaginal, etc.

5. **História da doença atual**
6. **Cirurgias e procedimentos prévios**
   - O quê, quando e se houve complicações
7. **Antecedentes e comorbidades**
   - Oncologia (tipo/estadiamento/data/tratamento)
   - Doenças crônicas relevantes
   - Infecções recentes
   - Histórico familiar / gineco‑obstétrico (quando disponível)
8. **Medicações relevantes**
9. **Laboratório relevante**
10. **Exames prévios e comparativos**
   - Data, local/serviço, resumo/achados

11. **Status operacional**
    - Jejum/preparo
    - Contraste oral/retal
    - Apneia/dispneia
    - Claustrofobia/sedação
    - Peso/IMC
    - Intercorrências do procedimento (quando documentadas)

12. **Texto do pedido (legível)**
    - Transcrição do que for legível; usar “[ilegível]” onde não for possível ler.

## Layout e Hierarquia Visual (UI)
- **Hero Full Width**: nome do paciente em tamanho maior, ID logo abaixo; informações secundárias em linha compacta.
- **Pergunta clínica**: card principal, full width, com título em destaque.
- **Grid responsivo**:
  - Desktop: 2–3 colunas com cards de mesma altura visual.
  - Mobile: 1 coluna, cards empilhados por prioridade.
- **Cards** com bordas sutis e fundo `--color-bg-secondary`/`--color-bg-tertiary`.
- **Linhas chave:valor** em cada card: label curto (uppercase) + valor mais destacado.
- **Badges** com cores do design system:
  - Alergia: `--status-error-bg` / `--status-error-text`
  - Função renal: `--status-success-bg` / `--status-success-text`
  - Contraste: `--status-info-bg` / `--status-info-text`

## Regras de Divergência (Conflitos de Informação)
- Se houver conflito, a linha deve iniciar com `[DIVERGENTE]` e listar as versões.
- A UI detecta esse prefixo e exibe um chip “Divergente” junto ao item.
- O conteúdo da linha deve preservar o contexto (“[DIVERGENTE] ID: 123 vs 456”).

## Texto Legível do Pedido (Manuscrito)
- Criar seção específica “Texto do pedido (legível)”.
- Incluir somente o que for claramente legível; usar `[ilegível]` para trechos duvidosos.
- Exibição em card dedicado com `white-space: pre-wrap` e espaçamento generoso.

## Alterações na IA (Prompt e Saída)
O prompt deve garantir a presença dos campos críticos listados pelo negócio:
- Nome do médico solicitante, convênio, tipo de exame.
- Resumo executivo curto.
- Exames prévios detalhados (data, local, resumo).
- Contraste (tipo, via, quantidade) e preparo (Buscopan/manitol/etc.).
- Cirurgias/procedimentos prévios em seção dedicada.
- Histórico familiar / gineco‑obstétrico quando aparecer nos documentos.
- Intercorrências do procedimento quando documentadas.
- Texto legível do pedido manuscrito.

A saída `resumo_clinico_consolidado.texto_em_topicos` já é flexível; basta expandir as seções e itens para cobrir os campos acima.

## Plano de Implementação (Fases)

### Fase 1 — Atualizar Prompt e Conteúdo (IA)
- Ajustar `src/adapters/gemini/prompts.ts` para incluir:
  - Seção “Identificação e contexto” com convênio e médico solicitante.
  - Seção “Resumo executivo”.
  - Seção “Texto do pedido (legível)”.
  - Campos de contraste/preparo mais detalhados.
- Garantir instrução explícita: não inventar dados e usar “Não informado”.
- Padronizar uso de `[DIVERGENTE]` quando houver conflito.

### Fase 2 — Estrutura de Renderização (Frontend)
- Em `src/features/clinical/ClinicalTab.tsx`, priorizar renderização por `data.resumo_clinico_consolidado.texto_em_topicos`.
- Implementar um mapeador de seção -> card (ex.: `getClinicalSections()`), respeitando a ordem prioritária.
- Fallback: se `data` não existir, usar `markdown_para_ui` com `MarkdownRenderer`.

### Fase 3 — Estilos e Componentes
- Em `src/styles/clinical.css`:
  - Definir grid responsivo dos cards.
  - Estilos para hero, cards, labels e valores.
  - Badges de alergia/contraste/renal.
  - Chip visual para `[DIVERGENTE]`.
- Em `src/styles/markdown.css`:
  - Ajustar apenas o fallback (se necessário), sem quebrar o tema.

### Fase 4 — Refinos de UX
- Adicionar truncamento suave (line-clamp) para textos longos.
- Garantir espaçamento consistente entre blocos.
- Validar contraste de cor e legibilidade em telas pequenas.

### Fase 5 — QA e Ajustes
- Revisão visual com casos reais e mocks (`src/__mocks__/documentMocks.ts`).
- Validação da presença dos campos críticos.
- Testes manuais de responsividade (desktop + mobile).

## Critérios de Aceite
- Nome do paciente e pergunta clínica são os elementos mais visíveis.
- Cards com separação clara substituem listas longas.
- Badges de alergia/renal/contraste funcionam e são visíveis.
- Informações divergentes aparecem com chip “Divergente”.
- Texto do pedido manuscrito aparece quando legível.
- Seção de “Cirurgias e procedimentos prévios” aparece quando houver dados (ocultar se vazia).
- Layout mantém identidade visual do produto.

## Riscos e Mitigações
- **IA não preencher campos críticos**: reforçar instruções no prompt e usar “Não informado”.
- **Divergências não detectadas**: padronizar prefixo e criar validação mínima na UI.
- **Excesso de texto**: usar line-clamp e priorizar síntese.

## Pendências / Perguntas em Aberto
- Convênio é sempre relevante ou opcional? Priorizar se existir.
- Qual o limite aceitável de tamanho para o “Resumo executivo”?
- Campos obrigatórios para concluir o exame (ex.: contraste)?
