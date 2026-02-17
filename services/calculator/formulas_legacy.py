"""
Formulas whitelist - LLM never calculates; it always calls here.
"""
from typing import Optional
import unicodedata


def _normalize_text(value: Optional[str]) -> str:
    if value is None:
        return ""
    text = str(value)
    normalized = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return stripped.lower().strip()


def _safe_div(numerator: float, denominator: float, precision: Optional[int] = None):
    if denominator in (0, None):
        return None
    value = numerator / denominator
    if precision is None:
        return value
    return round(value, precision)


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return bool(value)
    return _normalize_text(value) in {"true", "sim", "yes", "1"}


def _volume_ellipsoid(d1: float, d2: float, d3: float, factor: float = 0.52, precision: int = 2) -> float:
    return round(factor * d1 * d2 * d3, precision)


def _ri_value(psv: float, edv: float) -> Optional[float]:
    return _safe_div(psv - edv, psv, 2)


def _result(value, category: Optional[str] = None, **extras):
    payload = {"value": value}
    if category is not None:
        payload["category"] = category
    payload.update(extras)
    return payload


# Vascular

def calculate_resistive_index(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None:
        return _result(None)
    if ri < 0.55:
        category = "Normal (baixa resistencia vascular)"
    elif ri <= 0.70:
        category = "Borderline (resistencia moderada)"
    else:
        category = "Aumentado (alta resistencia)"
    return _result(ri, category)


def calculate_pulsatility_index(psv: float, edv: float, v_mean: float):
    pi = _safe_div(psv - edv, v_mean, 2)
    if pi is None:
        return _result(None)
    if pi < 1.0:
        category = "Baixo (fluxo pouco pulsatil)"
    elif pi <= 2.0:
        category = "Normal (pulsatilidade normal)"
    else:
        category = "Aumentado (alta pulsatilidade)"
    return _result(pi, category)


def calculate_nascet_stenosis(d_stenosis: float, d_distal: float):
    percent = _safe_div(d_distal - d_stenosis, d_distal, None)
    if percent is None:
        return _result(None)
    percent = round(percent * 100, 1)
    if percent < 30:
        category = "Sem estenose significativa"
    elif percent <= 69:
        category = "Estenose moderada (30-69%)"
    else:
        category = "Estenose grave (>=70%)"
    return _result(percent, category)


def calculate_ras_doppler_criteria(psv_renal: float, psv_aorta: float):
    rar = _safe_div(psv_renal, psv_aorta, 2)
    if rar is None:
        return _result(None)
    if psv_renal < 180 and rar < 3.5:
        category = "Sem estenose significativa"
    elif (180 <= psv_renal <= 200) or (3.5 <= rar <= 4.0):
        category = "Borderline; considerar confirmacao"
    else:
        category = "Provavel estenose >=60%"
    return _result(rar, category, psv_renal=round(psv_renal, 1))


def calculate_aaa_growth_rate(d_atual: float, d_anterior: float, intervalo_anos: float):
    growth_rate = _safe_div(d_atual - d_anterior, intervalo_anos, 1)
    if growth_rate is None:
        return _result(None)

    if d_atual < 28:
        category = "AAA pequeno; sem follow-up necessario"
    elif d_atual < 40:
        category = "AAA moderado; follow-up anual"
    elif d_atual < 45:
        category = "AAA grande; follow-up cada 3 meses"
    elif d_atual < 55:
        category = "AAA muito grande; considerar cirurgia"
    else:
        category = "AAA critico; cirurgia recomendada"

    rapid_growth = growth_rate > 3.0
    return _result(growth_rate, category, rapid_growth=rapid_growth)


def classify_aortic_dissection_stanford(envolve_ascendente: bool, localizacao_lacera_o: str):
    if _as_bool(envolve_ascendente):
        return _result("Type A")
    location = _normalize_text(localizacao_lacera_o)
    if location == "descendente":
        return _result("Type B")
    return _result("Type B (limitada descendente)")


def calculate_ivc_collapsibility_index(d_max_inspiracao: float, d_min_expira_o: float):
    ci = _safe_div(d_max_inspiracao - d_min_expira_o, d_max_inspiracao, None)
    if ci is None:
        return _result(None)
    ci = round(ci * 100, 1)
    if ci > 50:
        category = "PVC baixa; colapsabilidade normal"
    elif ci >= 25:
        category = "PVC normal; colapsabilidade intermediaria"
    else:
        category = "PVC elevada; colapsabilidade reduzida"
    return _result(ci, category)


def calculate_portal_vein_congestion_index(v_max_portal: float, v_min_portal: float):
    ci = _safe_div(v_max_portal - v_min_portal, v_max_portal, 2)
    if ci is None:
        return _result(None)
    if ci < 0.4:
        category = "Normal; sem congestao portal"
    elif ci <= 0.6:
        category = "Borderline; possivel congestao leve"
    else:
        category = "Congestao portal; sugerir hipertensao portal"
    return _result(ci, category)


def calculate_ecst_stenosis(d_estenose: float, d_proximal: float):
    percent = _safe_div(d_proximal - d_estenose, d_proximal, None)
    if percent is None:
        return _result(None)
    percent = round(percent * 100, 1)
    if percent < 30:
        category = "Sem estenose significativa"
    elif percent <= 69:
        category = "Estenose moderada (30-69%)"
    else:
        category = "Estenose grave (>=70%)"
    return _result(percent, category)


def calculate_mesenteric_stenosis_doppler(psv_sma: float, psv_celiaca: Optional[float] = None):
    if psv_sma > 400 or (psv_celiaca is not None and psv_celiaca > 250):
        category = "Provavel estenose significativa"
    elif (275 <= psv_sma <= 400) or (psv_celiaca is not None and 200 <= psv_celiaca <= 250):
        category = "Borderline; considerar confirmacao"
    else:
        category = "Sem estenose significativa"
    return _result(psv_sma, category, psv_celiaca=psv_celiaca)


def measure_carotid_intima_media_thickness(imt_mm: float):
    if imt_mm < 0.7:
        category = "Normal"
    elif imt_mm <= 0.9:
        category = "Borderline"
    else:
        category = "Aumentado"
    return _result(round(imt_mm, 2), category)


def diagnose_dvt_compression_criteria(compressibilidade: str, lado_contralateral: str):
    comp = _normalize_text(compressibilidade)
    contra = _normalize_text(lado_contralateral)
    if comp == "incompressivel" and contra == "normal":
        return _result("DVT presente")
    return _result("Sem TVP")


def calculate_ankle_brachial_index(p_tornozelo: float, p_braquial: float):
    abi = _safe_div(p_tornozelo, p_braquial, 2)
    if abi is None:
        return _result(None)
    if abi >= 1.0:
        category = "Normal"
    elif abi >= 0.91:
        category = "Borderline"
    elif abi >= 0.71:
        category = "PAD leve-moderada"
    elif abi >= 0.41:
        category = "PAD moderada-grave"
    else:
        category = "PAD grave/critica"
    return _result(abi, category)


def measure_aortic_diameter(d_aorta: float, localizacao: str):
    location = _normalize_text(localizacao)
    category = ""
    if location == "raiz":
        if d_aorta < 40:
            category = "Normal"
        elif d_aorta <= 50:
            category = "Borderline"
        else:
            category = "Aneurisma aortico"
    elif location == "ascendente":
        if d_aorta < 37:
            category = "Normal"
        elif d_aorta > 50:
            category = "Aneurisma aortico"
        else:
            category = "Borderline"
    elif location == "abdominal":
        if d_aorta < 30:
            category = "Normal"
        elif d_aorta <= 50:
            category = "Aneurisma abdominal"
        else:
            category = "AAA grande; cirurgia recomendada"
    return _result(round(d_aorta, 1), category or None, localizacao=location)


# Thorax

def calculate_pleural_effusion_volume_ct(profundidade_max: float, comprimento_max: float):
    if profundidade_max <= 0:
        return _result(None)
    d_cm = profundidade_max / 10.0
    volume = 0.365 * (d_cm ** 3) - 4.529 * (d_cm ** 2) + 159.723 * d_cm - 88.377
    volume = round(volume, 1)
    if volume < 500:
        category = "Pequeno derrame (<500 mL)"
    elif volume <= 1000:
        category = "Derrame moderado (500-1000 mL)"
    else:
        category = "Derrame volumoso (>1000 mL)"
    return _result(volume, category, comprimento_max=comprimento_max)


def calculate_rv_lv_ratio(d_rv: float, d_lv: float):
    ratio = _safe_div(d_rv, d_lv, 2)
    if ratio is None:
        return _result(None)
    if ratio < 0.9:
        category = "Normal"
    elif ratio <= 1.0:
        category = "Borderline"
    else:
        category = "Dilatação RV"
    return _result(ratio, category)


def calculate_pa_aorta_ratio(d_pa: float, d_ao: float):
    ratio = _safe_div(d_pa, d_ao, 2)
    if ratio is None:
        return _result(None)
    if ratio < 0.9:
        category = "Normal"
    elif ratio <= 1.0:
        category = "Borderline"
    else:
        category = "Sugestivo de hipertensao pulmonar"
    return _result(ratio, category)


def classify_nodule_fleischner_2017(tamanho_mm: float, tipo_nodulo: str, risco_paciente: str):
    tipo = _normalize_text(tipo_nodulo)
    risco = _normalize_text(risco_paciente)
    if tipo in {"solido"}:
        if tamanho_mm < 4:
            return _result("Sem follow-up necessario")
        if tamanho_mm <= 6:
            if risco == "alto":
                return _result("Follow-up 6-8 semanas")
            return _result("Follow-up 12 meses")
        if tamanho_mm <= 8:
            return _result("Follow-up 6-8 semanas depois 3-6 meses")
        return _result("PET-CT ou biopsia")

    if tipo in {"subssolido", "vidro_fosco_puro"}:
        if tamanho_mm < 6:
            return _result("Sem follow-up")
        return _result("Follow-up 3-6 meses depois 18-24 meses")

    return _result("Indeterminado")


def calculate_emphysema_index_laa(voxels_950_hu: float, voxels_totais_pulmao: float):
    percentage = _safe_div(voxels_950_hu, voxels_totais_pulmao, None)
    if percentage is None:
        return _result(None)
    percentage = round(percentage * 100, 1)
    if percentage < 5:
        category = "Normal"
    elif percentage < 25:
        category = "Enfisema leve"
    elif percentage < 50:
        category = "Enfisema moderado"
    else:
        category = "Enfisema grave"
    return _result(percentage, category)


def calculate_pesi_score(
    idade: float,
    sexo: str,
    fc: float,
    pas: float,
    fr: float,
    temperatura: float,
    consciencia_alterada: bool,
    sao2: float,
    icc: bool,
    dpoc: bool,
):
    score = idade
    if _normalize_text(sexo) == "m":
        score += 10
    if fc >= 110:
        score += 30
    if pas < 100:
        score += 20
    if fr >= 30:
        score += 20
    if temperatura < 36:
        score += 20
    if _as_bool(consciencia_alterada):
        score += 60
    if _as_bool(icc):
        score += 20
    if _as_bool(dpoc):
        score += 10

    if score <= 65:
        category = "Classe I"
    elif score <= 85:
        category = "Classe II"
    elif score <= 105:
        category = "Classe III"
    elif score <= 125:
        category = "Classe IV"
    else:
        category = "Classe V"

    return _result(int(score), category)


# Abdomen

def calculate_hepatorenal_index(atenuacao_figado: float, atenuacao_rim: float):
    hri = _safe_div(atenuacao_figado - atenuacao_rim, atenuacao_rim, 2)
    if hri is None:
        return _result(None)
    if hri < 0.5:
        category = "Sem esteatose significativa"
    elif hri < 1.5:
        category = "Esteatose leve"
    elif hri < 2.5:
        category = "Esteatose moderada"
    else:
        category = "Esteatose grave"
    return _result(hri, category)


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
        if declared.startswith('b'):
            declared = declared[1:]
        if declared in {"i", "1"}:
            return _result("I")
        if declared in {"ii", "2"}:
            return _result("II")
        if declared in {"iif", "2f", "2f", "2f"}:
            return _result("IIF")
        if declared in {"iii", "3"}:
            return _result("III")
        if declared in {"iv", "4"}:
            return _result("IV")

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

    # Bosniak IV: enhancing nodules or enhancing solid components.
    if nodule_enh:
        if nodule_size >= 4 or nodule_margin in {"aguda", "agudo", "acute"}:
            return _result("IV")
        if nodule_size > 0:
            return _result("IV")
        if solids:
            return _result("IV")
    if solids and enhancement:
        return _result("IV")

    # Bosniak III: thick (>=4 mm) or irregular enhancing wall/septa.
    if enhancement and (wall_irreg or septa_irreg or wall_thick >= 4 or septa_thick >= 4):
        return _result("III")

    # Bosniak IIF: minimally thick (3 mm) enhancing wall/septa or many thin enhancing septa.
    if enhancement and ((3 <= wall_thick < 4) or (3 <= septa_thick < 4) or sept_count >= 4):
        return _result("IIF")

    # Bosniak I: simple cyst.
    if simple_fluid or (not septa and not calc and not solids and (
        (is_ct and homogeneous and atenuacao_hu_pre is not None and -9 <= atenuacao_hu_pre <= 20)
        or (is_mri and t2_csf)
    )):
        return _result("I")

    # MRI-specific Bosniak II/IIF.
    if is_mri:
        if t1_hetero:
            return _result("IIF")
        if t2_csf or t1_marked:
            return _result("II")

    # CT-specific Bosniak II.
    if is_ct:
        if too_small:
            return _result("II")
        if homogeneous and not enhancement:
            if atenuacao_hu_pre is not None:
                if atenuacao_hu_pre >= 70:
                    return _result("II")
                if atenuacao_hu_pre > 20:
                    return _result("II")
                if -9 <= atenuacao_hu_pre <= 20:
                    return _result("II")
            if atenuacao_hu_portal is not None and 21 <= atenuacao_hu_portal <= 30:
                return _result("II")
        if septa or calc:
            if sept_count >= 4:
                return _result("IIF" if enhancement else "II")
            if (wall_thick <= 2 or wall_thick == 0) and (septa_thick <= 2 or septa_thick == 0):
                return _result("II")

    # Fallback: if enhancement without clear category.
    if enhancement:
        return _result("IIF")

    return _result(None, "Indeterminado")


def calculate_renal_nephrometry_score(
    radius_cm: float,
    exophytic_percent: float,
    nearness_mm: float,
    anterior_posterior: str,
    location_polar: str,
):
    if radius_cm < 4:
        r_score = 1
    elif radius_cm <= 7:
        r_score = 2
    else:
        r_score = 3

    if exophytic_percent <= 25:
        e_score = 1
    elif exophytic_percent <= 50:
        e_score = 2
    else:
        e_score = 3

    if nearness_mm >= 7:
        n_score = 1
    elif nearness_mm >= 4:
        n_score = 2
    else:
        n_score = 3

    ap = _normalize_text(anterior_posterior)
    a_score = 2 if ap == "ambos" else 1

    loc = _normalize_text(location_polar)
    l_score = 2 if loc == "meio" else 1

    total = r_score + e_score + n_score + a_score + l_score
    if total <= 6:
        category = "Baixa complexidade"
    elif total <= 9:
        category = "Complexidade intermediaria"
    else:
        category = "Alta complexidade"
    return _result(total, category)


def calculate_height_adjusted_tkv(volume_renal_total: float, altura: float):
    ht_tkv = _safe_div(volume_renal_total, altura, 2)
    if ht_tkv is None:
        return _result(None)
    if ht_tkv < 1.5:
        category = "Mayo Class 1A"
    elif ht_tkv < 2.2:
        category = "Mayo Class 1B"
    elif ht_tkv < 2.6:
        category = "Mayo Class 2"
    elif ht_tkv < 3.1:
        category = "Mayo Class 3"
    else:
        category = "Mayo Class 4"
    return _result(ht_tkv, category)


def calculate_adrenal_absolute_washout(hu_nc: float, hu_portal: float, hu_tardia: float):
    denominator = hu_portal - hu_nc
    if denominator == 0:
        return _result(None)
    washout = round(((hu_portal - hu_tardia) / denominator) * 100, 1)
    if washout > 60:
        category = "Adenoma"
    elif washout >= 40:
        category = "Borderline"
    else:
        category = "Sugestivo nao-adenoma"
    return _result(washout, category)


def calculate_adrenal_signal_intensity_index(sinal_in_phase: float, sinal_opposed_phase: float):
    sii = _safe_div(sinal_in_phase - sinal_opposed_phase, sinal_in_phase, None)
    if sii is None:
        return _result(None)
    sii = round(sii * 100, 1)
    if sii > 16.5:
        category = "Adenoma"
    elif sii >= 10:
        category = "Borderline"
    else:
        category = "Sugestivo nao-adenoma"
    return _result(sii, category)


def calculate_lirads_threshold_growth(d_anterior: float, d_atual: float, intervalo_meses: float):
    percent = _safe_div(d_atual - d_anterior, d_anterior, None)
    if percent is None:
        return _result(None)
    percent = round(percent * 100, 1)
    threshold = percent >= 50 and intervalo_meses <= 6
    return _result(percent, "Threshold growth" if threshold else "Sem threshold", threshold_growth=threshold)


def calculate_modified_ct_severity_index(grau_inflamacao: str, percentual_necrose: float):
    grade = _normalize_text(grau_inflamacao)
    infl_points = {"a": 0, "b": 1, "c": 2, "d": 3, "e": 4}.get(grade, 0)
    if percentual_necrose <= 0:
        nec_points = 0
    elif percentual_necrose <= 30:
        nec_points = 2
    else:
        nec_points = 4
    score = infl_points + nec_points
    if score <= 2:
        category = "Pancreatite leve"
    elif score <= 6:
        category = "Pancreatite moderada"
    else:
        category = "Pancreatite grave"
    return _result(score, category)


def measure_pancreatic_duct_diameter(
    diametro_cabeca: Optional[float] = None,
    diametro_corpo: Optional[float] = None,
    diametro_cauda: Optional[float] = None,
):
    values = {
        "cabeca": diametro_cabeca,
        "corpo": diametro_corpo,
        "cauda": diametro_cauda,
    }
    any_values = [v for v in values.values() if v is not None]
    if not any_values:
        return _result(None)

    dilated = False
    borderline = False
    if diametro_cabeca is not None:
        if diametro_cabeca > 5:
            dilated = True
        elif 3 <= diametro_cabeca <= 5:
            borderline = True
    if diametro_corpo is not None:
        if diametro_corpo > 3:
            dilated = True
        elif 2 <= diametro_corpo <= 3:
            borderline = True
    if diametro_cauda is not None:
        if diametro_cauda > 2:
            dilated = True
        elif 1 <= diametro_cauda <= 2:
            borderline = True

    if dilated:
        category = "Dilatado"
    elif borderline:
        category = "Borderline"
    else:
        category = "Normal"

    return _result(None, category, **values)


def calculate_splenic_volume_ellipsoid(comprimento: float, largura: float, espessura: float):
    volume = _volume_ellipsoid(comprimento, largura, espessura, 0.52, 1)
    if volume < 150:
        category = "Normal"
    elif volume <= 200:
        category = "Borderline"
    elif volume <= 400:
        category = "Esplenomegalia leve"
    else:
        category = "Esplenomegalia moderada-grave"
    return _result(volume, category)


def measure_bile_duct_diameter(d_ducto_biliar: float):
    value = round(d_ducto_biliar, 1)
    if value < 6:
        category = "Normal"
    elif value <= 7:
        category = "Borderline"
    elif value <= 10:
        category = "Dilatado leve"
    else:
        category = "Dilatado moderado-grave"
    return _result(value, category)


def measure_gallbladder_wall_thickness(espessura_parede: float):
    value = round(espessura_parede, 1)
    if value < 3:
        category = "Normal"
    elif value <= 3.5:
        category = "Borderline"
    elif value <= 5:
        category = "Espessado"
    else:
        category = "Muito espessado"
    return _result(value, category)


def grade_hepatic_steatosis_ultrasound(
    ecogenicidade_figado: str,
    visibilidade_diafragma: str,
    atenuacao_posterior: str,
):
    eco = _normalize_text(ecogenicidade_figado)
    dia = _normalize_text(visibilidade_diafragma)
    atten = _normalize_text(atenuacao_posterior)

    eco_score = {"normal": 0, "levemente_aumentada": 1, "moderadamente_aumentada": 2, "acentuadamente_aumentada": 3}.get(eco, 0)
    dia_score = {"normal": 0, "reduzida": 2, "ausente": 3}.get(dia, 0)
    att_score = {"ausente": 0, "leve": 1, "moderada": 2, "acentuada": 3}.get(atten, 0)

    grade = max(eco_score, dia_score, att_score)
    if grade == 0:
        label = "Sem esteatose"
    elif grade == 1:
        label = "Esteatose leve"
    elif grade == 2:
        label = "Esteatose moderada"
    else:
        label = "Esteatose grave"
    return _result(grade, label)


def grade_pancreatic_echogenicity(ecogenicidade_pancreas: str, comparacao_figado: str):
    eco = _normalize_text(ecogenicidade_pancreas)
    if eco == "normal":
        label = "Normal"
    elif eco == "levemente_aumentada":
        label = "Pancreatite cronica leve"
    elif eco == "moderadamente_aumentada":
        label = "Pancreatite cronica moderada"
    else:
        label = "Pancreatite cronica grave"
    return _result(label)


def calculate_psoas_muscle_index(area_psoas: float, altura: float):
    pmi = _safe_div(area_psoas, altura ** 2, 1)
    return _result(pmi)


def measure_visceral_fat_area(vfa_cm2: float):
    value = round(vfa_cm2, 1)
    if value < 100:
        category = "Normal"
    elif value <= 150:
        category = "Aumentado"
    else:
        category = "Muito aumentado"
    return _result(value, category)


def calculate_aorta_calcification_score(grau_calcificacao: float):
    score = int(round(grau_calcificacao))
    if score <= 0:
        category = "Sem calcificacao"
    elif score == 1:
        category = "Calcificacao leve"
    elif score == 2:
        category = "Calcificacao moderada"
    else:
        category = "Calcificacao grave"
    return _result(score, category)


def measure_bowel_wall_thickness(espessura_parede: float):
    value = round(espessura_parede, 1)
    if value < 2:
        category = "Normal"
    elif value <= 3:
        category = "Borderline"
    elif value <= 5:
        category = "Espessado"
    else:
        category = "Muito espessado"
    return _result(value, category)


def grade_mesenteric_fat_stranding(grau_stranding: str):
    grau = _normalize_text(grau_stranding)
    if grau == "ausente":
        label = "Normal"
    elif grau == "leve":
        label = "Borderline"
    elif grau == "moderado":
        label = "Inflamacao mesenterica"
    else:
        label = "Inflamacao acentuada"
    return _result(label)


def calculate_hepatic_artery_ri(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None:
        return _result(None)
    if ri < 0.55:
        category = "Normal"
    elif ri <= 0.70:
        category = "Borderline"
    else:
        category = "Aumentado"
    return _result(ri, category)


def classify_hepatic_vein_doppler(padr_o_fluxo: str):
    padrao = _normalize_text(padr_o_fluxo)
    if padrao == "normal_trifasico":
        return _result("Normal")
    if padrao == "bifasico":
        return _result("Borderline")
    if padrao == "monofasico":
        return _result("Alterado")
    if padrao == "reverso":
        return _result("Reverso")
    return _result("Indeterminado")


def measure_renal_artery_psv(psv_cm_s: float):
    value = round(psv_cm_s, 1)
    if value < 180:
        category = "Normal"
    elif value <= 200:
        category = "Borderline"
    else:
        category = "Aumentado"
    return _result(value, category)


def measure_renal_artery_edv(edv_cm_s: float):
    value = round(edv_cm_s, 1)
    if value > 45:
        category = "Normal"
    elif value >= 20:
        category = "Borderline"
    else:
        category = "Reduzido"
    return _result(value, category)


def calculate_renal_transplant_ri(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None:
        return _result(None)
    if ri < 0.70:
        category = "Normal"
    elif ri <= 0.80:
        category = "Borderline"
    else:
        category = "Aumentado"
    return _result(ri, category)


def measure_adrenal_size(diametro_max: float):
    value = round(diametro_max, 1)
    if value < 10:
        category = "Normal"
    elif value <= 12:
        category = "Borderline"
    elif value <= 15:
        category = "Aumentado"
    else:
        category = "Muito aumentado"
    return _result(value, category)


def calculate_adrenal_lipid_index(hu_nc: float, hu_portal: float):
    lipid_index = round(hu_nc, 1)
    if lipid_index < -10:
        category = "Muito lipidico"
    elif lipid_index <= 10:
        category = "Borderline"
    else:
        category = "Pouco lipidico"
    return _result(lipid_index, category)


def calculate_splenic_artery_ri(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None:
        return _result(None)
    if ri < 0.55:
        category = "Normal"
    elif ri <= 0.70:
        category = "Borderline"
    else:
        category = "Aumentado"
    return _result(ri, category)


def classify_spleen_doppler_flow(direcao_fluxo: str):
    direction = _normalize_text(direcao_fluxo)
    if direction == "hepatopetal":
        return _result("Normal")
    if direction == "bifasico":
        return _result("Borderline")
    if direction == "hepatofugal":
        return _result("Reverso")
    return _result("Indeterminado")


def measure_bile_duct_stone_diameter(d_calcul: float):
    value = round(d_calcul, 1)
    if value < 5:
        category = "Pequeno"
    elif value <= 10:
        category = "Moderado"
    else:
        category = "Grande"
    return _result(value, category)


def grade_hepatic_steatosis_ct(hu_figado: float, hu_rim: float):
    diferenca = round(hu_figado - hu_rim, 1)
    if diferenca > -10:
        label = "Sem esteatose"
    elif diferenca > -20:
        label = "Esteatose leve"
    elif diferenca > -30:
        label = "Esteatose moderada"
    else:
        label = "Esteatose grave"
    return _result(diferenca, label)


def calculate_stone_skin_distance_mean(ssd_1: float, ssd_2: float, ssd_3: float):
    mean = round((ssd_1 + ssd_2 + ssd_3) / 3, 1)
    return _result(mean)


# Urologia

def calculate_prostate_volume_ellipsoid(comprimento: float, largura: float, altura: float):
    volume = _volume_ellipsoid(comprimento, largura, altura, 0.52, 1)
    if volume < 25:
        category = "Normal"
    elif volume <= 50:
        category = "Hiperplasia leve"
    elif volume <= 100:
        category = "Hiperplasia moderada"
    else:
        category = "Hiperplasia grave"
    return _result(volume, category)


def classify_prostate_pirads_v2_1(t2_score: float, dwi_score: float, dce_score: float, localizacao: str):
    zone = _normalize_text(localizacao)
    if zone == "zona_periferica":
        base = int(round(dwi_score))
        if base == 3 and dce_score > 0:
            base = 4
    else:
        base = int(round(t2_score))
        if base == 3 and dwi_score >= 4:
            base = 4
    base = min(max(base, 1), 5)
    return _result(base)


def calculate_prostate_psa_density(psa: float, volume_prostata: float):
    psad = _safe_div(psa, volume_prostata, 3)
    if psad is None:
        return _result(None)
    if psad < 0.15:
        category = "Normal"
    elif psad <= 0.25:
        category = "Borderline"
    else:
        category = "Aumentado"
    return _result(psad, category)


def calculate_transition_zone_psa_density(psa: float, volume_tz: float):
    tz_psad = _safe_div(psa, volume_tz, 3)
    if tz_psad is None:
        return _result(None)
    if tz_psad < 0.10:
        category = "Normal"
    elif tz_psad <= 0.20:
        category = "Borderline"
    else:
        category = "Aumentado"
    return _result(tz_psad, category)


def diagnose_extraprostatic_extension(epe_presente: bool, lateralidade: str):
    if not _as_bool(epe_presente):
        return _result("Sem EPE; T2")
    side = _normalize_text(lateralidade)
    if side == "bilateral":
        return _result("EPE bilateral; T3a")
    return _result("EPE unilateral; T3a")


def diagnose_seminal_vesicle_invasion(svi_presente: bool, lateralidade: str):
    if not _as_bool(svi_presente):
        return _result("Sem SVI; T2-T3a")
    side = _normalize_text(lateralidade)
    if side == "bilateral":
        return _result("SVI bilateral; T3b")
    return _result("SVI unilateral; T3b")


def estimate_gleason_score_mri(dwi_score: float, dce_score: float, t2_score: float):
    if dwi_score <= 2 and dce_score <= 1:
        return _result("Gleason 6-7")
    if dwi_score == 3 or dce_score == 2:
        return _result("Gleason 7")
    if dwi_score >= 4 or dce_score == 3:
        return _result("Gleason 8-10")
    return _result("Indeterminado")


def grade_prostate_cancer_gleason(gleason_primary: float, gleason_secondary: float):
    score = int(round(gleason_primary + gleason_secondary))
    if score <= 6:
        category = "Grupo 1"
    elif score == 7:
        category = "Grupo 2-3"
    elif score == 8:
        category = "Grupo 4"
    else:
        category = "Grupo 5"
    return _result(score, category)


def measure_uterine_artery_doppler(ri_arteria_uterina: float, notch_diastolico: bool):
    ri = round(ri_arteria_uterina, 2)
    if ri < 0.58 and not _as_bool(notch_diastolico):
        category = "Normal"
    else:
        category = "Aumentado"
    return _result(ri, category)


def calculate_bladder_outlet_obstruction_index(pressao_detrusor_max: float, fluxo_urinario_max: float):
    boo_index = round(pressao_detrusor_max - 2 * fluxo_urinario_max, 1)
    if boo_index < 20:
        category = "Sem obstrucao"
    elif boo_index <= 40:
        category = "Borderline"
    else:
        category = "Obstruido"
    return _result(boo_index, category)


def measure_bladder_wall_thickness(espessura_parede: float, volume_bexiga: float):
    value = round(espessura_parede, 1)
    if value < 3 and volume_bexiga > 300:
        category = "Normal"
    elif value <= 5:
        category = "Borderline"
    else:
        category = "Espessado"
    return _result(value, category)


def measure_post_void_residual_volume(volume_residuo: float):
    value = round(volume_residuo, 1)
    if value < 50:
        category = "Normal"
    elif value <= 100:
        category = "Borderline"
    else:
        category = "Retencao"
    return _result(value, category)


# Ginecologia / Obstetricia

def calculate_hadlock_efw(ac: float, fl: float, bpd: Optional[float] = None, hc: Optional[float] = None):
    log_weight = 1.304 + 0.05281 * ac + 0.1938 * fl - 0.004 * ac * fl
    weight = round(10 ** log_weight, 0)
    return _result(weight)


def calculate_ovarian_volume_ellipsoid(comprimento: float, largura: float, espessura: float):
    volume = _volume_ellipsoid(comprimento, largura, espessura, 0.52, 1)
    if volume < 9:
        category = "Normal"
    elif volume <= 12:
        category = "Borderline"
    else:
        category = "Aumentado"
    return _result(volume, category)


def classify_ovarian_lesion_orads_us(
    tamanho_mm: float,
    composicao: str,
    vascularizacao: str,
    achados_adicionais: Optional[str] = None,
):
    comp = _normalize_text(composicao)
    vasc = _normalize_text(vascularizacao)

    # Simplified mapping based on composition/vascularity only.
    if comp == "cistica_simples" and vasc == "ausente":
        category = 2
    elif comp == "cistica_complexa":
        category = 3 if vasc == "ausente" else 4
    elif comp == "mista":
        category = 4 if vasc == "presente" else 3
    elif comp == "solida":
        category = 5 if vasc == "presente" else 4
    else:
        category = 3

    return _result(int(category), None, achados_adicionais=achados_adicionais)


def diagnose_ovarian_torsion(doppler_fluxo: str, volume_ovario: float, edema_estroma: bool):
    fluxo = _normalize_text(doppler_fluxo)
    edema = _as_bool(edema_estroma)
    if fluxo == "ausente" and volume_ovario > 20 and edema:
        return _result("Provavel torsao")
    if fluxo == "reduzido" and edema:
        return _result("Possivel torsao")
    if fluxo == "presente" and not edema:
        return _result("Nao torsao")
    return _result("Indeterminado")


def assess_ovarian_reserve_amh(amh_ng_ml: float):
    if amh_ng_ml >= 1.0:
        category = "Normal"
    elif amh_ng_ml >= 0.5:
        category = "Reduzido"
    else:
        category = "Muito reduzido"
    return _result(round(amh_ng_ml, 2), category)


def measure_endometrial_thickness(espessura_endometrio: float, fase_ciclo: str):
    fase = _normalize_text(fase_ciclo)
    value = round(espessura_endometrio, 1)
    if fase == "proliferativa" and value < 8:
        category = "Normal"
    elif fase == "secretoria" and value < 14:
        category = "Normal"
    elif value > 20:
        category = "Muito espessado"
    elif value > 16 and fase != "menstrual":
        category = "Espessado"
    else:
        category = "Indeterminado"
    return _result(value, category)


def calculate_uterine_fibroid_volume(comprimento: float, largura: float, altura: float):
    volume = _volume_ellipsoid(comprimento, largura, altura, 0.52, 1)
    if volume < 100:
        category = "Pequeno"
    elif volume <= 500:
        category = "Moderado"
    else:
        category = "Grande"
    return _result(volume, category)


def measure_adenomyosis_junctional_zone(espessura_jz: float, irregularidade_jz: bool):
    value = round(espessura_jz, 1)
    irregular = _as_bool(irregularidade_jz)
    if value < 8 and not irregular:
        category = "Normal"
    elif value <= 12 and irregular:
        category = "Adenomiose leve"
    elif value <= 16 and irregular:
        category = "Adenomiose moderada"
    elif value > 16 and irregular:
        category = "Adenomiose grave"
    else:
        category = "Indeterminado"
    return _result(value, category)


def measure_rectal_wall_thickness(espessura_parede: float):
    value = round(espessura_parede, 1)
    if value < 5:
        category = "T1 (submucosa)"
    elif value <= 10:
        category = "T2 (muscular propria)"
    else:
        category = "T3-T4"
    return _result(value, category)


def classify_rectal_cancer_tnm(t_stage: str, n_stage: str, m_stage: str):
    t_val = _normalize_text(t_stage).upper()
    n_val = _normalize_text(n_stage).upper()
    m_val = _normalize_text(m_stage).upper()
    stage = f"{t_val}{n_val}{m_val}"

    if t_val == "T1" and n_val == "N0" and m_val == "M0":
        category = "Stage I"
    elif t_val in {"T2", "T3", "T4"} and n_val == "N0" and m_val == "M0":
        category = "Stage II"
    elif n_val in {"N1", "N2"} and m_val == "M0":
        category = "Stage III"
    elif m_val != "M0":
        category = "Stage IV"
    else:
        category = "Indeterminado"
    return _result(stage, category)


def measure_circumferential_resection_margin(distancia_crm: float):
    value = round(distancia_crm, 1)
    if value >= 2:
        category = "Negativo"
    elif value >= 1:
        category = "Borderline"
    else:
        category = "Positivo"
    return _result(value, category)


def measure_rectal_cancer_depth(profundidade_invasao: float):
    value = round(profundidade_invasao, 1)
    if value <= 5:
        category = "T3a"
    elif value <= 10:
        category = "T3b"
    elif value <= 15:
        category = "T3c"
    else:
        category = "T3d/T4"
    return _result(value, category)


def classify_lymph_node_staging(numero_linfonodos: float, diametro_max: float):
    count = int(round(numero_linfonodos))
    if count == 0:
        category = "N0"
    elif count <= 3:
        category = "N1"
    else:
        category = "N2"
    return _result(category, None, numero_linfonodos=count, diametro_max=diametro_max)


# Tireoide

def classify_thyroid_nodule_tirads(
    composicao: str,
    ecogenicidade: str,
    forma: str,
    margens: str,
    focos_ecogenicos: str,
):
    comp = _normalize_text(composicao)
    echo = _normalize_text(ecogenicidade)
    shape = _normalize_text(forma)
    margins = _normalize_text(margens)
    foci = _normalize_text(focos_ecogenicos)

    comp_points = {
        "cistica": 0,
        "quase_completamente_cistica": 0,
        "cistica_com_solido": 1,
        "solida": 2,
    }.get(comp, 0)

    echo_points = {
        "anecoica": 0,
        "isoecoica": 1,
        "hiperecoica": 1,
        "hipoecoica": 2,
    }.get(echo, 0)

    shape_points = 3 if shape == "tao_larga_quanto_alta" else 0

    margin_points = {
        "bem_definidas": 0,
        "mal_definidas": 0,
        "lobuladas": 2,
        "espiculadas": 3,
    }.get(margins, 0)

    foci_points = {
        "ausentes": 0,
        "pontos_grandes": 1,
        "pontos_pequenos_comet_tail": 0,
    }.get(foci, 0)

    score = comp_points + echo_points + shape_points + margin_points + foci_points
    if score <= 1:
        level = "TR1"
    elif score == 2:
        level = "TR2"
    elif score == 3:
        level = "TR3"
    elif score <= 6:
        level = "TR4"
    else:
        level = "TR5"
    return _result(level)


def calculate_thyroid_volume_ellipsoid(
    l_rd: float,
    w_rd: float,
    h_rd: float,
    l_ld: float,
    w_ld: float,
    h_ld: float,
    v_istmo: Optional[float] = None,
):
    vol_rd = _volume_ellipsoid(l_rd, w_rd, h_rd, 0.52, 1)
    vol_ld = _volume_ellipsoid(l_ld, w_ld, h_ld, 0.52, 1)
    istmo = v_istmo or 0.0
    total = round(vol_rd + vol_ld + istmo, 1)
    return _result(total)


# TC Abdome - Caracterizacao de Lesoes

def calculate_lesion_washin_universal(
    hu_nc: float,
    hu_arterial: float,
    hu_portal: float,
    orgao: Optional[str] = None
):
    """
    Wash-in genérico para qualquer lesão sólida em TC abdome.
    
    Interpretação por órgão:
    - Fígado: >100%=HCC/hemangioma, 60-100%=HNF/adenoma, <60%=metástase
    - Pâncreas: >60%=NET, <60%=adenocarcinoma
    - Adrenal: >60%=feocromocitoma, <60%=adenoma/metástase
    - Rim: >80%=angiomiolipoma/oncocitoma, <80%=CCR
    """
    denominator = hu_portal - hu_nc
    if denominator == 0 or denominator < 0:
        return _result(None, "Dados invalidos; lesao nao realca")
    
    washin = round(((hu_arterial - hu_nc) / denominator) * 100, 1)
    organ = _normalize_text(orgao) if orgao else "generico"
    
    # Interpretação genérica
    if washin > 100:
        category = "Hipervascular (wash-in tardio)"
        interpretation = "Sugere lesao com realce progressivo (hemangioma, HCC bem diferenciado)"
    elif washin >= 60:
        category = "Hipervascular (wash-in precoce)"
        interpretation = "Realce arterial predominante (NET, feocromocitoma, HNF, oncocitoma)"
    else:
        category = "Hipovascular"
        interpretation = "Realce portal predominante (metastase, adenocarcinoma pancreatico)"
    
    # Ajuste por órgão
    if organ == "figado":
        if washin > 100:
            interpretation = "Sugestivo hemangioma ou HCC bem diferenciado"
        elif washin >= 60:
            interpretation = "Sugestivo HNF, adenoma hepatocelular ou HCC tipico"
        else:
            interpretation = "Sugestivo metastase ou lesao hipovascular"
    
    elif organ == "pancreas":
        if washin >= 60:
            interpretation = "Sugestivo tumor neuroendocrino (NET)"
        else:
            interpretation = "Sugestivo adenocarcinoma ductal"
    
    elif organ == "adrenal":
        if washin > 60:
            interpretation = "Sugestivo feocromocitoma"
        else:
            interpretation = "Padrao inespecifico (adenoma/metastase)"
    
    elif organ == "rim":
        if washin > 80:
            interpretation = "Hipervascular (angiomiolipoma pobre em gordura, oncocitoma)"
        else:
            interpretation = "Carcinoma celulas renais (padrao mais comum)"
    
    return _result(washin, category, interpretacao=interpretation, orgao=organ)


def calculate_lesion_washout_universal(
    hu_nc: float,
    hu_arterial: float,
    hu_tardia: float,
    orgao: Optional[str] = None
):
    """
    Wash-out genérico para lesões que realçam na arterial.
    
    Interpretação:
    - >40% = wash-out rápido (hemangioma, feocromocitoma)
    - 20-40% = wash-out moderado (HCC, NET)
    - <20% = wash-out lento ou ausente (metástase, adenocarcinoma)
    """
    denominator = hu_arterial - hu_nc
    if denominator <= 0:
        return _result(None, "Lesao nao realca ou dados invalidos")
    
    washout = round(((hu_arterial - hu_tardia) / denominator) * 100, 1)
    organ = _normalize_text(orgao) if orgao else "generico"
    
    if washout > 40:
        category = "Wash-out rapido"
        interpretation = "Hemangioma atipico, feocromocitoma, HCC moderadamente diferenciado"
    elif washout >= 20:
        category = "Wash-out moderado"
        interpretation = "HCC tipico, NET, oncocitoma"
    else:
        category = "Wash-out lento/ausente"
        interpretation = "Metastase, adenocarcinoma, HNF"
    
    # Ajuste por órgão
    if organ == "figado":
        if washout > 40:
            interpretation = "Sugestivo hemangioma flash-filling ou HCC moderadamente diferenciado"
        elif washout >= 20:
            interpretation = "Padrao tipico de HCC (LI-RADS 5)"
        else:
            interpretation = "HNF, adenoma ou metastase hipervascular"
    
    return _result(washout, category, interpretacao=interpretation, orgao=organ)


def calculate_adrenal_relative_washout(hu_portal: float, hu_tardia: float):
    """
    Adrenal Relative Washout (RPW) - usado quando NÃO há fase pré-contraste.
    
    RPW = ((HU_portal - HU_tardia) / HU_portal) × 100
    
    >40% = adenoma (especificidade 96% - Caoili 2002)
    30-40% = borderline
    <30% = sugestivo não-adenoma
    """
    denominator = hu_portal
    if denominator == 0:
        return _result(None)
    washout = round(((hu_portal - hu_tardia) / denominator) * 100, 1)
    if washout > 40:
        category = "Adenoma"
    elif washout >= 30:
        category = "Borderline"
    else:
        category = "Sugestivo nao-adenoma"
    return _result(washout, category, referencia="Caoili 2002")


def grade_hepatic_steatosis_hu_absolute(hu_figado_nc: float):
    """
    Classificação de esteatose hepática por HU absoluto em TC sem contraste (120 kVp).
    Critério de Starekova J, et al. Radiology 2021.
    
    HU ≥57 = ausente/limite
    HU 40-56 = leve (S1)
    HU 23-39 = moderada (S2)
    HU <23 = acentuada/grave (S3)
    """
    hu = round(hu_figado_nc, 1)
    
    if hu >= 57:
        grade = "S0"
        category = "Ausente ou esteatose minima"
    elif hu >= 40:
        grade = "S1"
        category = "Esteatose leve"
    elif hu >= 23:
        grade = "S2"
        category = "Esteatose moderada"
    else:
        grade = "S3"
        category = "Esteatose acentuada/grave"
    
    return _result(hu, category, grade=grade, referencia="Starekova 2021")


def classify_pancreatic_tumor_enhancement(
    hu_tumor_arterial: float,
    hu_parenquima_pancreas_arterial: float,
    hu_tumor_nc: Optional[float] = None
):
    """
    Diferenciação adenocarcinoma (hipovascular) vs NET (hipervascular).
    
    Delta <15-20 HU = hipovascular → adenocarcinoma ductal (90% dos tumores pancreáticos)
    Delta >20 HU = hipervascular → NET, tumor sólido-pseudopapilar, pancreatoblastoma
    """
    delta_realce = hu_tumor_arterial - hu_parenquima_pancreas_arterial
    delta_realce = round(delta_realce, 1)
    
    if delta_realce < -20:
        category = "Hipovascular acentuado"
        interpretation = "Muito sugestivo de adenocarcinoma ductal"
    elif delta_realce < 0:
        category = "Hipovascular"
        interpretation = "Sugestivo de adenocarcinoma ductal"
    elif delta_realce <= 15:
        category = "Isovascular"
        interpretation = "Borderline; correlacionar clinica e morfologia"
    else:
        category = "Hipervascular"
        interpretation = "Sugestivo de tumor neuroendocrino (NET), tumor solido-pseudopapilar, ou pancreatoblastoma"
    
    # Se temos NC, calcular realce absoluto do tumor
    realce_absoluto = None
    if hu_tumor_nc is not None:
        realce_absoluto = round(hu_tumor_arterial - hu_tumor_nc, 1)
    
    return _result(
        delta_realce,
        category,
        interpretacao=interpretation,
        realce_absoluto_tumor=realce_absoluto
    )


def calculate_renal_mass_enhancement_absolute(
    hu_massa_nc: float,
    hu_massa_portal: float,
    hu_massa_tardia: Optional[float] = None
):
    """
    Critério clássico: realce absoluto >15-20 HU = massa sólida/realcante.
    
    <10 HU = cisto simples/proteináceo (Bosniak I-II)
    10-20 HU = indeterminado; avaliar morfologia (Bosniak IIF vs III)
    >20 HU = massa sólida realcante (Bosniak III-IV, CCR, angiomiolipoma)
    """
    realce_absoluto = round(hu_massa_portal - hu_massa_nc, 1)
    
    if realce_absoluto < 10:
        category = "Sem realce significativo"
        bosniak_suggestion = "Bosniak I-II (cisto simples ou minimamente complexo)"
    elif realce_absoluto <= 20:
        category = "Realce indeterminado/borderline"
        bosniak_suggestion = "Bosniak IIF-III; avaliar morfologia (septos, paredes)"
    else:
        category = "Realce significativo (massa solida)"
        bosniak_suggestion = "Bosniak III-IV se cistico, ou massa solida renal (CCR, angiomiolipoma)"
    
    # Se temos fase tardia, calcular wash-out
    washout = None
    if hu_massa_tardia is not None and realce_absoluto > 0:
        washout = round(((hu_massa_portal - hu_massa_tardia) / realce_absoluto) * 100, 1)
    
    return _result(
        realce_absoluto,
        category,
        bosniak_implication=bosniak_suggestion,
        washout_percent=washout
    )


def grade_portal_vein_thrombosis(
    diametro_veia_porta: float,
    percentual_oclusao: float,
    presenca_realce_trombo: Optional[bool] = None
):
    """
    Graduação de trombose portal por percentual de oclusão.
    
    I   = <25% oclusão
    II  = 25-50% oclusão
    III = 50-75% oclusão
    IV  = >75% oclusão (completa se 100%)
    """
    if percentual_oclusao < 25:
        grade = "I"
        category = "Trombose leve (<25%)"
    elif percentual_oclusao < 50:
        grade = "II"
        category = "Trombose moderada (25-50%)"
    elif percentual_oclusao < 75:
        grade = "III"
        category = "Trombose avancada (50-75%)"
    else:
        grade = "IV"
        if percentual_oclusao >= 99:
            category = "Trombose completa (100%)"
        else:
            category = "Trombose subtotal (>75%)"
    
    # Realce sugere trombo agudo/subagudo
    age_suggestion = None
    if presenca_realce_trombo is not None:
        if _as_bool(presenca_realce_trombo):
            age_suggestion = "Trombo agudo/subagudo (realce presente)"
        else:
            age_suggestion = "Trombo cronico (sem realce)"
    
    return _result(
        round(percentual_oclusao, 1),
        category,
        grade=grade,
        age_trombo=age_suggestion,
        diametro_veia=round(diametro_veia_porta, 1)
    )


def calculate_meld_score(creatinina: float, bilirrubina: float, inr: float):
    """
    Model for End-Stage Liver Disease (MELD) score.
    
    MELD = 9.57×ln(Cr) + 3.78×ln(Bili) + 11.2×ln(INR) + 6.43
    
    <10 = baixo risco
    10-19 = risco moderado
    20-29 = alto risco
    >=30 = risco muito alto
    """
    import math
    
    # Limitar valores mínimos para evitar log(0)
    cr = max(creatinina, 1.0)
    bili = max(bilirrubina, 1.0)
    inr_val = max(inr, 1.0)
    
    meld = 9.57 * math.log(cr) + 3.78 * math.log(bili) + 11.2 * math.log(inr_val) + 6.43
    meld = round(max(meld, 6), 0)  # Mínimo de 6
    
    if meld < 10:
        category = "Baixo risco (3% mortalidade 90d)"
    elif meld < 20:
        category = "Risco moderado (6-20% mortalidade 90d)"
    elif meld < 30:
        category = "Alto risco (20-45% mortalidade 90d)"
    else:
        category = "Risco muito alto (>50% mortalidade 90d)"
    
    return _result(int(meld), category)


def calculate_child_pugh_score(
    bilirrubina: float,
    albumina: float,
    inr: float,
    ascite_grau: str,
    encefalopatia_grau: str
):
    """
    Child-Pugh score para classificação de cirrose.
    
    Pontuação:
    - Bilirrubina: <2=1pt, 2-3=2pt, >3=3pt
    - Albumina: >3.5=1pt, 2.8-3.5=2pt, <2.8=3pt
    - INR: <1.7=1pt, 1.7-2.3=2pt, >2.3=3pt
    - Ascite: ausente=1pt, leve=2pt, moderada/tensao=3pt
    - Encefalopatia: ausente=1pt, grau I-II=2pt, grau III-IV=3pt
    
    Score 5-6 = Child A
    Score 7-9 = Child B
    Score 10-15 = Child C
    """
    score = 0
    
    # Bilirrubina (mg/dL)
    if bilirrubina < 2:
        score += 1
    elif bilirrubina <= 3:
        score += 2
    else:
        score += 3
    
    # Albumina (g/dL)
    if albumina > 3.5:
        score += 1
    elif albumina >= 2.8:
        score += 2
    else:
        score += 3
    
    # INR
    if inr < 1.7:
        score += 1
    elif inr <= 2.3:
        score += 2
    else:
        score += 3
    
    # Ascite
    ascite = _normalize_text(ascite_grau)
    if ascite in {"ausente", "0", "nao"}:
        score += 1
    elif ascite in {"leve", "minimo", "1"}:
        score += 2
    else:
        score += 3
    
    # Encefalopatia
    encef = _normalize_text(encefalopatia_grau)
    if encef in {"ausente", "0", "nao"}:
        score += 1
    elif encef in {"i", "ii", "1", "2", "leve"}:
        score += 2
    else:
        score += 3
    
    if score <= 6:
        child_class = "A"
        category = "Child-Pugh A (compensada; sobrevida 1 ano >95%)"
    elif score <= 9:
        child_class = "B"
        category = "Child-Pugh B (disfuncao significativa; sobrevida 1 ano 80%)"
    else:
        child_class = "C"
        category = "Child-Pugh C (descompensada; sobrevida 1 ano 35%)"
    
    return _result(score, category, child_class=child_class)


def classify_hepatic_lesion_density(hu_lesao_nc: float):
    """
    Classificação de lesão hepática por densidade HU sem contraste.
    
    <0 HU = Gordura (lipoma, adenoma rico em gordura)
    0-20 HU = Água/fluido simples (cisto simples, abscesso liquido)
    20-45 HU = Conteúdo proteináceo/hemorrágico
    45-60 HU = Parênquima/sólido hipodenso
    >70 HU = Hiperdenso (hemangioma, calcificação, metástase mucinosa)
    """
    hu = round(hu_lesao_nc, 1)
    
    if hu < 0:
        category = "Densidade de gordura"
        interpretation = "Lipoma hepatico, adenoma hepatocelular rico em gordura, ou artefato"
    elif hu <= 20:
        category = "Densidade de agua/fluido simples"
        interpretation = "Cisto hepatico simples, abscesso liquido, ou biloma"
    elif hu <= 45:
        category = "Conteudo proteico/hemorragico"
        interpretation = "Cisto complexo, hematoma, abscesso em organizacao"
    elif hu <= 60:
        category = "Parenquima/solido hipodenso"
        interpretation = "Metastase tipica, HCC, colangiocarcinoma"
    else:
        category = "Hiperdenso"
        interpretation = "Hemangioma, calcificacao, metastase mucinosa ou hipervascular"
    
    return _result(hu, category, interpretacao=interpretation)


def grade_appendix_diameter(diametro_apendice: float):
    """
    Avaliação do diâmetro apendicular para diagnóstico de apendicite.
    
    <6mm = Normal
    6-7mm = Borderline (correlacionar com clínica)
    >7mm = Apendicite aguda provável
    >10mm = Apendicite estabelecida
    """
    d = round(diametro_apendice, 1)
    
    if d < 6:
        category = "Normal"
    elif d <= 7:
        category = "Borderline (correlacionar clinica)"
    elif d <= 10:
        category = "Apendicite aguda provavel"
    else:
        category = "Apendicite estabelecida"
    
    return _result(d, category)


def classify_bowel_obstruction_level(
    diametro_intestino_delgado_max: float,
    diametro_colon_max: Optional[float] = None,
    ponto_transicao_presente: Optional[bool] = None
):
    """
    Classificação de obstrução intestinal por calibre.
    
    Intestino delgado:
    - <3cm = Normal
    - 3-4cm = Borderline/íleo paralítico
    - >4cm = Obstrução de delgado
    
    Cólon:
    - <6cm = Normal
    - 6-9cm = Borderline
    - >9cm = Obstrução de grosso calibre
    """
    d_delgado = round(diametro_intestino_delgado_max, 1)
    
    if d_delgado < 3:
        category_delgado = "Calibre normal"
    elif d_delgado <= 4:
        category_delgado = "Borderline/ileo paralitico"
    else:
        category_delgado = "Obstrucao de delgado"
    
    category_colon = None
    if diametro_colon_max is not None:
        d_colon = round(diametro_colon_max, 1)
        if d_colon < 6:
            category_colon = "Colon normal"
        elif d_colon <= 9:
            category_colon = "Colon borderline/distensao leve"
        else:
            category_colon = "Obstrucao de grosso calibre"
    
    transition = None
    if ponto_transicao_presente is not None:
        transition = "Presente" if _as_bool(ponto_transicao_presente) else "Ausente"
    
    return _result(
        d_delgado,
        category_delgado,
        diametro_colon=diametro_colon_max,
        categoria_colon=category_colon,
        ponto_transicao=transition
    )


def calculate_liver_fibrosis_index_ct(diametro_caudado_mm: float, diametro_lobo_direito_mm: float):
    """
    Índice de fibrose hepática morfológico por TC.
    
    Ratio = caudado / lobo direito
    
    <0.65 = Fibrose ausente/leve
    >=0.65 = Sugestivo fibrose avançada/cirrose
    """
    ratio = _safe_div(diametro_caudado_mm, diametro_lobo_direito_mm, 3)
    
    if ratio is None:
        return _result(None)
    
    if ratio < 0.65:
        category = "Fibrose ausente ou leve"
    else:
        category = "Sugestivo fibrose avancada/cirrose"
    
    return _result(ratio, category)


def calculate_pancreatic_duct_to_gland_ratio(
    diametro_ducto_wirsung: float,
    espessura_glandula: float
):
    """
    Razão ducto/glândula pancreática.
    
    Ratio >0.5 = dilatação ductal desproporcional
    Sugere pancreatite crônica ou IPMN
    """
    ratio = _safe_div(diametro_ducto_wirsung, espessura_glandula, 2)
    
    if ratio is None:
        return _result(None)
    
    if ratio > 0.5:
        category = "Dilatacao ductal desproporcional"
        interpretation = "Sugestivo pancreatite cronica ou IPMN"
    elif ratio > 0.3:
        category = "Borderline"
        interpretation = "Correlacionar clinica"
    else:
        category = "Proporcao normal"
        interpretation = "Parenquima preservado"
    
    return _result(ratio, category, interpretacao=interpretation)


def measure_mesenteric_lymph_node_size(eixo_curto_mm: float):
    """
    Classificação de linfonodo mesentérico por eixo curto.
    
    <10mm = Normal
    10-15mm = Borderline (reativo vs patológico)
    >15mm = Patológico (adenomegalia)
    """
    size = round(eixo_curto_mm, 1)
    
    if size < 10:
        category = "Normal"
    elif size <= 15:
        category = "Borderline (reativo vs patologico)"
    else:
        category = "Patologico (adenomegalia)"
    
    return _result(size, category)


def classify_retroperitoneal_lymph_nodes(
    nivel_anatomico: str,
    eixo_curto_max_mm: float
):
    """
    Mapeamento de linfonodos retroperitoneais por nível anatômico.
    
    Níveis: para-aortico, aorto-caval, inter-aortocava, pre-aortico, etc
    
    >10mm = N+ (patológico) em cada nível
    """
    level = _normalize_text(nivel_anatomico)
    size = round(eixo_curto_max_mm, 1)
    
    if size < 10:
        n_stage = "N0"
        category = "Sem adenomegalia"
    else:
        n_stage = "N1"
        category = f"Adenomegalia no nivel {level}"
    
    return _result(size, category, n_stage=n_stage, nivel=level)


def measure_splenic_artery_aneurysm_risk(diametro_aneurisma_mm: float):
    """
    Classificação de risco de aneurisma de artéria esplênica.
    
    <20mm = Watchful waiting (baixo risco ruptura)
    20-25mm = Considerar cirurgia (risco moderado)
    >25mm = Cirurgia recomendada (alto risco ruptura)
    """
    d = round(diametro_aneurisma_mm, 1)
    
    if d < 20:
        category = "Watchful waiting"
        risk = "Baixo risco de ruptura"
    elif d <= 25:
        category = "Considerar cirurgia"
        risk = "Risco moderado de ruptura"
    else:
        category = "Cirurgia recomendada"
        risk = "Alto risco de ruptura"
    
    return _result(d, category, risco_ruptura=risk)


def calculate_renal_artery_stenosis_indirect(
    diametro_rim_afetado_cm: float,
    diametro_rim_contralateral_cm: float
):
    """
    Avaliação indireta de estenose arterial renal por atrofia.
    
    Ratio = rim afetado / rim contralateral
    
    <0.9 = Atrofia sugestiva de estenose significativa
    >=0.9 = Sem atrofia significativa
    """
    ratio = _safe_div(diametro_rim_afetado_cm, diametro_rim_contralateral_cm, 2)
    
    if ratio is None:
        return _result(None)
    
    if ratio < 0.9:
        category = "Atrofia sugestiva de estenose significativa"
    else:
        category = "Sem atrofia significativa"
    
    return _result(ratio, category)


def measure_colonic_wall_thickness(espessura_parede_colon_mm: float):
    """
    Espessamento parietal colônico.
    
    <3mm = Normal
    3-5mm = Borderline
    >5mm = Espessado (colite, neoplasia)
    """
    thickness = round(espessura_parede_colon_mm, 1)
    
    if thickness < 3:
        category = "Normal"
    elif thickness <= 5:
        category = "Borderline"
    else:
        category = "Espessado (colite, neoplasia)"
    
    return _result(thickness, category)


def calculate_peritoneal_carcinomatosis_index(
    numero_segmentos_envolvidos: int,
    tamanho_maior_implante_mm: Optional[float] = None
):
    """
    Peritoneal Cancer Index (PCI) simplificado.
    
    PCI = número de segmentos (0-12) + score por tamanho
    
    0-10 = Baixo
    11-20 = Moderado
    >20 = Extenso
    """
    pci = numero_segmentos_envolvidos
    
    if pci <= 10:
        category = "Carcinomatose baixa carga"
    elif pci <= 20:
        category = "Carcinomatose moderada carga"
    else:
        category = "Carcinomatose extensa/alta carga"
    
    return _result(
        pci,
        category,
        numero_segmentos=numero_segmentos_envolvidos,
        maior_implante_mm=tamanho_maior_implante_mm
    )


def grade_ascites_volume(
    ascite_periesplenica: bool,
    ascite_difusa: bool,
    deslocamento_visceras: bool
):
    """
    Classificação de ascite por distribuição.
    
    Grau I   = Mínimo (periesplenical only)
    Grau II  = Moderado (difuso, sem deslocamento)
    Grau III = Volumoso (difuso + deslocamento vísceras)
    """
    periesplen = _as_bool(ascite_periesplenica)
    difusa = _as_bool(ascite_difusa)
    desloc = _as_bool(deslocamento_visceras)
    
    if desloc and difusa:
        grade = "III"
        category = "Ascite volumosa (tensao)"
    elif difusa:
        grade = "II"
        category = "Ascite moderada"
    elif periesplen:
        grade = "I"
        category = "Ascite minima"
    else:
        grade = "0"
        category = "Sem ascite"
    
    return _result(None, category, grade=grade)


def calculate_pancreatic_atrophy_index(
    espessura_cabeca_mm: float,
    espessura_corpo_mm: float,
    espessura_cauda_mm: float
):
    """
    Índice de atrofia pancreática (média das espessuras).
    
    <10mm média = Atrofia difusa (pancreatite crônica)
    10-15mm = Borderline
    >15mm = Preservado
    """
    avg = round((espessura_cabeca_mm + espessura_corpo_mm + espessura_cauda_mm) / 3, 1)
    
    if avg < 10:
        category = "Atrofia difusa (pancreatite cronica)"
    elif avg <= 15:
        category = "Borderline/atrofia leve"
    else:
        category = "Parenquima preservado"
    
    return _result(
        avg,
        category,
        cabeca=round(espessura_cabeca_mm, 1),
        corpo=round(espessura_corpo_mm, 1),
        cauda=round(espessura_cauda_mm, 1)
    )


def calculate_perforated_appendix_score(
    pneumoperitonio: bool,
    abscesso_periapendicular: bool,
    dilatacao_apendice_mm: Optional[float] = None
):
    """
    Score de perfuração apendicular.
    
    0-1 pontos = Não perfurado
    2-3 pontos = Provável perfuração
    
    Critérios:
    - Pneumoperitônio = 1pt
    - Abscesso periapendicular = 1pt
    - Dilatação >12mm = 1pt
    """
    score = 0
    
    if _as_bool(pneumoperitonio):
        score += 1
    
    if _as_bool(abscesso_periapendicular):
        score += 1
    
    if dilatacao_apendice_mm is not None and dilatacao_apendice_mm > 12:
        score += 1
    
    if score <= 1:
        category = "Apendicite nao perfurada"
    else:
        category = "Provavel perfuracao apendicular"
    
    return _result(score, category)


def measure_gastric_wall_enhancement(hu_parede_gastrica_portal: float):
    """
    Realce da parede gástrica na fase portal.
    
    <40 HU = Sem realce significativo
    40-60 HU = Realce moderado (gastrite)
    >60 HU = Hiper-realce (gastrite ativa, neoplasia)
    """
    hu = round(hu_parede_gastrica_portal, 1)
    
    if hu < 40:
        category = "Sem realce significativo"
    elif hu <= 60:
        category = "Realce moderado (gastrite)"
    else:
        category = "Hiper-realce (gastrite ativa, neoplasia)"
    
    return _result(hu, category)


def grade_ureteral_obstruction(
    diametro_ureter_mm: float,
    grau_hidronefrose: str
):
    """
    Graduação de obstrução ureteral combinando calibre + hidronefrose.
    
    Hidronefrose: 0, I, II, III, IV
    
    Combinação define severidade: Leve, Moderada, Grave
    """
    hidro = _normalize_text(grau_hidronefrose)
    d_ureter = round(diametro_ureter_mm, 1)
    
    # Mapear grau hidronefrose
    if hidro in {"0", "ausente", "nao"}:
        hydro_grade = 0
    elif hidro in {"i", "1"}:
        hydro_grade = 1
    elif hidro in {"ii", "2"}:
        hydro_grade = 2
    elif hydro in {"iii", "3"}:
        hydro_grade = 3
    else:
        hydro_grade = 4
    
    # Classificar obstrução
    if hydro_grade == 0 and d_ureter < 5:
        category = "Sem obstrucao"
    elif hydro_grade <= 1 and d_ureter < 7:
        category = "Obstrucao leve"
    elif hydro_grade <= 2 and d_ureter < 10:
        category = "Obstrucao moderada"
    else:
        category = "Obstrucao grave"
    
    return _result(
        d_ureter,
        category,
        grau_hidronefrose=hidro,
        hydro_numeric=hydro_grade
    )


def calculate_renal_parenchymal_volume(
    volume_rim_total_ml: float,
    volume_sistema_coletor_ml: float
):
    """
    Volume de parênquima renal funcional.
    
    Volume parênquima = volume total - volume sistema coletor
    
    Correlaciona com função glomerular (rins policísticos, hidronefrose)
    """
    parenchyma_vol = round(volume_rim_total_ml - volume_sistema_coletor_ml, 1)
    
    if parenchyma_vol < 0:
        return _result(None, "Dados invalidos")
    
    # Percentual de parênquima
    percent = _safe_div(parenchyma_vol, volume_rim_total_ml, None)
    if percent is not None:
        percent = round(percent * 100, 1)
    
    if percent is not None:
        if percent < 30:
            category = "Parenquima muito reduzido"
        elif percent < 50:
            category = "Parenquima significativamente reduzido"
        elif percent < 70:
            category = "Parenquima moderadamente reduzido"
        else:
            category = "Parenquima preservado"
    else:
        category = None
    
    return _result(
        parenchyma_vol,
        category,
        percentual_parenquima=percent,
        volume_total=volume_rim_total_ml
    )


def calculate_adc_value_classification(adc_value_x10_3: float, orgao: Optional[str] = None):
    """
    Classificação do valor de ADC (Coeficiente de Difusão Aparente).
    Valores típicos em x10^-3 mm²/s.
    
    Interpretação genérica:
    < 0.7-0.8 = Restrição significativa (alta celularidade/malignidade/abscesso)
    0.8 - 1.2 = Restrição moderada / Indeterminado
    > 1.2 = Sem restrição significativa (benigno/edema/necrose)
    """
    val = round(adc_value_x10_3, 2)
    organ = _normalize_text(orgao) if orgao else "generico"
    
    if val < 0.75:
        category = "Restricao significativa (baixa difusividade)"
        interpretation = "Alta celularidade; suspeito para malignidade (se massa) ou abscesso"
    elif val <= 1.2:
        category = "Restricao moderada / Intermediario"
        interpretation = "Celularidade intermediaria; indeterminado"
    else:
        category = "Sem restricao significativa (alta difusividade)"
        interpretation = "Provavel benigno, edema, quisto ou necrose"
    
    # Ajustes específicos
    if organ == "prostata":
        if val < 0.75:
            interpretation = "Altamente suspeito para CaP clinicamente significativo (PI-RADS 4/5)"
        elif val < 1.0:
            interpretation = "Suspeito / Equivoco"
    elif organ == "rim":
        if val < 1.5: # Rins tem ADC basal alto
             # CCR costuma ter ADC menor que parenquima normal, mas variavel
             pass
             
    return _result(val, category, interpretacao=interpretation, orgao=organ)


def calculate_prostate_epe_risk_contact_length(comprimento_contato_capsular_mm: float):
    """
    Risco de Extensão Extraprostática (EPE) baseado no comprimento de contato (LCC).
    
    LCC > 12-15mm aumenta significativamente o risco de EPE.
    """
    lcc = round(comprimento_contato_capsular_mm, 1)
    
    if lcc < 6:
        risk = "Baixo risco de EPE"
    elif lcc < 12:
        risk = "Risco moderado de EPE"
    else:
        risk = "Alto risco de EPE microscopica ou macroscopica"
        
    return _result(lcc, risk)


def calculate_liver_iron_concentration_r2star(t2_star_ms: float):
    """
    Quantificação de ferro hepático por RM (R2*).
    FORMULA: R2* = 1000 / T2* (ms)
    
    R2* < 40 Hz (? T2* > 25ms) = Normal
    R2* > 40 Hz = Sobrecarga de ferro
    """
    if t2_star_ms <= 0:
        return _result(None, "T2* invalido")
        
    r2_star = round(1000.0 / t2_star_ms, 1)
    
    if r2_star < 40:
        category = "Normal (sem sobrecarga)"
        grade = "Normal"
    elif r2_star < 70:
        category = "Sobrecarga leve"
        grade = "Leve"
    elif r2_star < 140:
        category = "Sobrecarga moderada"
        grade = "Moderada"
    else:
        category = "Sobrecarga grave"
        grade = "Grave"
        
    return _result(r2_star, category, grade=grade, unit="Hz")


def calculate_liver_fat_fraction_dixon(sinal_gordura: float, sinal_agua: float):
    """
    Fração de gordura hepática (PDFF estimado) por sequência Dixon/IP-OP.
    Fat Fraction = F / (F + W)
    
    < 5% = Normal
    5-10% = Esteatose leve
    > 10% = Esteatose significativa
    """
    total_signal = sinal_gordura + sinal_agua
    if total_signal == 0:
        return _result(None)
        
    ff = round((sinal_gordura / total_signal) * 100, 1)
    
    if ff < 5:
        category = "Normal"
    elif ff < 10:
        category = "Esteatose leve"
    elif ff < 20:
        category = "Esteatose moderada"
    else:
        category = "Esteatose grave"
        
    return _result(ff, category)


def classify_rectal_tumor_height(distancia_borda_anal_cm: float):
    """
    Altura do tumor retal (RM): Define abordagem cirúrgica (Amputação vs RAB).
    
    < 5cm = Reto inferior (risco alto de AAP)
    5-10cm = Reto médio
    10-15cm = Reto superior
    """
    dist = round(distancia_borda_anal_cm, 1)
    
    if dist < 5:
        category = "Reto inferior"
        sugestao = "Avaliar necessidade de amputacao (AAP) vs preservacao esfincteriana ultra-baixa"
    elif dist <= 10:
        category = "Reto medio"
        sugestao = "Candidato a resseccao anterior baixa (RAB)"
    elif dist <= 15:
        category = "Reto superior"
        sugestao = "Candidato a resseccao anterior (RA)"
    else:
        category = "Juncao retossigmoide / Sigmoide"
        sugestao = "Colectomia/Sigmoidectomia"
        
    return _result(dist, category, implicacao_cirurgica=sugestao)


def grade_pelvic_congestion_syndrome(diametro_veia_ovariana_mm: float):
    """
    Síndrome de Congestão Pélvica (TC/RM).
    Diâmetro da veia ovariana/gonadal.
    
    < 6mm = Normal
    6-8mm = Ectasia leve / Borderline
    > 8mm = Dilatação significativa (sugestivo de SCP se tortuosa)
    """
    d = round(diametro_veia_ovariana_mm, 1)
    
    if d < 6:
        category = "Calibre normal"
    elif d <= 8:
        category = "Ectasia leve / Borderline"
    else:
        category = "Veia ovariana dilatada"
        
    return _result(d, category)


def measure_uterine_junctional_zone_mri(espessura_jz_mm: float):
    """
    Espessura da Zona Juncional (JZ) uterina em T2 (RM).
    Marcador de Adenomiose.
    
    < 8mm = Normal
    8-12mm = Indeterminado
    > 12mm = Adenomiose
    """
    jz = round(espessura_jz_mm, 1)
    
    if jz < 8:
        category = "Normal"
    elif jz <= 12:
        category = "Indeterminado (correlacionar focos de alto sinal)"
    else:
        category = "Espessamento da zona juncional (Adenomiose)"
        
    return _result(jz, category)


def classify_diverticulitis_hinchey_ct(
    abscesso_presente: bool,
    tamanho_abscesso_cm: Optional[float] = None,
    peritonite_purulenta: Optional[bool] = None,
    peritonite_fecal: Optional[bool] = None,
    distancia_inflamacao: str = "pericolica" # pericolica vs pélvica/distante
):
    """
    Classificação de Hinchey modificada (CT) para diverticulite aguda.
    
    Ia = Inflamação pericólica/fleimão (sem abscesso)
    Ib = Abscesso < 4-5cm (pericólico/mesentérico)
    II = Abscesso pélvico, intra-abdominal ou retroperitoneal (geralmente > 4cm ou distante)
    III = Peritonite purulenta (ar livre, sem comunicação direta óbvia)
    IV = Peritonite fecal (comunicação livre, fezes na cavidade)
    """
    abscesso = _as_bool(abscesso_presente)
    purulenta = _as_bool(peritonite_purulenta)
    fecal = _as_bool(peritonite_fecal)
    
    if fecal:
        return _result("IV", "Peritonite fecal")
    if purulenta:
        return _result("III", "Peritonite purulenta")
    
    if abscesso:
        # Se tamanho > 4cm ou localização distante -> Hinchey II
        distante = "pelv" in _normalize_text(distancia_inflamacao) or "dist" in _normalize_text(distancia_inflamacao)
        grande = tamanho_abscesso_cm is not None and tamanho_abscesso_cm > 4.0
        
        if grande or distante:
            return _result("II", "Abscesso pelvico/abdominal distante ou grande")
        else:
            return _result("Ib", "Abscesso pericolico/mesenterico pequeno")
            
    return _result("Ia", "Inflamacao pericolica confinada/fleimao")


def calculate_crohn_activity_mri_simplified(
    espessura_parede_mm: float,
    realce_mural_intenso: bool,
    edema_mural_t2: bool,
    ulceras: bool
):
    """
    Estimativa simplificada de atividade de Crohn (MaRIA-like).
    
    Sinais de atividade: Espessamento >3mm, Realce intenso, Edema (alto T2), Úlceras.
    """
    thick = espessura_parede_mm > 3
    enh = _as_bool(realce_mural_intenso)
    edema = _as_bool(edema_mural_t2)
    ulc = _as_bool(ulceras)
    
    score = 0
    if thick: score += 1
    if enh: score += 1
    if edema: score += 1
    if ulc: score += 2 # Úlceras são sinal forte
    
    if score == 0:
        category = "Sem sinais de atividade inflamatoria"
    elif score <= 2:
        category = "Atividade inflamatoria leve"
    else:
        category = "Atividade inflamatoria moderada a grave"
        
    return _result(score, category)


def classify_anal_fistula_parks_mri(
    atravessa_esfincter_interno: bool,
    atravessa_esfincter_externo: bool,
    acima_elevador: bool
):
    """
    Classificação de Parks simplificada para fístula perianal (RM).
    """
    ei = _as_bool(atravessa_esfincter_interno)
    ee = _as_bool(atravessa_esfincter_externo)
    supra = _as_bool(acima_elevador)
    
    if supra:
        if atravessa_esfincter_externo:
            return _result("Supra-esfincteriana ou Extra-esfincteriana (complexa)")
        else:
             return _result("Supra-esfincteriana (complexa)")
             
    if ee:
        return _result("Trans-esfincteriana")
        
    if ei:
        return _result("Inter-esfincteriana (mais comum)")
        
    return _result("Superficial / Submucosa")


def grade_bladder_trabeculation(espessura_parede_mm: float, diverticulos: bool):
    """
    Graduação de esforço vesical / bexiga de luta.
    """
    thick = round(espessura_parede_mm, 1)
    divs = _as_bool(diverticulos)
    
    if thick < 3 and not divs:
        category = "Normal"
    elif thick >= 3 and thick < 5 and not divs:
        category = "Trabeculacao leve (espessamento parietal discreto)"
    elif (thick >= 5) or (thick >= 3 and divs):
        category = "Bexiga de esforco / Trabeculacao acentuada"
        if divs:
            category += " com diverticulos"
            
    return _result(thick, category)


def calculate_seminal_vesicle_invasion_risk(
    comprimento_contato_base_mm: float,
    angulo_obliterado: bool
):
    """
    Risco de invasão de vesículas seminais (T3b) em RM Próstata.
    """
    len_con = round(comprimento_contato_base_mm, 1)
    angle = _as_bool(angulo_obliterado)
    
    if angle:
        return _result("Alto risco", "Obliteracao do angulo prostato-seminal (Sinal direto)")
        
    if len_con > 15:
        return _result("Alto risco", "Contato extenso com a base da vesicula")
    elif len_con > 10:
        return _result("Risco moderado", "Contato intermediario")
        
    return _result("Baixo risco", "Contato pequeno ou ausente")


def calculate_kidney_stone_burden_cumulative(
    diametros_calculos: list[float]
):
    """
    Carga litásica cumulativa (soma dos diâmetros).
    Útil para planejamento urológico (LECO vs Ureteroscopia vs NLP).
    """
    if not diametros_calculos:
        return _result(0, "Sem calculos")
        
    total = sum(diametros_calculos)
    count = len(diametros_calculos)
    
    if total < 20: # <2cm
        category = "Carga litasica baixa (<2cm)"
        therapy = "Favoravel a LECO ou Ureteroscopia flexivel"
    else:
        category = "Carga litasica alta (>2cm)"
        therapy = "Considerar Nefrolitotripsia percutanea (NLP)"
        
    return _result(round(total, 1), category, numero_calculos=count, sugestao_terapeutica=therapy)


def classify_adnexal_mass_mri_complexity(
    componente_solido: bool,
    septos_espessos: bool,
    realce_pos_contraste: bool,
    gordura_macroscopica: bool
):
    """
    Caracterização simplificada de massa anexial por RM.
    """
    solido = _as_bool(componente_solido)
    septos = _as_bool(septos_espessos)
    realce = _as_bool(realce_pos_contraste)
    gordura = _as_bool(gordura_macroscopica)
    
    if gordura and not realce:
        return _result("Teratoma maduro (cisto dermoide)", "Provavelmente Benigno")
        
    if realce:
        if solido:
            return _result("Massa solida realcante", "Suspeito / Indeterminado (avaliar curvas perfusao)")
        if septos:
            return _result("Cisto complexo com septos espessos", "Suspeito / Indeterminado")
            
    return _result("Cisto simples ou sem elementos suspeitos", "Provavelmente Benigno")


def measure_biliary_dilatation_severity_mri(diametro_coledoco_mm: float, pos_colecistectomia: bool):
    """
    Graduação de dilatação biliar (ColangioRM).
    Pós-colecistectomia tolera diâmetros maiores.
    """
    d = round(diametro_coledoco_mm, 1)
    pos = _as_bool(pos_colecistectomia)
    
    threshold_normal = 10.0 if pos else 7.0
    
    if d <= threshold_normal:
        category = "Calibre normal"
    elif d <= threshold_normal + 4:
        category = "Dilatacao leve"
    elif d <= threshold_normal + 8:
        category = "Dilatacao moderada"
    else:
        category = "Dilatacao acentuada"
        
    return _result(d, category, status_pos_colecistectomia=pos)

def assess_cervical_stromal_ring_mri(anel_estromal_integro: bool):
    """
    Avaliação de integridade do anel estromal cervical (RM).
    Status do anel hipointenso em T2.
    
    Integro = Tumor confinado (estádio menor)
    Rompido = Invasão estromal profunda ou parametrial provável
    """
    integro = _as_bool(anel_estromal_integro)
    
    if integro:
        category = "Anel estromal integro"
        interpretation = "Alta probabilidade de tumor confinado ao colo (preservacao margem)"
    else:
        category = "Ruptura do anel estromal"
        interpretation = "Sugere invasao estromal profunda ou parametrial"
        
    return _result(category, interpretation)


FORMULAS = {
    "calculate_resistive_index": calculate_resistive_index,
    "calculate_pulsatility_index": calculate_pulsatility_index,
    "calculate_nascet_stenosis": calculate_nascet_stenosis,
    "calculate_ras_doppler_criteria": calculate_ras_doppler_criteria,
    "calculate_aaa_growth_rate": calculate_aaa_growth_rate,
    "classify_aortic_dissection_stanford": classify_aortic_dissection_stanford,
    "calculate_ivc_collapsibility_index": calculate_ivc_collapsibility_index,
    "calculate_portal_vein_congestion_index": calculate_portal_vein_congestion_index,
    "calculate_ecst_stenosis": calculate_ecst_stenosis,
    "calculate_mesenteric_stenosis_doppler": calculate_mesenteric_stenosis_doppler,
    "calculate_pleural_effusion_volume_ct": calculate_pleural_effusion_volume_ct,
    "calculate_rv_lv_ratio": calculate_rv_lv_ratio,
    "calculate_pa_aorta_ratio": calculate_pa_aorta_ratio,
    "classify_nodule_fleischner_2017": classify_nodule_fleischner_2017,
    "calculate_emphysema_index_laa": calculate_emphysema_index_laa,
    "calculate_pesi_score": calculate_pesi_score,
    "calculate_hepatorenal_index": calculate_hepatorenal_index,
    "classify_renal_cyst_bosniak_2019": classify_renal_cyst_bosniak_2019,
    "calculate_renal_nephrometry_score": calculate_renal_nephrometry_score,
    "calculate_height_adjusted_tkv": calculate_height_adjusted_tkv,
    "calculate_adrenal_absolute_washout": calculate_adrenal_absolute_washout,
    "calculate_adrenal_signal_intensity_index": calculate_adrenal_signal_intensity_index,
    "calculate_lirads_threshold_growth": calculate_lirads_threshold_growth,
    "calculate_modified_ct_severity_index": calculate_modified_ct_severity_index,
    "measure_pancreatic_duct_diameter": measure_pancreatic_duct_diameter,
    "calculate_splenic_volume_ellipsoid": calculate_splenic_volume_ellipsoid,
    "calculate_prostate_volume_ellipsoid": calculate_prostate_volume_ellipsoid,
    "classify_prostate_pirads_v2_1": classify_prostate_pirads_v2_1,
    "calculate_hadlock_efw": calculate_hadlock_efw,
    "calculate_ovarian_volume_ellipsoid": calculate_ovarian_volume_ellipsoid,
    "classify_ovarian_lesion_orads_us": classify_ovarian_lesion_orads_us,
    "classify_thyroid_nodule_tirads": classify_thyroid_nodule_tirads,
    "calculate_thyroid_volume_ellipsoid": calculate_thyroid_volume_ellipsoid,
    "measure_carotid_intima_media_thickness": measure_carotid_intima_media_thickness,
    "diagnose_dvt_compression_criteria": diagnose_dvt_compression_criteria,
    "calculate_ankle_brachial_index": calculate_ankle_brachial_index,
    "measure_aortic_diameter": measure_aortic_diameter,
    "measure_bile_duct_diameter": measure_bile_duct_diameter,
    "measure_gallbladder_wall_thickness": measure_gallbladder_wall_thickness,
    "grade_hepatic_steatosis_ultrasound": grade_hepatic_steatosis_ultrasound,
    "grade_pancreatic_echogenicity": grade_pancreatic_echogenicity,
    "calculate_psoas_muscle_index": calculate_psoas_muscle_index,
    "measure_visceral_fat_area": measure_visceral_fat_area,
    "calculate_aorta_calcification_score": calculate_aorta_calcification_score,
    "measure_bowel_wall_thickness": measure_bowel_wall_thickness,
    "grade_mesenteric_fat_stranding": grade_mesenteric_fat_stranding,
    "calculate_hepatic_artery_ri": calculate_hepatic_artery_ri,
    "classify_hepatic_vein_doppler": classify_hepatic_vein_doppler,
    "measure_renal_artery_psv": measure_renal_artery_psv,
    "measure_renal_artery_edv": measure_renal_artery_edv,
    "calculate_renal_transplant_ri": calculate_renal_transplant_ri,
    "measure_adrenal_size": measure_adrenal_size,
    "calculate_adrenal_lipid_index": calculate_adrenal_lipid_index,
    "calculate_splenic_artery_ri": calculate_splenic_artery_ri,
    "classify_spleen_doppler_flow": classify_spleen_doppler_flow,
    "measure_bile_duct_stone_diameter": measure_bile_duct_stone_diameter,
    "grade_hepatic_steatosis_ct": grade_hepatic_steatosis_ct,
    "calculate_prostate_psa_density": calculate_prostate_psa_density,
    "calculate_transition_zone_psa_density": calculate_transition_zone_psa_density,
    "measure_endometrial_thickness": measure_endometrial_thickness,
    "calculate_uterine_fibroid_volume": calculate_uterine_fibroid_volume,
    "measure_adenomyosis_junctional_zone": measure_adenomyosis_junctional_zone,
    "measure_bladder_wall_thickness": measure_bladder_wall_thickness,
    "measure_post_void_residual_volume": measure_post_void_residual_volume,
    "measure_rectal_wall_thickness": measure_rectal_wall_thickness,
    "classify_rectal_cancer_tnm": classify_rectal_cancer_tnm,
    "measure_circumferential_resection_margin": measure_circumferential_resection_margin,
    "diagnose_ovarian_torsion": diagnose_ovarian_torsion,
    "assess_ovarian_reserve_amh": assess_ovarian_reserve_amh,
    "diagnose_extraprostatic_extension": diagnose_extraprostatic_extension,
    "diagnose_seminal_vesicle_invasion": diagnose_seminal_vesicle_invasion,
    "estimate_gleason_score_mri": estimate_gleason_score_mri,
    "grade_prostate_cancer_gleason": grade_prostate_cancer_gleason,
    "measure_uterine_artery_doppler": measure_uterine_artery_doppler,
    "calculate_bladder_outlet_obstruction_index": calculate_bladder_outlet_obstruction_index,
    "measure_rectal_cancer_depth": measure_rectal_cancer_depth,
    "classify_lymph_node_staging": classify_lymph_node_staging,
    "calculate_stone_skin_distance_mean": calculate_stone_skin_distance_mean,
    "calculate_lesion_washin_universal": calculate_lesion_washin_universal,
    "calculate_lesion_washout_universal": calculate_lesion_washout_universal,
    "calculate_adrenal_relative_washout": calculate_adrenal_relative_washout,
    "grade_hepatic_steatosis_hu_absolute": grade_hepatic_steatosis_hu_absolute,
    "classify_pancreatic_tumor_enhancement": classify_pancreatic_tumor_enhancement,
    "calculate_renal_mass_enhancement_absolute": calculate_renal_mass_enhancement_absolute,
    "grade_portal_vein_thrombosis": grade_portal_vein_thrombosis,
    "calculate_meld_score": calculate_meld_score,
    "calculate_child_pugh_score": calculate_child_pugh_score,
    "classify_hepatic_lesion_density": classify_hepatic_lesion_density,
    "grade_appendix_diameter": grade_appendix_diameter,
    "classify_bowel_obstruction_level": classify_bowel_obstruction_level,
    "calculate_liver_fibrosis_index_ct": calculate_liver_fibrosis_index_ct,
    "calculate_pancreatic_duct_to_gland_ratio": calculate_pancreatic_duct_to_gland_ratio,
    "measure_mesenteric_lymph_node_size": measure_mesenteric_lymph_node_size,
    "classify_retroperitoneal_lymph_nodes": classify_retroperitoneal_lymph_nodes,
    "measure_splenic_artery_aneurysm_risk": measure_splenic_artery_aneurysm_risk,
    "calculate_renal_artery_stenosis_indirect": calculate_renal_artery_stenosis_indirect,
    "measure_colonic_wall_thickness": measure_colonic_wall_thickness,
    "calculate_peritoneal_carcinomatosis_index": calculate_peritoneal_carcinomatosis_index,
    "grade_ascites_volume": grade_ascites_volume,
    "calculate_pancreatic_atrophy_index": calculate_pancreatic_atrophy_index,
    "calculate_perforated_appendix_score": calculate_perforated_appendix_score,
    "measure_gastric_wall_enhancement": measure_gastric_wall_enhancement,
    "grade_ureteral_obstruction": grade_ureteral_obstruction,
    "calculate_renal_parenchymal_volume": calculate_renal_parenchymal_volume,
    "calculate_adc_value_classification": calculate_adc_value_classification,
    "calculate_prostate_epe_risk_contact_length": calculate_prostate_epe_risk_contact_length,
    "calculate_liver_iron_concentration_r2star": calculate_liver_iron_concentration_r2star,
    "calculate_liver_fat_fraction_dixon": calculate_liver_fat_fraction_dixon,
    "classify_rectal_tumor_height": classify_rectal_tumor_height,
    "grade_pelvic_congestion_syndrome": grade_pelvic_congestion_syndrome,
    "measure_uterine_junctional_zone_mri": measure_uterine_junctional_zone_mri,
    "classify_diverticulitis_hinchey_ct": classify_diverticulitis_hinchey_ct,
    "calculate_crohn_activity_mri_simplified": calculate_crohn_activity_mri_simplified,
    "classify_anal_fistula_parks_mri": classify_anal_fistula_parks_mri,
    "grade_bladder_trabeculation": grade_bladder_trabeculation,
    "calculate_seminal_vesicle_invasion_risk": calculate_seminal_vesicle_invasion_risk,
    "calculate_kidney_stone_burden_cumulative": calculate_kidney_stone_burden_cumulative,
    "classify_adnexal_mass_mri_complexity": classify_adnexal_mass_mri_complexity,
    "measure_biliary_dilatation_severity_mri": measure_biliary_dilatation_severity_mri,
    "assess_cervical_stromal_ring_mri": assess_cervical_stromal_ring_mri,
}
