"""
Fórmulas de Urologia (Rins, Adrenais, Bexiga, Ureter)
"""
from typing import Optional
from ._common import _result, _safe_div, _normalize_text, _as_bool, _volume_ellipsoid

# ==============================================================================
# RINS (Cistos, Massas, Cálculos)
# ==============================================================================

def classify_renal_cyst_bosniak_2019(
    realce_hu: Optional[float] = None,
    componentes_solidos: Optional[bool] = None,
    septos: Optional[bool] = None,
    calcificacao: Optional[bool] = None,
    numero_septos: Optional[float] = None,
    modalidade: Optional[str] = None,
    tamanho_lesao_mm: Optional[float] = None,
    parede_espessura_mm: Optional[float] = None,
    septos_espessura_mm: Optional[float] = None,
    parede_irregular: Optional[bool] = None,
    septos_irregulares: Optional[bool] = None,
    parede_realce: Optional[bool] = None,
    septos_realce: Optional[bool] = None,
    nodulo_realce: Optional[bool] = None,
    nodulo_tamanho_mm: Optional[float] = None,
    nodulo_margem: Optional[str] = None,
    atenuacao_hu_pre: Optional[float] = None,
    atenuacao_hu_portal: Optional[float] = None,
    homogeneo: Optional[bool] = None,
    hiperintenso_t2_csf: Optional[bool] = None,
    hiperintenso_t1_marcado: Optional[bool] = None,
    hiperintenso_t1_heterogeneo_fs: Optional[bool] = None,
    muito_pequeno_caracterizar: Optional[bool] = None,
    fluido_simples: Optional[bool] = None,
    categoria_declarada: Optional[str] = None,
):
    if categoria_declarada:
        declared = _normalize_text(categoria_declarada).replace('bosniak', '').replace('categoria', '').replace(' ', '')
        if declared.startswith('b'): declared = declared[1:]
        if declared in {"i", "1"}: return _result("I")
        if declared in {"ii", "2"}: return _result("II")
        if declared in {"iif", "2f"}: return _result("IIF")
        if declared in {"iii", "3"}: return _result("III")
        if declared in {"iv", "4"}: return _result("IV")

    modality = _normalize_text(modalidade)
    is_mri = modality in {"rm", "mri", "ressonancia", "ressonancia_magnetica"}
    is_ct = not is_mri

    enhancement_ct = realce_hu is not None and realce_hu >= 20
    wall_enh = _as_bool(parede_realce)
    septa_enh = _as_bool(septos_realce)
    nodule_enh = _as_bool(nodulo_realce)
    enhancement = enhancement_ct or wall_enh or septa_enh or nodule_enh

    nodule_margin = _normalize_text(nodulo_margem)
    nodule_size = nodulo_tamanho_mm or 0

    solids = _as_bool(componentes_solidos)
    septa = _as_bool(septos)
    calc = _as_bool(calcificacao)
    sept_count = int(round(numero_septos)) if numero_septos is not None else 0
    wall_thick = parede_espessura_mm or 0
    septa_thick = septos_espessura_mm or 0
    wall_irreg = _as_bool(parede_irregular)
    septa_irreg = _as_bool(septos_irregulares)
    t2_csf = _as_bool(hiperintenso_t2_csf)
    t1_marked = _as_bool(hiperintenso_t1_marcado)
    t1_hetero = _as_bool(hiperintenso_t1_heterogeneo_fs)
    too_small = _as_bool(muito_pequeno_caracterizar)
    simple_fluid = _as_bool(fluido_simples)
    homogeneous = _as_bool(homogeneo)

    # Bosniak IV
    if nodule_enh:
        if nodule_size >= 4 or nodule_margin in {"aguda", "agudo", "acute"}: return _result("IV")
        if nodule_size > 0: return _result("IV")
        if solids: return _result("IV")
    if solids and enhancement: return _result("IV")

    # Bosniak III
    if enhancement and (wall_irreg or septa_irreg or wall_thick >= 4 or septa_thick >= 4):
        return _result("III")

    # Bosniak IIF
    if enhancement and ((3 <= wall_thick < 4) or (3 <= septa_thick < 4) or sept_count >= 4):
        return _result("IIF")

    # Bosniak I
    if simple_fluid or (not septa and not calc and not solids and (
        (is_ct and homogeneous and atenuacao_hu_pre is not None and -9 <= atenuacao_hu_pre <= 20)
        or (is_mri and t2_csf)
    )):
        return _result("I")

    # MRI-specific Bosniak II/IIF
    if is_mri:
        if t1_hetero: return _result("IIF")
        if t2_csf or t1_marked: return _result("II")

    # CT-specific Bosniak II
    if is_ct:
        if too_small: return _result("II")
        if homogeneous and not enhancement:
            if atenuacao_hu_pre is not None:
                if atenuacao_hu_pre >= 70: return _result("II")
                if atenuacao_hu_pre > 20: return _result("II")
                if -9 <= atenuacao_hu_pre <= 20: return _result("II")
            if atenuacao_hu_portal is not None and 21 <= atenuacao_hu_portal <= 30:
                return _result("II")
        if septa or calc:
            if sept_count >= 4: return _result("IIF" if enhancement else "II")
            if (wall_thick <= 2 or wall_thick == 0) and (septa_thick <= 2 or septa_thick == 0):
                return _result("II")

    # Fallback
    if enhancement: return _result("IIF")

    return _result(None, "Indeterminado")


