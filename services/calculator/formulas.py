"""
Formulas whitelist - LLM never calculates; it always calls here.
"""
from typing import Optional
import math

def volume_ellipsoid(d1: float, d2: float, d3: float) -> float:
    """Volume elipsoide (prostata, rins, etc)"""
    return round(0.52 * d1 * d2 * d3, 2)

def resistive_index(vps: float, vd: float) -> float:
    """Indice de resistividade renal"""
    if vps == 0:
        return None
    return round((vps - vd) / vps, 2)

def adrenal_washout_abs(hu_pre: float, hu_portal: float, hu_delayed: float) -> float:
    """Washout absoluto adrenal"""
    if hu_portal == hu_pre:
        return None
    return round(100 * (hu_portal - hu_delayed) / (hu_portal - hu_pre), 1)

def adrenal_washout_rel(hu_portal: float, hu_delayed: float) -> float:
    """Washout relativo adrenal"""
    if hu_portal == 0:
        return None
    return round(100 * (hu_portal - hu_delayed) / hu_portal, 1)

def steatosis_grade(liver_hu: float, spleen_hu: Optional[float] = None) -> str:
    """Grau de esteatose hepatica"""
    if spleen_hu:
        diff = liver_hu - spleen_hu
        if diff < -10:
            return "moderada a acentuada"
        elif diff < 0:
            return "leve"
        else:
            return "ausente"
    else:
        if liver_hu < 40:
            return "presente"
        else:
            return "ausente"

def csf_index(transverse: float, biparietal: float) -> float:
    """CSF Index (cefalico)"""
    if biparietal == 0:
        return None
    return round(transverse / biparietal, 2)

def pelvic_kidney_ratio(pelvis: float, kidney: float) -> float:
    """Razao pelve/rim"""
    if kidney == 0:
        return None
    return round(pelvis / kidney, 2)

def percent_change(current: float, previous: float) -> float:
    """Variacao percentual (RECIST)"""
    if previous == 0:
        return None
    return round(100 * (current - previous) / previous, 1)

def sum_target_lesions(measurements: list[float]) -> float:
    """Soma de lesoes alvo (RECIST)"""
    return round(sum(measurements), 1)

def bmi(weight_kg: float, height_m: float) -> float:
    """IMC"""
    if height_m == 0:
        return None
    return round(weight_kg / (height_m ** 2), 1)

def gestational_age_weeks(lmp_days: int) -> float:
    """Idade gestacional em semanas"""
    return round(lmp_days / 7, 1)

def fetal_weight_hadlock(bpd: float, hc: float, ac: float, fl: float) -> float:
    """Peso fetal estimado (Hadlock)"""
    log_weight = 1.3596 + 0.0064 * hc + 0.0424 * ac + 0.174 * fl + 0.00061 * bpd * ac - 0.00386 * ac * fl
    return round(10 ** log_weight, 0)

# Dicionario de formulas disponiveis
FORMULAS = {
    "volume_ellipsoid": volume_ellipsoid,
    "resistive_index": resistive_index,
    "adrenal_washout_abs": adrenal_washout_abs,
    "adrenal_washout_rel": adrenal_washout_rel,
    "steatosis_grade": steatosis_grade,
    "csf_index": csf_index,
    "pelvic_kidney_ratio": pelvic_kidney_ratio,
    "percent_change": percent_change,
    "sum_target_lesions": sum_target_lesions,
    "bmi": bmi,
    "gestational_age_weeks": gestational_age_weeks,
    "fetal_weight_hadlock": fetal_weight_hadlock,
}
