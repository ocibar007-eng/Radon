"""
Fórmulas de Tórax (Pulmão, Coração, Grandes Vasos torácicos)
"""
from typing import Optional
from ._common import _result, _safe_div, _normalize_text, _as_bool

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
