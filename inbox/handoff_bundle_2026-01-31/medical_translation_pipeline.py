#!/usr/bin/env python3
"""
Pipeline de Tradução Médica EN→PT-BR v2.0
==========================================
Versão refatorada com melhorias de qualidade:
- Eliminação de falsos positivos (ok sem mudança)
- Regras de sufixo filtradas
- dict_partial com word boundaries
- Proteção de CamelCase
- Thresholds ajustados

Uso:
    python3 medical_translation_pipeline.py [--input FILE] [--output-dir DIR]
        [--output FILE] [--max-terms N] [--resume] [--no-decs] [--smoke]
"""

import csv
import json
import re
import argparse
import os
from typing import Dict, List, Optional, Tuple, Set, Any
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from decs_client import DeCSClient

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================

DEFAULT_INPUT = "medical-wordlist-98k.txt"
DEFAULT_OUTPUT_DIR = "."
DEFAULT_OUTPUT_NAME = "translations.full.jsonl"
DEFAULT_SMOKE_OUTPUT_NAME = "translations.smoke.jsonl"
DEFAULT_OVERRIDE_FILES = ["radiology_gold.csv", "overrides.csv", "generic_overrides.csv"]
DEFAULT_GENERIC_TERMS_FILE = "generic_terms.csv"

# Thresholds de confiança
THRESHOLD_OK = 0.85
THRESHOLD_AMBIGUOUS = 0.60

SOURCE_WEIGHTS = {
    "override_manual": 1.30,
    "override": 1.20,
    "dict": 1.00,
    "dict_partial": 0.85,
    "rule_suffix": 0.80,
    "decs_api": 0.95,
}

STATUS_WEIGHTS = {
    "ok": 1.00,
    "ambiguous": 0.85,
    "needs_review": 0.60,
}

# =============================================================================
# ENUMS E TIPOS
# =============================================================================

class Status(Enum):
    OK = "ok"
    KEEP_EN = "keep_en"
    AMBIGUOUS = "ambiguous"
    UNTRANSLATED = "untranslated"
    NEEDS_REVIEW = "needs_review"

class TypeGuess(Enum):
    ABBR = "abbr"
    EPONYM = "eponym"
    DRUG_CHEMICAL = "drug_chemical"
    ANATOMY = "anatomy"
    PROCEDURE = "procedure"
    PATHOLOGY = "pathology"
    GENERAL = "general"
    OTHER = "other"

@dataclass
class TranslationRecord:
    id: int
    term_en: str
    term_en_norm: str
    term_pt: str
    status: str
    type_guess: str
    notes: str
    sources: List[str]
    confidence: float

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "term_en": self.term_en,
            "term_en_norm": self.term_en_norm,
            "term_pt": self.term_pt,
            "status": self.status,
            "type_guess": self.type_guess,
            "notes": self.notes,
            "sources": self.sources,
            "confidence": self.confidence
        }

@dataclass
class OverrideEntry:
    term_pt: str
    source: str
    priority: int

@dataclass
class Candidate:
    term_pt: str
    source: str
    confidence: float
    notes: str = ""
    meta: Dict[str, Any] = field(default_factory=dict)

# =============================================================================
# DICIONÁRIO DE TRADUÇÕES CONHECIDAS
# =============================================================================

# Anatomia básica (PT-BR padrão radiologia)
ANATOMY_DICT = {
    "heart": "coração", "liver": "fígado", "kidney": "rim", "lung": "pulmão",
    "brain": "cérebro", "stomach": "estômago", "spleen": "baço", "pancreas": "pâncreas",
    "bladder": "bexiga", "gallbladder": "vesícula biliar", "intestine": "intestino",
    "colon": "cólon", "rectum": "reto", "esophagus": "esôfago", "thyroid": "tireoide",
    "prostate": "próstata", "uterus": "útero", "ovary": "ovário", "testis": "testículo",
    "adrenal": "adrenal", "appendix": "apêndice", "duodenum": "duodeno",
    "artery": "artéria", "vein": "veia", "nerve": "nervo", "muscle": "músculo",
    "bone": "osso", "joint": "articulação", "ligament": "ligamento", "tendon": "tendão",
    "cartilage": "cartilagem", "disc": "disco", "vertebra": "vértebra",
    "skull": "crânio", "spine": "coluna", "pelvis": "pelve", "thorax": "tórax",
    "abdomen": "abdome", "chest": "tórax", "neck": "pescoço", "head": "cabeça",
    "aorta": "aorta", "carotid": "carótida", "jugular": "jugular",
    "femoral": "femoral", "portal": "portal",
    "pulmonary": "pulmonar", "renal": "renal", "hepatic": "hepático",
    "mesenteric": "mesentérica", "splenic": "esplênica", "gastric": "gástrica",
    "axillary": "axilar", "inguinal": "inguinal", "cervical": "cervical",
    "lumbar": "lombar", "sacral": "sacral",
    "cranial": "craniano", "anterior": "anterior",
    "posterior": "posterior", "lateral": "lateral", "medial": "medial",
    "proximal": "proximal", "distal": "distal", "superficial": "superficial",
}

