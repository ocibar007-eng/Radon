# MANUAL BIOMETRIA — USG + DICOM (Cap 04–11)

Arquivo consolidado para reduzir número de arquivos (ex.: upload/integração em projeto).

Inclui:
- `CAP04_DICOM_METADADOS.md`
- `CAP05_USG_PROTOCOLO.md`
- `CAP06_USG_FIGADO.md`
- `CAP07_USG_BACO.md`
- `CAP08_USG_RINS.md`
- `CAP09_USG_BEXIGA.md`
- `CAP10_USG_PROSTATA.md`
- `CAP11_USG_PELVE_FEMININA.md`

---

# CAPÍTULO 4 — DICOM E METADADOS CRÍTICOS PARA MEDIDAS (USG/TC/RM)

## 4.1 Objetivo do capítulo

Este capítulo responde a perguntas práticas:

- Quais **tags DICOM** precisam ser guardadas junto da medida?
- Como **PixelSpacing/SliceThickness** afetam conversões pixel→mm?
- Por que medidas na **workstation ≠ export PDF**?
- Como **kernel/preset/sequência** mudam o número final?
- Como **auditar** se a medida está consistente com os metadados?

**Escopo**: USG, TC e RM (Doppler tem particularidades, ver Cap 12).

---

## 4.2 O que precisa ser guardado junto da medida (campos mínimos)

### Regra de Ouro:
> Uma medida **SEM metadados** é um número **sem rastreabilidade**.

### Tabela 4.1 — Metadados Mínimos por Modalidade

| Modalidade | Metadados Obrigatórios | Onde Encontrar (DICOM Tag) |
|------------|------------------------|----------------------------|
| **USG** | Preset, Profundidade, Foco, Frequência | (Vendor-specific, muitas vezes no Image Comments) |
| **TC** | kVp, mAs, Kernel, SliceThickness, PixelSpacing | (0018,0050), (0018,0088), (0028,0030) |
| **RM** | TE, TR, FA, Sequência, Voxel size | (0018,0080), (0018,0081), (0018,1314), (0028,0030) |

### 4.2.1 Consequência de não documentar

**Exemplo real**:
- Medida A: lesão hepática 12 mm (kernel soft)
- Medida B: mesma lesão 14 mm (kernel sharp)
- **Sem documentar kernel**: parece que cresceu 2 mm
- **Com documentação**: variação explicada por técnica

---

## 4.3 Tags DICOM essenciais (TC e RM)

### 4.3.1 Tabela 4.2 — Tags DICOM Críticas para Biometria

| Tag | Nome | Valor Exemplo | Impacto em Medidas |
|-----|------|---------------|-------------------|
| **(0028,0030)** | Pixel Spacing | [0.78, 0.78] | Conversão pixel→mm |
| **(0018,0050)** | Slice Thickness | 5.0 | Volume 3D, parcial volume |
| **(0018,0088)** | Spacing Between Slices | 2.5 | Cálculo volumétrico |
| **(0018,1100)** | Reconstruction Diameter | 350 | FOV, resolução efetiva |
| **(0028,0010)** | Rows | 512 | Matriz |
| **(0028,0011)** | Columns | 512 | Matriz |
| **(0018,1210)** | Convolution Kernel | STANDARD vs B70f | Bordas, HU |
| **(0018,0080)** | Repetition Time (TR) | 3000 | Sequência RM |
| **(0018,0081)** | Echo Time (TE) | 80 | Contraste RM |
| **(0018,0015)** | Body Part Examined | ABDOMEN | Validação |
| **(0008,0060)** | Modality | CT, MR, US | Modalidade |

---

### 4.3.2 Como acessar tags DICOM

**No PACS** (exemplo):
1. Abrir imagem
2. Menu → DICOM Header → Buscar tag
3. Copiar valores relevantes

**Via script** (Python/pydicom):
```python
import pydicom

ds = pydicom.dcmread("imagem.dcm")

# Pixel Spacing
pixel_spacing = ds.PixelSpacing  # [row_spacing, col_spacing]
print(f"Pixel Spacing: {pixel_spacing[0]} mm × {pixel_spacing[1]} mm")

# Slice Thickness
slice_thickness = ds.SliceThickness
print(f"Slice Thickness: {slice_thickness} mm")

# Kernel (TC)
if hasattr(ds, 'ConvolutionKernel'):
    kernel = ds.ConvolutionKernel
    print(f"Kernel: {kernel}")
```

---

## 4.4 TC: Kernels/filtros e impacto em bordas

### 4.4.1 O que é kernel de reconstrução?

**Kernel** = filtro matemático aplicado à reconstrução.

| Tipo | Aplicação | Características | Impacto em Medida |
|------|-----------|-----------------|-------------------|
| **Standard/Soft** | Parênquima | Suaviza ruído, bordas suaves | Melhor para HU, pode subestimar diâmetro |
| **Bone/Sharp (B70f)** | Pulmão, osso | Realça bordas, mais ruído | Bordas acentuadas, pode superestimar diâmetro |
| **Lung** | Pulmão específico | Intermediário | Equilíbrio |

### Exemplo Resolvido 4.1 — Impacto do kernel em diâmetro

**Cenário**: Nódulo hepático medido em 2 reconstruções

**Medida com kernel STANDARD**:
- Diâmetro: 11,2 mm
- Bordas suaves, fácil de medir

**Medida com kernel B70f (sharp)**:
- Diâmetro: 12,1 mm
- Bordas acentuadas, aparenta maior

**Diferença**: 0,9 mm (~8%)

**Conclusão**: 
> Para medidas de parênquima, **sempre usar kernel standard/soft** e **documentar** qual foi usado.

---

### 4.4.2 Regra operacional do manual

**Para biometria de abdome/pelve**:
- ✅ **Usar**: Kernel standard (ex.: B30f, FC13, Standard)
- ❌ **Evitar**: Kernels sharp (B70f, bone, lung) para medidas de parênquima
- 📝 **Documentar**: Sempre registrar qual kernel foi usado

---

## 4.5 RM: Distorção geométrica, EPI (DWI) e impacto em medidas

### 4.5.1 Tipos de distorção em RM

| Tipo | Causa | Sequências Afetadas | Impacto |
|------|-------|---------------------|---------|
| **Suscetibilidade magnética** | Interfaces ar/osso | EPI (DWI), GRE | Distorção geométrica |
| **Chemical shift** | Diferença de precessão água/gordura | Fora de fase | Bordas borradas |
| **Eddy currents** | Gradientes rápidos | DWI | Estiramento/compressão |
| **Movimento** | Respiração, peristalse | T2, DWI | Borramento |

### 4.5.2 Regra do manual para medidas em RM

**Sequências confiáveis para medida**:
- ✅ T2 FSE (alta resolução)
- ✅ T1 pré/pós-contraste (3D)
- ⚠️ DWI: **qualitativo apenas** (não medir diâmetros)
- ⚠️ STIR/FAT-SAT: cuidado com bordas

**Quando DWI tem distorção visível**:
> Relatar restrição à difusão de forma **qualitativa**, sem valores numéricos de diâmetro em áreas distorcidas.

---

### Exemplo Resolvido 4.2 — Lesão renal em T2 vs DWI

**Lesão em T2 FSE**:
- Diâmetro: 24 mm
- Bordas nítidas, sem distorção

**Mesma lesão em DWI**:
- Diâmetro aparente: 28 mm (distorção por EPI)
- Artefato de suscetibilidade evidente

**Decisão**:
- Usar medida do **T2 FSE**: 24 mm
- Laudo: "Restrição à difusão presente (análise qualitativa)"

---

## 4.6 USG: Presets, profundidade, foco e efeito no caliper

### 4.6.1 Parâmetros USG que afetam medidas

| Parâmetro | Efeito em Medida | Como Padronizar |
|-----------|------------------|-----------------|
| **Profundidade** | Estrutura fora do campo = erro | Ajustar para incluir toda estrutura |
| **Foco** | Fora do foco = borda borrada | Posicionar foco na estrutura alvo |
| **Ganho** | Alto = "engorda" estrutura | Ajustar para borda nítida |
| **Harmônica** | Melhora borda, pode mudar tamanho | Documentar se usou |
| **Compressão** | Muda dimensões (ex.: vasos, órgãos) | Pressão mínima necessária |
| **Frequência** | Alta freq = melhor resolução | Usar maior freq que permite profundidade |

### Checklist 4.1 — USG: Parâmetros técnicos antes de medir

- [ ] Profundidade ajustada (estrutura inteira visível)
- [ ] Foco posicionado na estrutura alvo
- [ ] Ganho ajustado (borda nítida, sem saturação)
- [ ] Compressão mínima (quando aplicável)
- [ ] Frequência documentada (ex.: 3-5 MHz convexo)
- [ ] Harmônica documentada (se usada)

---

## 4.7 Export/print vs valor "medido no PACS": evitar inconsistência

### 4.7.1 O problema

**Cenário comum**:
1. Médico mede no PACS: 11,4 mm
2. Exporta para PDF/print: aparece 11 mm (arredondado automaticamente)
3. Laudo cita: "11 mm" (do print)
4. Follow-up compara com medida original (11,4 mm)
5. **Confusão**: cresceu ou não?

### 4.7.2 Solução

**Regra do manual**:
> Sempre registrar o valor **medido no PACS** (com precisão original), não o do export/print.

**Fluxo correto**:
1. Medir no PACS: 11,4 mm
2. Anotar: 11,4 mm (1 decimal)
3. Aplicar arredondamento conforme manual: 11,4 mm → 11 mm (se padrão for inteiro) OU manter 11,4 mm (se padrão for 1 decimal)
4. Laudo: usar valor padronizado (11 mm ou 11,4 mm)

---

## 4.8 Checklist DICOM mínimo para auditoria de medidas

### Checklist 4.2 — Auditoria DICOM (TC/RM)

Para cada medida auditada, verificar:

**Geometria**:
- [ ] PixelSpacing está correto (não 1.0, 1.0)
- [ ] SliceThickness compatível com protocolo
- [ ] SpacingBetweenSlices documentado (se volumétrico)

**Técnica TC**:
- [ ] Kernel documentado
- [ ] Fase de contraste documentada (sem/arterial/portal/tardio)
- [ ] kVp/mAs estão consistentes com protocolo

**Técnica RM**:
- [ ] Sequência identificada (T1/T2/DWI/etc.)
- [ ] TE/TR documentados
- [ ] Voxel size adequado para a medida (in-plane ≤ 1 mm ideal)

**Validação Cruzada**:
- [ ] Modalidade no header = modalidade esperada
- [ ] Body Part = ABDOMEN (ou pelve)
- [ ] Data/hora compatíveis com o exame

---

## 4.9 Como registrar versão do software (PACS/console) no QA

### Por que registrar versão de software?

**Motivo**: Atualizações de software podem mudar:
- Algoritmos de medição
- Conversões DICOM
- Cálculos automáticos (volume, HU médio, etc.)

### Tabela 4.3 — Tags de Software DICOM

| Tag | Nome | Exemplo | Uso |
|-----|------|---------|-----|
| **(0018,1020)** | Software Versions | "Syngo CT 2023A" | Versão do console |
| **(0018,1000)** | Device Serial Number | "12345" | Identificar equipamento |
| **(0008,0070)** | Manufacturer | "SIEMENS" | Fabricante |
| **(0008,1090)** | Manufacturer Model Name | "SOMATOM Force" | Modelo |

### Checklist 4.3 — QA de software (trimestral)

- [ ] Registrar versão atual do software (console + PACS)
- [ ] Após atualização, medir phantom de referência
- [ ] Comparar medidas pré/pós-atualização
- [ ] Documentar mudanças (se houver)
- [ ] Atualizar registro mestre

---

## 4.10 Exemplo completo: Extração DICOM + Cálculo + Laudo

### Exemplo Resolvido 4.3 — Volume de lesão hepática (TC)

**Passo 1: Verificar DICOM**

```
Modalidade: CT
Body Part: ABDOMEN
Fase: Portal (70s)
Kernel: B30f (standard)
kVp: 120
PixelSpacing: [0.68, 0.68] mm
SliceThickness: 3.0 mm
SpacingBetweenSlices: 3.0 mm (sem overlap)
Rows × Columns: 512 × 512
```

**Passo 2: Segmentação manual**

- Número de voxels marcados: 450 voxels
- Método: ROI em cada fatia, soma dos voxels

**Passo 3: Cálculo de volume**

