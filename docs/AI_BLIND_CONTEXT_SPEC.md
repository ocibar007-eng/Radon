# 📄 ESPECIFICAÇÃO TÉCNICA SELF-CONTAINED: PROJETO RADON AI

Este documento contém toda a lógica, estruturas e regras do projeto Radon AI para ser fornecido a uma IA que **não possui acesso aos arquivos locais**. Ele é o "manual de instruções" para que outra IA possa codar ou debugar o projeto como se estivesse vendo o código.

---

## 1. O QUE É O PROJETO RADON?
Um assistente médico para radiologistas que transforma dados brutos (PDFs, Imagens) em laudos estruturados. O sistema segue diretrizes internacionais (como Fleischner Society) e tem **tolerância zero** a alucinações de números (tamanhos de nódulos, meses de seguimento).

---

## 2. ESTRUTURA DE DADOS (O "CONTRATO")
O sistema gira em torno de um objeto principal chamado `ReportJSON`. Toda a lógica deve respeitar esta interface (TypeScript).

### A. Objeto ReportJSON (Resumo)
```typescript
{
  case_id: string,
  modality: "CT" | "MR" | "US",
  indication: {
    clinical_history: string,
    patient_sex: "M" | "F",
    patient_age_group: string // ex: "58 anos"
  },
  comparison: { // Se houver exame anterior
    available: boolean,
    summary: string
  },
  findings: [ // Achados do médico
    {
      finding_id: string,
      organ: string,
      description: string,
      size_mm?: number,
      morphology?: string
    }
  ],
  // TRILHA 1: Somente o que vai no laudo oficial (Validado pelo Guard)
  evidence_recommendations: [
    {
      finding_type: string,
      text: string,          // Texto exato da biblioteca
      conditional: boolean,  // True se faltar dado de risco
      guideline_id: string   // ex: "FLEISCHNER_2017"
    }
  ],
  // TRILHA 2: Suporte médico (NÃO vai no laudo)
  consult_assist: [
    {
      title: string,
      summary: string,
      sources: [{ url: string, organization: string }]
    }
  ],
  impression: {
    primary_diagnosis: string,
    recommendations: string[] // Texto final para o paciente
  }
}
```

---

## 3. ORQUESTRAÇÃO DO PIPELINE (A LOGICA)
O arquivo `orchestrator.ts` segue esta sequência exata:
1.  **Clinical/Technical Agent:** Extrai dados do paciente e técnica do exame.
2.  **Findings Agent:** Mapeia a anatomia e identifica achados matemáticos (ex: extrai `8mm` de uma descrição textual).
3.  **Recommendations Agent (O Cérebro):**
    - **Passo 1:** Detecta o tipo de achado via Regex (ex: "nódulo" -> `pulmonary_nodule`).
    - **Passo 2:** Consulta o banco SQLite local (`recommendations.db`).
    - **Passo 3 (Segurança):** Verifica se o tamanho do achado bate com a recomendação (ex: Se achado = 8mm, e recomendação é para `<= 4mm`, ele ignora e busca a próxima).
    - **Passo 4 (Missing Inputs):** Se o banco pede "Status de Fumante" e o laudo não tem, ele gera um texto condicional: *"Conforme Fleischner, a conduta depende do perfil de risco..."*.
4.  **Guard Layer (Cinto de Segurança):** Antes de fechar o laudo, o Guard compara o texto gerado pela IA com o dado bruto do banco. Se a IA inventar ou alterar um número (hallucination), o Guard detecta e reseta o texto para um fallback genérico seguro.
5.  **Impression Agent:** Escreve a conclusão baseada em tudo acima.

---

## 4. O SISTEMA DE 3 TRILHAS
Para gerenciar risco, separamos o output em 3 campos:
1.  **Trilha 1 (Oficial):** Dados extraídos da nossa biblioteca interna testada por médicos. Vai para o laudo impresso.
2.  **Trilha 2 (Consulta):** Busca em tempo real na Web via `WebEvidenceAgent` (PubMed, ACR, Radiopaedia). Serve para o médico estudar o caso, mas não é assinado no laudo oficial por segurança.
3.  **Trilha 3 (Curadoria):** Termos que a IA encontrou mas não estão na nossa biblioteca. Salvos para os desenvolvedores atualizarem o banco no futuro.

---

## 5. REGRAS DE OURO PARA CODAR (GUIA PARA A IA)
- **Regex de Detecção:** Use buscas gulosas para órgãos e termos médicos (ex: `/nódulo\s+pulmonar/i`).
- **Validação Numérica:** Compare sempre `size_mm` contra padrões embutidos no texto (`<= Xmm`, `X-Ymm`).
- **Graceful Degradation:** Se o banco de dados falhar ou não houver recomendação, use o fallback: *"Considerar correlação clínica e seguimento conforme diretrizes institucionais."* Nunca tente inventar uma recomendação se não tiver certeza da fonte.
- **Tipagem:** Nunca use `any`. Siga a interface `ReportJSON`.

---

## 6. COMANDOS DE TESTE (CONTEXTO DE EXECUÇÃO)
- Para validar a lógica de recomendações: `npx tsx tests/e2e-three-tracks-validation.ts`
- Para testar a API do banco SQLite: `npx tsx services/recommendations/query_api.ts`

**Este documento contém o DNA técnico do Radon. Use-o para manter a consistência entre sessões.**