# Termos radiológicos
RADIOLOGY_DICT = {
    "radiograph": "radiografia", "radiography": "radiografia",
    "ultrasound": "ultrassonografia", "ultrasonography": "ultrassonografia",
    "fluoroscopy": "fluoroscopia", "mammography": "mamografia",
    "angiography": "angiografia", "arteriography": "arteriografia",
    "venography": "venografia", "myelography": "mielografia",
    "scintigraphy": "cintilografia", "densitometry": "densitometria",
    "nodule": "nódulo", "mass": "massa", "lesion": "lesão",
    "cyst": "cisto", "tumor": "tumor", "calcification": "calcificação",
    "opacity": "opacidade", "lucency": "lucência", "density": "densidade",
    "enhancement": "realce", "attenuation": "atenuação",
    "stenosis": "estenose", "occlusion": "oclusão", "obstruction": "obstrução",
    "dilatation": "dilatação", "dilation": "dilatação", "ectasia": "ectasia",
    "aneurysm": "aneurisma", "dissection": "dissecção", "thrombus": "trombo",
    "thrombosis": "trombose", "embolism": "embolia", "infarction": "infarto",
    "hemorrhage": "hemorragia", "bleeding": "sangramento", "hematoma": "hematoma",
    "effusion": "derrame", "edema": "edema", "congestion": "congestão",
    "inflammation": "inflamação", "infection": "infecção", "abscess": "abscesso",
    "necrosis": "necrose", "fibrosis": "fibrose", "sclerosis": "esclerose",
    "atrophy": "atrofia", "hypertrophy": "hipertrofia", "hyperplasia": "hiperplasia",
    "metastasis": "metástase", "metastases": "metástases", "lymphadenopathy": "linfonodomegalia",
    "contrast": "contraste", "injection": "injeção", "acquisition": "aquisição",
    "reconstruction": "reconstrução", "multiplanar": "multiplanar",
    "axial": "axial", "sagittal": "sagital", "coronal": "coronal",
    "slice": "corte", "section": "secção", "sequence": "sequência",
    "artifact": "artefato", "motion": "movimento", "noise": "ruído",
    "bilateral": "bilateral", "unilateral": "unilateral",
    "diffuse": "difuso", "focal": "focal", "multifocal": "multifocal",
    "homogeneous": "homogêneo", "heterogeneous": "heterogêneo",
    "hyperdense": "hiperdenso", "hypodense": "hipodenso", "isodense": "isodenso",
    "hyperintense": "hiperintenso", "hypointense": "hipointenso", "isointense": "isointenso",
    "hyperechoic": "hiperecogênico", "hypoechoic": "hipoecogênico", "anechoic": "anecogênico",
}

# Procedimentos
PROCEDURE_DICT = {
    "biopsy": "biópsia", "aspiration": "aspiração", "puncture": "punção",
    "drainage": "drenagem", "catheterization": "cateterização",
    "intubation": "intubação", "ventilation": "ventilação",
    "resection": "ressecção", "excision": "excisão", "ablation": "ablação",
    "embolization": "embolização", "transplantation": "transplante",
}