```
Volume_voxel = PSx × PSy × SliceThickness
Volume_voxel = 0,68 × 0,68 × 3,0
Volume_voxel = 1,39 mm³

Volume_total = N_voxels × Volume_voxel
Volume_total = 450 × 1,39
Volume_total = 625,5 mm³
```

**Conversão para cm³/mL**:
```
625,5 mm³ ÷ 1000 = 0,626 mL ≈ 0,6 mL
```

**Passo 4: Registro**

| Campo | Valor |
|-------|-------|
| Medida | Volume lesão hepática |
| Valor | 0,6 mL (625,5 mm³) |
| Método | Segmentação manual (voxel-count) |
| Fase | Portal (70s) |
| Kernel | B30f (standard) |
| Voxel size | 0,68 × 0,68 × 3,0 mm |
| Software | Syngo CT 2023A |

**Passo 5: Laudo**

> "Imagem nodular hepática no segmento VI, medindo 0,6 mL 
> (segmentação volumétrica em fase portal, kernel standard)."

---

## 4.11 Armadilhas comuns e como evitar

### Tabela 4.4 — Armadilhas DICOM/Metadados

| Armadilha | Consequência | Como Evitar |
|-----------|--------------|-------------|
| Usar medida em mm, PACS em cm | Erro de 10× | Sempre verificar unidade no header |
| Não documentar kernel | Variabilidade inexplicável | Checklist obrigatório |
| Confundir SliceThickness e Spacing | Erro volumétrico 50%+ | Ver Exemplo 3.2 (Cap 3) |
| Medir em sequência distorcida (DWI) | Diâmetro errado | Usar T2/T1 para medidas |
| Ignorar ajustes de janela/nível | HU incorreto | Usar ROI (ignora janela visual) |
| Não registrar versão software | Perda de rastreabilidade | QA trimestral |

---

## 4.12 Integração com a Tabela-Mestra

### Template de Registro Estendido (com DICOM)

| Campo | Exemplo |
|-------|---------|
| ID_MEDIDA | TC_FIGADO_VOL_LESAO_v1.0 |
| Modalidade | TC |
| Estrutura | Lesão hepática |
| Definição | Volume por voxel-count |
| Como_medir | Segmentação manual, ROI em cada fatia |
| **DICOM_Tags** | PixelSpacing, SliceThickness, Kernel |
| **Fase** | Portal (70s) |
| **Kernel** | B30f (standard) |
| Valores | N/A (depende da lesão) |
| Interpretação | Acompanhamento evolutivo |
| Fonte | ACR_LIRADS_2024 (método) |

---

## 4.13 Exemplo resolvidode auditoria DICOM

### Exemplo Resolvido 4.4 — Auditoria de medida renal (RM)

**Contexto**: Revisar medida de rim em RM

**Passo 1: Localizar série**
- Exam ID: 67890
- Série: 5 (T2 CORONAL)
- Imagem: #12

**Passo 2: Verificar DICOM**

| Tag | Valor | Status |
|-----|-------|--------|
| Modality | MR | ✅ |
| Body Part | ABDOMEN | ✅ |
| Series Description | T2_TSE_COR | ✅ |
| PixelSpacing | [0.75, 0.75] | ✅ |
| SliceThickness | 4.0 mm | ⚠️ (grosso) |
| TE | 90 ms | ✅ (T2) |
| TR | 4500 ms | ✅ |

**Passo 3: Avaliar qualidade**

- Resolução in-plane: 0,75 mm (bom)
- Slice thickness: 4 mm (aceitável, mas não ideal)
- Distorção: Nenhuma visível (não é EPI)

**Passo 4: Verificar medida**

- Medida PACS: 112 mm
- Conversão automática: 11,2 cm
- Padrão do manual: 1 decimal em cm → **11,2 cm** ✅

**Passo 5: Validar com referência**

- Referência: 9-12 cm [ACR-PPTS-RENAL-DUPLEX-2023]
- 11,2 cm → dentro da normalidade ✅

**Resultado da auditoria**:
- ✅ DICOM consistente
- ✅ Medida correta
- ⚠️ Nota: SliceThickness 4 mm (protocolo ideal ≤ 3 mm)
- **Ação**: Documentar na nota de limitação se relevante

---

## 4.14 Tabelas de referência rápida

### Tabela 4.5 — Valores Típicos de PixelSpacing

| Equipamento/Protocolo | PixelSpacing Típico | Aplicação |
|-----------------------|---------------------|-----------|
| TC abdome standard | 0,6-0,8 mm | Rotina |
| TC alta resolução | 0,3-0,5 mm | Pequenas lesões |
| RM abdome T2 | 0,7-1,0 mm | Rotina |
| RM próstata T2 | 0,3-0,5 mm | PI-RADS |
| USG (teórico) | Variável (não DICOM padrão) | — |

### Tabela 4.6 — Valores Típicos de SliceThickness

| Região/Protocolo | SliceThickness Ideal | Máximo Aceitável |
|------------------|----------------------|------------------|
| TC abdome rotina | 3-5 mm | 5 mm |
| TC lesões pequenas | 1-3 mm | 3 mm |
| RM abdome T2 | 3-5 mm | 6 mm |
| RM próstata T2 | 3 mm | 3 mm |
| RM difusão | 4-5 mm | 6 mm |

---

## 4.15 Glossário DICOM (termos essenciais)

| Termo | Definição |
|-------|-----------|
| **Tag DICOM** | Identificador único de metadado (ex.: 0028,0030) |
| **PixelSpacing** | Tamanho do pixel no plano (mm) |
| **SliceThickness** | Espessura do corte (mm) |
| **SpacingBetweenSlices** | Distância entre centros de fatias (mm) |
| **Kernel** | Filtro de reconstrução (TC) |
| **FOV** | Field of View (campo de visão) |
| **Matrix** | Número de pixels (ex.: 512×512) |
| **Voxel** | Volume element (pixel 3D) |
| **EPI** | Echo Planar Imaging (rápido, mas com distorção) |
| **FSE/TSE** | Fast/Turbo Spin Echo (T2 de alta qualidade) |

---

## Referências bibliográficas do capítulo

1. **DICOM Standard** (2023). National Electrical Manufacturers Association (NEMA). Disponível em: dicom.nema.org
2. **ACR–AAPM–SIIM Technical Standard for Electronic Practice of Medical Imaging** (Revised 2023).
3. **Quantitative Imaging Biomarkers Alliance (QIBA)**. Profile for CT Volumetry. RSNA, 2023.
4. **ESR Statement on the Validation of Imaging Biomarkers**. Insights into Imaging, 2020.
5. **pydicom Documentation**. pydicom.github.io

---

**FIM DO CAPÍTULO 4**

*Próximo: Capítulo 5 — USG: Protocolo de Aquisição para Biometria*

---

## ANEXO 4A — Script Python para Extrair Tags Críticas

```python
"""
Script para extrair tags DICOM críticas para biometria
Uso: python extract_dicom_tags.py arquivo.dcm
"""

import pydicom
import sys

def extract_critical_tags(dicom_file):
    """Extrai tags críticas para biometria"""
    
    ds = pydicom.dcmread(dicom_file)
    
    print("=" * 60)
    print("TAGS DICOM CRÍTICAS PARA BIOMETRIA")
    print("=" * 60)
    
    # Identificação
    print("\n[IDENTIFICAÇÃO]")
    print(f"Modality: {ds.get('Modality', 'N/A')}")
    print(f"Body Part: {ds.get('BodyPartExamined', 'N/A')}")
    print(f"Study Date: {ds.get('StudyDate', 'N/A')}")
    
    # Geometria
    print("\n[GEOMETRIA]")
    if hasattr(ds, 'PixelSpacing'):
        ps = ds.PixelSpacing
        print(f"Pixel Spacing: {ps[0]} mm × {ps[1]} mm")
    else:
        print("Pixel Spacing: N/A")
    
    print(f"Slice Thickness: {ds.get('SliceThickness', 'N/A')} mm")
    print(f"Spacing Between Slices: {ds.get('SpacingBetweenSlices', 'N/A')} mm")
    print(f"Matrix: {ds.get('Rows', 'N/A')} × {ds.get('Columns', 'N/A')}")
    
    # TC específico
    if ds.Modality == 'CT':
        print("\n[TC ESPECÍFICO]")
        print(f"kVp: {ds.get('KVP', 'N/A')}")
        print(f"Kernel: {ds.get('ConvolutionKernel', 'N/A')}")
        
    # RM específico
    if ds.Modality == 'MR':
        print("\n[RM ESPECÍFICO]")
        print(f"TE: {ds.get('EchoTime', 'N/A')} ms")
        print(f"TR: {ds.get('RepetitionTime', 'N/A')} ms")
        print(f"Sequência: {ds.get('SequenceName', 'N/A')}")
    
    # Software
    print("\n[SOFTWARE]")
    print(f"Manufacturer: {ds.get('Manufacturer', 'N/A')}")
    print(f"Model: {ds.get('ManufacturerModelName', 'N/A')}")
    print(f"Software: {ds.get('SoftwareVersions', 'N/A')}")
    
    print("=" * 60)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python extract_dicom_tags.py arquivo.dcm")
        sys.exit(1)
    
    extract_critical_tags(sys.argv[1])
```

**Uso**:
```bash
python extract_dicom_tags.py imagem_abdome.dcm
```

---

## ANEXO 4B — Checklist de Implementação

### Implementar auditoria DICOM no serviço (4 semanas)

**Semana 1: Preparação**
- [ ] Identificar quais medidas serão auditadas
- [ ] Definir tags DICOM críticas por modalidade
- [ ] Criar template de registro (Excel/database)
- [ ] Treinar equipe em acesso a headers DICOM

**Semana 2: Piloto**
- [ ] Selecionar 10 casos por modalidade
- [ ] Extrair tags manualmente
- [ ] Documentar inconsistências encontradas
- [ ] Ajustar template conforme necessário

**Semana 3: Automação**
- [ ] Implementar script Python (ou equivalente)
- [ ] Testar extração automática em 50 casos
- [ ] Validar contra extração manual
- [ ] Corrigir erros de parsing

**Semana 4: Rotina**
- [ ] Integrar em workflow de QA
- [ ] Definir frequência de auditoria (mensal/trimestral)
- [ ] Criar dashboard de monitoramento
- [ ] Documentar procedimento operacional padrão

---

# CAPÍTULO 5 — USG: PROTOCOLO DE AQUISIÇÃO PARA BIOMETRIA (ABDOME E PELVE)

## 5.1 Objetivo do capítulo

Este capítulo define:

- **Protocolo mínimo** para aquisição de imagens voltadas para biometria
- **Parâmetros técnicos** padronizados por estrutura
- **Preparo do paciente** e suas implicações
- **Checklist de qualidade** para garantir reprodutibilidade

---

## 5.2 Preparo do paciente (impacto em medidas)

### Tabela 5.1 — Preparo por Estrutura Alvo

| Estrutura | Preparo Ideal | Tempo Jejum | Hidratação | Impacto se Não Fazer |
|-----------|---------------|-------------|------------|----------------------|
| **Fígado/vesícula** | Jejum 6-8h | 6-8h | Normal | Vesícula colapsada, vias biliares não distendidas |
| **Pâncreas** | Jejum 6-8h | 6-8h | Normal | Gases intestinais ++, má visualização |
| **Baço** | Não obrigatório | — | Normal | Mínimo |
| **Rins** | Não obrigatório | — | Boa | Melhora diferenciação córtico-medular |
| **Bexiga** | Repleção vesical | — | 500-1000 mL 1h antes | Bexiga vazia = sem janela acústica |
| **Próstata (suprapúbica)** | Bexiga repleta | — | 500-1000 mL | Próstata não visualizada |
| **Útero/ovários** | Bexiga repleta | — | 500-1000 mL | Útero retrovertido dificulta, ovários não vistos |
| **Aorta** | Jejum 6-8h (ideal) | 6-8h | Normal | Gases podem limitar |

### 5.2.1 Jejum: Por que importa?

**Vantagens do jejum**:
- ✅ Vesícula distendida (permite medir parede)
- ✅ Menos gases intestinais (janela para pâncreas/aorta)
- ✅ Vias biliares mais fáceis de avaliar

**Desvantagens de não fazer jejum**:
- ❌ Vesícula contraída (parede falsamente espessada)
- ❌ Gases excessivos (limita pâncreas, retroperitônio)
- ❌ Peristalse aumentada (artefatos de movimento)

### 5.2.2 Hidratação vesical: Protocolos práticos

