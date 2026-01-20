# Especificação Técnica: Sistema de Validação de Segurança de Contraste (Safety Gate)

## 1. Visão Geral
Sistema automatizado para validação cruzada de informações sobre o uso de contraste em exames radiológicos. O objetivo principal é garantir a **segurança do paciente** identificando discrepâncias entre o que foi solicitado, autorizado e administrado.

---

## 2. Arquitetura de Dados (Extensão de Schemas)

Para viabilizar o cruzamento, os schemas de extração da IA (`src/adapters/schemas.ts`) precisarão ser enriquecidos com campos booleanos explícitos.

### 2.1 Campos por Tipo de Documento

| Documento | Schema | Novos Campos Necessários |
|-----------|--------|--------------------------|
| **Pedido Médico** | `PedidoMedicoData` | `indica_uso_contraste` (boolean)<br>`justificativa_contraste` (string) |
| **Termo de Consentimento** | `TermoConsentimentoData` | `autoriza_contraste` (boolean)<br>`possui_alergia_relatada` (boolean)<br>`assinatura_presente` (boolean) |
| **Anotação Enfermagem** | `AnotacaoClinicaData` | `contraste_administrado` (boolean)<br>`tipo_contraste` (string)<br>`volume_ml` (number)<br>`via_administracao` (string) |
| **Laudo (Radiologista)** | `ReportMetadata` | `menciona_uso_contraste` (boolean)<br>`tecnica_menciona_contraste` (boolean) |

---

## 3. Motor de Validação (Cross-Check Engine)

Uma função pura ou Hook (`useContrastSafety`) que recebe o conjunto de documentos de um paciente e retorna o status de segurança.

### 3.1 Estados de Validação

| Status | Ícone | Descrição | Ação Recomendada |
|--------|-------|-----------|------------------|
| **✅ Concordante** | Check Verde | Todas as fontes concordam (SIM ou NÃO). | Nenhuma ação. |
| **🚨 Crítico** | Alerta Vermelho | **Termo=NÃO** mas **Enfermagem=SIM**. (Paciente não autorizou ou não assinou, mas recebeu). | **Parar o laudo**. Investigar imediatamente. |
| **🚨 Crítico** | Alerta Vermelho | **Termo=Alergia** mas **Enfermagem=SIM**. (Risco de choque anafilático/reação). | **Prioridade Máxima** na Worklist. |
| **⚠️ Divergente** | Alerta Amarelo | **Pedido=NÃO** mas **Laudo=SIM**. (Radiologista optou pelo contraste sem pedido explícito). | Apenas notificar/registrar. |
| **❓ Incompleto** | Interrogação Cinza | Falta documento chave (ex: Enfermagem presente, mas sem Termo). | Solicitar digitalização faltante. |

### 3.2 Matriz de Decisão (Exemplos)

```typescript
type ContrastStatus = 'SAFE' | 'CRITICAL_RISK' | 'PROCESS_DIVERGENCE' | 'MISSING_DATA';

interface SafetyCheckResult {
  status: ContrastStatus;
  reason: string;
  sources: {
    pedido?: boolean;
    termo?: boolean;
    enfermagem?: boolean;
    laudo?: boolean;
  }
}
```

---

## 4. Interface de Usuário (UX)

### 4.1 Na Worklist (Lista de Pacientes)
Adicionar uma coluna ou badge de "Safety" na linha do paciente.
- **Badge Vermelho Piscante:** Se status for `CRITICAL_RISK`. O médico deve ver isso antes de abrir o exame.
- **Tooltip:** Ao passar o mouse, mostrar resumo: "Termo de Consentimento ausente para exame contrastado".

### 4.2 No Detalhe do Exame (Card Unificado)
Um componente `SecurityBarrier` (Barreira de Segurança) expandido.
- **Header:** "Validação de Segurança: Contraste"
- **Tabela de Evidências:**

| Fonte | Status | Detalhe | Link |
|-------|--------|---------|------|
| Pedido | ✅ Solicitado | "TC de Abdome com Contraste" | [Ver Doc] |
| Termo | ❌ Não Assinado | Documento em branco | [Ver Doc] |
| Enfermagem | ✅ Administrado | 100ml Gadolínio | [Ver Doc] |

### 4.3 Modal de Resolução
Se houver divergência crítica, o sistema pode exigir uma "Justificativa de Quebra de Barreira" para o médico assinar o laudo (Audit Log).

---

## 5. Exportação e Auditoria

### 5.1 Relatório CSV de Discrepâncias
Ferramenta para gestão da qualidade (Quality Assurance).

**Colunas Sugeridas:**
1. `Data_Exame`
2. `OS`
3. `Paciente`
4. `Status_Segurança` (Crítico/Divergente)
5. `Pedido_Contraste` (S/N)
6. `Termo_Autorizado` (S/N)
7. `Enfermagem_Administrado` (S/N)
8. `Laudo_Confirmado` (S/N)
9. `Tipo_Discrepancia` (Ex: "Administrado sem Termo")

---

## 6. Plano de Implementação (Roadmap)

### Fase 1: Prompts e Dados (Backend/IA)
- [ ] Atualizar `prompts.ts` para extrair campos booleanos de contraste.
- [ ] Atualizar `schemas.ts` com os novos campos opcionais.
- [ ] Testar extração com 50 casos de teste (Com/Sem contraste).

### Fase 2: Lógica de Negócio (Frontend Core)
- [ ] Implementar hook `useContrastAnalysis(docs)`.
- [ ] Criar testes unitários para a matriz de decisão (garantir que pega os casos críticos).

### Fase 3: Visualização (UI)
- [ ] Adicionar Badge na `PatientList`.
- [ ] Criar componente `ContrastSafetyCard` para a aba de "Resumo Clínico" ou "Laudo".

### Fase 4: Gestão (Export)
- [ ] Implementar gerador de CSV baseado nos dados filtrados da Worklist.
