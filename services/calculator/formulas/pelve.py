"""
Fórmulas Pélvicas (Próstata, Ginecologia, Reto)
"""
from typing import Optional
from ._common import _result, _safe_div, _normalize_text, _as_bool, _volume_ellipsoid

# ==============================================================================
# PRÓSTATA
# ==============================================================================

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


def calculate_prostate_psa_density(psa: float, volume_prostata: float):
    psad = _safe_div(psa, volume_prostata, 3)
    if psad is None: return _result(None)
    if psad < 0.15: category = "Normal"
    elif psad <= 0.25: category = "Borderline"
    else: category = "Aumentado"
    return _result(psad, category)


def calculate_transition_zone_psa_density(psa: float, volume_tz: float):
    tz_psad = _safe_div(psa, volume_tz, 3)
    if tz_psad is None: return _result(None)
    if tz_psad < 0.10: category = "Normal"
    elif tz_psad <= 0.20: category = "Borderline"
    else: category = "Aumentado"
    return _result(tz_psad, category)


def classify_prostate_pirads_v2_1(t2_score: float, dwi_score: float, dce_score: float, localizacao: str):
    """
    Classificação PI-RADS v2.1 simplificada.
    
    Zona Periférica (PZ): DWI é dominante.
    Zona de Transição (TZ): T2 é dominante.
    """
    zone = _normalize_text(localizacao)
    # Mapping simplificado PZ vs TZ
    is_pz = "periferica" in zone or "pz" in zone
    
    if is_pz:
        base = int(round(dwi_score))
        if base == 3 and dce_score > 0: # DCE positivo (+1)
            base = 4
    else: # TZ
        base = int(round(t2_score))
        if base == 3 and dwi_score >= 4: # DWI restrito (+1)
            base = 4
            
    base = min(max(base, 1), 5)
    
    if base <= 2: cat = "Clinicamente nao significativo"
    elif base == 3: cat = "Equivoco"
    elif base == 4: cat = "Provavel significativo"
    else: cat = "Altamente provavel significativo"
    
    return _result(base, cat, zone=zone)


def estimate_gleason_score_mri(dwi_score: float, dce_score: float, t2_score: float):
    # Estimativa, não é Gleason real (patológico)
    if dwi_score <= 2 and dce_score <= 1: return _result("Gleason 6-7 (provavel de baixo grau)")
    if dwi_score == 3 or dce_score == 2: return _result("Gleason 7 (Intermediario)")
    if dwi_score >= 4 or dce_score == 3: return _result("Gleason 8-10 (Alto grau)")
    return _result("Indeterminado")


def grade_prostate_cancer_gleason(gleason_primary: float, gleason_secondary: float):
    score = int(round(gleason_primary + gleason_secondary))
    if score <= 6: category = "Grupo 1 (ISUP)"
    elif score == 7:
        if gleason_primary == 3: category = "Grupo 2 (ISUP) - 3+4"
        else: category = "Grupo 3 (ISUP) - 4+3"
    elif score == 8: category = "Grupo 4 (ISUP)"
    else: category = "Grupo 5 (ISUP)"
    return _result(score, category)


def diagnose_extraprostatic_extension(epe_presente: bool, lateralidade: str):
    if not _as_bool(epe_presente): return _result("Sem EPE; T2")
    side = _normalize_text(lateralidade)
    if side == "bilateral": return _result("EPE bilateral; T3a")
    return _result("EPE unilateral; T3a")


def diagnose_seminal_vesicle_invasion(svi_presente: bool, lateralidade: str):
    if not _as_bool(svi_presente): return _result("Sem SVI; T2-T3a")
    side = _normalize_text(lateralidade)
    if side == "bilateral": return _result("SVI bilateral; T3b")
    return _result("SVI unilateral; T3b")


def calculate_prostate_epe_risk_contact_length(comprimento_contato_capsular_mm: float):
    lcc = round(comprimento_contato_capsular_mm, 1)
    if lcc < 6: risk = "Baixo risco de EPE"
    elif lcc < 12: risk = "Risco moderado de EPE"
    else: risk = "Alto risco de EPE microscopica ou macroscopica"
    return _result(lcc, risk)


