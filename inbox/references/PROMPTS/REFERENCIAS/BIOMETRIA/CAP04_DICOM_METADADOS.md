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
