"""
Fórmulas de Tireoide (TI-RADS, Volume)
"""
from typing import Optional
from ._common import _result, _normalize_text, _volume_ellipsoid

def calculate_thyroid_volume_ellipsoid(
    l_rd: float, w_rd: float, h_rd: float,
    l_ld: float, w_ld: float, h_ld: float,
    v_istmo: Optional[float] = None,
):
    vol_rd = _volume_ellipsoid(l_rd, w_rd, h_rd, 0.52, 1)
    vol_ld = _volume_ellipsoid(l_ld, w_ld, h_ld, 0.52, 1)
    istmo = v_istmo or 0.0
    total = round(vol_rd + vol_ld + istmo, 1)
    
    if total < 6: category = "Reduzido (Hipotrofico)"
    elif total <= 18: category = "Normal (Mulher)" # Usando ref generica
    # Refinar classificacao se sexo fornecido futuramente
    elif total <= 25: category = "Normal (Homem) / Limite"
    else: category = "Bocio (Aumentado)"
    
    return _result(total, category, vol_ld=vol_ld, vol_rd=vol_rd)


def classify_thyroid_nodule_tirads(
    composicao: str,
    ecogenicidade: str,
    forma: str,
    margens: str,
    focos_ecogenicos: str,
):
    """
    ACR TI-RADS 2017 Calculator.
    """
    comp = _normalize_text(composicao)
    echo = _normalize_text(ecogenicidade)
    shape = _normalize_text(forma)
    margins = _normalize_text(margens)
    foci = _normalize_text(focos_ecogenicos)

    # Composition
    if "cistica" in comp and "solido" not in comp and "quase" not in comp: pts_comp = 0
    elif "espongiforme" in comp: pts_comp = 0
    elif "mista" in comp or "solido" in comp: pts_comp = 2
    else: pts_comp = 0 # Default

    # Echogenicity
    if "anecoica" in echo: pts_echo = 0
    elif "hiperec" in echo or "isoec" in echo: pts_echo = 1
    elif "hipoec" in echo: pts_echo = 2
    elif "muito_hipo" in echo: pts_echo = 3
    else: pts_echo = 1

    # Shape
    if "mais_alto" in shape: pts_shape = 3
    else: pts_shape = 0

    # Margins
    if "lisas" in margins or "bem_defin" in margins: pts_margins = 0
    elif "lobuladas" in margins or "irregulares" in margins: pts_margins = 2
    elif "extensao" in margins or "extra" in margins: pts_margins = 3
    else: pts_margins = 0

    # Echogenic Foci
    if "ausente" in foci or "cauda_cometa" in foci: pts_foci = 0
    elif "macrocalc" in foci: pts_foci = 1
    elif "periferic" in foci: pts_foci = 2
    elif "puntiforme" in foci: pts_foci = 3
    else: pts_foci = 0
    
    # Custom logic fallback if direct match fails using simple keywords
    # Composition
    pts = 0
    if "cistic" in comp and "solid" in comp: pts += 1 # Cystic/Solid mix = 1
    elif "solid" in comp: pts += 2 # Solid = 2
    elif "espong" in comp: pts += 0
    
    # Echogenicity
    if "anecoi" in echo: pts += 0
    elif "hipere" in echo or "isoe" in echo: pts += 1
    elif "muitohipo" in echo: pts += 3
    elif "hipo" in echo: pts += 2
    
    # Shape
    if "alto" in shape: pts += 3
    
    # Margins
    if "lisa" in margins: pts += 0
    elif "lobul" in margins or "irreg" in margins: pts += 2
    elif "extra" in margins: pts += 3
    
    # Foci
    if "ausente" in foci or "cometa" in foci: pts += 0
    elif "macro" in foci: pts += 1
    elif "perif" in foci: pts += 2
    elif "punti" in foci: pts += 3

    # Use the more robust explicit logic from legacy if needed, 
    # but the simple logic above covers main ACR points.
    # Let's trust the accumulation. Wait, I shouldn't double count.
    # Let's use the explicit map from legacy reader.
    
    c_p = 0
    if "espong" in comp: c_p = 0
    elif "cistic" in comp and "solid" in comp: c_p = 1
    elif "solid" in comp: c_p = 2
    
    e_p = 1 # Iso default
    if "aneco" in echo: e_p = 0
    elif "hipere" in echo or "isoe" in echo: e_p = 1
    elif "muito" in echo: e_p = 3
    elif "hipo" in echo: e_p = 2
    
    s_p = 0
    if "alto" in shape: s_p = 3
    
    m_p = 0
    if "lisa" in margins: m_p = 0
    elif "mal" in margins: m_p = 0 # Ill-defined in ACR 2017 is 0 points unless irregular
    elif "lobul" in margins or "irreg" in margins: m_p = 2
    elif "extra" in margins: m_p = 3
    
    f_p = 0
    if "ausente" in foci or "cometa" in foci: f_p = 0
    elif "macro" in foci: f_p = 1
    elif "perif" in foci: f_p = 2
    elif "punti" in foci: f_p = 3
    
    score = c_p + e_p + s_p + m_p + f_p
    
    if score <= 1: level = "TR1 (Benigno)"
    elif score == 2: level = "TR2 (Nao suspeito)"
    elif score == 3: level = "TR3 (Levemente suspeito)"
    elif score <= 6: level = "TR4 (Moderadamente suspeito)"
    else: level = "TR5 (Altamente suspeito)"
    
    return _result(level, None, points=score)