def calculate_seminal_vesicle_invasion_risk(comprimento_contato_base_mm: float, angulo_obliterado: bool):
    len_con = round(comprimento_contato_base_mm, 1)
    if _as_bool(angulo_obliterado): return _result("Alto risco", "Obliteracao do angulo prostato-seminal")
    if len_con > 15: return _result("Alto risco", "Contato extenso com a base da vesicula")
    elif len_con > 10: return _result("Risco moderado", "Contato intermediario")
    return _result("Baixo risco", "Contato pequeno ou ausente")


def calculate_adc_value_classification(adc_value_x10_3: float, orgao: Optional[str] = None):
    val = round(adc_value_x10_3, 2)
    organ = _normalize_text(orgao) if orgao else "generico"
    
    if val < 0.75:
        cat = "Restricao significativa"
        interp = "Suspeito para malignidade"
    elif val <= 1.2:
        cat = "Restricao moderada"
        interp = "Indeterminado"
    else:
        cat = "Sem restricao significativa"
        interp = "Provavel benigno"
        
    return _result(val, cat, interpretacao=interp, orgao=organ)


# ==============================================================================
# GINECOLOGIA (Útero, Ovários)
# ==============================================================================

def calculate_ovarian_volume_ellipsoid(comprimento: float, largura: float, espessura: float):
    vol = _volume_ellipsoid(comprimento, largura, espessura, 0.52, 1)
    if vol < 10: cat = "Normal (menacme)"
    elif vol <= 20: cat = "Aumentado / Borderline"
    else: cat = "Aumentado"
    # Nota: pós menopausa normal < 6ml
    return _result(vol, cat)


def classify_ovarian_lesion_orads_us(
    tamanho_mm: float,
    composicao: str,
    vascularizacao: str,
    achados_adicionais: Optional[str] = None,
):
    comp = _normalize_text(composicao)
    vasc = _normalize_text(vascularizacao)
    # Mapping simplificado
    if comp == "cistica_simples" and vasc == "ausente": cat = 2
    elif comp == "cistica_complexa": cat = 3 if vasc == "ausente" else 4
    elif comp == "mista": cat = 4 if vasc == "presente" else 3
    elif comp == "solida": cat = 5 if vasc == "presente" else 4
    else: cat = 3
    return _result(int(cat), f"O-RADS {cat}", achados=achados_adicionais)


def diagnose_ovarian_torsion(doppler_fluxo: str, volume_ovario: float, edema_estroma: bool):
    fluxo = _normalize_text(doppler_fluxo)
    edema = _as_bool(edema_estroma)
    if fluxo in {"ausente", "reduzido"} and volume_ovario > 20 and edema: return _result("Provavel torsao")
    if fluxo == "presente" and not edema: return _result("Nao torsao")
    return _result("Indeterminado")


def assess_ovarian_reserve_amh(amh_ng_ml: float):
    if amh_ng_ml >= 1.0: cat = "Normal"
    elif amh_ng_ml >= 0.5: cat = "Reduzido"
    else: cat = "Muito reduzido"
    return _result(round(amh_ng_ml, 2), cat)


def measure_endometrial_thickness(espessura_endometrio: float, fase_ciclo: str):
    fase = _normalize_text(fase_ciclo)
    val = round(espessura_endometrio, 1)
    if "proliferativ" in fase and val < 11: cat = "Normal"
    elif "secretor" in fase and val < 16: cat = "Normal"
    elif "pos_meno" in fase and val <= 5: cat = "Normal"
    elif val > 18: cat = "Muito espessado"
    else: cat = "Espessado / Indeterminado"
    return _result(val, cat)


def calculate_uterine_fibroid_volume(comprimento: float, largura: float, altura: float):
    vol = _volume_ellipsoid(comprimento, largura, altura, 0.52, 1)
    if vol < 20: cat = "Pequeno"
    elif vol <= 100: cat = "Moderado"
    else: cat = "Grande"
    return _result(vol, cat)


def measure_adenomyosis_junctional_zone(espessura_jz: float, irregularidade_jz: bool):
    val = round(espessura_jz, 1)
    if val < 8: cat = "Normal"
    elif val > 12: cat = "Adenomiose"
    else: cat = "Indeterminado"
    return _result(val, cat)


def measure_uterine_junctional_zone_mri(espessura_jz_mm: float):
    val = round(espessura_jz_mm, 1)
    if val < 8: cat = "Normal"
    elif val <= 12: cat = "Indeterminado"
    else: cat = "Espessamento (Adenomiose)"
    return _result(val, cat)


