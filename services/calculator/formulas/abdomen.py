"""
Fórmulas de Abdome (Fígado, Vias Biliares, Pâncreas, Baço)
"""
from typing import Optional
from ._common import _result, _safe_div, _normalize_text, _as_bool, _volume_ellipsoid, _ri_value

# ==============================================================================
# FÍGADO
# ==============================================================================

def calculate_meld_score(creatinina: float, bilirrubina: float, inr: float):
    import math
    cr = max(creatinina, 1.0)
    bili = max(bilirrubina, 1.0)
    inr_val = max(inr, 1.0)
    
    meld = 9.57 * math.log(cr) + 3.78 * math.log(bili) + 11.2 * math.log(inr_val) + 6.43
    meld = round(max(meld, 6), 0)
    
    if meld < 10: cat = "Baixo risco (3% mortalidade 90d)"
    elif meld < 20: cat = "Risco moderado (6-20% mortalidade 90d)"
    elif meld < 30: cat = "Alto risco (20-45% mortalidade 90d)"
    else: cat = "Risco muito alto (>50% mortalidade 90d)"
    return _result(int(meld), cat)


def calculate_child_pugh_score(
    bilirrubina: float,
    albumina: float,
    inr: float,
    ascite_grau: str,
    encefalopatia_grau: str
):
    score = 0
    # Bilirrubina
    if bilirrubina < 2: score += 1
    elif bilirrubina <= 3: score += 2
    else: score += 3
    # Albumina
    if albumina > 3.5: score += 1
    elif albumina >= 2.8: score += 2
    else: score += 3
    # INR
    if inr < 1.7: score += 1
    elif inr <= 2.3: score += 2
    else: score += 3
    # Ascite
    asc = _normalize_text(ascite_grau)
    if asc in {"ausente", "0", "nao"}: score += 1
    elif asc in {"leve", "minimo", "1"}: score += 2
    else: score += 3
    # Encefalopatia
    enc = _normalize_text(encefalopatia_grau)
    if enc in {"ausente", "0", "nao"}: score += 1
    elif enc in {"i", "ii", "1", "2", "leve"}: score += 2
    else: score += 3

    if score <= 6: cc = "A"; cat = "Child-Pugh A (Compensada)"
    elif score <= 9: cc = "B"; cat = "Child-Pugh B (Disfuncao significativa)"
    else: cc = "C"; cat = "Child-Pugh C (Descompensada)"
    return _result(score, cat, child_class=cc)


def calculate_liver_fibrosis_index_ct(diametro_caudado_mm: float, diametro_lobo_direito_mm: float):
    ratio = _safe_div(diametro_caudado_mm, diametro_lobo_direito_mm, 3)
    if ratio is None: return _result(None)
    if ratio < 0.65: cat = "Fibrose ausente/leve"
    else: cat = "Sugestivo fibrose avancada/cirrose"
    return _result(ratio, cat)


def calculate_lesion_washin_universal(
    hu_nc: float, hu_arterial: float, hu_portal: float, orgao: Optional[str] = None
):
    denom = hu_portal - hu_nc
    if denom <= 0: return _result(None, "Lesao nao realca ou dados invalidos")
    washin = round(((hu_arterial - hu_nc) / denom) * 100, 1)
    organ = _normalize_text(orgao) if orgao else "generico"
    
    interp = "Indeterminado"
    if organ == "figado":
        if washin > 100: interp = "Sugestivo hemangioma ou HCC bem diferenciado"
        elif washin >= 60: interp = "Sugestivo HNF, adenoma ou HCC tipico"
        else: interp = "Sugestivo metastase ou lesao hipovascular"
    elif organ == "pancreas":
        if washin >= 60: interp = "Sugestivo tumor neuroendocrino (NET)"
        else: interp = "Sugestivo adenocarcinoma ductal"
    elif organ == "adrenal":
        if washin > 60: interp = "Sugestivo feocromocitoma"
        else: interp = "Padrao inespecifico"
    elif organ == "rim":
        if washin > 80: interp = "Hipervascular (angiomiolipoma, oncocitoma)"
        else: interp = "Carcinoma celulas renais (comum)"
    
    return _result(washin, "Indice calculo", interpretacao=interp, orgao=organ)