**Protocolo padrão**:
1. Paciente urina completamente
2. Bebe 500-1000 mL de água
3. Aguarda 45-60 minutos
4. Exame realizado com bexiga repleta
5. Se urgência miccional intensa, permitir urinar parcialmente

**Nota de Limitação** (quando aplicável):
> "Avaliação vesical/pélvica limitada por repleção vesical subótima."

---

## 5.3 Posicionamento do paciente

### Tabela 5.2 — Posicionamento Padrão por Estrutura

| Estrutura | Posição Principal | Posições Complementares | Motivo |
|-----------|-------------------|-------------------------|--------|
| **Fígado** | Decúbito dorsal | Decúbito lateral esquerdo | Afastar gases, aproximar fígado |
| **Vesícula** | Decúbito dorsal | Decúbito lateral esquerdo, semi-sentado | Mobilizar cálculos, afastar gases |
| **Pâncreas** | Decúbito dorsal | Semi-sentado | Janela entre estômago/duodeno |
| **Baço** | Decúbito lateral direito | Decúbito dorsal | Afast gases, usar janela intercostal |
| **Rins** | Decúbito lateral | Decúbito dorsal, prono | Máxima distância pólo-pólo |
| **Bexiga** | Decúbito dorsal | Leve Trendelenburg | Repleção uniforme |
| **Próstata** | Decúbito dorsal | — | Via suprapúbica |
| **Útero/ovários** | Decúbito dorsal | Trendelenburg | Deslocar alças intestinais |
| **Aorta** |  Decúbito dorsal | — | Acesso direto |

---

## 5.4 Transdutores: Seleção por estrutura

### Tabela 5.3 — Transdutores Padrão em Adultos

| Estrutura | Transdutor | Frequência | Motivo |
|-----------|------------|------------|--------|
| **Abdome geral** | Convexo | 3-5 MHz | Penetração profunda |
| **Fígado/baço superficiais** | Convexo | 3-5 MHz | Padrão |
| **Vesícula/vias biliares** | Convexo | 3-5 MHz | Padrão |
| **Pâncreas** | Convexo | 3-5 MHz | Profundidade variável |
| **Rins** | Convexo | 3-5 MHz | Padrão |
| **Bexiga/próstata (supra)** | Convexo | 3-5 MHz | Penetração |
| **Apêndice/parede abdominal** | Linear | 7-12 MHz | Alta resolução, estruturas superficiais |
| **Tireoide (fora escopo)** | Linear | 7-12 MHz | Referência |

### 5.4.1 Quando usar transdutor linear em abdome?

**Indicações**:
- Parede abdominal (hérnia, massa subcutânea)
- Apêndice cecal (quando visível)
- Vesícula biliar (detalhe de parede/pólipos)
- Vasos superficiais (femoral, ilíaca externa acessível)

**Limitação**: Profundidade máxima ~6-8 cm.

---

## 5.5 Parâmetros técnicos padronizados

### 5.5.1 Ganho (Gain)

**Regra operacional**:
- Ajustar para borda nítida da estrutura alvo
- Parênquima hepático: ligeiramente hipoecoico ao córtex renal
- Evitar saturação (tudo branco) ou supressão excessiva (tudo preto)

**Checklist de ganho**:
- [ ] Borda da estrutura nítida (não "engordada")
- [ ] Contraste preservado entre tecidos
- [ ] Sem saturação em áreas hiperecóicas
- [ ] Sem supressão em áreas anecoicas

---

### 5.5.2 Foco (Focal Zone)

**Regra operacional**:
- Posicionar foco **na profundidade da estrutura alvo**
- Usar múltiplos focos se estrutura grande (diminui frame rate)

**Impacto em medida**:
- Foco errado = bordas borradas = medida imprecisa

---

### 5.5.3 Profundidade (Depth)

**Regra operacional**:
- Incluir toda a estrutura + margem pequena
- Evitar "cortar" pólos/extremidades

**Consequência de profundidade excessiva**:
- Resolução reduzida (pixels maiores no alvo)
- Estrutura pequena na tela

---

### 5.5.4 Frequência

**Regra geral**:
> Usar a **maior frequência** que permite **visualizar a profundidade necessária**.

| Profundidade | Frequência Ideal |
|--------------|------------------|
| < 4 cm | 7-12 MHz (linear) |
| 4-10 cm | 5-7 MHz (convexo) |
| > 10 cm | 3-5 MHz (convexo) |

---

### 5.5.5 Harmônica (Tissue Harmonic Imaging)

**Vantagens**:
- ✅ Melhora borda/contraste
- ✅ Reduz artefatos de reverberação
- ✅ Melhora visualização em obesos

**Desvantagens**:
- ❌ Pode alterar textura/ecogenicidade
- ❌ Reduz penetração profunda

**Regra do manual**:
> Usar harmônica como padrão, documentar se **não** usar (ex.: em muito obesos com penetração limitada).

---

## 5.6 Planos de imagem padronizados

### Tabela 5.4 — Planos Anatômicos Padrão

| Órgão | Plano Principal | Plano Complementar | Medida Padrão |
|-------|-----------------|-------------------|---------------|
| **Fígado** | Intercostal oblíquo | Subcostal transversal | Eixo longitudinal LMC |
| **Vesícula** | Oblíquo subcostal | Intercostal | Comprimento, espessura parede |
| **Pâncreas** | Transversal epigástrico | Longitudinal | Cabeça AP, corpo AP |
| **Baço** | Coronal oblíquo | Intercostal | Eixo longitudinal |
| **Rim** | Sagital oblíquo | Transversal | Eixo longitudinal pólo-pólo |
| **Bexiga** | Transversal + Sagital | — | 3 eixos (volume) |
| **Próstata** | Transversal + Sagital | — | 3 eixos (volume) |
| **Útero** | Sagital + Transversal | — | 3 eixos, endométrio |
| **Aorta** | Longitudinal + Transversal | — | Diâmetro AP/Transverso |

---

## 5.7 Documentação mínima (imagens obrigatórias)

### Tabela 5.5 — Imagens Mínimas por Exame

| Exame | Imagens Mínimas | Anotações |
|-------|-----------------|-----------|
| **Abdome Total** | Fígado (2 planos), Vesícula (2), Pâncreas, Baço, Rins (2×2), Bexiga, Aorta | ~15-20 imagens |
| **Abdome Superior** | Fígado (2), Vesícula (2), Pâncreas, Baço, Rins (2×2) | ~12 imagens |
| **Rins e Vias Urinárias** | Rins (2×2), Bexiga (2), [RPM se indicado] | ~6-8 imagens |
| **Próstata (supra)** | Bexiga repleta, Próstata (2 planos), RPM | ~4-5 imagens |
| **Pelve Feminina** | Útero (2), Ovários (2×2), Bexiga | ~6-8 imagens |
| **Aorta Abdominal** | Longitudinal, Transversal (proximal, médio, distal) | ~4-6 imagens |

**Checklist de documentação**:
- [ ] Todos os planos mínimos capturados
- [ ] Calipers visíveis quando medida realizada
- [ ] Identificação anatômica clara (labels/textos)
- [ ] Sem artefatos grosseiros (reverberação, sombra excessiva)

---

## 5.8 Compressão: Quando usar e quando evitar

### Tabela 5.6 — Compressão por Estrutura

| Estrutura | Compressão | Motivo |
|-----------|------------|--------|
| **Aorta** | ✅ Leve | Afastar gases, sem deformar lúmen |
| **Apêndice** | ✅ Gradual | "Pushing out gases", comprimir até encontrar |
| **Vesícula** | ❌ Evitar | Pode esvaziar/deformar |
| **Rins** | ❌ Evitar | Altera dimensões |
| **Bexiga** | ❌ Evitar | Reduz volume artificialmente |
| **Vasos arteriais** | ⚠️ Mínima | Apenas para afastar gases |

---

## 5.9 Respiração: Protocolo padronizado

### Regra geral

| Fase Respiratória | Órgãos | Motivo |
|-------------------|--------|--------|
| **Inspiração profunda suspensa** | Fígado, baço, rins, vesícula | Desloca diafragma, afasta gases |
| **Expiração suspensa** | Pâncreas | Aproxima estômago/duodeno |
| **Respiração livre** | Bexiga, pelve, aorta | Menos movimento |

**Documentar no laudo** (quando relevante):
> "Exame realizado com cooperação respiratória adequada" OU
> "Avaliação limitada por cooperação respiratória inadequada."

---

## 5.10 Limitações técnicas: Como documentar

### Tabela 5.7 — Limitações Comuns e Texto Padrão

| Limitação | Causa | Texto para Laudo |
|-----------|-------|------------------|
| **Jejum inadequado** | Vesícula contraída, gases | "Avaliação da vesícula biliar limitada por ausência de jejum." |
| **Interposição gasosa** | Gases intestinais | "Avaliação do pâncreas/retroperitônio limitada por interposição gasosa." |
| **Bexiga vazia** | Sem janela pélvica | "Avaliação pélvica limitada por repleção vesical inadequada." |
| **Biotipo** | Obesidade | "Avaliação limitada por biotipo desfavorável (obesidade/tecido subcutâneo espesso)." |
| **Cooperação** | Movimento, respiração | "Avaliação limitada por cooperação inadequada do paciente." |
| **Cicatriz cirúrgica** | Sombra acústica | "Avaliação do [órgão] limitada por cicatriz cirúrgica com sombra acústica." |

---

## 5.11 Checklist de qualidade de imagem (pré-medição)

### Checklist 5.1 — QA de Imagem Antes de Medir

Para cada estrutura a ser medida:

**Técnica**:
- [ ] Transdutor adequado selecionado
- [ ] Frequência otimizada para profundidade
- [ ] Ganho ajustado (bordas nítidas)
- [ ] Foco na estrutura alvo
- [ ] Profundidade apropriada (estrutura completa visível)

**Anatomia**:
- [ ] Plano correto identificado
- [ ] Estrutura completa no campo (sem "cortes")
- [ ] Referências anatômicas visíveis
- [ ] Sem obliquidade excessiva

**Artefatos**:
- [ ] Sem reverberação grosseira
- [ ] Sem sombra acústica obscurecendo alvo
- [ ] Sem движения (movimento) borramento

**Preparação**:
- [ ] Preparo adequado (jejum/bexiga conforme protocolo)
- [ ] Posicionamento otimizado
- [ ] Respiração controlada (se aplicável)

**Se QUALQUER item falhar**: Documentar limitação no laudo.

---

## 5.12 Protocolo de medição (pós-aquisição)

### 5.12.1 Sequência operacional

```
AQUISIÇÃO DE IMAGEM
    ↓
Verificar qualidade (Checklist 5.1)
    ↓
Plano correto?
    ├─ Sim → Prosseguir
    └─ Não → Re-adquirir
    ↓
Aplicar caliper
    ↓
Verificar:
  • Pontos anatômicos corretos
  • Linha reta (não curva)
  • Unidade correta (mm/cm)
    ↓
Salvar medida
    ↓
Anotar valor + unidade
    ↓
Aplicar arredondamento padrão
    ↓
Inserir no laudo
```

---

## 5.13 Exemplo resolvido: Protocolo completo para rim

### Exemplo Resolvido 5.1 — Biometria Renal (USG)

**Objetivo**: Medir comprimento longitudinal do rim direito

**Passo 1: Preparo**
- Paciente: Sem jejum obrigatório
- Posição: Decúbito lateral esquerdo
- Hidratação: Boa (para diferenciação córtico-medular)

**Passo 2: Equipamento**
- Transdutor: Convexo 3-5 MHz
- Preset: Abdome/Renal
- Harmônica: Ativada

**Passo 3: Aquisição**
- Janela: Intercostal posterior direita
- Plano: Sagital oblíquo (pólo a pólo)
- Respiração: Inspiração profunda suspensa
- Ajustes:
  - Profundidade: 15 cm (rim completamente visível)
  - Foco: Na profundidade do rim (~8-10 cm)
  - Ganho: Borda nítida, cápsula visível

**Passo 4: Verificação pré-medição**
- ✅ Pólo superior e inferior visíveis
- ✅ Maior eixo longitudinal identificado
- ✅ Sem obliquidade (transversal do rim não visível)
- ✅ Sem artefatos grosseiros

**Passo 5: Medição**
- Caliper 1: Pólo superior (cápsula)
- Caliper 2: Pólo inferior (cápsula)
- Medida PACS: 114 mm
- Conversão: 114 mm = 11,4 cm

