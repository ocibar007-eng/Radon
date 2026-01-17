# Implementação: Anotações Clínicas e UI Fixes

## 1. Correção do ClassificationChip (Dropdown)
**Problema:** O dropdown de classificação fechava imediatamente ao abrir devido a conflitos de propagação de eventos e z-index em containeres com overflow hidden.
**Solução:**
- Reescrita completa do componente `ClassificationChip`.
- Uso de **React Portal** (`createPortal`) para renderizar o menu diretamente no `document.body`, escapando de qualquer hierarquia de empilhamento (z-index) ou corte (overflow) dos componentes pais.
- Lógica de posicionamento inteligente (detecta bordas da tela e inverte direção se necessário).

## 2. Reclassificação de Documentos
**Problema:** Reclassificar um documento alterava todos os documentos do grupo ou travava em "Pending" se o arquivo original não estivesse disponível.
**Solução:**
- Refatoração do hook `handleManualReclassify`.
- Agora afeta estritamente o `docId` alvo.
- Verificação de segurança: `if (!doc.file) status = 'done'`, evitando loop infinito de processamento se o binário não existir.

## 3. Template de Anotação Clínica (Assistencial)
**Novo Recurso:** Visualização especializada para documentos classificados como `assistencial`.
**Funcionalidades:**
- **Transcrição Literal Corrigida:** Exibe o texto OCR limpo e ortograficamente corrigido, mas fiel ao conteúdo original (inclusive mantendo termos técnicos ou relatos "absurdos" se presentes no original).
- **Campos Estruturados:** Templates visuais para:
  - Profissional Responsável (Nome, COREN)
  - Contraste (Volume, Via, Lote)
  - Intercorrências (com badge de gravidade)
  - Sinais Vitais (PA, FC, SpO2)
- **Visual:** Estilo limpo e moderno, consistente com o restante da aplicação (sem fontes retrô).

## 4. Próximos Passos (Sugestão)
- Implementar validação cruzada de contraste (Pedido vs Termo vs Anotação).
- Exportação de discrepâncias em CSV na Worklist.