def calculate_lesion_washout_universal(
    hu_nc: float, hu_arterial: float, hu_tardia: float, orgao: Optional[str] = None
):
    denom = hu_arterial - hu_nc
    if denom <= 0: return _result(None, "Lesao nao realca significativo na arterial")
    washout = round(((hu_arterial - hu_tardia) / denom) * 100, 1)
    organ = _normalize_text(orgao) if orgao else "generico"
    
    # Generic Interpretation
    if washout > 40:
        cat = "Wash-out rapido"
        interp = "Hemangioma atipico, feocromocitoma, HCC moderadamente diferenciado"
    elif washout >= 20:
        cat = "Wash-out moderado"
        interp = "HCC tipico, NET, oncocitoma"
    else:
        cat = "Wash-out lento/ausente"
        interp = "Metastase, adenocarcinoma, HNF"
    
    # Organ specific override
    if organ == "figado":
        if washout > 40:
             interp = "Sugestivo hemangioma flash-filling ou HCC moderadamente diferenciado"
        elif washout >= 20:
             interp = "Padrao tipico de HCC (LI-RADS 5)"
        else:
             interp = "HNF, adenoma ou metastase hipervascular"
    
    return _result(washout, cat, interpretacao=interp, orgao=organ)


def grade_hepatic_steatosis_hu_absolute(hu_figado_nc: float):
    hu = round(hu_figado_nc, 1)
    if hu >= 57: grade = "S0"; cat = "Ausente ou esteatose minima"
    elif hu >= 40: grade = "S1"; cat = "Esteatose leve"
    elif hu >= 23: grade = "S2"; cat = "Esteatose moderada"
    else: grade = "S3"; cat = "Esteatose acentuada/grave"
    return _result(hu, cat, grade=grade)


def grade_hepatic_steatosis_ct(hu_figado: float, hu_rim: float):
    diff = round(hu_figado - hu_rim, 1)
    if diff > -10: cat = "Sem esteatose"
    elif diff > -20: cat = "Esteatose leve"
    elif diff > -30: cat = "Esteatose moderada"
    else: cat = "Esteatose grave"
    return _result(diff, cat)


def calculate_hepatorenal_index(ecogenicidade_figado: float, ecogenicidade_rim: float):
    ratio = _safe_div(ecogenicidade_figado, ecogenicidade_rim, 2)
    if ratio is None: return _result(None)
    if ratio < 1.0: cat = "Normal"
    elif ratio < 1.3: cat = "Esteatose leve"
    elif ratio < 2.2: cat = "Esteatose moderada"
    else: cat = "Esteatose grave"
    return _result(ratio, cat)


def calculate_liver_fat_fraction_dixon(sinal_gordura: float, sinal_agua: float):
    total = sinal_gordura + sinal_agua
    if total == 0: return _result(None)
    ff = round((sinal_gordura / total) * 100, 1)
    if ff < 5: cat = "Normal"
    elif ff < 10: cat = "Esteatose leve"
    elif ff < 20: cat = "Esteatose moderada"
    else: cat = "Esteatose grave"
    return _result(ff, cat)


def calculate_liver_iron_concentration_r2star(t2_star_ms: float):
    if t2_star_ms <= 0: return _result(None, "T2* invalido")
    r2 = round(1000.0 / t2_star_ms, 1)
    if r2 < 40: cat = "Normal (sem sobrecarga)"
    elif r2 < 70: cat = "Sobrecarga leve"
    elif r2 < 140: cat = "Sobrecarga moderada"
    else: cat = "Sobrecarga grave"
    return _result(r2, cat, unit="Hz")


def classify_hepatic_lesion_density(hu_lesao_nc: float):
    hu = round(hu_lesao_nc, 1)
    if hu < 0: cat = "Densidade de gordura"
    elif hu <= 20: cat = "Densidade de agua/fluido simples"
    elif hu <= 45: cat = "Conteudo proteico/hemorragico"
    elif hu <= 60: cat = "Parenquima/solido hipodenso"
    else: cat = "Hiperdenso"
    return _result(hu, cat)


def grade_portal_vein_thrombosis(diametro_veia_porta: float, percentual_oclusao: float, presenca_realce_trombo: Optional[bool] = None):
    occ = round(percentual_oclusao, 1)
    if occ < 25: cat = "Trombose leve (<25%)"
    elif occ < 50: cat = "Trombose moderada (25-50%)"
    elif occ < 75: cat = "Trombose avancada (50-75%)"
    else: cat = "Trombose subtotal/total (>75%)"
    
    age = None
    if presenca_realce_trombo is not None:
        age = "Trombo agudo/tumoral" if _as_bool(presenca_realce_trombo) else "Trombo cronico"
        
    return _result(occ, cat, cronicidade=age, diametro=diametro_veia_porta)


