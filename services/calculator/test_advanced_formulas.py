"""
Teste das 16 novas fórmulas avançadas (RM/TC Abdome e Pelve).
"""
import sys
sys.path.insert(0, '/Users/lucasdonizetecamargos/Downloads/app (6)/services/calculator')
from formulas import FORMULAS

print("=" * 70)
print("TESTE: 16 FÓRMULAS AVANÇADAS (RM/TC Pélvis e Abdome)")
print("=" * 70)

tests = [
    {
        "name": "ADC Classification (Malignant)",
        "func": "calculate_adc_value_classification",
        "args": {"adc_value_x10_3": 0.65, "orgao": "prostata"},
        "expect": "category"
    },
    {
        "name": "Liver Iron (R2*)",
        "func": "calculate_liver_iron_concentration_r2star",
        "args": {"t2_star_ms": 10.0}, # R2* = 100 Hz
        "expect": "grade"
    },
    {
        "name": "Liver Fat (Dixon)",
        "func": "calculate_liver_fat_fraction_dixon",
        "args": {"sinal_gordura": 15, "sinal_agua": 85}, # ~15%
        "expect": "category"
    },
    {
        "name": "Prostate EPE Risk",
        "func": "calculate_prostate_epe_risk_contact_length",
        "args": {"comprimento_contato_capsular_mm": 18},
        "expect": "risk"
    },
    {
        "name": "Rectal Tumor Height",
        "func": "classify_rectal_tumor_height",
        "args": {"distancia_borda_anal_cm": 4.0},
        "expect": "implicacao_cirurgica"
    },
    {
        "name": "Pelvic Congestion Syndrome",
        "func": "grade_pelvic_congestion_syndrome",
        "args": {"diametro_veia_ovariana_mm": 9},
        "expect": "category"
    },
    {
        "name": "Uterine Junctional Zone (Adenomyosis)",
        "func": "measure_uterine_junctional_zone_mri",
        "args": {"espessura_jz_mm": 14},
        "expect": "category"
    },
    {
        "name": "Hinchey Diverticulitis (III)",
        "func": "classify_diverticulitis_hinchey_ct",
        "args": {"abscesso_presente": False, "peritonite_purulenta": True},
        "expect": "value"
    },
    {
        "name": "Crohn Activity (Active)",
        "func": "calculate_crohn_activity_mri_simplified",
        "args": {"espessura_parede_mm": 6, "realce_mural_intenso": True, "edema_mural_t2": True, "ulceras": False},
        "expect": "category"
    },
    {
        "name": "Anal Fistula (Transsphincteric)",
        "func": "classify_anal_fistula_parks_mri",
        "args": {"atravessa_esfincter_interno": True, "atravessa_esfincter_externo": True, "acima_elevador": False},
        "expect": "value"
    },
    {
        "name": "Bladder Trabeculation",
        "func": "grade_bladder_trabeculation",
        "args": {"espessura_parede_mm": 5, "diverticulos": True},
        "expect": "category"
    },
    {
        "name": "Seminal Vesicle Invasion Risk",
        "func": "calculate_seminal_vesicle_invasion_risk",
        "args": {"comprimento_contato_base_mm": 12, "angulo_obliterado": False},
        "expect": "risk"
    },
    {
        "name": "Kidney Stone Burden",
        "func": "calculate_kidney_stone_burden_cumulative",
        "args": {"diametros_calculos": [12.0, 5.0, 8.0]}, # Sum = 25mm
        "expect": "sugestao_terapeutica"
    },
    {
        "name": "Adnexal Mass MRI (Teratoma)",
        "func": "classify_adnexal_mass_mri_complexity",
        "args": {"componente_solido": False, "septos_espessos": False, "realce_pos_contraste": False, "gordura_macroscopica": True},
        "expect": "value"
    },
    {
        "name": "Biliary Dilatation (Post-Cholecystectomy)",
        "func": "measure_biliary_dilatation_severity_mri",
        "args": {"diametro_coledoco_mm": 9, "pos_colecistectomia": True}, # Normal is <=10
        "expect": "category"
    },
    {
        "name": "Cervical Stromal Ring (Disrupted)",
        "func": "assess_cervical_stromal_ring_mri",
        "args": {"anel_estromal_integro": False},
        "expect": "interpretation"
    },
]

passed = 0
failed = 0

for test in tests:
    try:
        func = FORMULAS[test["func"]]
        result = func(**test["args"])
        
        # Check success
        print(f"Testing {test['name']}...")
        if result is not None and (test["expect"] in result or "value" in result):
            print(f"   ✅ OK - Result: {result.get('value') or result.get('category')} ({result.get('category')})")
            passed += 1
        else:
            print(f"   ❌ FAIL - Missing {test['expect']} in {result}")
            failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        failed += 1

print("\n" + "=" * 70)
print(f"✅ Aprovados: {passed}/{len(tests)}")
print(f"📊 Total de fórmulas no sistema: {len(FORMULAS)}")
print("=" * 70)

if failed > 0:
    sys.exit(1)