**Passo 6: Arredondamento**
- Padrão para órgãos: 0,1 cm
- 11,4 cm → **11,4 cm** (já correto)

**Passo 7: Interpretação**
- Referência: 9-12 cm [ACR-PPTS-RENAL-DUPLEX-2023]
- 11,4 cm → **normal**

**Passo 8: Laudo**
> "Rim direito em topografia habitual, de contornos regulares, 
> medindo 11,4 cm no eixo longitudinal (normal: 9-12 cm), com 
> relação corticomedular preservada."

---

## 5.14 Protocolo para casos especiais

### 5.14.1 Paciente obeso (IMC > 35)

**Adaptações**:
- Usar frequência mais baixa (2-3 MHz se disponível)
- Aumentar profundidade
- Considerar posições alternativas (prono para rins)
- Compressão gradual (afastar tecido subcutâneo)
- Aceitar limitação quando inevitável

**Texto de limitação**:
> "Avaliação técnica limitada por biotipo desfavorável (obesidade grau III). 
> Estruturas visualizadas apresentam aspecto dentro da normalidade."

---

### 5.14.2 Paciente pediátrico (fora do escopo v1.0)

**Nota**: Este manual v1.0 foca em adultos. Para pediatria:
- Fórum diferente frequências (mais altas)
- Valores de referência idade/peso específicos
- Preparo adaptado (jejum reduzido em lactentes)

---

### 5.14.3 Pós-operatório recente

**Considerações**:
- Cicatriz/dreno = sombra acústica
- Pneumoperitônio residual = má janela
- Íleo paralítico = gases excessivos

**Conduta**:
- Documentar limitações
- Usar janelas alternativas quando possível
- Considerar TC se USG inadequado

---

## 5.15 Tabela-Mestra: Template para registro de protocolo

### Tabela 5.8 — Template de Registro de Protocolo

| Campo | Exemplo |
|-------|---------|
| **ID_Protocolo** | USG_ABD_TOTAL_v1.0 |
| **Indicação** | Rotina, dor abdominal, follow-up |
| **Preparo** | Jejum 6-8h, hidratação normal |
| **Posicionamento** | Decúbito dorsal + laterais |
| **Transdutores** | Convexo 3-5 MHz (padrão), Linear 7-12 MHz (se necessário) |
| **Parâmetros** | Harmônica ON, Ganho ajustado, Foco dinâmico |
| **Estruturas** | Fígado, vesícula, pâncreas, baço, rins (bilateral), bexiga, aorta |
| **Planos mínimos** | Conforme Tabela 5.4 |
| **Imagens mínimas** | 15-20 (Tabela 5.5) |
| **Medidas padrão** | Fígado LMC, Rins long, Baço long, Aorta AP |
| **Limitações comuns** | Gases (pâncreas), Bexiga vazia (pelve) |
| **Tempo estimado** | 20-30 minutos |

---

## 5.16 Referências do capítulo

1. ACR–SPR–SRU Practice Parameter for the Performance and Interpretation of Diagnostic Ultrasound Examinations (Revised 2023).
2. AIUM Practice Parameter for the Performance of an Ultrasound Examination of the Abdomen and/or Retroperitoneum (Revised 2024).
3. ACR–AIUM–SPR–SRU Practice Parameter for the Performance of Duplex Sonography of Native Renal Vessels (Revised 2023).
4. RUMACK CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018. (Capítulos de técnica e instrumentação)

---

**FIM DO CAPÍTULO 5**

*Próximo: Capítulo 6 — USG: Fígado (Biometria, Contornos e Medidas Associadas)*

---

## ANEXO 5A — Checklist Rápido de Protocolo (1 página)

```
═══════════════════════════════════════════════════════════
CHECKLIST RÁPIDO USG ABDOME TOTAL
═══════════════════════════════════════════════════════════

ANTES DO EXAME:
☐ Jejum confirmado? (6-8h) OU documentar ausência
☐ Bexiga repleta? (se pelve incluída) OU documentar
☐ Equipamento ligado e preset correto selecionado
☐ Paciente informado sobre posições/respiração

DURANTE AQUISIÇÃO:
☐ Ganho ajustado (bordas nítidas)
☐ Foco na profundidade da estrutura alvo
☐ Profundidade adequada (estrutura completa)
☐ Planos corretos (longitudinal + transversal mínimo)
☐ Respiração controlada (inspiração/expiração conforme órgão)

ESTRUTURAS (Abdome Total):
☐ Fígado (2 planos)
☐ Vesícula (2 planos + avaliar mobilidade cálculos se houver)
☐ Pâncreas (transversal mínimo)
☐ Baço (longitudinal)
☐ Rim D + E (longitudinal + transversal cada)
☐ Bexiga (transversal + sagital)
☐ Aorta (longitudinal + transversal)

MEDIDAS PADRÃO:
☐ Fígado: eixo longitudinal LMC
☐ Rins: comprimento longitudinal bilateral
☐ Baço: eixo longitudinal
☐ Aorta: diâmetro AP (pelo menos infrarrenal)
☐ [Outras conforme indicação]

LIMITAÇÕES (documentar se presente):
☐ Jejum inadequado
☐ Interposição gasosa
☐ Bexiga vazia
☐ Biotipo desfavorável
☐ Cooperação inadequada
☐ Outra: _______________

IMAGENS SALVAS:
☐ Mínimo 15-20 imagens (abdome total)
☐ Calipers visíveis quando aplicável
☐ Labels/identificação em todas

═══════════════════════════════════════════════════════════
```

---

## ANEXO 5B — Troubleshooting Rápido

| Problema | Solução Imediata |
|----------|------------------|
| **Vesícula prega** | Alimentar paciente, esperar 15min, re-escanear |
| **Pâncreas não visualizado** | Tentar semi-sentado, compressão gradual, considerar TC |
| **Rim posterior não visto** | Decúbito prono, janela posterior |
| **Bexiga vazia** | Paciente bebe 500 mL, aguarda 40min, ou adiar exame |
| **Gases excessivos** | Compressão gradual, posições alternativas, marcar limitação |
| **Paciente não coopera respiração** | Instruir novamente, show visual (médico demonstra), ou aceitar live |

---

# CAPÍTULO 6 — USG: FÍGADO (Biometria, Contornos e Medidas Associadas)

## 6.1 O que medir no fígado (definição)

### Medidas padronizadas:

1. **Eixo longitudinal** na linha medioclavicular (LMC)
2. **Lobo esquerdo** (craniocaudal)
3. **Lobo caudado** (opcional, para índice de cirrose)
4. **Lesões focais** (quando presentes)
5. **Veia porta** (calibre)

---

## 6.2 Quando medir

### Indicações:

- ✅ Suspeita de hepatomegalia
- ✅ Doença hepática crônica (cirrose, esteatose)
- ✅ Acompanhamento de lesões focais
- ✅ Exames de rotina (screening)

---

## 6.3 Como medir (passo a passo)

### 6.3.1 Eixo Longitudinal na Linha Medioclavicular (LMC)

**Técnica**:
1. Paciente em decúbito dorsal
2. Respiração: ins piração profunda suspensa
3. Transdutor convexo 3-5 MHz
4. Janela: Intercostal direita, linha medioclavicular
5. Plano: Sagital oblíquo
6. Identificar: Cúpula diafragmática → Borda inferior hepática
7. Caliper: Ponto mais cranial → Ponto mais caudal

**Pontos anatômicos**:
- Cranial: Interface fígado-diafragma
- Caudal: Borda inferior do fígado (mais baixa)

### Exemplo Resolvido 6.1 — Comprimento Hepático LMC

**Dados**:
- Medida PACS: 152 mm
- Conversão: 152 mm = 15,2 cm

**Valor de referência**: ≤ 15,5 cm [RUMACK, 2018]

**Interpretação**: 15,2 cm → **Normal** (limítrofe superior)

**Laudo**:
> "Fígado de dimensões normais, com eixo longitudinal na linha 
> medioclavicular medindo 15,2 cm (normal: ≤ 15,5 cm)."

---

### 6.3.2 Lobo Esquerdo

**Técnica**:
1. Paciente em decúbito dorsal
2. Janela: Epigástrica, linha média
3. Plano: Sagital
4. Caliper: Borda superior → Borda inferior

**Valor de referência**: ≤ 10 cm [NIEDERAU1983]

---

### 6.3.3 Índice do Lobo Caudado (ILC)

**Quando usar**: Suspeita de cirrose

**Fórmula**:
```
ILC = Lobo Caudado (AP) / Lobo Direito (AP)

Normal: < 0,65
Cirrose: > 0,65
```

**Técnica**:
1. Plano transversal no hilo hepático
2. Medir AP do lobo caudado
3. Medir AP do lobo direito (mesma imagem)
4. Calcular razão

### Exemplo Resolvido 6.2 — ILC

**Dados**:
- Lobo caudado: 3,2 cm
- Lobo direito: 14,5 cm

**Cálculo**:
```
ILC = 3,2 / 14,5 = 0,22
```

**Interpretação**: 0,22 < 0,65 → **Normal** (não sugere cirrose)

---

## 6.4 Parâmetros técnicos que alteram medidas

| Parâmetro | Efeito | Mitigação |
|-----------|--------|-----------|
| **Respiração** | Variação até 2-3 cm | Padronizar inspiração profunda |
| **Posição** | Lobo direito "desliza" em decúbito lateral | Sempre decúbito dorsal para medida |
| **Compressão** | Reduz dimensão AP | Sem compressão excessiva |
| **Janela** | Intercostal vs subcostal = diferentes | Documentar janela usada |

---

## 6.5 Valores de referência

### Tabela 6.1 — Valores Normais (Adultos)

| Medida | Normal | Limítrofe | Anormal |
|--------|--------|-----------|---------|
| Eixo longitudinal LMC | ≤ 15,5 cm | 15,5-17 cm | > 17 cm |
| Lobo esquerdo | ≤ 10 cm | 10-12 cm | > 12 cm |
| Lobo caudado | ≤ 3,5 cm | — | — |
| ILC | < 0,65 | 0,65-0,75 | > 0,75 |

**Fontes**: RUMACK 2018, NIEDERAU 1983, CERRI 2009

---

## 6.6 Interpretação prática

| Achado | Interpretação | Próximo Passo |
|--------|---------------|---------------|
| Eixo LMC > 17 cm | Hepatomegalia | Investigar causa (esteatose, congestão, infiltração) |
| ILC > 0,65 | Sugestivo de cirrose | Correlação clínica + elastografia/biópsia |
| Contornos irregulares | Cirrose avançada | Investigar complicações (varizes, ascite, CHC) |
| Esteatose difusa | Eco-aumentada | Correlação: transaminases, perfil lipídico |

---

## 6.7 Armadilhas e erros comuns

| Armadilha | Consequência | Como Evitar |
|-----------|--------------|-------------|
| Medir em expiração | Subestima tamanho | Sempre inspiração profunda |
| Incluir cisto/lesão | Superestima parênquima | Medir parênquima normal adjacente |
| Plano oblíquo | Medida incorreta | Garantir sagital puro (veia porta longitudinal) |
| Lobo de Riedel | Falso hepatomegalia | Reconhecer variante (alongamento focal) |

---

## 6.8 Checklist rápido

### Checklist 6.1 — Biometria Hepática

- [ ] Paciente em decúbito dorsal
- [ ] Inspiração profunda suspensa
- [ ] Janela intercostal LMC identificada
- [ ] Plano sagital oblíquo (veia porta longitudinal visível)
- [ ] Caliper: cúpula diafragma → borda inferior
- [ ] Unidade: cm
- [ ] Sem compressão excessiva
- [ ] Se medir ILC: mesmo plano transversal para ambos lobos

---

## 6.9 Avaliação complementar (não biométrica, mas relevante)

### 6.9.1 Ecogenicidade (Esteatose)

| Grau | Descrição | critério USG |
|------|-----------|--------------|
| **0** | Normal | Iso/hipoecoico ao córtex renal |
| **I** | Leve | Leve aumento, vasos visíveis |
| **II** | Moderada | Aumento moderado, vasos parcialmente borrados |
| **III** | Acentuada | Muito aumentada, vasos não visíveis, atenuação posterior |

**Regra do manual**: Esteatose é avaliação **qualitativa** (não medida numérica).

---

### 6.9.2 Contornos

| Achado | Interpretação |
|--------|---------------|
| Regulares, lisos | Normal |
| Levemente irregulares | Esteatose, congestão |
| Francamente nodulares | Cirrose |

