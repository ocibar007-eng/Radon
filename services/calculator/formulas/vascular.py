"""
Fórmulas Vasculares (Doppler, Aorta, Carótidas, etc.)
"""
from typing import Optional
from ._common import _result, _safe_div, _ri_value, _normalize_text, _as_bool

def calculate_resistive_index(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None: return _result(None)
    if ri < 0.55: cat = "Normal (baixa resistencia vascular)"
    elif ri <= 0.70: cat = "Borderline (resistencia moderada)"
    else: cat = "Aumentado (alta resistencia)"
    return _result(ri, cat)

def calculate_pulsatility_index(psv: float, edv: float, v_mean: float):
    pi = _safe_div(psv - edv, v_mean, 2)
    if pi is None: return _result(None)
    if pi < 1.0: cat = "Baixo (fluxo pouco pulsatil)"
    elif pi <= 2.0: cat = "Normal (pulsatilidade normal)"
    else: cat = "Aumentado (alta pulsatilidade)"
    return _result(pi, cat)

def calculate_nascet_stenosis(d_stenosis: float, d_distal: float):
    percent = _safe_div(d_distal - d_stenosis, d_distal, None)
    if percent is None: return _result(None)
    percent = round(percent * 100, 1)
    if percent < 30: cat = "Sem estenose significativa"
    elif percent <= 69: cat = "Estenose moderada (30-69%)"
    else: cat = "Estenose grave (>=70%)"
    return _result(percent, cat)

def calculate_ras_doppler_criteria(psv_renal: float, psv_aorta: float):
    rar = _safe_div(psv_renal, psv_aorta, 2)
    if rar is None: return _result(None)
    if psv_renal < 180 and rar < 3.5: cat = "Sem estenose significativa"
    elif (180 <= psv_renal <= 200) or (3.5 <= rar <= 4.0): cat = "Borderline; considerar confirmacao"
    else: cat = "Provavel estenose >=60%"
    return _result(rar, cat, psv_renal=round(psv_renal, 1))

def calculate_aaa_growth_rate(d_atual: float, d_anterior: float, intervalo_anos: float):
    growth_rate = _safe_div(d_atual - d_anterior, intervalo_anos, 1)
    if growth_rate is None: return _result(None)
    if d_atual < 28: cat = "AAA pequeno; sem follow-up necessario"
    elif d_atual < 40: cat = "AAA moderado; follow-up anual"
    elif d_atual < 45: cat = "AAA grande; follow-up cada 3 meses"
    elif d_atual < 55: cat = "AAA muito grande; considerar cirurgia"
    else: cat = "AAA critico; cirurgia recomendada"
    rapid_growth = growth_rate > 3.0
    return _result(growth_rate, cat, rapid_growth=rapid_growth)

def classify_aortic_dissection_stanford(envolve_ascendente: bool, localizacao_lacera_o: str):
    if _as_bool(envolve_ascendente): return _result("Type A")
    location = _normalize_text(localizacao_lacera_o)
    if location == "descendente": return _result("Type B")
    return _result("Type B (limitada descendente)")

def calculate_ivc_collapsibility_index(d_max_inspiracao: float, d_min_expira_o: float):
    ci = _safe_div(d_max_inspiracao - d_min_expira_o, d_max_inspiracao, None)
    if ci is None: return _result(None)
    ci = round(ci * 100, 1)
    if ci > 50: cat = "PVC baixa; colapsabilidade normal"
    elif ci >= 25: cat = "PVC normal; colapsabilidade intermediaria"
    else: cat = "PVC elevada; colapsabilidade reduzida"
    return _result(ci, cat)

def calculate_portal_vein_congestion_index(v_max_portal: float, v_min_portal: float):
    ci = _safe_div(v_max_portal - v_min_portal, v_max_portal, 2)
    if ci is None: return _result(None)
    if ci < 0.4: cat = "Normal; sem congestao portal"
    elif ci <= 0.6: cat = "Borderline; possivel congestao leve"
    else: cat = "Congestao portal; sugerir hipertensao portal"
    return _result(ci, cat)

def calculate_ecst_stenosis(d_estenose: float, d_proximal: float):
    percent = _safe_div(d_proximal - d_estenose, d_proximal, None)
    if percent is None: return _result(None)
    percent = round(percent * 100, 1)
    if percent < 30: cat = "Sem estenose significativa"
    elif percent <= 69: cat = "Estenose moderada (30-69%)"
    else: cat = "Estenose grave (>=70%)"
    return _result(percent, cat)

def calculate_mesenteric_stenosis_doppler(psv_sma: float, psv_celiaca: Optional[float] = None):
    if psv_sma > 400 or (psv_celiaca is not None and psv_celiaca > 250): cat = "Provavel estenose significativa"
    elif (275 <= psv_sma <= 400) or (psv_celiaca is not None and 200 <= psv_celiaca <= 250): cat = "Borderline"
    else: cat = "Sem estenose significativa"
    return _result(psv_sma, cat, psv_celiaca=psv_celiaca)

def measure_carotid_intima_media_thickness(imt_mm: float):
    if imt_mm < 0.7: cat = "Normal"
    elif imt_mm <= 0.9: cat = "Borderline"
    else: cat = "Aumentado"
    return _result(round(imt_mm, 2), cat)

def diagnose_dvt_compression_criteria(compressibilidade: str, lado_contralateral: str):
    comp = _normalize_text(compressibilidade)
    contra = _normalize_text(lado_contralateral)
    if comp == "incompressivel" and contra == "normal": return _result("DVT presente")
    return _result("Sem TVP")

def calculate_ankle_brachial_index(p_tornozelo: float, p_braquial: float):
    abi = _safe_div(p_tornozelo, p_braquial, 2)
    if abi is None: return _result(None)
    if abi >= 1.0: cat = "Normal"
    elif abi >= 0.91: cat = "Borderline"
    elif abi >= 0.71: cat = "PAD leve-moderada"
    elif abi >= 0.41: cat = "PAD moderada-grave"
    else: cat = "PAD grave/critica"
    return _result(abi, cat)

def measure_aortic_diameter(d_aorta: float, localizacao: str):
    location = _normalize_text(localizacao)
    cat = ""
    if location == "raiz":
        if d_aorta < 40: cat = "Normal"
        elif d_aorta <= 50: cat = "Borderline"
        else: cat = "Aneurisma aortico"
    elif location == "ascendente":
        if d_aorta < 37: cat = "Normal"
        elif d_aorta > 50: cat = "Aneurisma aortico"
        else: cat = "Borderline"
    elif location == "abdominal":
        if d_aorta < 30: cat = "Normal"
        elif d_aorta <= 50: cat = "Aneurisma abdominal"
        else: cat = "AAA grande; cirurgia recomendada"
    return _result(round(d_aorta, 1), cat or None, localizacao=location)

def calculate_hepatic_artery_ri(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None: return _result(None)
    if ri > 0.80: cat = "Indice de resistencia elevado"
    elif ri < 0.50: cat = "Indice de resistencia reduzido"
    else: cat = "Normal"
    return _result(ri, cat)

def classify_hepatic_vein_doppler(padrao_onda: str):
    onda = _normalize_text(padrao_onda)
    if onda == "trifasico": cat = "Normal"
    elif onda == "monofasico": cat = "Anormal"
    else: cat = "Indeterminado/Bifasico"
    return _result(onda, cat)

def measure_renal_artery_psv(psv: float):
    if psv > 180: cat = "Velocidade sistolica elevada"
    else: cat = "Normal"
    return _result(round(psv, 1), cat)

def measure_renal_artery_edv(edv: float):
    return _result(round(edv, 1), "Medida EDV Renal")

def calculate_renal_transplant_ri(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None: return _result(None)
    if ri > 0.8: cat = "Elevado"
    elif ri > 0.7: cat = "Limitrofe"
    else: cat = "Normal"
    return _result(ri, cat)

def calculate_splenic_artery_ri(psv: float, edv: float):
    ri = _ri_value(psv, edv)
    if ri is None: return _result(None)
    return _result(ri, "Indice Resistencia Arteria Esplenica")

def classify_spleen_doppler_flow(direcao_fluxo_veia_esplenica: str):
    d = _normalize_text(direcao_fluxo_veia_esplenica)
    if d == "hepatopetal": return _result(d, "Fluxo normal")
    if d == "hepatofugal": return _result(d, "Fluxo invertido")
    return _result(d, "Fluxo indeterminado")

def calculate_aorta_calcification_score(grau_calcificacao: float):
    score = int(round(grau_calcificacao))
    if score <= 0: category = "Sem calcificacao"
    elif score == 1: category = "Calcificacao leve"
    elif score == 2: category = "Calcificacao moderada"
    else: category = "Calcificacao grave"
    return _result(score, category)
