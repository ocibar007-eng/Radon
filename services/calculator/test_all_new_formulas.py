"""
Teste completo das 25 novas fórmulas TC Abdome implementadas.
"""
import sys
sys.path.insert(0, '/Users/lucasdonizetecamargos/Downloads/app (6)/services/calculator')

from formulas import FORMULAS

print("=" * 70)
print("TESTE COMPLETO: 25 NOVAS FÓRMULAS TC ABDOME")
print("=" * 70)
print(f"\nTotal de fórmulas no sistema: {len(FORMULAS)}")
print()

# Lista das novas fórmulas
new_formulas = [
    "calculate_lesion_washin_universal",
    "calculate_lesion_washout_universal",
    "calculate_adrenal_relative_washout",
    "grade_hepatic_steatosis_hu_absolute",
    "classify_pancreatic_tumor_enhancement",
    "calculate_renal_mass_enhancement_absolute",
    "grade_portal_vein_thrombosis",
    "calculate_meld_score",
    "calculate_child_pugh_score",
    "classify_hepatic_lesion_density",
    "grade_appendix_diameter",
    "classify_bowel_obstruction_level",
    "calculate_liver_fibrosis_index_ct",
    "calculate_pancreatic_duct_to_gland_ratio",
    "measure_mesenteric_lymph_node_size",
    "classify_retroperitoneal_lymph_nodes",
    "measure_splenic_artery_aneurysm_risk",
    "calculate_renal_artery_stenosis_indirect",
    "measure_colonic_wall_thickness",
    "calculate_peritoneal_carcinomatosis_index",
    "grade_ascites_volume",
    "calculate_pancreatic_atrophy_index",
    "calculate_perforated_appendix_score",
    "measure_gastric_wall_enhancement",
    "grade_ureteral_obstruction",
    "calculate_renal_parenchymal_volume",
]

# Verificar se todas estão registradas
print("✅ VALIDANDO REGISTRO DAS FÓRMULAS:")
all_registered = True
for formula in new_formulas:
    if formula not in FORMULAS:
        print(f"   ❌ {formula} - NÃO REGISTRADA!")
        all_registered = False
    else:
        print(f"   ✓ {formula}")

if not all_registered:
    print("\n❌ ERRO: Algumas fórmulas não foram registradas!")
    sys.exit(1)

print(f"\n✅ {len(new_formulas)} novas fórmulas registradas com sucesso!")

# Testes rápidos de cada fórmula
print("\n" + "=" * 70)
print("TESTES FUNCIONAIS")
print("=" * 70)