---

### 6.9.3 Veia Porta (Doppler - ver Cap 14)

**Medida**: Diâmetro no hilo

**Normal**: ≤ 13 mm [BOLONDI 1993]

**> 13 mm**: Sugestivo de hipertensão portal

---

## 6.10 Texto pronto para laudo

### Normal:
> "Fígado de dimensões normais (eixo longitudinal LMC: [X] cm), 
> contornos regulares, ecotextura homogênea e ecogenicidade 
> preservada. Veias hepáticas e ramos portais de trajeto e 
> calibre preservados."

### Hepatomegalia:
> "Fígado aumentado, com eixo longitudinal medindo [X] cm 
> (normal: ≤ 15,5 cm), contornos [regulares/irregulares], 
> [demais características]."

### Esteatose:
> "Fígado com ecogenicidade difusamente aumentada, compatível 
> com esteatose hepática grau [I/II/III], [com/sem] atenuação 
> acústica posterior significativa."

### Cirrose (suspeita):
> "Fígado de contornos irregularmente nodulares, dimensões 
> [reduzidas/normais], índice do lobo caudado ([valor]) 
> sugestivo de hepatopatia crônica avançada. Sugerida 
> correlação clínica e laboratorial."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018.
2. Niederau C, et al. Sonographic measurements of the normal liver, spleen, pancreas, and portal vein. Radiology. 1983;149(2):537-40.
3. Cerri GG, Oliveira IRS. Ultrassonografia Abdominal. 2ª ed. Revinter; 2009.
4. Harbin WP, et al. Diagnosis of cirrhosis based on regional changes in hepatic morphology. Radiology. 1980;135(2):273-83.

---

**FIM DO CAPÍTULO 6**

---

# CAPÍTULO 7 — USG: BAÇO (Dimensões e Volume)

## 7.1 O que medir

### Medidas padronizadas:

1. **Eixo longitudinal** (craniocaudal)
2. **Índice esplênico** (opcional)
3. **Volume** (se necessário para seguimento)

---

## 7.2 Quando medir

### Indicações:

- ✅ Suspeita de esplenomegalia
- ✅ Doenças hematológicas (anemia, púrpura, leucemia)
- ✅ Hipertensão portal
- ✅ Trauma abdominal (splenosis)

---

## 7.3 Como medir (passo a passo)

### 7.3.1 Eixo Longitudinal

**Técnica**:
1. Paciente em **decúbito lateral direito** (preferencial)
2. Respiração: Inspiração profunda suspensa
3. Transdutor convexo 3-5 MHz
4. Janela: Intercostal posterior esquerda
5. Plano: Coronal oblíquo (maior eixo craniocaudal)
6. Caliper: Polo superior → Polo inferior

**Pontos anatômicos**:
- Polo superior: borda cranial do baço
- Polo inferior: ponta do baço (mais caudal)

### Exemplo Resolvido 7.1 — Comprimento Esplênico

**Dados**:
- Medida PACS: 128 mm
- Conversão: 128 mm = 12,8 cm

**Valor de referência**: ≤ 12 cm [NIEDERAU 1983]

**Interpretação**: 12,8 cm → **Esplenomegalia leve**

**Laudo**:
> "Baço com dimensões aumentadas, eixo longitudinal de 12,8 cm 
> (normal: ≤ 12 cm), compatível com esplenomegalia leve. 
 > Ecotextura homogênea, sem lesões focais."

---

### 7.3.2 Índice Esplênico (IE)

**Fórmula**:
```
IE = Comprimento × Largura × Espessura (sem fator 0,52)

Normal: < 480 cm³
```

**Técnica**:
1. Plano coronal: medir comprimento (C)
2. Mesmo plano: medir largura latero-medial (L)
3. Plano axial: medir espessura anteroposterior (E)
4. Calcular: IE = C × L × E

### Exemplo Resolvido 7.2 — Índice Esplênico

**Dados**:
- Comprimento: 14,5 cm
- Largura: 5,0 cm
- Espessura: 4,5 cm

**Cálculo**:
```
IE = 14,5 × 5,0 × 4,5
IE = 326,3 cm³
```

**Interpretação**:
- Comprimento: 14,5 cm → **Esplenomegalia leve** (> 12 cm)
- IE: 326 cm³ < 480 cm³ → **Normal pelo índice**

**Conclusão**: Discordância entre métodos. Preferir eixo longitudinal para classificação.

---

## 7.4 Parâmetros técnicos

| Parâmetro | Efeito | Mitigação |
|-----------|--------|-----------|
| **Posição** | Decúbito lateral **direito** é ideal | Afasta gases, usa janela intercostal |
| **Respiração** | Inspiração desloca baço caudalmente | Padronizar inspiração profunda |
| **Janela** | Intercostal vs subcostal = imagens diferentes | Documentar janela |
| **Frequência** | Baço profundo (>10 cm) = baixa freq | 3-5 MHz preferencial |

---

## 7.5 Valores de referência

### Tabela 7.1 — Classificação de Esplenomegalia

| Eixo Longitudinal | Classificação |
|-------------------|---------------|
| ≤ 12 cm | Normal |
| 12-15 cm | Esplenomegalia leve |
| 15-20 cm | Esplenomegalia moderada |
| > 20 cm | Esplenomegalia acentuada |

**Fontes**: NIEDERAU 1983, RUMACK 2018

**Nota**: Valores variam com altura/sexo do paciente. Alguns autores usam até 13 cm como normal.

---

## 7.6 Interpretação prática

| Achado | Principais Causas |
|--------|-------------------|
| Esplenomegalia leve (12-15 cm) | Congestão portal, infecção viral, hemólise |
| Esplenomegalia moderada (15-20 cm) | Linfoma, leucemia, mielofibrose, esquistossomose |
| Esplenomegalia acentuada (> 20 cm) | Leucemia crônica, mielofibrose avançada, sarcoidose |
| Baço pequeno (< 8 cm) | Asplenia funcional (anemia falciforme), pós-esplenectomia parcial |

---

## 7.7 Armadilhas

| Armadilha | Consequência | Como Evitar |
|-----------|--------------|-------------|
| Medir em decúbito dorsal | Gases obscurecem baço | Sempre decúbito lateral direito |
| Plano oblíquo | Subest ou superestima | Garantir maior eixo craniocaudal |
| Incluir cauda pâncreas | Medida incorreta | Identificar hilo esplênico |
| Não medir em inspiração | Variação de até 2 cm | Padronizar respiração |

---

## 7.8 Checklist rápido

### Checklist 7.1 — Biometria Esplênica

- [ ] Paciente em decúbito lateral direito
- [ ] Inspiração profunda suspensa
- [ ] Janela intercostal posterior esquerda
- [ ] Plano coronal oblíquo (maior eixo)
- [ ] Polo superior e inferior visíveis
- [ ] Caliper alinhado com maior comprimento
- [ ] Cauda do pâncreas não incluída
- [ ] Unidade: cm

---

## 7.9 Avaliação complementar

### Ecotextura:

| Achado | Interpretação |
|--------|---------------|
| Homogênea | Normal |
| Heterogênea | Infiltração (linfoma, metástases) |
| Nódulos múltiplos | Linfoma, metástases, granulomas |
| Calcificações | Granulomas antigos, cisto hidático |

---

## 7.10 Texto pronto para laudo

### Normal:
> "Baço de dimensões normais, com eixo longitudinal de [X] cm 
> (normal: ≤ 12 cm), ecotextura homogênea, sem lesões focais."

###Esplenomegalia:
> "Baço com dimensões aumentadas, apresentando eixo longitudinal 
> de [X] cm (normal: ≤ 12 cm), compatível com esplenomegalia 
> [leve/moderada/acentuada]. Ecotextura homogênea, sem lesões focais."

### Com lesão:
> "Baço aumentado ([X] cm), com imagem [descrição da lesão]. 
> Sugere-se correlação clínica e complementação propedêutica 
> conforme indicação."

---

## Referências:

1. Niederau C, et al. Sonographic measurements of the normal liver, spleen, pancreas, and portal vein. Radiology. 1983;149(2):537-40.
2. Lamb PM, et al. Spleen size: how well do linear ultrasound measurements correlate with three-dimensional CT volume assessments? Br J Radiol. 2002;75(895):573-7.
3. Chow KU, et al. Spleen size is significantly influenced by body height and sex. Ann Hematol. 2005;84(5):297-301.

---

**FIM DO CAPÍTULO 7**

---

# CAPÍTULO 8 — USG: RINS E TRATO URINÁRIO SUPERIOR

## 8.1 O que medir

### Medidas padronizadas dos rins:

1. **Comprimento longitudinal** (bilateral)
2. **Largura** (opcional)
3. **Espessura cortical** (opcional)
4. **Volume renal** (quando indicado)
5. **Índice de resistividade (IR)** - ver Cap 13 (Doppler)

---

## 8.2 Quando medir

### Indicações:

- ✅ Doença renal crônica (DRC)
- ✅ Assimetria renal (suspeita)
- ✅ Hipertensão renovascular
- ✅ Pós-transplante renal (não escopo v1.0)
- ✅ Cálculo renal (avaliar obstrução)
- ✅ Infecção urinária de repetição
- ✅ Acompanhamento de cistos/massas

---

## 8.3 Como medir (passo a passo)

### 8.3.1 Comprimento Longitudinal (Medida Mais Importante)

**Técnica**:
1. Paciente em **decúbito lateral** (oposto ao rim avaliado)
2. Respiração: Inspiração profunda suspensa
3. Transdutor convexo 3-5 MHz
4. Janela: Intercostal posterior
5. Plano: **Sagital oblíquo** (polo a polo)
6. Identificar: Polo superior → Polo inferior
7. Caliper: Maior distância longitudinal

**Pontos anatômicos**:
- Polo superior: borda cranial do rim (cápsula)
- Polo inferior: borda caudal do rim (cápsula)

**Critério de qualidade**:
- ✅ Ambos os polos visíveis
- ✅ Pelve renal centralizada (não oblíquo)
- ✅ Sem corte transversal visível

### Exemplo Resolvido 8.1 — Comprimento Renal Bilateral

**Rim Direito**:
- Medida PACS: 114 mm = 11,4 cm
- Referência: 9-12 cm
- **Normal**

**Rim Esquerdo**:
- Medida PACS: 108 mm = 10,8 cm
- Referência: 9-12 cm
- **Normal**

**Assimetria**:
```
Diferença = 11,4 - 10,8 = 0,6 cm
```

**Interpretação**: Diferença < 2 cm → **Simétricos**

**Laudo**:
> "Rins tópicos, de contornos regulares, medindo 11,4 cm e 10,8 cm 
> nos eixos longitudinais à direita e esquerda, respectivamente 
> (normal: 9-12 cm), simétricos. Relação corticomedular preservada 
> bilateralmente."

---

### 8.3.2 Largura (Opcional)

**Técnica**:
1. Mesmo plano sagital
2. Medir largura máxima (perpendicular ao eixo longitudinal)
3. Normal: 4-6 cm

---

### 8.3.3 Espessura Cortical

**Técnica**:
1. Plano transversal ou sagital
2. Medir da cápsula ao início da pirâmide medular
3. **Normal: 1,0-1,5 cm** [RUMACK 2018]

**Quando medir**:
- Suspeita de atrofia cortical (DRC)
- Rim transplantado (fora escopo v1.0)

---

### 8.3.4 Volume Renal (Fórmula do Elipsoide)

**Fórmula**:
```
Volume (mL) = Comprimento × Largura × Espessura × 0,52
```

**Quando usar**:
- Acompanhamento de DRC (atrofia progressiva)
- Rim policístico (volume aumenta)
- Pesquisa/estudos

### Exemplo Resolvido 8.2 — Volume Renal

**Dados** (rim direito):
- Comprimento: 11,2 cm
- Largura: 5,0 cm
- Espessura: 4,8 cm

**Cálculo**:
```
V = 11,2 × 5,0 × 4,8 × 0,52
V = 268,8 × 0,52
V = 139,8 mL ≈ 140 mL
```

**Referência**: 120-200 mL [RUMACK 2018]

**Interpretação**: 140 mL → **Normal**

---

## 8.4 Parâmetros técnicos

### Tabela 8.1 — Fatores que Afetam Medida Renal

