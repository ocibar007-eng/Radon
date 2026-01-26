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
    realce_hu: float,
    componentes_solidos: bool,
    septos: bool,
    calcificacao: bool,
    numero_septos: Optional[float] = None,
):
    enhancement = realce_hu >= 20
    solids = _as_bool(componentes_solidos)
    septa = _as_bool(septos)
    calc = _as_bool(calcificacao)
    sept_count = numero_septos or 0

    # Simplified mapping based on available inputs.
    if not enhancement and not solids and not septa and not calc:
        return _result("I")
    if not enhancement and (septa or calc):
        if sept_count > 3:
            return _result("IIF")
        return _result("II")
    if enhancement and solids:
        if not septa and not calc:
            return _result("V")
        return _result("IV")
    if enhancement and septa:
        if sept_count > 3:
            return _result("IIF")
        return _result("III")
    return _result("IIF")


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
}