# Patologias comuns
PATHOLOGY_DICT = {
    "pneumonia": "pneumonia", "bronchitis": "bronquite", "asthma": "asma",
    "emphysema": "enfisema", "tuberculosis": "tuberculose",
    "arthritis": "artrite", "osteoarthritis": "osteoartrite",
    "osteoporosis": "osteoporose", "osteomyelitis": "osteomielite",
    "fracture": "fratura", "dislocation": "luxação", "sprain": "entorse",
    "cirrhosis": "cirrose", "hepatitis": "hepatite", "pancreatitis": "pancreatite",
    "cholecystitis": "colecistite", "appendicitis": "apendicite",
    "diverticulitis": "diverticulite", "colitis": "colite", "gastritis": "gastrite",
    "nephritis": "nefrite", "cystitis": "cistite", "prostatitis": "prostatite",
    "meningitis": "meningite", "encephalitis": "encefalite",
    "carcinoma": "carcinoma", "adenoma": "adenoma", "lymphoma": "linfoma",
    "melanoma": "melanoma", "sarcoma": "sarcoma", "leukemia": "leucemia",
    "diabetes": "diabetes", "hypertension": "hipertensão", "hypotension": "hipotensão",
    "arrhythmia": "arritmia", "tachycardia": "taquicardia", "bradycardia": "bradicardia",
}

# Combinar todos
TRANSLATION_DICT = {**ANATOMY_DICT, **RADIOLOGY_DICT, **PROCEDURE_DICT, **PATHOLOGY_DICT}

# =============================================================================
# REGRAS MORFOLÓGICAS (SUFIXOS LATINOS) - V2 FILTRADAS
# =============================================================================

# Regras que REALMENTE mudam o termo (EN ≠ PT)
SUFFIX_RULES_ENABLED = [
    # Procedimentos - alta confiança
    (r"ectomy$", "ectomia", "procedure", 0.90),
    (r"ostomy$", "ostomia", "procedure", 0.90),
    (r"plasty$", "plastia", "procedure", 0.90),
    (r"scopy$", "scopia", "procedure", 0.90),
    (r"graphy$", "grafia", "procedure", 0.90),
    (r"centesis$", "centese", "procedure", 0.85),
    (r"tripsy$", "tripsia", "procedure", 0.85),
    (r"pexy$", "pexia", "procedure", 0.85),
    (r"rrhaphy$", "rrafia", "procedure", 0.85),
    
    # Patologias - alta confiança
    (r"itis$", "ite", "pathology", 0.90),
    (r"osis$", "ose", "pathology", 0.85),
    (r"iasis$", "íase", "pathology", 0.85),
    (r"pathy$", "patia", "pathology", 0.85),
    (r"plegia$", "plegia", "pathology", 0.80),
    (r"megaly$", "megalia", "pathology", 0.85),
    
    # Terminações que MUDAM - média confiança
    (r"ic$", "ico", "anatomy", 0.50),  # thoracic -> torácico (rebaixado)
    (r"ous$", "oso", "anatomy", 0.45),  # ambiguous (rebaixado)
]

# Regras DESABILITADAS (no-op ou muito arriscadas)
# - al$ -> al (não muda nada)
# - ar$ -> ar (não muda nada)
# - ary$ -> ário (arriscado)
# - form$ -> forme (arriscado)
# - otomy$ -> otomia (similar a ectomy mas menos comum)
# - desis$ -> dese (raro)
# - stomy$ -> stomia (coberto por ostomy)
# - tomy$ -> tomia (muito genérico)
# - emia$ -> emia (não muda nada)
# - oma$ -> oma (não muda nada)
# - algia$ -> algia (não muda nada)
# - trophy$ -> trofia (arriscado)

# =============================================================================
# FUNÇÕES DE CLASSIFICAÇÃO
# =============================================================================

def is_camelcase(term: str) -> bool:
    """Detecta se o termo tem padrão CamelCase/marca."""
    # Padrão: minúscula seguida de maiúscula no meio do termo
    if re.search(r'[a-z][A-Z]', term):
        return True
    # Múltiplas maiúsculas no meio (evitar: SpineWands, AccuDEXA)
    if re.search(r'[A-Z][a-z]+[A-Z]', term):
        return True
    return False

