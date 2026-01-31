#!/usr/bin/env python3
"""
Gerador de Léxico Radiológico v2.0
===================================
Apenas termos com tradução real (term_pt != term_en) recebem preferred_pt.
"""

import json
import hashlib
import re
import argparse
from pathlib import Path
from typing import List

def get_concept_key(term: str) -> str:
    """Gera uma chave de conceito baseada no termo."""
    norm = term.lower().strip()
    for suffix in ['s', 'es', 'ies', 'ing', 'ed']:
        if norm.endswith(suffix) and len(norm) > len(suffix) + 3:
            norm = norm[:-len(suffix)]
            break
    h = hashlib.md5(norm.encode()).hexdigest()[:8]
    return f"LOCAL:{h}"

def get_tags(term_en: str) -> List[str]:
    """Determina tags radiológicas para o termo."""
    tl = term_en.lower()
    tags = []
    
    region_map = {
        "torax": ['thorax', 'thoracic', 'chest', 'lung', 'pulmon', 'pleura', 'mediast'],
        "abdome": ['abdomen', 'abdomin', 'hepat', 'liver', 'spleen', 'pancrea', 'renal', 'kidney'],
        "neuro": ['brain', 'cerebr', 'cranial', 'head', 'neuro', 'spinal', 'mening'],
        "musculoesqueletico": ['bone', 'skeletal', 'vertebr', 'spine', 'joint', 'muscle', 'tendon', 'ligament'],
        "cardiovascular": ['heart', 'cardiac', 'cardio', 'aorta', 'coronar', 'vascular', 'artery', 'vein']
    }
    for tag, keywords in region_map.items():
        if any(kw in tl for kw in keywords):
            tags.append(tag)
    
    modality_regex = {
        "TC": [r"\bct\b", r"tomograph", r"computed"],
        "RM": [r"\bmri\b", r"magnetic", r"resonance", r"\bt1\b", r"\bt2\b", r"\bflair\b"],
        "US": [r"ultrasound", r"sonograph", r"\becho\b"],
        "RX": [r"xray", r"x-ray", r"radiograph"],
        "angio": [r"angio", r"arteriogra", r"venogra"]
    }
    for tag, patterns in modality_regex.items():
        if any(re.search(pat, tl) for pat in patterns):
            tags.append(tag)
    
    if any(kw in tl for kw in ['nodule', 'mass', 'lesion', 'tumor', 'cyst', 'opacity']):
        tags.append("achado")
    
    if any(tl.endswith(suf) for suf in ['ectomy', 'scopy', 'plasty', 'graphy']):
        tags.append("tecnica")
    if any(tl.endswith(suf) for suf in ['itis', 'osis', 'oma', 'pathy']):
        tags.append("patologia")
    
    return list(set(tags))

def is_radiology_relevant(term: str) -> bool:
    """Verifica se o termo é relevante para radiologia."""
    tl = term.lower()

    stopwords = {"and", "or", "the", "a", "an", "of", "to", "in"}
    if tl.strip() in stopwords:
        return False

    strong_patterns = [
        r"\bct\b", r"\bmri\b", r"\bpet\b", r"\bspect\b", r"\bdicom\b", r"\bpacs\b",
        r"x[-\s]?ray", r"roentgen", r"radiograph", r"radiolog", r"fluoroscop",
        r"tomograph", r"ultrasound", r"sonograph", r"doppler", r"mammograph",
        r"angiograph", r"scintigraph", r"hounsfield", r"\bt1\b", r"\bt2\b", r"\bflair\b",
    ]
    weak_patterns = [
        r"scan", r"contrast", r"sequence", r"axial", r"sagittal", r"coronal", r"multiplanar",
        r"lesion", r"tumou?r", r"cyst", r"fracture", r"opacity", r"lucency", r"density",
        r"attenuation", r"enhancement", r"signal", r"artifact",
        r"stenosis", r"occlusion", r"aneurysm", r"dissection", r"effusion",
        r"thorax", r"abdomen", r"pelvis", r"spine", r"brain", r"liver", r"kidney",
        r"lung", r"heart", r"aorta", r"artery", r"vein",
    ]

    strong = sum(1 for pat in strong_patterns if re.search(pat, tl))
    weak = sum(1 for pat in weak_patterns if re.search(pat, tl))
    if strong >= 1:
        return True
    if strong == 0 and weak >= 2:
        return True
    return False

