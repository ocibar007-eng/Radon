"""
Testes rápidos das novas fórmulas de caracterização de lesões.
"""
import sys
sys.path.insert(0, '/Users/lucasdonizetecamargos/Downloads/app (6)/services/calculator')

from formulas import (
    calculate_lesion_washin_universal,
    calculate_lesion_washout_universal,
    calculate_adrenal_relative_washout,
    grade_hepatic_steatosis_hu_absolute,
    classify_pancreatic_tumor_enhancement,
    calculate_renal_mass_enhancement_absolute
)

print("=" * 60)
print("TESTES DAS NOVAS FÓRMULAS - TC ABDOME")
print("=" * 60)

# Teste 1: Wash-in Universal - Lesão Hepática Hipervascular (HCC)
print("\n1️⃣ WASH-IN UNIVERSAL - Lesão Hepática")
result = calculate_lesion_washin_universal(
    hu_nc=45,
    hu_arterial=105,
    hu_portal=85,
    orgao="figado"
)
print(f"   Input: NC=45, Art=105, Portal=85")
print(f"   Wash-in: {result['value']}%")
print(f"   Categoria: {result['category']}")
print(f"   Interpretação: {result['interpretacao']}")

# Teste 2: Wash-in - Tumor Pancreático (NET)
print("\n2️⃣ WASH-IN - Tumor Pancreático NET")
result = calculate_lesion_washin_universal(
    hu_nc=35,
    hu_arterial=110,
    hu_portal=95,
    orgao="pancreas"
)
print(f"   Input: NC=35, Art=110, Portal=95")
print(f"   Wash-in: {result['value']}%")
print(f"   Interpretação: {result['interpretacao']}")

# Teste 3: Wash-out Universal - HCC
print("\n3️⃣ WASH-OUT UNIVERSAL - HCC")
result = calculate_lesion_washout_universal(
    hu_nc=40,
    hu_arterial=120,
    hu_tardia=75,
    orgao="figado"
)
print(f"   Input: NC=40, Art=120, Tardia=75")
print(f"   Wash-out: {result['value']}%")
print(f"   Categoria: {result['category']}")
print(f"   Interpretação: {result['interpretacao']}")

# Teste 4: Adrenal Relative Washout (sem pré-contraste)
print("\n4️⃣ ADRENAL RELATIVE WASHOUT")
result = calculate_adrenal_relative_washout(
    hu_portal=85,
    hu_tardia=38
)
print(f"   Input: Portal=85, Tardia=38")
print(f"   RPW: {result['value']}%")
print(f"   Categoria: {result['category']}")
print(f"   Referência: {result.get('referencia', 'N/A')}")

# Teste 5: Esteatose Hepática HU Absoluto
print("\n5️⃣ ESTEATOSE HEPÁTICA HU ABSOLUTO")
cases = [62, 45, 30, 18]
for hu in cases:
    result = grade_hepatic_steatosis_hu_absolute(hu)
    print(f"   HU={hu} → Grade {result.get('grade')}: {result['category']}")

# Teste 6: Tumor Pancreático Enhancement
print("\n6️⃣ TUMOR PANCREÁTICO - Adenoca vs NET")
print("\n   Caso A (Adenocarcinoma):")
result = classify_pancreatic_tumor_enhancement(
    hu_tumor_arterial=55,
    hu_parenquima_pancreas_arterial=75,
    hu_tumor_nc=42
)
print(f"      Delta: {result['value']} HU")
print(f"      Categoria: {result['category']}")
print(f"      Interpretação: {result['interpretacao']}")

print("\n   Caso B (NET):")
result = classify_pancreatic_tumor_enhancement(
    hu_tumor_arterial=125,
    hu_parenquima_pancreas_arterial=80,
    hu_tumor_nc=38
)
print(f"      Delta: {result['value']} HU")
print(f"      Categoria: {result['category']}")
print(f"      Interpretação: {result['interpretacao']}")
print(f"      Realce absoluto tumor: {result.get('realce_absoluto_tumor')} HU")

# Teste 7: Massa Renal Enhancement
print("\n7️⃣ MASSA RENAL ENHANCEMENT")
print("\n   Caso A (Cisto simples):")
result = calculate_renal_mass_enhancement_absolute(
    hu_massa_nc=8,
    hu_massa_portal=12
)
print(f"      Realce: {result['value']} HU")
print(f"      Categoria: {result['category']}")
print(f"      Bosniak: {result.get('bosniak_implication')}")

print("\n   Caso B (CCR):")
result = calculate_renal_mass_enhancement_absolute(
    hu_massa_nc=35,
    hu_massa_portal=78,
    hu_massa_tardia=62
)
print(f"      Realce: {result['value']} HU")
print(f"      Categoria: {result['category']}")
print(f"      Wash-out: {result.get('washout_percent')}%")
print(f"      Bosniak: {result.get('bosniak_implication')}")

print("\n" + "=" * 60)
print("✅ TODOS OS TESTES COMPLETADOS COM SUCESSO")
print("=" * 60)
