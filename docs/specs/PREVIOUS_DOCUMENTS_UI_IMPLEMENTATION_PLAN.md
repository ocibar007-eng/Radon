# Plano de Implementacao — Documentos Clinicos (UI + Conteudo)

## Objetivo
Criar uma experiencia de revisao de documentos clinicos que seja tao escaneavel quanto o Resumo Clinico, mantendo consistencia visual e sem quebrar o pipeline atual. A aba deve comunicar rapidamente o contexto, agrupar documentos por exame e reduzir ruido visual.

## Escopo
### Inclui
- Renomeacao da aba para refletir multiplos tipos de documento (laudos, pedidos, questionarios, termos, etc.).
- Nova hierarquia visual na tela de documentos: hero, estatisticas, busca e a lista de grupos.
- Reestilizacao de cards de grupos (ReportGroupCard) para padrao premium do sistema.
- Harmonizacao com os templates adaptativos (AnotacaoClinicaTemplate e afins).

### Nao inclui
- Mudancas no pipeline de OCR ou schemas.
- Alteracao da logica de agrupamento de documentos.
- Mudancas de persistencia ou back-end.

## Contexto Tecnico
- UI alvo: `src/features/reports/PreviousReportsTab.tsx`.
- Cards de grupo: `src/features/reports/ReportGroupCard.tsx`.
- Bundles por PDF: `src/features/reports/PdfDocumentBundle.tsx`.
- Estilos principais: `src/styles/documents.css`.
- Design tokens: `src/styles/design-tokens.css`.

## Arquitetura de Informacao
1. **Hero**
   - Titulo: Documentos Clinicos
   - Subtitulo de contexto
   - Stats (grupos, documentos, arquivos)

2. **Toolbar**
   - Busca integrada (escopo: tipo, data, texto)
   - CTA para adicionar documento

3. **Grid de Grupos**
   - Cards premium
   - Expansao ocupa largura total
   - Bundle por PDF com abas claras

4. **Estados vazios**
   - Mensagem clara quando nao ha documentos ou busca sem resultado

## Diretrizes Visuais
- Aparencia: Rational Design (Zinc/Amber)
- Cards com borda sutil, sombras suaves e gradientes discretos
- Separacao por blocos e respiracao generosa
- Badges e chips consistentes com Resumo Clinico

## Plano de Implementacao
### Fase 1 — Tokens
- Incluir tokens para panel, bordas fortes e gradientes suaves
- Padronizar sombra de card para listas de documentos

### Fase 2 — Layout do PreviousReportsTab
- Inserir hero com titulo, subtitulo e stats
- Toolbar com busca e CTA alinhados ao novo estilo
- Grid responsivo para grupos

### Fase 3 — Cards e Bundle
- Ajustar `ReportGroupCard` para header mais claro e moderno
- Melhorar contraste do bundle header e tabs
- Garantir leitura rapida de tipo, data e origem

### Fase 4 — Estados vazios e responsividade
- Mensagens mais claras para vazio e filtro
- Ajustes para mobile (coluna unica, botoes full width)

## Criterios de Aceite
- Aba comunica que ha multiplos tipos de documentos
- Layout consistente com Resumo Clinico
- Cards com leitura rapida de tipo/data/origem
- Expansao nao quebra o grid
- Estados vazios claros

## Riscos e Mitigacoes
- Ruido visual com muitos documentos: reduzir contraste e usar espaçamento.
- Inconsistencia com templates adaptativos: alinhar com sr-organ-card e tokens.

## QA Minimo
- Documento unico
- Multiplos tipos no mesmo PDF
- Busca com termo presente e ausente
- Mobile (largura menor que 720px)
