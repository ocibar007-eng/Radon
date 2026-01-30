# Roadmap de Execucao (Radon V3)

Status por blocos (macro)
- Blocos 1–6: concluido (prompt base, regras, estrutura e ajustes).
- Bloco 3 (schemas + calculator client + registry): concluido.
- Blocos 7–10 (pipeline completo: agentes, renderer, QA, self-healing, risk): concluido.
- Bloco 5 (Golden Set): pipeline conectado e scripts ajustados; falta rodar E2E real com chaves.

Arquitetura por layers (figura)
- Layer 1 (Input & Preprocessing): orquestrador + parser (status: OK).
- Layer 2 (Specialized Agents): clinical/technical/findings/comparison (OK), oncology (pendente), calculator (OK).
- Layer 3 (Synthesis): impression (OK), recommendations (OK via renderer/impression).
- Layer 4 (Quality & Formatting): renderer + canonicalizer + QA deterministico + self-healing + risk scoring (OK).
- Layer 5 (Output): markdown final (OK) + auditoria interna (OK quando houver).

O que falta para “rodar ja” (passo a passo)
1) Configurar chaves e modelos
   - Preencher .env com OPENAI_API_KEY e OPENAI_MODEL_* usados no renderer/impression/comparison.
2) Subir servico de calculos Python
   - Rodar o servico do calculator (porta 8081 por padrao).
3) Executar o pipeline real com Golden Set
   - Rodar scripts em scripts/golden/ para validar E2E.
4) Ajustar inputs minimos por escala (para reduzir inferencia)
   - PI-RADS, Bosniak, TI-RADS, O-RADS: capturar campos minimos no parser/UX.

Pendencias por prioridade (pulado 1 e 2 conforme pedido)
3) Campos minimos por escala no parser/UX (pendente)
4) Rodar golden tests E2E com chaves (pendente)
5) UI/quickactions (botao de comparacao, protocolo etc.) (pendente)

Notas importantes
- Oncology Agent (RECIST/iRECIST/Choi/Lugano) esta pendente (pulado por ora).
- O-RADS RM esta pendente (pulado por ora).