def is_abbreviation(term: str) -> bool:
    """Detecta se o termo é uma sigla/abreviação."""
    t = term.strip()
    clean = re.sub(r'[^A-Za-z0-9]', '', t)
    if len(clean) <= 1:
        return False
    if clean.isupper() and 2 <= len(clean) <= 8:
        return True
    if re.match(r'^[A-Z]{2,}s?$', t):
        return True
    if re.match(r'^[A-Z]\.[A-Z]\.', t):
        return True
    if re.match(r'^[A-Z0-9]{2,6}$', t):
        return True
    return False

def is_eponym(term: str) -> bool:
    """Detecta se o termo é um epônimo."""
    if "'s" in term.lower() or "'s" in term:
        return True
    if term.endswith("'s") or term.endswith("s'") or term.endswith("'"):
        return True
    return False

def is_chemical(term: str) -> bool:
    """Detecta se o termo é químico/medicamento."""
    tl = term.lower()
    if re.search(r'\d+[,-]\d+', term):
        return True
    if re.match(r'^\d+[a-z-]', tl):
        return True
    chem_prefixes = [
        'hydroxy', 'methyl', 'ethyl', 'amino', 'acetyl', 'carboxy',
        'chloro', 'fluoro', 'bromo', 'iodo', 'nitro', 'sulfo',
        'deoxy', 'dihydro', 'tetra', 'hexa', 'penta', 'tri-', 'di-',
        'mono', 'poly', 'cyclo', 'iso', 'neo', 'pseudo'
    ]
    for pref in chem_prefixes:
        if tl.startswith(pref):
            return True
    drug_suffixes = [
        'mab', 'nib', 'zole', 'pril', 'sartan', 'statin', 'olol',
        'azepam', 'barbital', 'cillin', 'mycin', 'zumab', 'ximab',
        'umab', 'tinib', 'afil', 'prazole', 'thiazide', 'lukast',
        'navir', 'vudine', 'parin', 'vastatin', 'profen'
    ]
    for suf in drug_suffixes:
        if tl.endswith(suf) and len(tl) > len(suf) + 3:
            return True
    return False

def classify_type(term: str) -> TypeGuess:
    """Classifica o tipo do termo."""
    tl = term.lower()
    
    if is_abbreviation(term):
        return TypeGuess.ABBR
    if is_eponym(term):
        return TypeGuess.EPONYM
    if is_chemical(term):
        return TypeGuess.DRUG_CHEMICAL
    
    anatomy_keywords = ['artery', 'vein', 'nerve', 'muscle', 'bone', 'ligament',
                        'tendon', 'joint', 'organ', 'tissue', 'vessel', 'gland']
    for kw in anatomy_keywords:
        if kw in tl:
            return TypeGuess.ANATOMY
    
    proc_suffixes = ['ectomy', 'ostomy', 'plasty', 'scopy', 'graphy',
                     'centesis', 'tripsy', 'pexy', 'rrhaphy']
    for suf in proc_suffixes:
        if tl.endswith(suf):
            return TypeGuess.PROCEDURE
    
    path_suffixes = ['itis', 'osis', 'pathy', 'iasis', 'plegia']
    for suf in path_suffixes:
        if tl.endswith(suf):
            return TypeGuess.PATHOLOGY
    
    if len(term) > 5 and re.match(r'^[a-z]+$', tl):
        return TypeGuess.GENERAL
    
    return TypeGuess.OTHER

# =============================================================================
# OVERRIDES E SANITY FILTERS
# =============================================================================

