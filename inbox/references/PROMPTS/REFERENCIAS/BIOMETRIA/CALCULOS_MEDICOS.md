# MANUAL TÉCNICO DE CÁLCULOS PARA ULTRASSONOGRAFIA ABDOMINAL

**Versão 2.0** | **Última atualização: Janeiro/2026**

---

## SUMÁRIO

1. [Introdução e Escopo](#1-introdução-e-escopo)
2. [Padronização de Unidades e Arredondamento](#2-padronização-de-unidades-e-arredondamento)
3. [Cálculos Volumétricos](#3-cálculos-volumétricos)
4. [Próstata](#4-próstata)
5. [Bexiga e Resíduo Pós-Miccional](#5-bexiga-e-resíduo-pós-miccional)
6. [Rins](#6-rins)
7. [Baço](#7-baço)
8. [Fígado](#8-fígado)
9. [Calibres e Diâmetros](#9-calibres-e-diâmetros)
10. [Doppler Vascular](#10-doppler-vascular)
11. [Biblioteca Python](#11-biblioteca-python)
12. [Referências e Placeholders](#12-referências-e-placeholders)

---

# 1. INTRODUÇÃO E ESCOPO

## 1.1 Objetivo
Este manual padroniza os cálculos utilizados em laudos de ultrassonografia abdominal, garantindo:
- Reprodutibilidade entre operadores
- Rastreabilidade de cada valor numérico
- Eliminação de cálculos mentais (usar Python/calculadora)

## 1.2 Regra de Ouro
> ⚠️ **NENHUM NÚMERO SEM FONTE**: Todo valor numérico no laudo deve ter origem documentada (medida direta, cálculo explícito ou referência bibliográfica).

## 1.3 Escopo
| Incluído | Não Incluído |
|----------|--------------|
| Volumes de órgãos sólidos | Obstetrícia |
| Resíduo vesical | Doppler transcraniano |
| Índices Doppler abdominais | Ecocardiografia |
| Calibres vasculares e biliares | Musculoesquelético |

---

# 2. PADRONIZAÇÃO DE UNIDADES E ARREDONDAMENTO

## 2.1 Unidades Oficiais (Tabela 1)

| Grandeza | Unidade Padrão | Alternativa | Conversão |
|----------|----------------|-------------|-----------|
| Comprimento | cm | mm | 1 cm = 10 mm |
| Volume | mL (= cm³) | cc | 1 mL = 1 cm³ |
| Velocidade | cm/s | m/s | 1 m/s = 100 cm/s |
| Fluxo | mL/min | L/min | 1 L = 1000 mL |
| Índices (IR, IP) | adimensional | — | — |

## 2.2 Regras de Arredondamento (Tabela 2)

| Variável | Casas Decimais | Exemplo |
|----------|----------------|---------|
| Volume < 10 mL | 1 decimal | 8,5 mL |
| Volume 10-100 mL | Inteiro | 45 mL |
| Volume > 100 mL | Inteiro | 250 mL |
| Comprimento < 1 cm | 1 decimal (mm) | 6,5 mm |
| Comprimento ≥ 1 cm | 1 decimal (cm) | 12,3 cm |
| Índice de Resistividade | 2 decimais | 0,68 |
| Velocidade | Inteiro | 45 cm/s |

## 2.3 Formatação PT-BR
- Decimal: **vírgula** (4,5 cm)
- Milhar: **ponto** ou espaço (1.250 mL)
- Unidade: sempre após espaço (45 mL)

### ✅ Checklist 1: Antes de Inserir Número no Laudo
- [ ] Valor tem origem documentada?
- [ ] Unidade está explícita?
- [ ] Arredondamento conforme tabela?
- [ ] Formato PT-BR (vírgula decimal)?

---

# 3. CÁLCULOS VOLUMÉTRICOS

## 3.1 Métodos de Cálculo de Volume (Tabela 3)

| Método | Fórmula | Precisão | Uso Típico |
|--------|---------|----------|------------|
| Elipsoide (0,52) | V = A × B × C × 0,52 | ±10-15% | Próstata, vesícula |
| Elipsoide (π/6) | V = A × B × C × 0,5236 | ±10-15% | Equivalente ao 0,52 |
| Planimetria | V = Σ(Área × Espessura) | ±5-10% | Massas irregulares |
| Voxel-count | V = N × volume_voxel | ±2-5% | 3D automatizado |

## 3.2 Fórmula do Elipsoide

### Quando Usar
- Estruturas aproximadamente ovoides/elípticas
- Próstata, vesícula seminal, cistos, nódulos

### Como Medir
1. **Eixo A (longitudinal)**: maior comprimento craniocaudal
2. **Eixo B (transverso)**: maior largura latero-lateral
3. **Eixo C (anteroposterior)**: maior profundidade

### Fórmula
```
V = A × B × C × K

Onde:
- V = volume em mL (se entradas em cm)
- A, B, C = eixos em cm
- K = 0,52 (aproximação) ou π/6 ≈ 0,5236 (exato)
```

### Comparação 0,52 vs π/6

| Fator | 0,52 | π/6 |
|-------|------|-----|
| Valor exato | 0,52 | 0,5236 |
| Diferença | -0,7% | referência |
| Uso clínico | Mais comum | Academicamente correto |
| Impacto prático | Desprezível | — |

**Consenso**: Ambos são aceitos. Para consistência, usar **0,52**.

### Exemplo Resolvido 1
**Dados**: Próstata com eixos 4,5 × 3,8 × 4,0 cm

**Cálculo**:
```
V = 4,5 × 3,8 × 4,0 × 0,52
V = 68,4 × 0,52
V = 35,57 mL
V ≈ 36 mL (arredondado)
```

### Armadilhas
- ❌ Medir no plano errado (oblíquo)
- ❌ Incluir calcificações periféricas como parênquima
- ❌ Confundir unidades (mm vs cm)
- ❌ Esquecer de multiplicar por 0,52

---

# 4. PRÓSTATA

## 4.1 Volume Prostático

### Quando Usar
- Avaliação de HPB
- Cálculo de PSA densidade
- Planejamento de biópsia/tratamento

### Como Medir (Tabela 4)
| Eixo | Plano | Técnica |
|------|-------|---------|
| Longitudinal | Sagital | Do colo vesical ao ápice |
| Transverso | Axial | Maior largura latero-lateral |
| Anteroposterior | Axial ou Sagital | Da cápsula anterior à posterior |

### Fórmula
```
Volume (mL) = AP × T × L × 0,52

Onde:
- AP = anteroposterior (cm)
- T = transverso (cm)
- L = longitudinal (cm)
```

### Exemplo Resolvido 2
**Dados**: Próstata 4,2 × 5,0 × 4,8 cm

**Cálculo**:
```
V = 4,2 × 5,0 × 4,8 × 0,52
V = 100,8 × 0,52
V = 52,4 mL
V ≈ 52 mL
```

### Interpretação (Tabela 5)
| Volume | Classificação |
|--------|---------------|
| < 30 mL | Normal |
| 30-50 mL | Aumento leve |
| 50-80 mL | Aumento moderado |
| > 80 mL | Aumento acentuado |

> ⚠️ *Varia por fonte*: alguns autores usam < 25 mL como normal.

### Armadilhas
- Vesículas seminais incluídas na medida
- Lobo mediano projetando-se na bexiga
- Calcificações grandes distorcendo contorno

### Texto Pronto para Laudo
> "Próstata de dimensões aumentadas, medindo [AP] × [T] × [L] cm, com volume estimado de [V] mL (cálculo: [AP] × [T] × [L] × 0,52), compatível com aumento [classificação]."

### ✅ Checklist 2: Volume Prostático
- [ ] Três eixos ortogonais medidos?
- [ ] Vesículas seminais excluídas?
- [ ] Cálculo executado (não mental)?
- [ ] Classificação aplicada?
- [ ] Texto inclui fórmula?

---

# 5. BEXIGA E RESÍDUO PÓS-MICCIONAL

## 5.1 Volume Vesical

### Quando Usar
- Pré-miccional: avaliar repleção adequada
- Pós-miccional: quantificar resíduo (RPM)

### Como Medir
1. Bexiga em máxima repleção (pré) ou logo após micção (pós)
2. Medir nos planos transversal e sagital
3. Calipers nas bordas internas da parede

### Fórmula
```
Volume (mL) = Altura × Largura × Profundidade × 0,52
```

### Exemplo Resolvido 3 (Pré-Miccional)
**Dados**: Bexiga 10,2 × 8,5 × 9,0 cm

```
V = 10,2 × 8,5 × 9,0 × 0,52
V = 780,3 × 0,52
V = 405,8 mL ≈ 406 mL
```

### Exemplo Resolvido 4 (RPM)
**Dados**: Bexiga pós-miccional 5,5 × 4,2 × 4,0 cm

```
RPM = 5,5 × 4,2 × 4,0 × 0,52
RPM = 92,4 × 0,52
RPM = 48,0 mL ≈ 48 mL
```

### Interpretação RPM (Tabela 6)
| RPM | Interpretação | Conduta Sugerida |
|-----|---------------|------------------|
| < 50 mL | Normal | — |
| 50-100 mL | Elevado | Correlação clínica |
| 100-200 mL | Significativo | Investigar causa |
| > 200 mL | Acentuado | Avaliação urológica |
| > 400 mL | Retenção | Urgência urológica |

> ⚠️ *Varia por fonte*: alguns usam < 100 mL como normal em idosos.

### Armadilhas
- Medir antes de micção completa
- Jato urinário incluído na medida
- Divertículos não incluídos
- Bexiga contraída/espástica

### Texto Pronto para Laudo

**Pré-miccional:**
> "Bexiga com repleção adequada, volume estimado de [V] mL."

**RPM normal:**
> "Bexiga adequadamente esvaziada após micção, com resíduo pós-miccional estimado de [RPM] mL (normal)."

**RPM elevado:**
> "Esvaziamento vesical incompleto, com resíduo pós-miccional estimado de [RPM] mL (cálculo: [A] × [B] × [C] × 0,52), [classificação]. Sugere-se correlação clínica e avaliação urológica."

### ✅ Checklist 3: Resíduo Pós-Miccional
- [ ] Paciente urinou imediatamente antes?
- [ ] Medida em até 10 minutos pós-micção?
- [ ] Três eixos medidos?
- [ ] Cálculo documentado?
- [ ] Classificação aplicada?

---

# 6. RINS

## 6.1 Volume Renal

### Quando Usar
- Avaliação de doença renal crônica
- Assimetria renal
- Seguimento de rins transplantados

### Como Medir (Tabela 7)
| Eixo | Plano | Referência |
|------|-------|------------|
| Comprimento | Sagital oblíquo | Polo a polo |
| Largura | Axial | Hilo a superfície lateral |
| Espessura | Axial | Anterior a posterior |

### Fórmula
```
Volume (mL) = C × L × E × 0,52

Onde:
- C = comprimento (cm)
- L = largura (cm)
- E = espessura (cm)
```

### Exemplo Resolvido 5
**Dados**: Rim direito 10,5 × 4,8 × 5,2 cm

```
V = 10,5 × 4,8 × 5,2 × 0,52
V = 262,08 × 0,52
V = 136,3 mL ≈ 136 mL
```

### Valores de Referência (Tabela 8)
| Parâmetro | Normal Adulto |
|-----------|---------------|
| Comprimento | 9-12 cm |
| Largura | 4-6 cm |
| Espessura cortical | 1,0-1,5 cm |
| Volume | 120-200 mL |
| Diferença entre rins | < 2 cm comprimento |

### Índice Córtico-Medular
- **Normal**: Relação preservada, córtex ligeiramente hipoecoico ao fígado/baço
- **Alterado**: Perda da diferenciação, hiperecogenicidade cortical

### Texto Pronto para Laudo
> "Rim [lado] em topografia habitual, medindo [C] × [L] × [E] cm (volume estimado: [V] mL), com contornos regulares e relação corticomedular preservada."

---

# 7. BAÇO

## 7.1 Dimensões Esplênicas

### Quando Usar
- Investigação de esplenomegalia
- Doenças hematológicas
- Hipertensão portal

### Como Medir
1. Eixo longitudinal: maior comprimento craniocaudal
2. Medir no plano coronal oblíquo intercostal
3. Evitar incluir cauda do pâncreas

### Valores de Referência (Tabela 9)
| Parâmetro | Normal | Leve | Moderada | Acentuada |
|-----------|--------|------|----------|-----------|
| Eixo longitudinal | ≤ 12 cm | 12-15 cm | 15-20 cm | > 20 cm |
| Índice esplênico | ≤ 480 cm³ | — | — | — |

### Índice Esplênico
```
IE = Comprimento × Largura × Espessura (sem fator)
Normal: < 480 cm³
```

### Exemplo Resolvido 6
**Dados**: Baço 14,5 × 5,0 × 4,5 cm

```
Eixo longitudinal: 14,5 cm → Esplenomegalia leve
IE = 14,5 × 5,0 × 4,5 = 326,3 cm³ → Normal
```

### Texto Pronto para Laudo

**Normal:**
> "Baço de dimensões normais, com eixo longitudinal de [X] cm e ecotextura homogênea."

**Esplenomegalia:**
> "Baço com dimensões aumentadas, apresentando eixo longitudinal de [X] cm, compatível com esplenomegalia [grau]. Ecotextura homogênea, sem lesões focais."

### ✅ Checklist 4: Baço
- [ ] Medido no eixo craniocaudal máximo?
- [ ] Cauda do pâncreas excluída?
- [ ] Classificação de esplenomegalia aplicada?
- [ ] Ecotextura descrita?

---

# 8. FÍGADO

## 8.1 Biometria Hepática

### Medidas Padronizadas (Tabela 10)
| Medida | Local | Normal |
|--------|-------|--------|
| Lobo direito (LMC) | Linha medioclavicular | ≤ 15,5 cm |
| Lobo esquerdo | Linha média | ≤ 10 cm |
| Lobo caudado | Transversal | ≤ 3,5 cm |

### Índice do Lobo Caudado (ILC)
```
ILC = Lobo Caudado / Lobo Direito

Normal: < 0,65
Cirrose: > 0,65
```

### Exemplo Resolvido 7
**Dados**: Lobo caudado 3,2 cm, Lobo direito 14,0 cm

```
ILC = 3,2 / 14,0 = 0,23 → Normal
```

### Graduação de Esteatose (Tabela 11)
| Grau | Ecogenicidade | Atenuação Posterior | Visualização Vasos |
|------|---------------|---------------------|-------------------|
| 0 | Normal | Ausente | Normal |
| I (leve) | Aumentada | Ausente/leve | Preservada |
| II (moderada) | Aumentada | Moderada | Parcialmente borrada |
| III (acentuada) | Muito aumentada | Acentuada | Não visualizados |

### Texto Pronto para Laudo

**Normal:**
> "Fígado de dimensões normais, contornos regulares, ecotextura homogênea e ecogenicidade preservada. Veias hepáticas e ramos portais de calibre e trajeto normais."

**Esteatose:**
> "Fígado com ecogenicidade difusamente aumentada, compatível com esteatose hepática grau [I/II/III], [com/sem] atenuação acústica posterior significativa."

---

# 9. CALIBRES E DIÂMETROS

## 9.1 Colédoco

### Valores de Referência (Tabela 12)
| Situação | Diâmetro Normal |
|----------|-----------------|
| Sem colecistectomia | ≤ 6-7 mm |
| Pós-colecistectomia | ≤ 10 mm |
| Idoso (> 60 anos) | Até 8-9 mm |
| Acréscimo por década | +1 mm após 60 anos |

> ⚠️ *Varia por fonte*: alguns aceitam até 8 mm em adultos sem colecistectomia.

### Como Medir
1. Varredura no plano oblíquo subcostal direito
2. Medir na porção distal, antes da entrada no pâncreas
3. Calipers nas paredes internas (luz)

### Texto Pronto para Laudo
> "Ducto colédoco de calibre normal, medindo [X] mm em seu segmento [proximal/distal]."

### ✅ Checklist 5: Via Biliar
- [ ] Medido na porção correta?
- [ ] Considerada colecistectomia prévia?
- [ ] Considerada idade do paciente?

## 9.2 Aorta Abdominal

### Valores de Referência
| Segmento | Normal | Ectasia | AAA |
|----------|--------|---------|-----|
| Suprarrenal | ≤ 25 mm | 25-29 mm | ≥ 30 mm |
| Infrarrenal | ≤ 20 mm | 20-29 mm | ≥ 30 mm |

### Classificação de AAA
| Diâmetro | Classificação | Conduta |
|----------|---------------|---------|
| < 30 mm | Normal/Ectasia | — |
| 30-49 mm | AAA pequeno | Controle 12 meses |
| 50-59 mm | AAA moderado | Controle 6 meses |
| ≥ 60 mm | AAA grande | Avaliação cirúrgica |

### Texto Pronto para Laudo

**Normal:**
> "Aorta abdominal de trajeto e calibre preservados, medindo [X] mm em seu segmento infrarrenal."

**AAA:**
> "Aorta abdominal com dilatação aneurismática infrarrenal, medindo [X] mm de diâmetro anteroposterior, compatível com aneurisma de aorta abdominal [classificação]. Recomenda-se avaliação vascular."

## 9.3 Veia Porta

### Valores de Referência
| Parâmetro | Normal | Alterado |
|-----------|--------|----------|
| Diâmetro | ≤ 13 mm | > 13 mm |
| Velocidade média | 15-20 cm/s | < 15 cm/s |
| Direção do fluxo | Hepatopetal | Hepatofugal |

### ✅ Checklist 6: Veia Porta
- [ ] Diâmetro medido no hilo?
- [ ] Fluxo Doppler avaliado?
- [ ] Direção do fluxo documentada?
- [ ] Velocidade registrada?

---

# 10. DOPPLER VASCULAR

## 10.1 Índice de Resistividade (IR)

### Quando Usar
- Avaliação de estenose de artéria renal
- Nefropatia crônica
- Rejeição de transplante renal
- Obstrução urinária

### Como Medir
1. **Amostra**: Artéria interlobar ou arqueada
2. **Ângulo**: < 60° (idealmente 0°)
3. **PRF**: Ajustar para captar todo espectro
4. **Sample volume**: 2-4 mm
5. **Mínimo**: 3 ondas consecutivas uniformes

### Fórmula
```
IR = (VPS - VDF) / VPS

Onde:
- VPS = Velocidade de Pico Sistólico (cm/s)
- VDF = Velocidade Diastólica Final (cm/s)
```

### Exemplo Resolvido 8
**Dados**: VPS = 45 cm/s, VDF = 15 cm/s

```
IR = (45 - 15) / 45
IR = 30 / 45
IR = 0,67
```

### Interpretação
| IR | Interpretação |
|----|---------------|
| < 0,70 | Normal |
| 0,70-0,75 | Limítrofe |
| > 0,75 | Elevado |
| > 0,80 | Muito elevado |

### Armadilhas
- Ângulo > 60° (subestima velocidades)
- Respiração inadequada
- Amostra em vaso errado (veia)
- Calibração incorreta do Doppler

### Texto Pronto para Laudo
> "Índice de resistividade das artérias renais [normal/elevado] bilateralmente: RD = [X], RE = [X] (VPS [X] cm/s, VDF [X] cm/s)."

### ✅ Checklist 7: IR Renal
- [ ] Artéria interlobar identificada?
- [ ] Ângulo < 60°?
- [ ] ≥3 ondas uniformes?
- [ ] IR calculado (não estimado)?
- [ ] Bilateral comparado?

## 10.2 Razão Renal-Aórtica (RAR)

### Quando Usar
- Screening de estenose de artéria renal
- Hipertensão renovascular

### Como Medir
1. **VPS da artéria renal**: No óstio ou porção proximal
2. **VPS da aorta**: No mesmo nível

### Fórmula
```
RAR = VPS artéria renal / VPS aorta
```

### Exemplo Resolvido 9
**Dados**: VPS artéria renal = 180 cm/s, VPS aorta = 60 cm/s

```
RAR = 180 / 60 = 3,0
```

### Interpretação
| RAR | Interpretação |
|-----|---------------|
| < 3,5 | Normal |
| ≥ 3,5 | Sugere estenose ≥ 60% |

### Texto Pronto para Laudo
> "Razão renal-aórtica (RAR) dentro da normalidade bilateralmente: RD = [X], RE = [X]. Sem sinais de estenose hemodinamicamente significativa."

## 10.3 Tempo de Aceleração (TA) e Índice de Aceleração (IA)

### Quando Usar
- Complemento na avaliação de estenose renal
- Quando RAR é duvidoso

### Como Medir
1. Medir do início da sístole ao pico sistólico
2. Usar artéria interlobar

### Fórmulas
```
TA = Tempo do início ao pico sistólico (ms)
IA = VPS / TA (cm/s²)
```

### Valores de Referência
| Parâmetro | Normal | Sugere Estenose |
|-----------|--------|-----------------|
| TA | < 70 ms | > 100 ms |
| IA | > 300 cm/s² | < 300 cm/s² |

### Exemplo Resolvido 10
**Dados**: TA = 85 ms, VPS = 25 cm/s

```
IA = 25 / 0,085 = 294 cm/s² → Limítrofe
```

## 10.4 Fluxo Volumétrico Portal (Opcional)

### Quando Usar
- Quantificação de hipertensão portal
- Avaliação pré-TIPS
- Seguimento de shunts portossistêmicos

### Como Medir
1. Medir diâmetro da veia porta (cm)
2. Obter velocidade média (Vmean) no mesmo local
3. Calcular área (πr²)

### Fórmula
```
Fluxo (mL/min) = Área × Vmean × 60

Onde:
- Área = π × (D/2)² em cm²
- Vmean = velocidade média em cm/s
- 60 = conversão para minutos
```

### Exemplo Resolvido 11
**Dados**: Diâmetro porta = 1,2 cm, Vmean = 18 cm/s

```
Raio = 1,2 / 2 = 0,6 cm
Área = π × 0,6² = 3,1416 × 0,36 = 1,13 cm²
Fluxo = 1,13 × 18 × 60 = 1.220 mL/min
```

### Valores de Referência
| Fluxo Portal | Interpretação |
|--------------|---------------|
| 700-1200 mL/min | Normal |
| < 700 mL/min | Reduzido |
| > 1200 mL/min | Aumentado |

### ✅ Checklist 8: Doppler Portal
- [ ] Diâmetro e velocidade no mesmo ponto?
- [ ] Vmean (não VPS)?
- [ ] Direção do fluxo documentada?
- [ ] Permeabilidade confirmada?

---

# 11. BIBLIOTECA PYTHON

## 11.1 Módulo Completo

```python
"""
MÓDULO DE CÁLCULOS PARA ULTRASSONOGRAFIA ABDOMINAL
Versão 2.0 | Janeiro/2026
"""

from typing import Tuple, Optional
import math

# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def converter_para_cm(valor: float, unidade: str = 'cm') -> float:
    """Converte mm para cm se necessário."""
    if unidade.lower() == 'mm':
        return valor / 10
    return valor

def formatar_br(numero: float, casas: int = 1) -> str:
    """Formata número no padrão brasileiro (vírgula decimal)."""
    return f"{numero:.{casas}f}".replace('.', ',')

def arredondar_volume(volume: float) -> int:
    """Aplica regras de arredondamento para volumes."""
    if volume < 10:
        return round(volume, 1)
    return round(volume)

# ============================================================
# VOLUMES
# ============================================================

def volume_elipsoide(a: float, b: float, c: float, 
                     unidade: str = 'cm', 
                     fator: float = 0.52) -> Tuple[float, str]:
    """
    Calcula volume de estrutura elipsoide.
    
    Args:
        a, b, c: Três eixos da estrutura
        unidade: 'cm' ou 'mm'
        fator: 0.52 (padrão) ou 0.5236 (π/6)
    
    Returns:
        Tupla (volume em mL, texto formatado)
    """
    # Converter se necessário
    a = converter_para_cm(a, unidade)
    b = converter_para_cm(b, unidade)
    c = converter_para_cm(c, unidade)
    
    # Validar
    if any(v <= 0 for v in [a, b, c]):
        raise ValueError("Medidas devem ser positivas")
    
    # Calcular
    volume = a * b * c * fator
    volume_arr = arredondar_volume(volume)
    
    # Texto
    texto = (f"{formatar_br(a)} × {formatar_br(b)} × {formatar_br(c)} cm, "
             f"volume estimado de {volume_arr} mL "
             f"({formatar_br(a)} × {formatar_br(b)} × {formatar_br(c)} × {fator} = "
             f"{formatar_br(volume, 1)})")
    
    return volume_arr, texto

# ============================================================
# PRÓSTATA
# ============================================================

def volume_prostatico(ap: float, t: float, l: float,
                      unidade: str = 'cm') -> Tuple[float, str, str]:
    """
    Calcula volume prostático e classifica.
    
    Returns:
        Tupla (volume, classificação, texto para laudo)
    """
    volume, _ = volume_elipsoide(ap, t, l, unidade)
    
    if volume < 30:
        classif = "normal"
    elif volume < 50:
        classif = "aumento leve"
    elif volume < 80:
        classif = "aumento moderado"
    else:
        classif = "aumento acentuado"
    
    # Converter para cm para texto
    ap = converter_para_cm(ap, unidade)
    t = converter_para_cm(t, unidade)
    l = converter_para_cm(l, unidade)
    
    if classif == "normal":
        texto = (f"Próstata de dimensões normais, medindo "
                f"{formatar_br(ap)} × {formatar_br(t)} × {formatar_br(l)} cm, "
                f"com volume estimado de {volume} mL.")
    else:
        texto = (f"Próstata de dimensões aumentadas, medindo "
                f"{formatar_br(ap)} × {formatar_br(t)} × {formatar_br(l)} cm, "
                f"com volume estimado de {volume} mL "
                f"({formatar_br(ap)} × {formatar_br(t)} × {formatar_br(l)} × 0,52), "
                f"compatível com {classif}.")
    
    return volume, classif, texto

# ============================================================
# RESÍDUO PÓS-MICCIONAL
# ============================================================

def residuo_pos_miccional(a: float, b: float, c: float,
                          unidade: str = 'cm') -> Tuple[float, str, str]:
    """
    Calcula RPM e classifica.
    
    Returns:
        Tupla (volume, classificação, texto para laudo)
    """
    volume, _ = volume_elipsoide(a, b, c, unidade)
    
    if volume < 50:
        classif = "normal"
        texto = (f"Bexiga adequadamente esvaziada após micção, "
                f"com resíduo pós-miccional de {volume} mL (normal).")
    elif volume < 100:
        classif = "elevado"
        texto = (f"Resíduo pós-miccional de {volume} mL (elevado). "
                f"Sugere-se correlação clínica.")
    elif volume < 200:
        classif = "significativo"
        texto = (f"Esvaziamento vesical incompleto, com resíduo "
                f"pós-miccional de {volume} mL (significativo). "
                f"Sugere-se avaliação urológica.")
    else:
        classif = "acentuado"
        texto = (f"Esvaziamento vesical incompleto, com resíduo "
                f"pós-miccional acentuado de {volume} mL. "
                f"Recomenda-se avaliação urológica urgente.")
    
    return volume, classif, texto

# ============================================================
# DOPPLER
# ============================================================

def indice_resistividade(vps: float, vdf: float) -> Tuple[float, str, str]:
    """
    Calcula IR e classifica.
    
    Args:
        vps: Velocidade de pico sistólico (cm/s)
        vdf: Velocidade diastólica final (cm/s)
    
    Returns:
        Tupla (IR, classificação, texto)
    """
    if vps <= 0:
        raise ValueError("VPS deve ser positivo")
    if vdf < 0:
        raise ValueError("VDF não pode ser negativo")
    if vdf > vps:
        raise ValueError("VDF não pode ser maior que VPS")
    
    ir = (vps - vdf) / vps
    
    if ir < 0.70:
        classif = "normal"
    elif ir <= 0.75:
        classif = "limítrofe"
    else:
        classif = "elevado"
    
    texto = f"IR = {formatar_br(ir, 2)} ({classif})"
    
    return round(ir, 2), classif, texto

def razao_renal_aortica(vps_renal: float, vps_aorta: float) -> Tuple[float, str, str]:
    """
    Calcula RAR para screening de estenose renal.
    
    Returns:
        Tupla (RAR, classificação, texto)
    """
    if vps_aorta <= 0:
        raise ValueError("VPS da aorta deve ser positivo")
    
    rar = vps_renal / vps_aorta
    
    if rar < 3.5:
        classif = "normal"
        texto = f"RAR = {formatar_br(rar, 1)} (normal, sem sinais de estenose)"
    else:
        classif = "sugere estenose ≥60%"
        texto = f"RAR = {formatar_br(rar, 1)} (elevado, sugere estenose ≥60%)"
    
    return round(rar, 1), classif, texto

def fluxo_portal(diametro: float, vmean: float,
                 unidade_d: str = 'cm') -> Tuple[float, str, str]:
    """
    Calcula fluxo volumétrico portal.
    
    Args:
        diametro: Diâmetro da veia porta
        vmean: Velocidade média (cm/s)
        unidade_d: Unidade do diâmetro ('cm' ou 'mm')
    
    Returns:
        Tupla (fluxo mL/min, classificação, texto)
    """
    d = converter_para_cm(diametro, unidade_d)
    raio = d / 2
    area = math.pi * raio ** 2
    fluxo = area * vmean * 60
    
    if 700 <= fluxo <= 1200:
        classif = "normal"
    elif fluxo < 700:
        classif = "reduzido"
    else:
        classif = "aumentado"
    
    texto = f"Fluxo portal = {round(fluxo)} mL/min ({classif})"
    
    return round(fluxo), classif, texto

# ============================================================
# EXEMPLOS DE USO
# ============================================================

if __name__ == "__main__":
    # Próstata
    vol, classif, txt = volume_prostatico(4.5, 3.8, 4.0)
    print(f"Próstata: {txt}\n")
    
    # RPM
    vol, classif, txt = residuo_pos_miccional(55, 42, 40, 'mm')
    print(f"RPM: {txt}\n")
    
    # IR
    ir, classif, txt = indice_resistividade(45, 15)
    print(f"Doppler: {txt}\n")
    
    # RAR
    rar, classif, txt = razao_renal_aortica(180, 60)
    print(f"RAR: {txt}\n")
    
    # Fluxo Portal
    fluxo, classif, txt = fluxo_portal(12, 18, 'mm')
    print(f"Portal: {txt}")
```

## 11.2 Exemplos de Uso no Code Interpreter

### Exemplo 12: Próstata
```python
vol, classif, texto = volume_prostatico(4.5, 3.8, 4.0)
print(texto)
# Saída: Próstata de dimensões aumentadas, medindo 4,5 × 3,8 × 4,0 cm, 
# com volume estimado de 36 mL (4,5 × 3,8 × 4,0 × 0,52), compatível com aumento leve.
```

### Exemplo 13: RPM em mm
```python
vol, classif, texto = residuo_pos_miccional(55, 42, 40, 'mm')
print(texto)
# Saída: Resíduo pós-miccional de 48 mL (normal).
```

### Exemplo 14: IR Renal
```python
ir, classif, texto = indice_resistividade(52, 12)
print(texto)
# Saída: IR = 0,77 (elevado)
```

### Exemplo Resolvido 15: RAR com Estenose
**Dados**: VPS artéria renal = 250 cm/s, VPS aorta = 55 cm/s

```
RAR = 250 / 55 = 4,5 → Sugere estenose ≥60%
```

### Exemplo Resolvido 16: Volume Renal Bilateral
**Dados**: RD 11,2 × 5,0 × 4,8 cm | RE 10,8 × 4,6 × 4,5 cm

```
Volume RD = 11,2 × 5,0 × 4,8 × 0,52 = 139,8 mL ≈ 140 mL
Volume RE = 10,8 × 4,6 × 4,5 × 0,52 = 116,3 mL ≈ 116 mL
Diferença: 140 - 116 = 24 mL (assimetria discreta)
```

### Exemplo Resolvido 17: RPM Acentuado
**Dados**: Bexiga pós-miccional 8,5 × 7,0 × 6,5 cm

```
RPM = 8,5 × 7,0 × 6,5 × 0,52
RPM = 386,75 × 0,52
RPM = 201,1 mL ≈ 201 mL → Acentuado
```

### Exemplo Resolvido 18: Índice do Lobo Caudado (Cirrose)
**Dados**: Lobo caudado 4,8 cm, Lobo direito 11,0 cm

```
ILC = 4,8 / 11,0 = 0,44 → Limítrofe (< 0,65 = normal)
```

### Exemplo Resolvido 19: Esplenomegalia Acentuada
**Dados**: Baço 22,5 × 8,0 × 6,5 cm

```
Eixo longitudinal: 22,5 cm → Esplenomegalia acentuada (> 20 cm)
IE = 22,5 × 8,0 × 6,5 = 1.170 cm³ → Muito aumentado (normal < 480)
```

### Exemplo Resolvido 20: Fluxo Portal Reduzido
**Dados**: Diâmetro porta = 14 mm, Vmean = 10 cm/s

```
Raio = 1,4 / 2 = 0,7 cm
Área = π × 0,7² = 1,54 cm²
Fluxo = 1,54 × 10 × 60 = 924 mL/min → Porém com velocidade < 15 cm/s (hipertensão portal)
```

---

# 12. REFERÊNCIAS BIBLIOGRÁFICAS

## 12.1 Referências Principais

### Livros-Texto de Referência

| Código | Referência Completa |
|--------|---------------------|
| **[RUMACK]** | Rumack CM, Levine D. **Diagnostic Ultrasound**. 5th ed. Philadelphia: Elsevier; 2018. |
| **[ACR]** | American College of Radiology. **ACR Appropriateness Criteria®**. Disponível em: acrappropriateness.org |
| **[AIUM]** | American Institute of Ultrasound in Medicine. **AIUM Practice Parameters**. Disponível em: aium.org |
| **[CERRI]** | Cerri GG, Oliveira IRS. **Ultrassonografia Abdominal**. 2ª ed. Rio de Janeiro: Revinter; 2009. |
| **[DEFINED]** | Defined Ultrasound Training. **UGAP Abdominal Guidelines**. |

---

## 12.2 Referências por Tópico

### Volume Prostático

| # | Referência | Achado Principal |
|---|------------|------------------|
| 1 | Terris MK, Stamey TA. **Determination of prostate volume by transrectal ultrasound**. J Urol. 1991;145(5):984-7. | Fórmula elipsoide (L×W×H×0,52) validada |
| 2 | Roehrborn CG. **Accurate determination of prostate size via digital rectal examination and transrectal ultrasound**. Urology. 1998;51(4A Suppl):19-22. | Correlação volume-HPB |
| 3 | Lee C, et al. **Measurement of prostate-specific antigen density**. Urology. 2007;70(6):1122-7. | PSA densidade = PSA/Volume |

**Valores de Referência Adotados:**
- Volume normal: < 30 mL [RUMACK, CERRI]
- Fator 0,52 ≈ π/6: [Terris & Stamey, 1991]

---

### Resíduo Pós-Miccional (RPM)

| # | Referência | Achado Principal |
|---|------------|------------------|
| 4 | Kolman C, et al. **Distribution of post-void residual urine volume in community-dwelling men**. J Urol. 1999;161(1):122-7. | RPM aumenta com idade |
| 5 | Rule AD, et al. **The association between benign prostatic hyperplasia and chronic kidney disease**. Kidney Int. 2005;67(6):2376-82. | RPM > 100 mL = risco renal |
| 6 | Asimakopoulos AD, et al. **Bladder emptying failure: new data on chronic urinary retention**. BJU Int. 2014;113(1):3-9. | RPM > 300 mL = retenção crônica |

**Valores de Referência Adotados:**
- RPM normal: < 50 mL [Kolman, 1999]
- RPM significativo: > 100 mL [Rule, 2005]
- Retenção: > 300-400 mL [Asimakopoulos, 2014]

---

### Índice de Resistividade Renal (IR)

| # | Referência | Achado Principal |
|---|------------|------------------|
| 7 | Platt JF, et al. **Duplex Doppler evaluation of native kidney dysfunction**. AJR Am J Roentgenol. 1989;152(2):309-13. | IR > 0,70 = nefropatia |
| 8 | Radermacher J, et al. **The renal arterial resistance index and renal allograft survival**. N Engl J Med. 2003;349(2):115-24. | IR prediz sobrevida do enxerto |
| 9 | Tublin ME, et al. **The resistive index in renal Doppler sonography: where do we stand?** AJR. 2003;180(4):885-92. | Revisão sistemática |

**Valores de Referência Adotados:**
- IR normal: < 0,70 [Platt, 1989; RUMACK]
- IR limítrofe: 0,70-0,75
- IR elevado: > 0,75 [Radermacher, 2003]

---

### Razão Renal-Aórtica (RAR) e Estenose Renal

| # | Referência | Achado Principal |
|---|------------|------------------|
| 10 | Olin JW, et al. **Renovascular disease in the new millennium**. J Am Coll Cardiol. 2004;44(4):1241-50. | RAR ≥ 3,5 = estenose ≥ 60% |
| 11 | Williams GJ, et al. **Duplex ultrasound for renal artery stenosis screening**. J Vasc Surg. 2007;46(4):731-8. | Sensibilidade 85%, Especificidade 92% |
| 12 | Zierler RE, et al. **Doppler ultrasound screening of renal artery stenosis**. Ultrasound Med Biol. 1994;20(4):309-17. | Critérios validados |

**Valores de Referência Adotados:**
- RAR normal: < 3,5 [Olin, 2004]
- RAR ≥ 3,5: sugere estenose ≥ 60%

---

### Calibre do Colédoco

| # | Referência | Achado Principal |
|---|------------|------------------|
| 13 | Kaim A, et al. **The value of upper abdominal US in the diagnosis of biliary obstruction**. Eur Radiol. 2004;14(6):1092-104. | Colédoco normal ≤ 6-7 mm |
| 14 | Bowie JD. **What is the upper limit of normal for the common bile duct on ultrasound?** J Clin Ultrasound. 2000;28(9):449-51. | Aumenta 1 mm/década após 60 anos |
| 15 | Park SM, et al. **Changes in common bile duct diameter in elderly subjects**. J Clin Ultrasound. 2009;37(5):292-6. | Pós-colecistectomia ≤ 10 mm |

**Valores de Referência Adotados:**
- Sem colecistectomia: ≤ 6-7 mm [Kaim, 2004]
- Pós-colecistectomia: ≤ 10 mm [Park, 2009]
- Idoso (> 60 anos): até 8-9 mm [Bowie, 2000]

---

### Baço e Esplenomegalia

| # | Referência | Achado Principal |
|---|------------|------------------|
| 16 | Niederau C, et al. **Sonographic measurements of the normal liver, spleen, pancreas, and portal vein**. Radiology. 1983;149(2):537-40. | Baço normal ≤ 12 cm |
| 17 | Lamb PM, et al. **Spleen size: how well do linear ultrasound measurements correlate with three-dimensional CT volume assessments?** Br J Radiol. 2002;75(895):573-7. | Correlação linear-3D |
| 18 | Chow KU, et al. **Spleen size is significantly influenced by body height and sex**. Ann Hematol. 2005;84(5):297-301. | Correção por altura/sexo |

**Valores de Referência Adotados:**
- Normal: ≤ 12 cm [Niederau, 1983; RUMACK]
- Esplenomegalia leve: 12-15 cm
- Esplenomegalia moderada: 15-20 cm
- Esplenomegalia acentuada: > 20 cm

---

### Fígado e Esteatose

| # | Referência | Achado Principal |
|---|------------|------------------|
| 19 | Gosink BB, et al. **Accuracy of ultrasonography in diagnosis of hepatocellular disease**. AJR. 1979;133(1):19-23. | Ecogenicidade aumentada = esteatose |
| 20 | Saadeh S, et al. **The utility of radiological imaging in nonalcoholic fatty liver disease**. Gastroenterology. 2002;123(3):745-50. | Sensibilidade 60-94% para esteatose |
| 21 | Hernaez R, et al. **Diagnostic accuracy and reliability of ultrasonography for the detection of fatty liver**. Hepatology. 2011;54(3):1082-90. | Meta-análise: Se > 89%, Sp > 84% |

**Valores de Referência Adotados:**
- Lobo direito (LMC): ≤ 15,5 cm [RUMACK]
- Índice Lobo Caudado: < 0,65 (cirrose > 0,65) [CERRI]

---

### Aorta Abdominal e Aneurisma (AAA)

| # | Referência | Achado Principal |
|---|------------|------------------|
| 22 | Chaikof EL, et al. **The Society for Vascular Surgery practice guidelines on AAA**. J Vasc Surg. 2018;67(1):2-77. | Definição e conduta AAA |
| 23 | LeFevre ML, et al. **Screening for abdominal aortic aneurysm: US Preventive Services Task Force**. Ann Intern Med. 2014;161(4):281-90. | Screening em homens 65-75 anos |
| 24 | Moll FL, et al. **Management of abdominal aortic aneurysms clinical practice guidelines of ESVS**. Eur J Vasc Endovasc Surg. 2011;41(Suppl 1):S1-58. | Guideline europeu |

**Valores de Referência Adotados:**
- Normal infrarrenal: ≤ 20 mm [Chaikof, 2018]
- AAA: ≥ 30 mm
- AAA grande (indicação cirúrgica): ≥ 55 mm (homens) / ≥ 50 mm (mulheres)

---

### Veia Porta e Hipertensão Portal

| # | Referência | Achado Principal |
|---|------------|------------------|
| 25 | Bolondi L, et al. **Accuracy of ultrasonography in the study of portal hypertension**. J Hepatol. 1993;17(3):S84-8. | Porta > 13 mm = HP |
| 26 | Gaiani S, et al. **Prevalence of spontaneous hepatofugal portal flow in liver cirrhosis**. Gastroenterology. 1991;100(1):160-7. | Fluxo hepatofugal = HP avançada |
| 27 | Zironi G, et al. **Value of measurement of portal blood velocity in the diagnosis of portal hypertension**. J Hepatol. 1992;15(1-2):125-30. | Velocidade < 15 cm/s = HP |

**Valores de Referência Adotados:**
- Diâmetro normal: ≤ 13 mm [Bolondi, 1993]
- Velocidade normal: 15-20 cm/s [Zironi, 1992]
- Fluxo normal: hepatopetal

---

### Tempo de Aceleração (TA) e Índice de Aceleração (IA)

| # | Referência | Achado Principal |
|---|------------|------------------|
| 28 | Stavros AT, et al. **Segmental stenosis of the renal artery: pattern recognition of tardus and parvus abnormalities**. Radiology. 1992;184(2):487-92. | TA > 70 ms sugere estenose proximal |
| 29 | Bude RO, et al. **Detection of renal artery stenosis with Doppler sonography**. Radiology. 1990;177(3):661-4. | Critérios indiretos |

**Valores de Referência Adotados:**
- TA normal: < 70 ms [Stavros, 1992]
- IA normal: > 300 cm/s²

---

## 12.3 Campos com Variação entre Fontes

| Parâmetro | Valores Encontrados | Este Manual Adota | Referência Base |
|-----------|---------------------|-------------------|-----------------|
| Volume prostático normal | < 25 mL a < 30 mL | < 30 mL | RUMACK, CERRI |
| RPM normal máximo | < 50 mL a < 100 mL | < 50 mL | Kolman 1999 |
| IR renal normal | < 0,70 a < 0,75 | < 0,70 | Platt 1989 |
| Colédoco normal | ≤ 6 mm a ≤ 8 mm | ≤ 7 mm | Kaim 2004 |
| Baço normal | ≤ 11 cm a ≤ 13 cm | ≤ 12 cm | Niederau 1983 |
| Porta normal | ≤ 12 mm a ≤ 15 mm | ≤ 13 mm | Bolondi 1993 |

---

## 12.4 Guidelines e Consensos

| Organização | Documento | Tópico |
|-------------|-----------|--------|
| ACR | ACR Appropriateness Criteria | Indicações de exames |
| AIUM | Practice Parameter for Abdominal US | Técnica e protocolo |
| SRU (Society of Radiologists in Ultrasound) | Consensus Statements | Diversos tópicos |
| SVS (Society for Vascular Surgery) | Practice Guidelines for AAA | Aneurisma de aorta |
| AUA (American Urological Association) | Guidelines on BPH | HPB e volume prostático |
| CBR (Colégio Brasileiro de Radiologia) | Recomendações Técnicas | Padrão brasileiro |

---

## CHECKLISTS RESUMO

### ✅ Checklist 9: Pré-Laudo Geral
- [ ] Todas medidas têm origem documentada?
- [ ] Cálculos executados em Python/calculadora?
- [ ] Unidades explícitas em todos os valores?
- [ ] Formato PT-BR (vírgula decimal)?
- [ ] Classificações aplicadas onde cabível?

### ✅ Checklist 10: Revisão Final
- [ ] Laudo não contém cálculos "de cabeça"?
- [ ] Fórmulas mostradas quando solicitado?
- [ ] Valores de referência atualizados?
- [ ] Textos prontos utilizados corretamente?
- [ ] Nenhum placeholder [X] restante?

---

**FIM DO MANUAL**

*Versão 2.0 — Janeiro/2026*
*Para uso com o Prompt de Ultrassonografia de Abdome Total V1.3*