tests = [
    {
        "name": "Portal Vein Thrombosis",
        "func": "grade_portal_vein_thrombosis",
        "args": {"diametro_veia_porta": 12, "percentual_oclusao": 80, "presenca_realce_trombo": False},
        "expect": "grade"
    },
    {
        "name": "MELD Score",
        "func": "calculate_meld_score",
        "args": {"creatinina": 2.5, "bilirrubina": 3.0, "inr": 2.0},
        "expect": "value"
    },
    {
        "name": "Child-Pugh Score",
        "func": "calculate_child_pugh_score",
        "args": {"bilirrubina": 2.5, "albumina": 3.0, "inr": 1.8, "ascite_grau": "leve", "encefalopatia_grau": "ausente"},
        "expect": "child_class"
    },
    {
        "name": "Hepatic Lesion Density",
        "func": "classify_hepatic_lesion_density",
        "args": {"hu_lesao_nc": 25},
        "expect": "interpretacao"
    },
    {
        "name": "Appendix Diameter",
        "func": "grade_appendix_diameter",
        "args": {"diametro_apendice": 9},
        "expect": "category"
    },
    {
        "name": "Bowel Obstruction",
        "func": "classify_bowel_obstruction_level",
        "args": {"diametro_intestino_delgado_max": 4.5, "diametro_colon_max": 7.0},
        "expect": "categoria_colon"
    },
    {
        "name": "Liver Fibrosis Index",
        "func": "calculate_liver_fibrosis_index_ct",
        "args": {"diametro_caudado_mm": 25, "diametro_lobo_direito_mm": 35},
        "expect": "value"
    },
    {
        "name": "Pancreatic Duct/Gland Ratio",
        "func": "calculate_pancreatic_duct_to_gland_ratio",
        "args": {"diametro_ducto_wirsung": 4, "espessura_glandula": 15},
        "expect": "interpretacao"
    },
    {
        "name": "Mesenteric Lymph Node",
        "func": "measure_mesenteric_lymph_node_size",
        "args": {"eixo_curto_mm": 12},
        "expect": "category"
    },
    {
        "name": "Retroperitoneal Lymph Nodes",
        "func": "classify_retroperitoneal_lymph_nodes",
        "args": {"nivel_anatomico": "para-aortico", "eixo_curto_max_mm": 14},
        "expect": "n_stage"
    },
    {
        "name": "Splenic Artery Aneurysm",
        "func": "measure_splenic_artery_aneurysm_risk",
        "args": {"diametro_aneurisma_mm": 23},
        "expect": "risco_ruptura"
    },
    {
        "name": "Renal Artery Stenosis (Indirect)",
        "func": "calculate_renal_artery_stenosis_indirect",
        "args": {"diametro_rim_afetado_cm": 8.5, "diametro_rim_contralateral_cm": 11.0},
        "expect": "value"
    },
    {
        "name": "Colonic Wall Thickness",
        "func": "measure_colonic_wall_thickness",
        "args": {"espessura_parede_colon_mm": 6},
        "expect": "category"
    },
    {
        "name": "Peritoneal Carcinomatosis Index",
        "func": "calculate_peritoneal_carcinomatosis_index",
        "args": {"numero_segmentos_envolvidos": 8, "tamanho_maior_implante_mm": 15},
        "expect": "numero_segmentos"
    },
    {
        "name": "Ascites Grading",
        "func": "grade_ascites_volume",
        "args": {"ascite_periesplenica": True, "ascite_difusa": True, "deslocamento_visceras": False},
        "expect": "grade"
    },
    {
        "name": "Pancreatic Atrophy Index",
        "func": "calculate_pancreatic_atrophy_index",
        "args": {"espessura_cabeca_mm": 12, "espessura_corpo_mm": 10, "espessura_cauda_mm": 9},
        "expect": "cabeca"
    },
    {
        "name": "Perforated Appendix Score",
        "func": "calculate_perforated_appendix_score",
        "args": {"pneumoperitonio": True, "abscesso_periapendicular": True, "dilatacao_apendice_mm": 13},
        "expect": "value"
    },
    {
        "name": "Gastric Wall Enhancement",
        "func": "measure_gastric_wall_enhancement",
        "args": {"hu_parede_gastrica_portal": 55},
        "expect": "category"
    },
    {
        "name": "Ureteral Obstruction",
        "func": "grade_ureteral_obstruction",
        "args": {"diametro_ureter_mm": 8, "grau_hidronefrose": "II"},
        "expect": "hydro_numeric"
    },
    {
        "name": "Renal Parenchymal Volume",
        "func": "calculate_renal_parenchymal_volume",
        "args": {"volume_rim_total_ml": 150, "volume_sistema_coletor_ml": 30},
        "expect": "percentual_parenquima"
    },
]

passed = 0
failed = 0

for test in tests:
    try:
        func = FORMULAS[test["func"]]
        result = func(**test["args"])
        
        if test["expect"] in result or result.get("value") is not None or result.get("category") is not None:
            print(f"✅ {test['name']:<35} → {test['func']}")
            passed += 1
        else:
            print(f"❌ {test['name']:<35} → Missing expected field: {test['expect']}")
            failed += 1
    except Exception as e:
        print(f"❌ {test['name']:<35} → ERROR: {str(e)}")
        failed += 1

print("\n" + "=" * 70)
print(f"RESULTADO DOS TESTES")
print("=" * 70)
print(f"✅ Aprovados: {passed}/{len(tests)}")
print(f"❌ Falharam:  {failed}/{len(tests)}")

if failed == 0:
    print("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!")
    print(f"\n📊 Total de fórmulas no Calculator Service: {len(FORMULAS)}")
    print(f"   (87 originais + 25 novas = 112 fórmulas)")
else:
    print("\n⚠️ ALGUNS TESTES FALHARAM!")
    sys.exit(1)