def assess_cervical_stromal_ring_mri(anel_estromal_integro: bool):
    if _as_bool(anel_estromal_integro):
        return _result("Integro", "Tumor confinado ao colo")
    return _result("Rompido", "Sugere invasao estromal profunda/parametrial")


def classify_adnexal_mass_mri_complexity(componente_solido: bool, septos_espessos: bool, realce_pos_contraste: bool, gordura_macroscopica: bool):
    if _as_bool(gordura_macroscopica) and not _as_bool(realce_pos_contraste):
        return _result("Teratoma maduro", "Provavel Benigno")
    if _as_bool(realce_pos_contraste) and _as_bool(componente_solido):
        return _result("Massa solida realcante", "Suspeito")
    return _result("Cisto simples/complexo", "Indeterminado")


def grade_pelvic_congestion_syndrome(diametro_veia_ovariana_mm: float):
    d = round(diametro_veia_ovariana_mm, 1)
    if d > 8: cat = "Dilatacao significativa (SCP)"
    else: cat = "Normal/Leve"
    return _result(d, cat)


def calculate_hadlock_efw(ac: float, fl: float, bpd: Optional[float] = None, hc: Optional[float] = None):
    # Log10 weight = 1.304 + 0.05281*AC + 0.1938*FL - 0.004*AC*FL
    log_w = 1.304 + 0.05281 * ac + 0.1938 * fl - 0.004 * ac * fl
    weight = round(10 ** log_w, 0)
    return _result(weight, "Estimativa peso fetal")


def measure_uterine_artery_doppler(ri_arteria_uterina: float, notch_diastolico: bool):
    ri = round(ri_arteria_uterina, 2)
    if ri < 0.58 and not _as_bool(notch_diastolico): category = "Normal"
    else: category = "Aumentado (Risco Pre-eclipasia/RCIU)"
    return _result(ri, category)


# ==============================================================================
# RETO
# ==============================================================================

def measure_rectal_wall_thickness(espessura_parede: float):
    val = round(espessura_parede, 1)
    if val < 5: cat = "T1/Normal"
    else: cat = "Espessado (T2+)"
    return _result(val, cat)


def classify_rectal_cancer_tnm(t_stage: str, n_stage: str, m_stage: str):
    t = _normalize_text(t_stage).upper()
    n = _normalize_text(n_stage).upper()
    m = _normalize_text(m_stage).upper()
    stage_str = f"{t}{n}{m}"
    if m != "M0": stage = "Stage IV"
    elif "N" in n and n != "N0": stage = "Stage III"
    elif t in {"T3", "T4"}: stage = "Stage II"
    else: stage = "Stage I"
    return _result(stage_str, stage)


def measure_circumferential_resection_margin(distancia_crm: float):
    val = round(distancia_crm, 1)
    if val >= 1: cat = "Livre (>1mm)" # CRM negative
    else: cat = "Acometida (<1mm)" # CRM positive
    return _result(val, cat)


def measure_rectal_cancer_depth(profundidade_invasao: float):
    val = round(profundidade_invasao, 1)
    if val <= 5: cat = "T3a (<5mm)"
    elif val <= 10: cat = "T3b (5-10mm)"
    elif val <= 15: cat = "T3c (10-15mm)"
    else: cat = "T3d (>15mm)"
    return _result(val, cat)


def classify_rectal_tumor_height(distancia_borda_anal_cm: float):
    d = round(distancia_borda_anal_cm, 1)
    if d < 5: cat = "Reto inferior"; sug = "Risco AAP"
    elif d <= 10: cat = "Reto medio"; sug = "Candidato RAB"
    elif d <= 15: cat = "Reto superior"; sug = "Candidato RA"
    else: cat = "Sigmoide"; sug = "Colectomia"
    return _result(d, cat, implicacao=sug)


def classify_anal_fistula_parks_mri(atravessa_esfincter_interno: bool, atravessa_esfincter_externo: bool, acima_elevador: bool):
    if _as_bool(acima_elevador): return _result("Supra/Extra-esfincteriana")
    if _as_bool(atravessa_esfincter_externo): return _result("Trans-esfincteriana")
    if _as_bool(atravessa_esfincter_interno): return _result("Inter-esfincteriana")
    return _result("Submucosa")


def classify_lymph_node_staging(numero_linfonodos: float, diametro_max: float):
    count = int(round(numero_linfonodos))
    if count == 0: cat = "N0"
    elif count <= 3: cat = "N1"
    else: cat = "N2"
    return _result(cat, None, count=count, diameter=diametro_max)