| Parâmetro | Efeito | Mitigação |
|-----------|--------|-----------|
| **Posição** | Decúbito lateral = polo a polo máximo | Sempre lateral (oposto ao rim) |
| **Respiração** | Inspiração "abaixa" rim ~2 cm | Padronizar inspiração profunda |
| **Hidratação** | Desidratação = Rim "murcho" | Paciente bem hidratado (ideal) |
| **Obliquidade** | Plano oblíquo = medida incorreta | Pelve centralizada, sem corte transversal |
| **Janela** | Anterior (gases) vs posterior | Preferir janela intercostal posterior |

---

## 8.5 Valores de referência

### Tabela 8.2 — Valores Normais Renais (Adultos)

 | Medida | Normal | Observação |
|--------|--------|------------|
| **Comprimento** | 9-12 cm | Mais comum: 10-11 cm |
| **Largura** | 4-6 cm | — |
| **Espessura cortical** | 1,0-1,5 cm | Atrofia: < 1,0 cm |
| **Volume** | 120-200 mL | Varia com idade/sexo |
| **Diferença entre rins** | < 2 cm | Assimetria significativa se ≥ 2 cm |

**Fontes**: ACR-PPTS-RENAL-DUPLEX-2023, RUMACK 2018

---

### 8.5.1 Variações por Idade e Sexo

| Grupo | Comprimento Médio | Nota |
|-------|-------------------|------|
| Homens | 11,2 ± 1,0 cm | Tendem a ser maiores |
| Mulheres | 10,9 ± 0,9 cm | Ligeiramente menores |
| Idosos (> 70 anos) | 9-10 cm | Atrofia fisiológica |

---

## 8.6 Interpretação prática

### Tabela 8.3 — Interpretação de Achados

| Achado | Interpretação Provável | Próximo Passo |
|--------|------------------------|---------------|
| Rim < 9 cm | Atrofia renal (DRC, isquemia) | Correlação: creatinina, doppler |
| Rim > 12 cm | Rim policístico, hidronefrose, massa | Investigar causa |
| Assimetria ≥ 2 cm | Estenose arterial, pielonefrite crônica, hipoplasia | Doppler renal, TC/RM |
| Cortical < 1 cm | Atrofia cortical (DRC) | Estadiar DRC (creatinina, TFG) |
| Cortical > 1,5 cm | Edema (NTA, pielonefrite), infiltração | Correlação clínica/laboratorial |

---

## 8.7 Armadilhas e erros comuns

### Tabela 8.4 — Armadilhas

| Armadilha | Consequência | Como Evitar |
|-----------|--------------|-------------|
| **Medir em plano oblíquo** | Subestima comprimento | Pelve centralizada, sem corte transversal |
| **Não ver ambos os polos** | Medida incorreta | Re-posicionar paciente, janela alternativa |
| **Medir com bexiga vazia** | Ureter distal não avaliado | Bexiga repleta (se indicação urológica) |
| **Confundir baço com rim esquerdo** | Erro grosseiro | Identificar hilo renal, pelve |
| **Esquecer de medir bilateral** | Não detecta assimetria | Sempre bilateral |

---

## 8.8 Checklist rápido

### Checklist 8.1 — Biometria Renal

**Rim Direito**:
- [ ] Paciente em decúbito lateral esquerdo
- [ ] Inspiração profunda suspensa
- [ ] Janela intercostal posterior direita
- [ ] Plano sagital oblíquo (pelve centralizada)
- [ ] Polo superior e inferior visíveis
- [ ] Caliper: polo a polo (maior distância)
- [ ] Unidade: cm

**Rim Esquerdo**:
- [ ] Paciente em decúbito lateral direito
- [ ] Mesmas verificações acima
- [ ] **Bilateral sempre** (nunca medir só um rim)

**Interpretação**:
- [ ] Comparar com referência (9-12 cm)
- [ ] Calcular assimetria (diferença < 2 cm?)
- [ ] Avaliar córtex (>= 1 cm?)
- [ ] Documentar achados adicionais (cistos, cálculos, hidronefrose)

---

## 8.9 Avaliação complementar (não biométrica)

### 8.9.1 Relação Corticomedular

| Achado | Interpretação |
|--------|---------------|
| **Preservada** | Córtex hipoecoico, pirâmides anecoicas, diferenciação nítida |
| **Borrada** | DRC, NTA, pielonefrite |
| **Invertida** | DRC avançada (córtex hiperecóico) |

---

### 8.9.2 Ecogenicidade Cortical

**Comparação**: Córtex renal **vs** Parênquima hepático/esplênico

| Achado | Interpretação |
|--------|---------------|
| Córtex **ligeiramente hipoecoico** ao fígado | Normal |
| Córtex **isoecóico** ao fígado | Limítrofe/DRC inicial |
| Córtex **hiperecóico** ao fígado | DRC, nefrite intersticial |

---

### 8.9.3 Hidronefrose (Classificação)

| Grau | Descrição USG |
|------|---------------|
| **Leve** | Discreto alargamento da pelve, cálices não dilatados |
| **Moderada** | Pelve dilatada + cálices dilatados, cortical preservada |
| **Acentuada** | Pelve/cálices muito dilatados, cortical adelgaçada |

**Nota**: Hidronefrose **não é medida numérica**, é avaliação **qualitativa**.

---

## 8.10 Texto pronto para laudo

### Normal:
> "Rins tópicos, de contornos regulares, medindo [RD] cm e [RE] cm 
> nos eixos longitudinais (normal: 9-12 cm), simétricos. Relação 
> corticomedular preservada bilateralmente. Ausência de dilatação 
> pielocalicial, cálculos ou massas."

### Atrofia renal:
> "Rim [lado] de dimensões reduzidas, medindo [X] cm (normal: 9-12 cm),  
> com adelgaçamento cortical e perda da relação corticomedular, 
> compatível com atrofia renal crônica. Sugere-se correlação com 
> função renal (creatinina, TFG)."

### Assimetria:
> "Assimetria renal significativa, com rim direito medindo [X] cm e 
> rim esquerdo [Y] cm (diferença: [Z] cm). Sugere-se investigação 
> de estenose de artéria renal ou nefropatia unilateral (Doppler, 
> TC/RM)."

### Cisto simples:
> "Rim [lado] com cisto simple de [X] mm no [polo/terço], com 
> critérios ultrassonográficos de benignidade (anecoico, paredes 
> finas, reforço posterior). Dimensões renais preservadas."

---

## 8.11 Casos especiais

### 8.11.1 Rim Único

**Contexto**: Agenesia contralateral, nefrectomia prévia

**Conduta**:
- Medir com maior cuidado (hipertrofia compensatória esperada)
- Rim único pode medir até 13-14 cm (normal para a situação)
- Documentar: "Rim único (nefrectomia prévia à [direita/esquerda])"

---

### 8.11.2 Rim Policístico (DRPAD)

**Achado**: Rins aumentados (> 15 cm comum), múltiplos cistos bilateralmente

**Conduta**:
- Medir comprimento (acompanhar crescimento)
- Opcional: medir volume (elipsoide)
- Classificar conforme Ravine/Pei

**Texto**:
> "Rins aumentados bilateralmente (RD: [X] cm, RE: [Y] cm), 
> repletos de múltiplos cistos de dimensões variadas, compatível 
> com doença renal policística autossômica dominante. Sugerida 
> correlação clínica e familiar."

---

### 8.11.3 Transplante Renal (fora escopo v1.0)

**Nota**: Protocolo específico, fora deste manual v1.0. Ver [ACR-PPTS-SOLID-ORGAN-TX-US-2024].

---

## 8.12 Exemplo resolvido completo

### Exemplo Resolvido 8.3 — Caso Clínico: DRC

**Contexto**: Paciente 68 anos, hipertenso, creatinina 2,1 mg/dL

**Achados USG**:
- RD: 8,2 cm
- RE: 8,5 cm
- Cortical: ~0,7 cm bilateralmente
- Ecogenicidade cortical aumentada (hiperecóica ao fígado)
- Relação corticomedular borrada

**Interpretação**:
1. Comprimentos reduzidos (< 9 cm) → **Atrofia renal bilateral**
2. Cortical adelgaçada (< 1 cm) → **Atrofia cortical**
3. Hiperecogenicidade → **DRC**
4. Relação borrada → **DRC avançada**

**Laudo integrado**:
> "Rins de dimensões globalmente reduzidas, medindo 8,2 cm e 8,5 cm 
> nos eixos longitudinais (normal: 9-12 cm), com adelgaçamento cortical 
> difuso (estimado em 0,7 cm, normal: 1,0-1,5 cm), aumento da 
> ecogenicidade cortical e perda da diferenciação corticomedular, 
> achados compatíveis com nefropatia crônica parenquimatosa bilateral. 
> Ausência de dilatação pielocalicial ou cálculos. Sugere-se correlação 
> clínica e laboratorial para estadiamento da doença renal crônica."

---

## Referências:

1. ACR–AIUM–SPR–SRU Practice Parameter for the Performance of Duplex Sonography of Native Renal Vessels (Revised 2023).
2. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018.
3. Emamian SA, et al. Kidney dimensions at sonography: correlation with age, sex, and habitus in 665 adult volunteers. AJR. 1993;160(1):83-6.
4. O'Neill WC. Sonographic evaluation of renal failure. Am J Kidney Dis. 2000;35(6):1021-38.

---

**FIM DO CAPÍTULO 8**

*Próximo: Capítulo 9 — USG: Bexiga (Volume, Parede, RPM)*

---

# CAPÍTULO 9 — USG: BEXIGA (Volume, Parede e Resíduo Pós-Miccional)

## 9.1 O que medir (definição)

### Medidas padronizadas:

1. **Volume vesical pré-miccional** (3 eixos + fórmula do elipsoide)
2. **Espessura da parede vesical** (apenas com repleção adequada)
3. **Resíduo pós-miccional (RPM / PVR)** (volume pós-miccional)
4. **Divertículos** (se presentes: maior diâmetro e colo, quando mensurável)

**Escopo prático**: este capítulo foca em **biometria**. Avaliação de lesões endoluminais, ureteres distais e jatos ureterais é **complementar**.

---

## 9.2 Quando medir

### Indicações:

- ✅ Sintomas urinários baixos (LUTS), retenção, jato fraco
- ✅ Suspeita/seguimento de obstrução infravesical (ex.: HPB)
- ✅ Avaliação de bexiga neurogênica
- ✅ Infecção urinária de repetição (especialmente com suspeita de RPM elevado)
- ✅ Hematúria (como componente do estudo; não substitui cistoscopia quando indicada)
- ✅ Controle pós-operatório urológico (conforme protocolo do serviço)

---

## 9.3 Preparo do paciente (repleção padronizada)

### Protocolo prático de repleção (adultos)

1. Urinar completamente (idealmente **60 min** antes)
2. Beber **500–1000 mL** de água
3. Aguardar **45–60 min**
4. Realizar exame com bexiga **repleta, porém tolerável**

**Nota de limitação** (quando aplicável):
> "Avaliação vesical/pélvica limitada por repleção vesical subótima."

---

## 9.4 Como medir (passo a passo)

### 9.4.1 Planos obrigatórios

- **Transversal** (largura e AP)
- **Sagital** (comprimento)

**Regra operacional**:
> Para biometria, priorizar imagens com **luz vesical bem definida** e **sem compressão** do transdutor.

---

### 9.4.2 Volume vesical (pré-miccional)

**Fórmula do elipsoide**:
```
Volume (mL) = Comprimento × Largura × AP × 0,52
```

**Onde medir cada eixo**:
- **Largura (L)**: plano **transversal**, maior diâmetro latero-lateral
- **AP (A)**: plano **transversal**, maior diâmetro ântero-posterior (perpendicular à largura)
- **Comprimento (C)**: plano **sagital**, maior diâmetro crânio-caudal

**Padrão do manual (volume)**:
- Medir **diâmetros internos da luz** (inner-to-inner), evitando incluir a parede.

### Exemplo Resolvido 9.1 — Volume Vesical Pré-Miccional

**Dados**:
- C = 10,8 cm
- L = 8,2 cm
- A = 6,5 cm

**Cálculo**:
```
V = 10,8 × 8,2 × 6,5 × 0,52
V = 575,6 × 0,52
V = 299,3 mL ≈ 299 mL
```

**Interpretação**: Repleção **adequada** para avaliação pélvica/vesical.

**Laudo (trecho)**:
> "Bexiga com repleção adequada, volume pré-miccional estimado em 299 mL."

---

### 9.4.3 Espessura da parede vesical

**Pré-requisito**: bexiga **adequadamente distendida** (evita superestimar espessura).