def has_real_translation(t: dict) -> bool:
    """Verifica se há tradução real (PT != EN)."""
    return (t['status'] == 'ok' and 
            t['term_pt'].lower() != t['term_en'].lower())

def build_lexicon(input_file: str = None, output_dir: str = None):
    """Constrói o léxico radiológico."""
    script_dir = Path(__file__).parent
    input_path = Path(input_file) if input_file else script_dir / "translations.full.jsonl"
    output_dir = Path(output_dir) if output_dir else script_dir
    output_path = output_dir / "radiology.lexicon.json"
    
    print("=" * 60)
    print("GERADOR DE LÉXICO RADIOLÓGICO v2.0")
    print("=" * 60)
    
    print(f"\n📂 Carregando traduções de: {input_path}")
    
    translations = []
    with open(input_path, 'r', encoding='utf-8') as f:
        for line in f:
            translations.append(json.loads(line))
    
    print(f"   Total carregado: {len(translations)}")
    
    # Filtrar termos radiológicos
    radiology_terms = [t for t in translations if is_radiology_relevant(t['term_en'])]
    print(f"   Termos radiológicos: {len(radiology_terms)}")
    
    # Contar traduções reais
    with_real_pt = [t for t in radiology_terms if has_real_translation(t)]
    print(f"   Com tradução PT real: {len(with_real_pt)}")
    
    concepts = {}
    
    for t in radiology_terms:
        term_en = t['term_en']
        term_pt = t['term_pt']
        concept_key = get_concept_key(term_en)
        
        if concept_key not in concepts:
            # preferred_pt só se houver tradução real
            if has_real_translation(t):
                pref_pt = term_pt
                notes = ""
            else:
                pref_pt = ""  # Vazio quando não há tradução
                notes = "missing_pt"
            
            concepts[concept_key] = {
                "concept_key": concept_key,
                "preferred_en": term_en,
                "preferred_pt": pref_pt,
                "synonyms_en": [],
                "synonyms_pt": [],
                "tags": get_tags(term_en),
                "do_not_use_pt": [],
                "notes": notes,
                "status": t['status']
            }
        else:
            # Adicionar como sinônimo
            if term_en not in concepts[concept_key]['synonyms_en']:
                concepts[concept_key]['synonyms_en'].append(term_en)
            
            # Só adicionar sinônimo PT se for tradução real
            if has_real_translation(t):
                if term_pt not in concepts[concept_key]['synonyms_pt']:
                    concepts[concept_key]['synonyms_pt'].append(term_pt)
                # Atualizar preferred_pt se ainda estiver vazio
                if not concepts[concept_key]['preferred_pt']:
                    concepts[concept_key]['preferred_pt'] = term_pt
                    concepts[concept_key]['notes'] = ""
    
    # Limpar sinônimos duplicados do preferred
    for c in concepts.values():
        if c['preferred_en'] in c['synonyms_en']:
            c['synonyms_en'].remove(c['preferred_en'])
        if c['preferred_pt'] and c['preferred_pt'] in c['synonyms_pt']:
            c['synonyms_pt'].remove(c['preferred_pt'])
    
    lexicon = list(concepts.values())
    
    print(f"\n💾 Salvando em: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(lexicon, f, ensure_ascii=False, indent=2)
    
    # Validação
    with_pt = sum(1 for c in lexicon if c['preferred_pt'])
    without_pt = sum(1 for c in lexicon if not c['preferred_pt'])
    bad_pt = sum(1 for c in lexicon 
                 if c['preferred_pt'] and c['preferred_pt'].lower() == c['preferred_en'].lower())
    
    print(f"\n📊 RESUMO")
    print("-" * 40)
    print(f"Total de conceitos: {len(lexicon)}")
    print(f"Com preferred_pt preenchido: {with_pt}")
    print(f"Sem preferred_pt (correto): {without_pt}")
    print(f"preferred_pt == preferred_en (ERRO): {bad_pt}")
    
    if bad_pt > 0:
        print(f"⚠️ ALERTA: Há {bad_pt} conceitos com PT==EN!")
    else:
        print(f"✅ Nenhum conceito com PT==EN indevidamente!")
    
    print(f"\n✅ Léxico radiológico v2.0 gerado!")
    return lexicon

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Gerador de Léxico Radiológico')
    parser.add_argument('--input', '-i', help='Arquivo de traduções (.jsonl)')
    parser.add_argument('--output-dir', '-o', help='Diretório de saída')
    args = parser.parse_args()
    
    build_lexicon(args.input, args.output_dir)
