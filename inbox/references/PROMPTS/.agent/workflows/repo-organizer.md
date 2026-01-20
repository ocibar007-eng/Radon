---
description: Reorganizar arquivos do repositório PROMPTS com renomeação inteligente e estrutura semântica
---

# 🗂️ Workflow: Reorganização do Repositório PROMPTS

## Objetivo
Reorganizar arquivos espalhados, renomear arquivos com nomes genéricos (como `ai_studio_code (X).txt`) para nomes semânticos e descritivos, e criar uma estrutura de pastas que facilite navegação e manutenção.

---

## Fase 1: Diagnóstico (Leitura Obrigatória)

### Passo 1.1: Listar toda a estrutura atual
```bash
find /Users/lucasdonizetecamargos/PROMPTS -type f -name "*.md" -o -name "*.txt" | head -100
```

### Passo 1.2: Identificar arquivos problemáticos
Procurar por:
- [ ] Arquivos com nomes genéricos (`ai_studio_code`, `untitled`, `novo_arquivo`)
- [ ] Arquivos duplicados ou com sufixos de versão (`_v2`, `_backup`, `_old`)
- [ ] Arquivos na raiz que deveriam estar em subpastas
- [ ] Arquivos `.txt` que deveriam ser `.md`

### Passo 1.3: Gerar inventário
Criar `/Users/lucasdonizetecamargos/PROMPTS/.agent/inventario_reorganizacao.md` com:
- Lista de todos os arquivos
- Status: `manter | renomear | mover | deletar | arquivar`
- Novo nome/local proposto

---

## Fase 2: Convenção de Nomenclatura

### Padrão de Nomes
```
[MODALIDADE]_[REGIAO/ORGAO]_[TIPO_CONTEUDO].md

Exemplos:
- USG_ABDOME_PEDIATRIA_REFERENCIAS.md
- TC_TORAX_PROTOCOLO.md
- RM_PROSTATA_PIRADS.md
- DOPPLER_RENAL_VALORES_NORMAIS.md
```

### Regras de Nomenclatura
1. **CAIXA_ALTA_COM_UNDERSCORES** (snake_case em maiúsculas)
2. **Sem espaços** - usar `_` (underscore)
3. **Sem caracteres especiais** - evitar acentos, parênteses, colchetes
4. **Sem números de versão** - usar git para versionamento
5. **Descritivo do conteúdo** - o nome deve indicar claramente o que contém

### Mapeamento de Nomes Genéricos
Para arquivos tipo `ai_studio_code (X).txt`:
1. Abrir o arquivo e ler as primeiras 50 linhas
2. Identificar o tema principal (órgão, modalidade, tipo de referência)
3. Propor novo nome seguindo a convenção
4. Converter de `.txt` para `.md` se o conteúdo for markdown

---

## Fase 3: Estrutura de Pastas Proposta

```
PROMPTS/
├── .agent/
│   └── workflows/
├── INSTRUCOES/
│   ├── INSTRUCAO_LAUDO_USG.md
│   └── INSTRUCAO_GERAL.md
├── USG/
│   ├── ABDOME/
│   │   ├── USG_ABDOME_TEMPLATE.md
│   │   ├── USG_ABDOME_RUNTIME.md
│   │   └── USG_ABDOME_COMPLETO.md
│   ├── PELVE/
│   └── DOPPLER/
├── TC/
├── RM/
├── REFERENCIAS/
│   ├── BIOMETRIA/
│   │   └── (mover conteúdo de MANUAL_BIOMETRIA aqui)
│   ├── PEDIATRIA/
│   │   └── (mover conteúdo de PEDIATRIA_REFERENCIAS aqui)
│   └── CALCULOS_MEDICOS.md
├── ARCHIVE/
│   └── (versões antigas, backups, etc)
└── README.md
```

---

## Fase 4: Execução da Reorganização

### Passo 4.1: Criar estrutura de pastas
// turbo
```bash
mkdir -p /Users/lucasdonizetecamargos/PROMPTS/{INSTRUCOES,USG/{ABDOME,PELVE,DOPPLER},TC,RM,REFERENCIAS/{BIOMETRIA,PEDIATRIA},ARCHIVE}
```

### Passo 4.2: Renomear arquivos genéricos
Para cada arquivo `ai_studio_code (X).txt`:

1. **Ler conteúdo:**
```bash
head -50 "arquivo.txt"
```

2. **Propor novo nome** baseado no conteúdo

3. **Confirmar com usuário** antes de renomear
   - Mostrar: arquivo atual → novo nome proposto
   - Aguardar aprovação

4. **Executar renomeação:**
```bash
mv "arquivo_antigo.txt" "NOVO_NOME.md"
```

### Passo 4.3: Mover arquivos para pastas corretas
Exemplo:
```bash
mv CALCULOS_MEDICOS.md REFERENCIAS/
mv USG_ABD_TOTAL_COMPLETO.md USG/ABDOME/
```

### Passo 4.4: Arquivar versões antigas
Mover para `ARCHIVE/` com data:
```bash
mv arquivo_PRE_REFACTOR_2026-01-09.md ARCHIVE/
```

---

## Fase 5: Validação

### Checklist Final
- [ ] Todos os arquivos têm nomes semânticos
- [ ] Nenhum arquivo tem espaços no nome
- [ ] Nenhum arquivo tem extensão `.txt` (exceto se necessário)
- [ ] Estrutura de pastas segue o padrão
- [ ] Arquivos antigos estão em ARCHIVE/
- [ ] Links internos atualizados (se houver referências cruzadas)

### Criar README.md na raiz
Gerar um README explicando a estrutura do repositório.

---

## ⚠️ Regras de Segurança

1. **NUNCA deletar** - mover para ARCHIVE/ em vez disso
2. **Confirmar antes de renomear** - mostrar proposta ao usuário
3. **Fazer backup** antes de grandes mudanças
4. **Preservar histórico git** - usar `git mv` quando possível
5. **Atualizar referências** - verificar se outros arquivos apontam para o renomeado

---

## 🔧 Comandos Úteis

```bash
# Encontrar arquivos com espaços no nome
find . -name "* *"

# Encontrar arquivos .txt
find . -name "*.txt"

# Encontrar duplicatas potenciais (mesmo tamanho)
find . -type f -exec ls -la {} \; | awk '{print $5, $NF}' | sort | uniq -d

# Renomear em lote: espaços → underscores
for f in *\ *; do mv "$f" "${f// /_}"; done
```

---

## 📋 Template de Inventário

```markdown
| Arquivo Original | Status | Novo Nome | Nova Pasta | Justificativa |
|-----------------|--------|-----------|------------|---------------|
| ai_studio_code (7).txt | renomear | PEDIATRIA_VALORES_NORMAIS.md | REFERENCIAS/PEDIATRIA/ | Contém tabelas de valores normais pediátricos |
| USG ABD TOTAL.txt | renomear | USG_ABDOME_TOTAL_LEGACY.md | ARCHIVE/ | Versão antiga, substituída por USG_ABD_TOTAL_COMPLETO.md |
```