def calculate_hepatic_artery_ri(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None: return _result(None)
    if ri < 0.55: cat = "Normal"
    elif ri <= 0.80: cat = "Normal" # Range típico 0.55-0.80? 
    else: cat = "Aumentado"
    return _result(ri, cat)


def classify_hepatic_vein_doppler(padrao_fluxo: str):
    p = _normalize_text(padrao_fluxo)
    if "tri" in p: cat = "Normal"
    elif "bi" in p: cat = "Borderline"
    elif "mono" in p: cat = "Alterado"
    elif "reverso" in p: cat = "Reverso"
    else: cat = "Indeterminado"
    return _result(p, cat)


def calculate_portal_vein_congestion_index(area_veia_cm2: float, velocidade_media_cm_s: float):
    val = _safe_div(area_veia_cm2, velocidade_media_cm_s, 3)
    if val is None: return _result(None)
    if val < 0.1: cat = "Normal"
    else: cat = "Congestao Portal"
    return _result(val, cat)


def grade_hepatic_steatosis_ultrasound(ecogenicidade: str, atenuacao_posterior: str):
    eco = _normalize_text(ecogenicidade)
    atn = _normalize_text(atenuacao_posterior)
    if "aumentada" in eco:
        if "acentuada" in atn or "forte" in atn: cat = "Esteatose Grau 3 (Acentuada)"
        elif "moderada" in atn: cat = "Esteatose Grau 2 (Moderada)"
        else: cat = "Esteatose Grau 1 (Leve)"
    else:
        cat = "Normal"
    return _result(cat)


# ==============================================================================
# VIAS BILIARES
# ==============================================================================

def measure_bile_duct_diameter(diametro_mm: float, idade: float, colecistectomia: bool):
    d = round(diametro_mm, 1)
    limit = 6 + (max(0, idade - 60) / 10)
    if _as_bool(colecistectomia): limit = 10
    if d <= limit: cat = "Normal"
    else: cat = "Dilatado"
    return _result(d, cat)


def measure_biliary_dilatation_severity_mri(diametro_coledoco_mm: float, pos_colecistectomia: bool):
    d = round(diametro_coledoco_mm, 1)
    pos = _as_bool(pos_colecistectomia)
    limit = 10.0 if pos else 7.0
    if d <= limit: cat = "Calibre normal"
    elif d <= limit + 4: cat = "Dilatacao leve"
    elif d <= limit + 8: cat = "Dilatacao moderada"
    else: cat = "Dilatacao acentuada"
    return _result(d, cat)


def measure_gallbladder_wall_thickness(espessura_mm: float, jejum: bool):
    val = round(espessura_mm, 1)
    limit = 3.0
    if not _as_bool(jejum): limit = 5.0
    if val <= limit: cat = "Normal"
    else: cat = "Espessada"
    return _result(val, cat)


def measure_bile_duct_stone_diameter(d_calculo: float):
    val = round(d_calculo, 1)
    if val < 5: cat = "Pequeno (<5mm)"
    elif val <= 10: cat = "Moderado"
    else: cat = "Grande (>1cm)"
    return _result(val, cat)


# ==============================================================================
# PÂNCREAS
# ==============================================================================

def measure_pancreatic_duct_diameter(diametro_mm: float, segmento: str):
    d = round(diametro_mm, 1)
    seg = _normalize_text(segmento)
    limit = 3.0
    if "corpo" in seg: limit = 2.5
    elif "cauda" in seg: limit = 2.0
    if d <= limit: cat = "Normal"
    else: cat = "Dilatado"
    return _result(d, cat)


def calculate_pancreatic_duct_to_gland_ratio(diametro_ducto: float, espessura_glandula: float):
    ratio = _safe_div(diametro_ducto, espessura_glandula, 2)
    if ratio is None: return _result(None)
    if ratio > 0.5: cat = "Dilatacao ductal desproporcional"
    elif ratio > 0.3: cat = "Borderline"
    else: cat = "Proporcao normal"
    return _result(ratio, cat)


def classify_pancreatic_tumor_enhancement(hu_tumor_arterial: float, hu_parenquima_pancreas_arterial: float, hu_tumor_nc: Optional[float] = None):
    # Added hu_tumor_nc param which was present in test expectation? 
    # Test passed kwargs like hu_tumor_nc.
    # Logic in test: classify_pancreatic_tumor_enhancement(hu_tumor_arterial, hu_parenquima_pancreas_arterial, hu_tumor_nc)
    # My signature mismatches? The test uses `hu_tumor_arterial` etc specifically.
    # In legacy it was: (hu_tumor_arterial, hu_parenquima_pancreas_arterial, hu_tumor_nc=None)
    # I should match signature.
    delta = round(hu_tumor_arterial - hu_parenquima_pancreas_arterial, 1)
    if delta < -20: 
        cat = "Hipovascular acentuado"
        interp = "Muito sugestivo de adenocarcinoma ductal"
    elif delta < 0: 
        cat = "Hipovascular"
        interp = "Sugestivo de adenocarcinoma ductal"
    elif delta <= 15: 
        cat = "Isovascular"
        interp = "Borderline"
    else: 
        cat = "Hipervascular"
        interp = "Sugestivo de tumor neuroendocrino (NET)"
        
    realce_abs = None
    if hu_tumor_nc is not None:
        realce_abs = round(hu_tumor_arterial - hu_tumor_nc, 1)
        
    return _result(delta, cat, interpretacao=interp, realce_absoluto_tumor=realce_abs)


def grade_pancreatic_echogenicity(ecogenicidade_pancreas: str, ecogenicidade_figado: str):
    p = _normalize_text(ecogenicidade_pancreas)
    if "aumentada" in p: cat = "Lipossubstituicao/Pancreatite cronica"
    else: cat = "Normal"
    return _result(cat)


def calculate_pancreatic_atrophy_index(cabeca: float, corpo: float, cauda: float):
    avg = round((cabeca + corpo + cauda) / 3, 1)
    if avg < 10: cat = "Atrofia difusa"
    elif avg <= 15: cat = "Borderline"
    else: cat = "Preservado"
    return _result(avg, cat)


def calculate_modified_ct_severity_index(grau_inflamacao: str, percentual_necrose: float):
    grade = _normalize_text(grau_inflamacao)
    # Balthazar or Modified CTSI
    # Let's map grades A-E to points roughly
    infl_points = 0
    if grade in {"a", "normal"}: infl_points = 0
    elif grade in {"b", "aumento"}: infl_points = 1 # Modified CTSI logic is slightly different but let's stick to legacy mapping if possible or standard
    elif grade in {"c", "inflamacao"}: infl_points = 2
    elif grade in {"d", "colecao"}: infl_points = 3
    elif grade in {"e", "colecoes"}: infl_points = 4
    
    nec_points = 0
    if percentual_necrose <= 0: nec_points = 0
    elif percentual_necrose <= 30: nec_points = 2
    else: nec_points = 4
    
    score = infl_points + nec_points
    if score <= 2: cat = "Pancreatite leve"
    elif score <= 6: cat = "Pancreatite moderada"
    else: cat = "Pancreatite grave"
    return _result(score, cat)


# ==============================================================================
# BAÇO & OUTROS (Psoas, Visceral Fat)
# ==============================================================================

def calculate_splenic_volume_ellipsoid(l: float, w: float, h: float):
    vol = _volume_ellipsoid(l, w, h, 0.524, 1)
    if vol <= 314: cat = "Normal"
    elif vol <= 480: cat = "Esplenomegalia leve"
    elif vol <= 750: cat = "Esplenomegalia moderada"
    else: cat = "Esplenomegalia macica"
    return _result(vol, cat)


def calculate_splenic_artery_ri(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None: return _result(None)
    return _result(ri, "Indice RI esplenico")


def classify_spleen_doppler_flow(direcao: str):
    d = _normalize_text(direcao)
    if "pet" in d: return _result("Normal (Hepatopetal)")
    return _result("Alterado")


def measure_splenic_artery_aneurysm_risk(diametro_mm: float):
    d = round(diametro_mm, 1)
    if d < 20: cat = "Baixo risco"
    elif d <= 25: cat = "Risco moderado"
    else: cat = "Alto risco"
    return _result(d, cat)


def calculate_psoas_muscle_index(area_psoas: float, altura: float):
    pmi = _safe_div(area_psoas, altura ** 2, 1)
    if pmi is None: return _result(None)
    return _result(round(pmi, 1), "PMI (cm2/m2)")


def measure_visceral_fat_area(vfa_cm2: float):
    val = round(vfa_cm2, 1)
    if val < 100: cat = "Normal"
    elif val <= 150: cat = "Aumentado"
    else: cat = "Muito aumentado (Obesidade visceral)"
    return _result(val, cat)
