---
name: skill-builder
description: Guia para criação de novas "Agent Skills" com alta qualidade e consistência.
---

# Skill Builder 🛠️

Use esta skill quando precisar criar ou atualizar uma "Skill" no diretório `.agent/skills/`.

## Estrutura de uma Skill
Cada skill deve ser uma pasta contendo, no mínimo, um arquivo `SKILL.md`.

```text
.agent/skills/<skill-name>/
├── SKILL.md       (Obrigatório - Instruções principais)
├── scripts/       (Opcional - Scripts utilitários)
├── examples/      (Opcional - Exemplos de uso)
└── resources/     (Opcional - Assets, templates)
```

## Diretrizes para o SKILL.md
O arquivo deve conter Frontmatter YAML e ser extremamente conciso, porém detalhado o suficiente para guiar o agente em tarefas complexas.

### Exemplo de Template
```markdown
---
name: nome-da-skill
description: Descrição curta e clara de quando usar esta skill.
---
# Título da Skill
## Quando usar
- Cenário A
- Cenário B

## Instruções Passo a Passo
1. Primeiro faça X
2. Depois valide Y

## Melhores Práticas / Convenções
- Use sempre o padrão Z
- Evite o antipadrão W
```

## Dicas de Ouro
- **Foco Único:** Uma skill deve resolver um problema específico.
- **Auto-contida:** Tente não depender de outras skills se possível.
- **Markdown Rico:** Use tabelas, alertas e diagramas se ajudar na clareza.