def calculate_renal_nephrometry_score(
    radius_cm: float,
    exophytic_percent: float,
    nearness_mm: float,
    anterior_posterior: str,
    location_polar: str,
):
    if radius_cm < 4: r_score = 1
    elif radius_cm <= 7: r_score = 2
    else: r_score = 3

    if exophytic_percent <= 25: e_score = 1
    elif exophytic_percent <= 50: e_score = 2
    else: e_score = 3

    if nearness_mm >= 7: n_score = 1
    elif nearness_mm >= 4: n_score = 2
    else: n_score = 3

    ap = _normalize_text(anterior_posterior)
    a_score = 2 if ap == "ambos" else 1

    loc = _normalize_text(location_polar)
    l_score = 2 if loc == "meio" else 1

    total = r_score + e_score + n_score + a_score + l_score
    if total <= 6: category = "Baixa complexidade"
    elif total <= 9: category = "Complexidade intermediaria"
    else: category = "Alta complexidade"
    return _result(total, category)


def calculate_height_adjusted_tkv(volume_renal_total: float, altura: float):
    ht_tkv = _safe_div(volume_renal_total, altura, 2)
    if ht_tkv is None: return _result(None)
    if ht_tkv < 1.5: category = "Mayo Class 1A"
    elif ht_tkv < 2.2: category = "Mayo Class 1B"
    elif ht_tkv < 2.6: category = "Mayo Class 2"
    elif ht_tkv < 3.1: category = "Mayo Class 3"
    else: category = "Mayo Class 4"
    return _result(ht_tkv, category)


def calculate_renal_mass_enhancement_absolute(
    hu_massa_nc: float,
    hu_massa_portal: float,
    hu_massa_tardia: Optional[float] = None
):
    """
    Critério clássico: realce absoluto >15-20 HU = massa sólida/realcante.
    """
    realce_absoluto = hu_massa_portal - hu_massa_nc
    
    if realce_absoluto >= 20:
        category = "Massa realcante (sugere RCC ou Oncocitoma)"
        bosniak_suggestion = "Bosniak IV (se solida) ou III (se cistica)"
    elif realce_absoluto >= 10:
        category = "Indeterminado / Equivoco"
        bosniak_suggestion = "Reavaliar ou considerar RM"
    else:
        category = "Ausencia de realce significativo (sugere cisto)"
        bosniak_suggestion = "Bosniak I ou II"
        
    washout = None
    if hu_massa_tardia is not None and realce_absoluto > 0:
        washout = round(((hu_massa_portal - hu_massa_tardia) / realce_absoluto) * 100, 1)
    
    return _result(
        realce_absoluto,
        category,
        bosniak_implication=bosniak_suggestion,
        washout_percent=washout
    )


def calculate_renal_parenchymal_volume(
    volume_rim_total_ml: float,
    volume_sistema_coletor_ml: float
):
    parenchyma_vol = round(volume_rim_total_ml - volume_sistema_coletor_ml, 1)
    if parenchyma_vol < 0: return _result(None, "Dados invalidos")
    
    percent = _safe_div(parenchyma_vol, volume_rim_total_ml, None)
    if percent is not None: percent = round(percent * 100, 1)
    
    if percent is not None:
        if percent < 30: category = "Parenquima muito reduzido"
        elif percent < 50: category = "Parenquima significativamente reduzido"
        elif percent < 70: category = "Parenquima moderadamente reduzido"
        else: category = "Parenquima preservado"
    else: category = None
    
    return _result(parenchyma_vol, category, percentual_parenquima=percent)


def calculate_kidney_stone_burden_cumulative(diametros_calculos: list[float]):
    if not diametros_calculos: return _result(0, "Sem calculos")
    total = sum(diametros_calculos)
    if total < 20:
        category = "Carga litasica baixa (<2cm)"
        therapy = "Favoravel a LECO ou Ureteroscopia flexivel"
    else:
        category = "Carga litasica alta (>2cm)"
        therapy = "Considerar Nefrolitotripsia percutanea (NLP)"
    return _result(round(total, 1), category, sugestao_terapeutica=therapy)


def calculate_stone_skin_distance_mean(ssd_mm: float):
    # Fórmula simples para SSD
    dist = round(ssd_mm, 1)
    if dist < 100: cat = "Favoravel a LECO"
    else: cat = "Desfavoravel a LECO (Obesidade)"
    return _result(dist, cat)


