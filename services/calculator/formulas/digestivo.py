"""
Fórmulas do Trato Digestivo (Estômago, Intestino, Apêndice, Peritônio)
"""
from typing import Optional
from ._common import _result, _normalize_text, _as_bool, _safe_div

def measure_gastric_wall_enhancement(hu_parede_gastrica_portal: float):
    hu = round(hu_parede_gastrica_portal, 1)
    if hu < 40: cat = "Sem realce significativo"
    elif hu <= 60: cat = "Realce moderado (gastrite)"
    else: cat = "Hiper-realce (gastrite ativa, neoplasia)"
    return _result(hu, cat)


def measure_bowel_wall_thickness(espessura_mm: float):
    d = round(espessura_mm, 1)
    if d < 3: cat = "Normal"
    elif d <= 5: cat = "Borderline"
    else: cat = "Espessamento parietal"
    return _result(d, cat)


def measure_colonic_wall_thickness(espessura_parede_colon_mm: float):
    d = round(espessura_parede_colon_mm, 1)
    if d < 3: cat = "Normal"
    elif d <= 5: cat = "Borderline"
    else: cat = "Espessado"
    return _result(d, cat)


def classify_bowel_obstruction_level(
    diametro_intestino_delgado_max: float,
    diametro_colon_max: Optional[float] = None,
    ponto_transicao_presente: Optional[bool] = None
):
    d_delg = round(diametro_intestino_delgado_max, 1)
    if d_delg < 3: cat_d = "Normal"
    elif d_delg <= 4: cat_d = "Borderline/Ileo"
    else: cat_d = "Obstrucao Delgado"
    
    cat_c = None
    d_col = None
    if diametro_colon_max is not None:
        d_col = round(diametro_colon_max, 1)
        if d_col < 6: cat_c = "Normal"
        elif d_col <= 9: cat_c = "Borderline"
        else: cat_c = "Obstrucao Colon"
        
    trans = "Presente" if _as_bool(ponto_transicao_presente) else "Ausente"
    
    return _result(d_delg, cat_d, cat_colon=cat_c, diametro_colon=d_col, transicao=trans)


def grade_appendix_diameter(diametro_apendice: float):
    d = round(diametro_apendice, 1)
    if d < 6: cat = "Normal"
    elif d <= 7: cat = "Borderline"
    elif d <= 10: cat = "Apendicite provavel"
    else: cat = "Apendicite estabelecida"
    return _result(d, cat)


def calculate_perforated_appendix_score(
    pneumoperitonio: bool,
    abscesso_periapendicular: bool,
    dilatacao_apendice_mm: Optional[float] = None
):
    score = 0
    if _as_bool(pneumoperitonio): score += 1
    if _as_bool(abscesso_periapendicular): score += 1
    if dilatacao_apendice_mm and dilatacao_apendice_mm > 12: score += 1
    
    if score <= 1: cat = "Nao perfurada / Baixa prob"
    else: cat = "Provavel perfuracao"
    return _result(score, cat)


def classify_diverticulitis_hinchey_ct(
    abscesso_presente: bool,
    tamanho_abscesso_cm: Optional[float] = None,
    peritonite_purulenta: Optional[bool] = None,
    peritonite_fecal: Optional[bool] = None,
    distancia_inflamacao: str = "pericolica"
):
    abscesso = _as_bool(abscesso_presente)
    if _as_bool(peritonite_fecal): return _result("IV", "Peritonite fecal")
    if _as_bool(peritonite_purulenta): return _result("III", "Peritonite purulenta")
    
    if abscesso:
        dist = "pelv" in _normalize_text(distancia_inflamacao)
        big = tamanho_abscesso_cm is not None and tamanho_abscesso_cm > 4.0
        if big or dist: return _result("II", "Abscesso distante/grande")
        return _result("Ib", "Abscesso pericolico pequeno")
        
    return _result("Ia", "Inflamacao pericolica/fleimao")


def calculate_crohn_activity_mri_simplified(espessura_parede_mm: float, realce_mural_intenso: bool, edema_mural_t2: bool, ulceras: bool):
    score = 0
    if espessura_parede_mm > 3: score += 1
    if _as_bool(realce_mural_intenso): score += 1
    if _as_bool(edema_mural_t2): score += 1
    if _as_bool(ulceras): score += 2
    
    if score == 0: cat = "Sem atividade"
    elif score <= 2: cat = "Atividade leve"
    else: cat = "Atividade moderada/grave"
    return _result(score, cat)


def grade_mesenteric_fat_stranding(grau_stranding: str):
    g = _normalize_text(grau_stranding)
    if "ausente" in g: cat = "Normal"
    elif "leve" in g: cat = "Borderline"
    elif "moderado" in g: cat = "Inflamacao"
    else: cat = "Acentuada"
    return _result(cat)


def measure_mesenteric_lymph_node_size(eixo_curto_mm: float):
    d = round(eixo_curto_mm, 1)
    if d < 10: cat = "Normal"
    elif d <= 15: cat = "Borderline/Reativo"
    else: cat = "Patologico"
    return _result(d, cat)


def classify_retroperitoneal_lymph_nodes(nivel_anatomico: str, eixo_curto_max_mm: float):
    lvl = _normalize_text(nivel_anatomico)
    d = round(eixo_curto_max_mm, 1)
    if d < 10: stg = "N0"; cat = "Normal"
    else: stg = "N1"; cat = "Adenomegalia"
    return _result(d, cat, estagio=stg, nivel=lvl)


def calculate_peritoneal_carcinomatosis_index(numero_segmentos_envolvidos: int, tamanho_maior_implante_mm: Optional[float] = None):
    # Simplified logic: PCI usually sum of scores, here simplified to count?
    # No, legacy had direct input. Let's assume input IS the score or segments count approximating it.
    # Legacy: pci = numero_segmentos (0-13) + size score... actually legacy input was just number_segments as pci?
    # Let's check legacy 2007: pci = numero_segmentos_envolvidos.
    pci = numero_segmentos_envolvidos
    if pci <= 10: cat = "Baixa carga"
    elif pci <= 20: cat = "Moderada carga"
    else: cat = "Alta carga"
    return _result(pci, cat, maior_implante=tamanho_maior_implante_mm)


def grade_ascites_volume(ascite_periesplenica: bool, ascite_difusa: bool, deslocamento_visceras: bool):
    if _as_bool(deslocamento_visceras) and _as_bool(ascite_difusa):
        return _result("III", "Volumosa (Tensao)")
    if _as_bool(ascite_difusa):
        return _result("II", "Moderada")
    if _as_bool(ascite_periesplenica):
        return _result("I", "Minima")
    return _result("0", "Ausente")