def load_overrides(paths: List[Path]) -> Dict[str, OverrideEntry]:
    """Carrega overrides de CSVs (prioridade máxima para Manual_Gold)."""
    overrides: Dict[str, OverrideEntry] = {}
    for path in paths:
        if not path.exists():
            continue
        allow_all_sources = path.name != "radiology_gold.csv"
        try:
            with open(path, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                if not reader.fieldnames:
                    continue
                for row in reader:
                    term_en = (row.get("English_Term") or row.get("term_en") or row.get("Term_EN") or "").strip()
                    term_pt = (row.get("Suggested_PT") or row.get("term_pt") or row.get("Term_PT") or "").strip()
                    source = (row.get("Source") or row.get("source") or "Override").strip()
                    if not term_en or not term_pt:
                        continue
                    if not allow_all_sources and source != "Manual_Gold":
                        continue

                    key = term_en.lower()
                    priority = 100 if source == "Manual_Gold" else 90
                    entry = OverrideEntry(term_pt=term_pt, source=source, priority=priority)

                    if key not in overrides or entry.priority > overrides[key].priority:
                        overrides[key] = entry
        except Exception:
            continue
    return overrides

def load_generic_terms(path: Path) -> Set[str]:
    """Carrega termos genéricos que não devem virar descritores verbosos."""
    terms: Set[str] = set()
    if not path.exists():
        return terms
    try:
        with open(path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                term_en = (row.get("term_en") or row.get("English_Term") or row.get("Term_EN") or "").strip()
                if term_en:
                    terms.add(term_en.lower())
    except Exception:
        return terms
    return terms

def get_override_candidate(term: str, overrides: Dict[str, OverrideEntry]) -> Optional[Candidate]:
    if not overrides:
        return None
    entry = overrides.get(term.lower().strip())
    if not entry:
        return None
    source = "override_manual" if entry.source == "Manual_Gold" else "override"
    confidence = 0.99 if entry.source == "Manual_Gold" else 0.95
    notes = f"Override ({entry.source})"
    return Candidate(term_pt=entry.term_pt, source=source, confidence=confidence, notes=notes)

def is_decs_eligible(term: str) -> bool:
    """Evita chamada DeCS para termos que não devem ser consultados."""
    if is_camelcase(term):
        return False
    if is_abbreviation(term):
        return False
    if is_eponym(term):
        return False
    if is_chemical(term):
        return False
    if len(term.strip()) <= 2:
        return False
    return True

def is_verbose_generic_decs(term_en: str, term_pt: str, generic_terms: Set[str]) -> bool:
    """Detecta descritores DeCS excessivamente verbosos para termos genéricos."""
    en_norm = term_en.lower().strip()
    if en_norm not in generic_terms:
        return False
    pt_tokens = re.findall(r"\b\w+\b", term_pt.lower())
    if len(pt_tokens) >= 4:
        return True
    if len(term_pt) >= max(12, len(term_en) * 2):
        return True
    return False

def select_best_candidate(
    term_en: str,
    candidates: List[Candidate],
    generic_terms: Set[str]
) -> Optional[Tuple[Candidate, str, float, str]]:
    """Seleciona o melhor candidato por score (não primeiro match)."""
    best = None
    for cand in candidates:
        cand_conf = cand.confidence
        cand_notes = cand.notes
        if cand.source == "decs_api":
            if is_verbose_generic_decs(term_en, cand.term_pt, generic_terms):
                cand_conf = min(cand_conf, 0.55)
                cand_notes = (cand_notes + " | " if cand_notes else "") + "DeCS verboso (rebaixado)"

        status = determine_status(cand_conf, term_en, cand.term_pt)
        weight = SOURCE_WEIGHTS.get(cand.source, 0.70)
        status_weight = STATUS_WEIGHTS.get(status, 0.50)
        score = cand_conf * weight * status_weight

        if cand.term_pt.lower() == term_en.lower():
            score -= 0.5

        if best is None or score > best[1]:
            best = (Candidate(term_pt=cand.term_pt, source=cand.source, confidence=cand_conf, notes=cand_notes, meta=cand.meta), score, status, cand_conf, cand_notes)

    if not best:
        return None
    return best[0], best[2], best[3], best[4]

# =============================================================================
# FUNÇÕES DE TRADUÇÃO V2
# =============================================================================

def translate_by_dict(term: str) -> Optional[Candidate]:
    """Tenta traduzir usando dicionário (match exato apenas)."""
    tl = term.lower().strip()
    
    # Match exato apenas - sem partial
    if tl in TRANSLATION_DICT:
        translated = TRANSLATION_DICT[tl]
        # Garantir que realmente mudou
        if translated.lower() != tl:
            return Candidate(term_pt=translated, source="dict", confidence=0.95)
    
    return None

def translate_by_dict_partial(term: str) -> Optional[Candidate]:
    """Traduz por match parcial com word boundaries seguros."""
    # Bloquear CamelCase
    if is_camelcase(term):
        return None
    
    tl = term.lower().strip()
    
    # Tokenizar por espaços e hífens
    tokens = re.split(r'[\s\-]+', tl)
    if len(tokens) < 2:
        # Termo simples - não aplicar partial match
        return None
    
    translated_tokens = []
    changed = False
    
    for token in tokens:
        if token in TRANSLATION_DICT:
            translated = TRANSLATION_DICT[token]
            if translated.lower() != token:
                translated_tokens.append(translated)
                changed = True
            else:
                translated_tokens.append(token)
        else:
            translated_tokens.append(token)
    
    if changed:
        # Reconstruir com hífen se original tinha hífen
        sep = "-" if "-" in term else " "
        result = sep.join(translated_tokens)
        return Candidate(term_pt=result, source="dict_partial", confidence=0.75, notes="Tradução parcial por tokens")
    
    return None

def translate_by_suffix(term: str) -> Optional[Candidate]:
    """Traduz usando regras de sufixos (apenas regras que MUDAM)."""
    # Bloquear CamelCase
    if is_camelcase(term):
        return None
    
    tl = term.lower().strip()
    
    for pattern, replacement, category, confidence in SUFFIX_RULES_ENABLED:
        if re.search(pattern, tl):
            translated = re.sub(pattern, replacement, tl)
            # CRÍTICO: só retornar se realmente mudou
            if translated != tl:
                notes = "Traduzido por regra morfológica"
                # Se o radical contém grafias que exigem outras transformações, rebaixar confiança
                if any(seq in tl for seq in ["th", "ph", "y"]):
                    confidence = min(confidence, 0.55)
                    notes += " (radical suspeito)"
                return Candidate(term_pt=translated, source="rule_suffix", confidence=confidence, notes=notes)
    
    return None

def determine_status(confidence: float, term_en: str, term_pt: str) -> str:
    """Determina status baseado em confiança e mudança real."""
    # REGRA CRÍTICA: se não mudou, NÃO pode ser ok
    if term_pt.lower() == term_en.lower():
        return Status.NEEDS_REVIEW.value
    
    # Aplicar thresholds
    if confidence >= THRESHOLD_OK:
        return Status.OK.value
    elif confidence >= THRESHOLD_AMBIGUOUS:
        return Status.AMBIGUOUS.value
    else:
        return Status.NEEDS_REVIEW.value

def translate_term(
    term: str,
    term_id: int,
    decs_client: Optional[DeCSClient] = None,
    overrides: Optional[Dict[str, OverrideEntry]] = None,
    generic_terms: Optional[Set[str]] = None,
    no_decs: bool = False,
    force_decs: bool = False
) -> TranslationRecord:
    """Pipeline completo de tradução de um termo."""
    term_norm = term.lower().strip()
    type_guess = classify_type(term)
    overrides = overrides or {}
    generic_terms = generic_terms or set()

    # Camada 0: Overrides (prioridade máxima)
    override_candidate = get_override_candidate(term, overrides)
    if override_candidate:
        status = determine_status(override_candidate.confidence, term, override_candidate.term_pt)
        return TranslationRecord(
            id=term_id,
            term_en=term,
            term_en_norm=term_norm,
            term_pt=override_candidate.term_pt,
            status=status,
            type_guess=type_guess.value,
            notes=override_candidate.notes,
            sources=[override_candidate.source],
            confidence=override_candidate.confidence
        )

    # Camada 1: Proteções determinísticas (keep_en)
    if is_camelcase(term):
        return TranslationRecord(
            id=term_id,
            term_en=term,
            term_en_norm=term_norm,
            term_pt=term,
            status=Status.KEEP_EN.value,
            type_guess=TypeGuess.OTHER.value,
            notes="CamelCase/marca protegida",
            sources=["rule"],
            confidence=1.0
        )

    if is_abbreviation(term):
        return TranslationRecord(
            id=term_id,
            term_en=term,
            term_en_norm=term_norm,
            term_pt=term,
            status=Status.KEEP_EN.value,
            type_guess=TypeGuess.ABBR.value,
            notes="Sigla mantida em inglês",
            sources=["rule"],
            confidence=1.0
        )

    if is_eponym(term):
        return TranslationRecord(
            id=term_id,
            term_en=term,
            term_en_norm=term_norm,
            term_pt=term,
            status=Status.KEEP_EN.value,
            type_guess=TypeGuess.EPONYM.value,
            notes="Epônimo mantido em inglês",
            sources=["rule"],
            confidence=1.0
        )

    if is_chemical(term):
        return TranslationRecord(
            id=term_id,
            term_en=term,
            term_en_norm=term_norm,
            term_pt=term,
            status=Status.KEEP_EN.value,
            type_guess=TypeGuess.DRUG_CHEMICAL.value,
            notes="Químico/medicamento mantido em inglês",
            sources=["rule"],
            confidence=0.9
        )

    candidates: List[Candidate] = []

    dict_candidate = translate_by_dict(term)
    if dict_candidate:
        candidates.append(dict_candidate)

    partial_candidate = translate_by_dict_partial(term)
    if partial_candidate:
        candidates.append(partial_candidate)

    suffix_candidate = translate_by_suffix(term)
    if suffix_candidate:
        candidates.append(suffix_candidate)

    best_local = select_best_candidate(term, candidates, generic_terms) if candidates else None
    best_local_status = best_local[1] if best_local else None

    # Camada DeCS: tentar se elegível e se local não for ok
    should_try_decs = (
        not no_decs
        and decs_client is not None
        and is_decs_eligible(term)
        and (term_norm not in generic_terms)
        and (force_decs or best_local_status != Status.OK.value)
    )
    if should_try_decs:
        decs_pt = decs_client.search_term(term)
        if decs_pt:
            candidates.append(
                Candidate(
                    term_pt=decs_pt,
                    source="decs_api",
                    confidence=0.92,
                    notes="Traduzido via DeCS API"
                )
            )

    best = select_best_candidate(term, candidates, generic_terms) if candidates else None
    if best:
        best_candidate, status, confidence, notes = best
        return TranslationRecord(
            id=term_id,
            term_en=term,
            term_en_norm=term_norm,
            term_pt=best_candidate.term_pt,
            status=status,
            type_guess=type_guess.value,
            notes=notes,
            sources=[best_candidate.source],
            confidence=confidence
        )

    # Fallback
    return TranslationRecord(
        id=term_id,
        term_en=term,
        term_en_norm=term_norm,
        term_pt=term,
        status=Status.NEEDS_REVIEW.value,
        type_guess=type_guess.value,
        notes="Sem tradução automática disponível",
        sources=["none"],
        confidence=0.0
    )

# =============================================================================
# MAIN
# =============================================================================

def main(
    input_file: str = None,
    output_dir: str = None,
    output_file: str = None,
    max_terms: Optional[int] = None,
    resume: bool = False,
    no_decs: bool = False,
    smoke: bool = False,
    force_decs: bool = False
):
    """Executa o pipeline de tradução."""
    script_dir = Path(__file__).parent
    input_path = Path(input_file) if input_file else script_dir / DEFAULT_INPUT
    output_dir_path = Path(output_dir) if output_dir else script_dir

    if output_file:
        output_path = Path(output_file)
    else:
        output_name = DEFAULT_SMOKE_OUTPUT_NAME if smoke else DEFAULT_OUTPUT_NAME
        output_path = output_dir_path / output_name

    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("PIPELINE DE TRADUÇÃO MÉDICA EN→PT-BR v2.0")
    print("=" * 70)

    if smoke:
        print("🧪 SMOKE MODE ativo")
        if max_terms is None:
            max_terms = 200

    print(f"\n📂 Carregando termos de: {input_path}")
    with open(input_path, 'r', encoding='utf-8') as f:
        terms = [line.rstrip('\n\r') for line in f.readlines()]

    total = len(terms)
    print(f"   Total de termos: {total}")

    # Overrides e termos genéricos
    override_paths = [script_dir / name for name in DEFAULT_OVERRIDE_FILES]
    overrides = load_overrides(override_paths)
    generic_terms = load_generic_terms(script_dir / DEFAULT_GENERIC_TERMS_FILE)

    if overrides:
        print(f"   ✅ Overrides carregados: {len(overrides)}")
    else:
        print("   ⚠️ Nenhum override encontrado")

    if generic_terms:
        print(f"   ✅ Termos genéricos carregados: {len(generic_terms)}")
    else:
        print("   ⚠️ Lista de termos genéricos vazia")

    print(f"\n🔄 Processando traduções...")

    # Inicializar DeCS Client
    decs_client = None
    if no_decs:
        print("   ⛔ DeCS desativado (--no-decs)")
    else:
        try:
            decs_client = DeCSClient()
            print("   ✅ DeCS Client inicializado com sucesso (SQLite Cache)")
        except Exception as e:
            print(f"   ⚠️ Falha ao inicializar DeCS Client: {e}")
            decs_client = None

    # Controle de resume
    start_index = 0
    if resume and output_path.exists():
        processed = 0
        last_id = 0
        with open(output_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                processed += 1
                try:
                    data = json.loads(line)
                    last_id = max(last_id, int(data.get("id", 0)))
                except Exception:
                    continue
        start_index = max(processed, last_id)
        print(f"   ▶️ Resume ativo: pulando {start_index} termos já processados")
    else:
        if output_path.exists():
            os.remove(output_path)

    # Aplicar max_terms após resume
    terms_to_process = terms[start_index:]
    if max_terms is not None:
        terms_to_process = terms_to_process[:max_terms]

    total_run = len(terms_to_process)
    if total_run == 0:
        print("   ⚠️ Nenhum termo para processar.")
        return [], {}, {}

    records = []
    status_counts = {}
    type_counts = {}

    print(f"   💾 Saída será salva incrementalmente em: {output_path}")

    for i, term in enumerate(terms_to_process, start=1):
        term_id = start_index + i
        record = translate_term(
            term,
            term_id,
            decs_client=decs_client,
            overrides=overrides,
            generic_terms=generic_terms,
            no_decs=no_decs,
            force_decs=force_decs
        )
        records.append(record)

        status_counts[record.status] = status_counts.get(record.status, 0) + 1
        type_counts[record.type_guess] = type_counts.get(record.type_guess, 0) + 1

        with open(output_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(record.to_dict(), ensure_ascii=False) + '\n')

        if i % 50 == 0:
            print(f"   Processados: {i}/{total_run} ({100*i/total_run:.1f}%)", flush=True)

    # Validação crítica
    ok_unchanged = sum(1 for r in records
                       if r.status == "ok" and r.term_pt.lower() == r.term_en.lower())
    ok_changed = sum(1 for r in records
                     if r.status == "ok" and r.term_pt.lower() != r.term_en.lower())

    print("\n📊 RESUMO")
    print("-" * 50)
    print(f"Total processado (run): {len(records)}")
    print(f"\n🔍 VALIDAÇÃO DE QUALIDADE:")
    print(f"  ok COM mudança (real): {ok_changed}")
    print(f"  ok SEM mudança (FALSO): {ok_unchanged}")
    if ok_unchanged > 0:
        print(f"  ⚠️  ALERTA: Há {ok_unchanged} falsos positivos!")
    else:
        print(f"  ✅ Sem falsos positivos!")

    print(f"\nDistribuição por STATUS (run):")
    for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"  {status:<20} {count:>8} ({100*count/total_run:.2f}%)")

    print("\n✅ Pipeline v2.0 concluído!")
    return records, status_counts, type_counts

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Pipeline de Tradução Médica')
    parser.add_argument('--input', '-i', help='Arquivo de entrada (.txt)')
    parser.add_argument('--output-dir', '-o', help='Diretório de saída')
    parser.add_argument('--output', '-O', help='Caminho completo do arquivo de saída (.jsonl)')
    parser.add_argument('--max-terms', type=int, help='Processar no máximo N termos')
    parser.add_argument('--resume', action='store_true', help='Retomar sem apagar output existente')
    parser.add_argument('--no-decs', action='store_true', help='Desativar chamadas ao DeCS')
    parser.add_argument('--smoke', action='store_true', help='Executar smoke run (~200 termos)')
    parser.add_argument('--force-decs', action='store_true', help='Forçar DeCS mesmo se candidato local estiver ok')
    args = parser.parse_args()
    
    main(
        input_file=args.input,
        output_dir=args.output_dir,
        output_file=args.output,
        max_terms=args.max_terms,
        resume=args.resume,
        no_decs=args.no_decs,
        smoke=args.smoke,
        force_decs=args.force_decs
    )
