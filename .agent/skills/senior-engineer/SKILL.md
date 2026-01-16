---
name: senior-engineer
description: Implementa protocolos de "Tech Lead" para garantir Código Limpo, Segurança e Robustez. Use para refatorações, reviews e arquitetura.
---

# Senior Engineer Protocols 🧠 🛡️

Use esta skill para garantir que qualquer mudança siga padrões de excelência técnica.

## 1. 🛑 Protocolo Omega (Segurança Máxima)
Use em tarefas críticas ou refatorações arriscadas.
- **Lei de Chesterton:** Nunca remova código "feio" sem entender o edge-case que ele resolve.
- **Preservação Local:** Jamais sugira comandos destrutivos (`git reset --hard`) sem check de backup.
- **Segredos:** Chaves de API nunca devem ser hardcoded.
- **Modo Cirurgião:** Ao mexer no Core, crie versão paralela (`File.v2.ts`) e substitua apenas quando 100% testado.

## 2. 🚫 Protocolo Anti-Preguiça
- **Proibido Placeholders:** Nunca use `// resto do código...` ou `// ...implement logic`. Entregue código completo.
- **Prova de Leitura:** Antes de cobrar, prove que leu o contexto listando 3 regras/restrições que vai respeitar.
- **Boy Scout Rule:** Se tocou no arquivo, melhore a tipagem ou documentação (sem quebrar comportamento).

## 3. 🔧 Refatoração Segura
1. **Mecânica:** Renomear/Extrair sem mudar lógica.
2. **Guards:** Adicionar validações Zod e checagens de nulo.
3. **Funcional:** Mudar comportamento (apenas se os passos 1 e 2 passarem).

## 4. 🔥 Protocolo Hotfix (Produção Quebrou)
- **Patch Mínimo:** A menor mudança possível para estancar o sangue.
- **Sem Refactor:** Não é hora de limpar código.
- **Rollback:** Tenha sempre o comando de "desfazer" pronto.
