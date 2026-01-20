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

---

## 🚫 NÃO DUPLICAR SKILLS

Antes de criar skill nova:
1. Verificar se já existe skill similar em `.agent/skills/`
2. Se existir: **estender** em vez de duplicar
3. Se for relacionada: criar seção na skill existente

```markdown
# RUIM
Criar radon-debugger-advanced quando radon-debugger já existe

# BOM
Adicionar seção "Advanced Debugging" na radon-debugger existente
```

---

## 📤 FORMATO PADRÃO DE OUTPUTS

Toda skill DEVE terminar com seção "Outputs Obrigatórios":

```markdown
## 📤 OUTPUTS OBRIGATÓRIOS

Ao concluir tarefa usando esta skill, entregar:
1. [Item 1]
2. [Item 2]
3. [Como reverter / Rollback]
```

Isso facilita handoff e verificação.

---

## ⚖️ SEÇÃO ANTI-CONTRADIÇÃO

Se uma skill contradizer outra, siga esta hierarquia:

1. **`senior-engineer`** > outras skills (é a skill "governança")
2. **`docs/guides/REFACTORING_SUPER_PROMPT.md`** > qualquer skill de refatoração
3. **Skill específica** > skill genérica

```markdown
# Exemplo de conflito
radon-feature-builder diz: "Criar pasta para tudo"
radon-doc-keeper diz: "Co-localizar se for pequeno"

# Resolução
radon-feature-builder é mais específico para features
→ Segue radon-feature-builder
```

---

## 📋 CHECKLIST DE NOVA SKILL

Antes de criar skill:

- [ ] Não existe skill similar?
- [ ] Tem frontmatter YAML correto?
- [ ] Tem seção "Quando usar"?
- [ ] Tem seção "Outputs Obrigatórios"?
- [ ] Não contradiz outras skills?
- [ ] Segue formato markdown rico?