def calculate_renal_artery_stenosis_indirect(tempo_aceleracao_ms: float, indice_aceleracao_m_s2: float):
    # Parvus et Tardus
    at = tempo_aceleracao_ms
    ai = indice_aceleracao_m_s2
    if at > 70 or ai < 3.0:
        cat = "Padrao Parvus et Tardus (Sugere estenose >70% proximal)"
    else:
        cat = "Normal (sem repercussao hemodinamica distal)"
    return _result(None, cat, at=at, ai=ai)


def grade_ureteral_obstruction(diametro_ureter_mm: float, grau_hidronefrose: str):
    hidro = _normalize_text(grau_hidronefrose)
    d_ureter = round(diametro_ureter_mm, 1)
    
    # Map hidronefrose
    if hidro in {"0", "ausente"}: h_grade = 0
    elif hidro in {"i", "1"}: h_grade = 1
    elif hidro in {"ii", "2"}: h_grade = 2
    elif hidro in {"iii", "3"}: h_grade = 3
    else: h_grade = 4
    
    if h_grade == 0 and d_ureter < 5: category = "Sem obstrucao"
    elif h_grade <= 1 and d_ureter < 7: category = "Obstrucao leve"
    elif h_grade <= 2 and d_ureter < 10: category = "Obstrucao moderada"
    else: category = "Obstrucao grave"
    
    return _result(d_ureter, category, grau_hidronefrose=hidro)


# ==============================================================================
# ADRENAIS
# ==============================================================================

def calculate_adrenal_absolute_washout(hu_nc: float, hu_portal: float, hu_tardia: float):
    denom = hu_portal - hu_nc
    if denom == 0: return _result(None)
    washout = round(((hu_portal - hu_tardia) / denom) * 100, 1)
    if washout > 60: category = "Adenoma"
    elif washout >= 40: category = "Borderline"
    else: category = "Sugestivo nao-adenoma"
    return _result(washout, category)


def calculate_adrenal_relative_washout(hu_portal: float, hu_tardia: float):
    if hu_portal == 0: return _result(None)
    washout = round(((hu_portal - hu_tardia) / hu_portal) * 100, 1)
    if washout > 40: category = "Adenoma"
    else: category = "Sugestivo nao-adenoma"
    return _result(washout, category)


def calculate_adrenal_signal_intensity_index(sinal_in_phase: float, sinal_opposed_phase: float):
    sii = _safe_div(sinal_in_phase - sinal_opposed_phase, sinal_in_phase, None)
    if sii is None: return _result(None)
    sii = round(sii * 100, 1)
    if sii > 16.5: category = "Adenoma"
    elif sii >= 10: category = "Borderline"
    else: category = "Sugestivo nao-adenoma"
    return _result(sii, category)


def measure_adrenal_size(espessura_corpo_mm: float):
    s = round(espessura_corpo_mm, 1)
    if s < 10: cat = "Normal"
    elif s <= 40: cat = "Nodulo/Massa adrenal"
    else: cat = "Massa adrenal grande (Risco ACC/Feo)"
    return _result(s, cat)


def calculate_adrenal_lipid_index(hu_adrenal_nc: float, hu_baco_nc: float):
    # Lipid-rich if HU < 10
    idx = hu_adrenal_nc
    if idx < 10: cat = "Adenoma rico em lipidios"
    else: cat = "Indeterminado"
    return _result(idx, cat)


# ==============================================================================
# BEXIGA
# ==============================================================================

def measure_bladder_wall_thickness(espessura_parede_mm: float):
    val = round(espessura_parede_mm, 1)
    if val < 3: cat = "Normal" # Replenished
    elif val <= 5: cat = "Espessamento leve"
    else: cat = "Espessamento parietal difuso"
    return _result(val, cat)


def measure_post_void_residual_volume(volume_residual_ml: float):
    vol = round(volume_residual_ml, 1)
    if vol < 50: cat = "Residuo desprezivel"
    elif vol < 100: cat = "Residuo leve"
    elif vol < 200: cat = "Residuo significativo"
    else: cat = "Retencao urinaria"
    return _result(vol, cat)


def calculate_bladder_outlet_obstruction_index(p_detrusor_qmax: float, qmax: float):
    booi = p_detrusor_qmax - (2 * qmax)
    if booi > 40: cat = "Obstruido"
    elif booi < 20: cat = "Nao obstruido"
    else: cat = "Equivoco"
    return _result(round(booi,1), cat)


def grade_bladder_trabeculation(espessura_parede_mm: float, diverticulos: bool):
    thick = round(espessura_parede_mm, 1)
    divs = _as_bool(diverticulos)
    if thick < 3 and not divs: category = "Normal"
    elif thick >= 3 and thick < 5 and not divs: category = "Trabeculacao leve"
    elif (thick >= 5) or (thick >= 3 and divs):
        category = "Bexiga de esforco / Trabeculacao acentuada"
        if divs: category += " com diverticulos"
    else: category = "Normal"
    return _result(thick, category)