**Técnica**:
1. Plano transversal ou sagital, com **parede anterior** bem definida
2. Medir **perpendicularmente** à parede
3. Evitar áreas com dobras/ trabeculações evidentes (quando possível)
4. Documentar **nível de repleção** (ex.: volume estimado) quando a espessura for alterada

**Padrão do manual (parede)**:
- Medir a **parede anterior**, do limite **mucosa** ao limite **serosa** (outer-to-outer).

---

### 9.4.4 Resíduo pós-miccional (RPM / PVR)

**Definição**:
- Volume vesical estimado **após micção**, medido pela mesma fórmula (ou cálculo automático do equipamento).

**Protocolo**:
1. Medir volume **pré-miccional** (V_pre)
2. Solicitar ao paciente que urine completamente
3. Reavaliar em até **10 minutos** (ideal: 0–5 min)
4. Medir volume **pós-miccional** (V_pos) = **RPM**

### Exemplo Resolvido 9.2 — RPM Elevado

**Dados**:
- V_pre = 410 mL
- V_pos (RPM) = 165 mL

**Interpretação**:
- RPM **aumentado** (ver Tabela 9.2)
- Sugere retenção/ esvaziamento incompleto (correlação com clínica/urofluxo)

**Laudo (trecho)**:
> "Bexiga com resíduo pós-miccional estimado em 165 mL, sugerindo esvaziamento vesical incompleto."

---

## 9.5 Parâmetros técnicos e qualidade

### Tabela 9.1 — Fatores que Alteram Medidas Vesicais

| Fator | Efeito | Mitigação |
|------|--------|-----------|
| **Repleção baixa** | Parede “aparenta” mais espessa | Medir com bexiga distendida ou documentar limitação |
| **Compressão do transdutor** | Subestima volume | Pressão mínima, mão leve |
| **Plano oblíquo** | Eixos menores → volume subestimado | Garantir maior diâmetro em cada plano |
| **Tempo pós-micção longo** | Refilling → RPM falsamente alto | Medir logo após urinar (≤ 10 min) |
| **Sedimento/coágulos** | Dificulta delimitar luz | Ajustar ganho, usar harmônica, múltiplos planos |

---

## 9.6 Valores de referência (práticos)

### Tabela 9.2 — Interpretação do RPM (Adultos, regra prática)

| RPM (mL) | Interpretação prática |
|----------|------------------------|
| **< 50** | Baixo (geralmente aceitável) |
| **50–100** | Limítrofe (avaliar contexto/idade) |
| **> 100** | Aumentado |
| **> 200** | Significativo (alta probabilidade de retenção/obstrução ou hipocontratilidade) |

### Tabela 9.3 — Parede Vesical (dependente de repleção)

| Situação | Espessura esperada | Nota |
|---------|---------------------|------|
| **Bexiga distendida** | tipicamente **≤ 3 mm** | Medir preferencialmente nesta condição |
| **Bexiga pouco repleta** | pode chegar a **~5 mm** | Evitar concluir “espessamento” sem distensão adequada |

**Nota**: Valores variam entre referências e equipamentos; no laudo, sempre contextualizar pela repleção.

---

## 9.7 Interpretação prática (como usar no laudo)

| Achado biométrico | Interpretação provável | Próximo passo |
|-------------------|------------------------|--------------|
| RPM elevado | Esvaziamento incompleto | Correlacionar com LUTS/urofluxo; avaliar próstata (Cap 10) |
| Parede espessada com boa repleção | Cistite, obstrução crônica, bexiga neurogênica | Correlacionar com EAS/urocultura e clínica |
| Trabeculação + divertículos | Obstrução crônica | Documentar; sugerir avaliação urológica |
| Volume pré-miccional baixo (repleção subótima) | Limitação técnica | Repetir após hidratação/adiar |

---

## 9.8 Armadilhas e erros comuns

| Armadilha | Consequência | Como evitar |
|----------|--------------|-------------|
| Medir parede com bexiga vazia | “Espessamento” falso | Exigir repleção adequada |
| Medir eixos externos para volume | Volume superestimado | Usar diâmetros internos (luz) |
| Pressionar transdutor | Volume subestimado | Compressão mínima |
| RPM medido tarde | RPM falsamente alto | Medir em até 10 min pós-micção |
| Eixo sagital curto (plano oblíquo) | Volume subestimado | Repetir e buscar maior eixo |

---

## 9.9 Checklist rápido

### Checklist 9.1 — Biometria Vesical (Volume + Parede + RPM)

- [ ] Confirmar repleção vesical (tolerável) e **não comprimir**
- [ ] Salvar bexiga em **transversal** (L e AP) com calipers
- [ ] Salvar bexiga em **sagital** (C) com calipers
- [ ] Calcular/registrar **volume pré-miccional** (mL)
- [ ] Se medir parede: confirmar **boa distensão** e medir parede anterior
- [ ] Se medir RPM: paciente urina e reavaliar em **≤ 10 min**
- [ ] Registrar **RPM (mL)** e texto interpretativo quando elevado
- [ ] Documentar limitações (repleção subótima, sedimento, biotipo)

---

## 9.10 Texto pronto para laudo

### Normal (com volume e RPM):
> "Bexiga com repleção adequada, volume pré-miccional estimado em [Vpre] mL, paredes finas, sem formações endoluminais evidentes. Resíduo pós-miccional estimado em [RPM] mL."

### RPM aumentado:
> "Resíduo pós-miccional estimado em [RPM] mL, sugerindo esvaziamento vesical incompleto. Correlacionar com quadro clínico e avaliação prostática quando aplicável."

### Parede espessada (com repleção adequada):
> "Espessamento difuso da parede vesical (medindo [X] mm) em bexiga adequadamente distendida, podendo relacionar-se a processo inflamatório ou obstrução crônica. Sugere-se correlação clínica e laboratorial."

### Limitação por repleção:
> "Avaliação vesical/pélvica limitada por repleção vesical subótima."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018. (Capítulos de sistema urinário e técnica)
2. ACR–SPR–SRU Practice Parameter for the Performance and Interpretation of Diagnostic Ultrasound Examinations (Revised 2023).

---

**FIM DO CAPÍTULO 9**

*Próximo: Capítulo 10 — USG: Próstata (Suprapúbica, Volume e Correlação com RPM)*

---

# CAPÍTULO 10 — USG: PRÓSTATA (Suprapúbica, Volume e Medidas Associadas)

## 10.1 Objetivo do capítulo

Este capítulo padroniza a biometria prostática por via **suprapúbica** (transabdominal), com foco em:

- **Volume prostático** (medida mais útil)
- Correlação com **bexiga/RPM** (Cap 9)
- Registro mínimo para reprodutibilidade (planos + calipers)

**Fora do escopo v1.0**: USG transretal (TRUS), biópsia guiada, volumetria avançada por segmentação.

---

## 10.2 O que medir

### Medidas padronizadas:

1. **Volume prostático** (3 eixos + elipsoide)
2. **Dimensões brutas** (largura, AP, comprimento) — registrar junto do volume
3. **Protrusão intravesical (IPP)** (opcional, quando evidente)

---

## 10.3 Quando medir

### Indicações:

- ✅ Sintomas urinários baixos (LUTS)
- ✅ Hiperplasia prostática benigna (HPB) — suspeita/seguimento
- ✅ Avaliação de retenção urinária ou **RPM elevado**
- ✅ Triagem em USG abdome/pelve quando próstata é visualizada adequadamente

---

## 10.4 Preparo do paciente

### Regra prática

- **Bexiga repleta** é essencial para janela acústica adequada.
- Seguir protocolo de repleção do **Cap 9**.

**Nota de limitação**:
> "Avaliação prostática limitada por repleção vesical inadequada."

---

## 10.5 Como medir (passo a passo)

### 10.5.1 Planos obrigatórios

- **Transversal**: melhor para **largura**
- **Sagital** (mediano): melhor para **comprimento** e **AP**

**Transdutor**: Convexo 3–5 MHz (padrão).

---

### 10.5.2 Dimensões e volume (fórmula do elipsoide)

**Fórmula**:
```
Volume (mL) = Largura × AP × Comprimento × 0,52
```

**Onde medir cada eixo**:
- **Largura (L)**: maior diâmetro latero-lateral no **plano transversal**
- **AP (A)**: maior diâmetro ântero-posterior no **plano sagital**
- **Comprimento (C)**: maior diâmetro crânio-caudal no **plano sagital**

**Padrão do manual**:
- Medir **contorno externo** da próstata (outer-to-outer).
- Evitar incluir **colo vesical** ou **vesículas seminais** nos calipers.

### Exemplo Resolvido 10.1 — Volume Prostático (Suprapúbico)

**Dados**:
- L = 5,2 cm
- A = 4,3 cm
- C = 4,8 cm

**Cálculo**:
```
V = 5,2 × 4,3 × 4,8 × 0,52
V = 107,3 × 0,52
V = 55,8 mL ≈ 56 mL
```

**Interpretação**: Volume aumentado (ver Tabela 10.1), compatível com HPB no contexto clínico.

**Laudo (trecho)**:
> "Próstata aumentada, com volume estimado em 56 mL (elipsoide), compatível com hiperplasia prostática benigna no contexto clínico."

---

### 10.5.3 Protrusão intravesical (IPP) — opcional

**Definição**: projeção do lobo prostático (geralmente mediano) para dentro da luz vesical.

**Técnica**:
1. Plano sagital mediano com bexiga **moderadamente repleta**
2. Traçar uma linha no **colo vesical** (referência)
3. Medir a distância da linha até o ponto mais proeminente da próstata para dentro da bexiga

**Uso prático**: quando claramente visível, ajuda a reforçar obstrução infravesical em conjunto com RPM e sintomas.

---

## 10.6 Parâmetros técnicos que alteram medidas

### Tabela 10.1 — Fatores de Variabilidade

| Fator | Efeito | Mitigação |
|------|--------|-----------|
| **Bexiga vazia** | Próstata pouco visível | Repleção conforme Cap 9 |
| **Bexiga hiper-repleta** | Distende/achata estruturas, desconforto | Repleção “tolerável”, não extrema |
| **Plano oblíquo** | Subestima eixos | Repetir até maior eixo em cada plano |
| **Ganho alto** | “Engorda” bordas | Ajustar para contorno nítido |
| **Calcificações** | Sombra atrapalha caliper | Mudar janela/ângulo, usar harmônica |

---

## 10.7 Valores de referência (práticos)

### Tabela 10.2 — Volume Prostático (Adultos, regra prática)

| Volume (mL) | Interpretação prática |
|-------------|------------------------|
| **≤ 30** | Dentro do esperado |
| **31–50** | Aumentado leve |
| **51–80** | Aumentado moderado |
| **> 80** | Aumentado acentuado |

**Nota**: Volume isolado não define obstrução. Interpretar junto com sintomas, **RPM** (Cap 9) e, quando aplicável, urodinâmica/urofluxometria.

---

## 10.7.1 Densidade do PSA (PSAD) — quando aplicável

A densidade do PSA (PSAD) ajuda a contextualizar o PSA pelo tamanho da próstata.

**Fórmula**:
```
PSAD (ng/mL/cc) = PSA (ng/mL) / Volume prostático (mL)
```

**Regra prática (apoio)**:
- PSAD **> 0,15 ng/mL/cc** pode aumentar suspeição clínica no contexto apropriado.

---

## 10.8 Interpretação integrada (próstata + bexiga)

| Achado | Interpretação provável | Sugestão de redação |
|-------|-------------------------|---------------------|
| Volume aumentado + RPM elevado | Obstrução infravesical provável | “Achados sugerem obstrução infravesical no contexto clínico.” |
| Volume aumentado + RPM baixo | HPB sem retenção significativa | “Sem evidência de retenção urinária significativa.” |
| Volume normal + RPM elevado | Hipocontratilidade/bexiga neurogênica (possível) | “RPM elevado com próstata sem aumento relevante; correlacionar.” |

---

## 10.9 Armadilhas e erros comuns

| Armadilha | Consequência | Como evitar |
|----------|--------------|-------------|
| Medir com bexiga pouco repleta | Subvisualização/erro | Repleção conforme protocolo |
| Incluir colo vesical nos calipers | Volume superestimado | Identificar limite próstata-bexiga |
| Plano transversal “torto” | Largura incorreta | Centralizar uretra/linha média |
| Usar apenas 1 dimensão | Não reprodutível | Registrar L, A, C + volume |

---

## 10.10 Checklist rápido

### Checklist 10.1 — Biometria Prostática (Suprapúbica)

- [ ] Confirmar repleção vesical adequada (Cap 9)
- [ ] Salvar próstata em **transversal** com caliper (largura)
- [ ] Salvar próstata em **sagital** com calipers (AP e comprimento)
- [ ] Calcular/registrar **volume (mL)** pelo elipsoide
- [ ] Se aplicável: registrar **RPM** no mesmo exame (Cap 9)
- [ ] Documentar limitações (bexiga subótima, biotipo, calcificações)

---

## 10.11 Texto pronto para laudo

### Normal:
> "Próstata com dimensões preservadas, volume estimado em [V] mL (elipsoide)."

### Aumentada (HPB):
> "Próstata aumentada, com volume estimado em [V] mL (elipsoide), compatível com hiperplasia prostática benigna no contexto clínico."

### Aumentada com RPM:
> "Próstata aumentada (volume estimado em [V] mL), associada a resíduo pós-miccional de [RPM] mL, sugerindo obstrução infravesical/esvaziamento incompleto no contexto clínico."

### Limitação:
> "Avaliação prostática limitada por repleção vesical inadequada."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018.
2. ACR–SPR–SRU Practice Parameter for the Performance and Interpretation of Diagnostic Ultrasound Examinations (Revised 2023).

---

**FIM DO CAPÍTULO 10**

*Próximo: Capítulo 11 — USG: Pelve Feminina (Útero, Endométrio e Ovários)*

---

# CAPÍTULO 11 — USG: PELVE FEMININA (Útero, Endométrio e Ovários)

## 11.1 Objetivo do capítulo

Padronizar as **medidas reprodutíveis** na USG pélvica feminina por via **transabdominal**, com foco em:

- **Útero** (3 eixos e, quando útil, volume)
- **Endométrio** (espessura, técnica correta)
- **Ovários** (3 eixos + volume)
- Medidas mínimas para descrição de **lesões anexiais** quando presentes (diâmetros ortogonais)

**Nota**: USG transvaginal (TVUS) frequentemente é superior para endométrio/adnexos, mas está fora do escopo v1.0.

---

## 11.2 O que medir

### Medidas padronizadas:

1. **Útero**:
   - Comprimento (C)
   - AP (A)
   - Largura/transverso (L)
   - Volume uterino (opcional)
2. **Endométrio**:
   - Espessura (mm), técnica “double-layer”
3. **Ovários (direito e esquerdo)**:
   - 3 eixos (C, A, L) + **volume ovariano**
4. **Lesões** (miomas, cistos, massas):
   - 3 diâmetros ortogonais (ou pelo menos 2) + localização

---

## 11.3 Quando medir

### Indicações comuns:

- ✅ Sangramento uterino anormal
- ✅ Dor pélvica / suspeita de massa anexial
- ✅ Miomatose (baseline e seguimento)
- ✅ Avaliação inicial de infertilidade (parte do estudo; não substitui protocolos específicos)
- ✅ Pós-menopausa com sintomas (especialmente sangramento)

---

## 11.4 Preparo do paciente (transabdominal)

### Regra prática

- **Bexiga repleta** melhora janela e desloca alças intestinais.
- Seguir protocolo de repleção do **Cap 9**.

**Nota de limitação**:
> "Avaliação pélvica limitada por repleção vesical inadequada e/ou interposição gasosa."

---

## 11.5 Como medir (passo a passo)

### 11.5.1 Planos obrigatórios (mínimo)

- Útero: **sagital** e **transversal**
- Ovários: planos que permitam **maior eixo** (nem sempre o mesmo para ambos)

---

### 11.5.2 Útero (3 eixos)

**Comprimento (C)** — plano sagital:
- Medir do **fundus** até o **colo** (incluindo colo quando aplicável conforme prática do serviço, mas manter padrão consistente no seguimento).

**AP (A)** — plano sagital:
- Maior diâmetro ântero-posterior do corpo uterino.

**Largura (L)** — plano transversal:
- Maior diâmetro latero-lateral.

**Volume uterino (opcional)**:
```
Volume (mL) = C × L × A × 0,52
```

### Exemplo Resolvido 11.1 — Biometria Uterina + Volume

**Dados**:
- C = 8,4 cm
- L = 4,6 cm
- A = 3,7 cm

**Cálculo**:
```
V = 8,4 × 4,6 × 3,7 × 0,52
V = 142,7 × 0,52
V = 74,2 mL ≈ 74 mL
```

**Laudo (trecho)**:
> "Útero medindo 8,4 × 4,6 × 3,7 cm (volume estimado ~74 mL)."

---

### 11.5.3 Endométrio (espessura em mm)

**Técnica correta (padrão)**:
1. Plano **sagital mediano** do útero (cavidade endometrial melhor definida)
2. Medir a espessura **no ponto de maior espessura**
3. Medida **double-layer** (espessura total do endométrio)
4. **Não incluir** miométrio adjacente
5. Se houver **líquido intracavitário**, medir as duas lâminas e **somar** (ou medir separadamente e relatar)

**Unidade**: sempre **mm**.

### Exemplo Resolvido 11.2 — Endométrio (Pós-menopausa, sintomática)

**Dados**:
- Endométrio medido: 8,0 mm
- Contexto: sangramento pós-menopausa (informado)

**Interpretação prática**:
- Espessura **aumentada** no contexto informado (ver Tabela 11.2)

**Laudo (trecho)**:
> "Endométrio espessado (8,0 mm). Sugere-se correlação com quadro clínico e avaliação ginecológica conforme indicação."

---

### 11.5.4 Ovários (3 eixos + volume)

**Localização prática**:
- Buscar anexos próximo aos **vasos ilíacos** e parede pélvica lateral.

**Medidas**:
- Registrar 3 eixos ortogonais e calcular volume:
```
Volume (mL) = C × L × A × 0,52
```

**Regra operacional**:
> Sempre medir **ovário direito e esquerdo**, mesmo que um seja de difícil visualização (documentar limitação).

### Exemplo Resolvido 11.3 — Volume Ovariano

**Dados (ovário direito)**:
- C = 3,2 cm
- L = 2,4 cm
- A = 1,9 cm

**Cálculo**:
```
V = 3,2 × 2,4 × 1,9 × 0,52
V = 14,6 × 0,52
V = 7,6 mL ≈ 7,6 mL
```

**Interpretação**: Volume dentro do esperado para idade reprodutiva (ver Tabela 11.3).

---

### 11.5.5 Lesões (miomas, cistos, massas): mínimo biométrico

**Padrão mínimo**:
- 3 diâmetros ortogonais (ou 2 se 3º for tecnicamente inviável)
- Localização (ex.: submucoso/intramural/subseroso; anexial D/E)
- Relação com endométrio (quando aplicável)

---

## 11.6 Parâmetros técnicos e qualidade

### Tabela 11.1 — Principais Limitadores em Pelve Feminina (Transabdominal)

| Limitador | Efeito | Mitigação |
|----------|--------|-----------|
| **Bexiga vazia** | Utero/adnexos mal vistos | Repleção conforme Cap 9 |
| **Bexiga hiper-repleta** | Desconforto e distorção | Permitir urinar parcialmente |
| **Interposição gasosa** | Ovários não visualizados | Compressão leve, mudança de decúbito, Trendelenburg leve |
| **Obesidade** | Penetração limitada | Harmônica, menor frequência, janelas alternativas |
| **Útero retrovertido** | Difícil eixo sagital | Ajustar angulação, varrer amplamente, documentar limitação |

---

## 11.7 Valores de referência (práticos)

### Tabela 11.2 — Endométrio: interpretação prática (mm)

| Cenário | Interpretação prática |
|--------|------------------------|
| **Pré-menopausa** | Varia conforme fase do ciclo (ideal: correlacionar com DUM) |
| **Pós-menopausa sem sangramento** | Valores baixos são esperados; interpretar com clínica |
| **Pós-menopausa com sangramento** | Endométrio fino torna etiologia significativa menos provável; endométrio espessado merece correlação/avaliação |

**Regra do manual**: sempre reportar **o número (mm)** e o **contexto informado** (pré/pós-menopausa; com/sem sangramento), evitando conclusões absolutas sem clínica.

### Tabela 11.3 — Volume Ovariano (regra prática)

| Grupo | Volume esperado |
|------|------------------|
| **Idade reprodutiva** | geralmente **≤ 10 mL** |
| **Pós-menopausa** | geralmente **≤ 5 mL** |

### Tabela 11.4 — Útero (regra prática, alta variabilidade)

| Situação | Observação |
|---------|------------|
| **Idade reprodutiva** | Dimensões variam com paridade, miomas e fase hormonal |
| **Pós-menopausa** | Tendência a redução de dimensões/volume ao longo do tempo |

**Nota**: Para útero, a **comparação seriada no mesmo padrão** (mesmos eixos, mesma via) é frequentemente mais útil do que um “cutoff” único.

---

## 11.8 Interpretação prática

| Achado biométrico | Interpretação provável | Conduta sugerida (texto) |
|-------------------|------------------------|---------------------------|
| Útero aumentado globalmente | Miomatose, adenomiose, gestação (se aplicável) | “Útero aumentado… correlacionar com achados e história.” |
| Mioma mensurável | Seguimento por diâmetros/volume | “Mioma intramural de X×Y×Z mm…” |
| Endométrio espessado em contexto de risco | Hiperplasia/pólipo (possível) | “Sugere-se avaliação ginecológica conforme indicação.” |
| Ovário aumentado / lesão anexial | Cisto funcional vs massa | “Lesão anexial… medir e caracterizar; correlacionar.” |

---

## 11.9 Armadilhas e erros comuns

| Armadilha | Consequência | Como evitar |
|----------|--------------|-------------|
| Medir endométrio fora do plano mediano | Sub/superestima | Buscar cavidade bem definida |
| Incluir miométrio na medida do endométrio | Endométrio “falsamente espesso” | Ajustar ganho e caliper na interface correta |
| Não registrar fase do ciclo (quando informado) | Interpretação equivocada | Perguntar/registrar DUM quando possível |
| Ovarário não visto e não documentado | Lacuna de qualidade | Declarar “não visualizado” e motivo provável |
| Lesão medida em plano oblíquo | Medidas não reprodutíveis | Medir em eixos ortogonais, repetir aquisição |

---

## 11.10 Checklist rápido

### Checklist 11.1 — Pelve Feminina (Mínimo Biométrico)

- [ ] Confirmar repleção vesical adequada (Cap 9)
- [ ] Útero: salvar **sagital** (C e AP) com calipers
- [ ] Útero: salvar **transversal** (L) com caliper
- [ ] Endométrio: salvar **sagital mediano** com espessura em **mm**
- [ ] Ovário direito: medir 3 eixos + volume (ou documentar não visualizado)
- [ ] Ovário esquerdo: medir 3 eixos + volume (ou documentar não visualizado)
- [ ] Lesões (se presentes): 2–3 diâmetros + localização
- [ ] Documentar limitações (gases, repleção, biotipo, dor)

---

## 11.11 Texto pronto para laudo

### Normal (modelo):
> "Útero em posição habitual, medindo [C] × [L] × [A] cm. Endométrio medindo [E] mm. Ovários de dimensões preservadas, sem lesões anexiais evidentes."

### Mioma (modelo):
> "Útero com mioma [localização] medindo [X] × [Y] × [Z] mm. Endométrio medindo [E] mm."

### Endométrio espessado (modelo):
> "Endométrio medindo [E] mm. Correlacionar com fase do ciclo/estado menopausal e quadro clínico, sugerindo-se avaliação ginecológica conforme indicação."

### Ovário não visualizado (modelo):
> "Ovário [direito/esquerdo] não visualizado ao método, provavelmente por interposição gasosa e/ou limitação técnica."

### Limitação técnica (modelo):
> "Avaliação pélvica limitada por repleção vesical inadequada e/ou interposição gasosa."

---

## Referências:

1. Rumack CM, Levine D. Diagnostic Ultrasound. 5th ed. Elsevier; 2018.
2. ACR–SPR–SRU Practice Parameter for the Performance and Interpretation of Diagnostic Ultrasound Examinations (Revised 2023).
3. AIUM Practice Parameter for the Performance of an Ultrasound Examination of the Female Pelvis (última revisão disponível no serviço).

---

**FIM DO CAPÍTULO 11**

*Próximo: Capítulo 12 — Doppler: Princípios Operacionais*
