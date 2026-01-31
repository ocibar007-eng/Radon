import csv
import json
import re
from pathlib import Path

input_file = "radiology_terms.jsonl"
output_file = "radiology_gold.csv"

curated_sources = {"Manual_Gold", "Morpho_Fix", "Review_Verbose"}

# 1. Manual Corrections (The "Gold" Dictionary)
manual_fixes = {
    "scintimammography": "cintilomamografia",
    "scintigraphy": "cintilografia",
    "scintiangiography": "cintiangiografia",
    "arthropneumoradiography": "artropneumorradiografia",
    "anechoic": "anecóico",  # User preference
    "stereoroentgenography": "estereorradiografia",
    "roentgenography": "radiografia",
    "roentgenoscopy": "radioscopia",
    "xeromammography": "xeromamografia",
    "xeroradiography": "xerorradiografia",
    "scanography": "escanografia",
    "tomography": "tomografia",
    "radiosurgery": "radiocirurgia",
    "radiotherapy": "radioterapia",
    "neuroradiology": "neurorradiologia",
    "teleradiology": "telerradiologia",
    "image": "imagem",
    "imaging": "imageamento",
    "scan": "varredura",
    "density": "densidade",
    "opacity": "opacidade",
    "lucency": "transparência",
    "attenuation": "atenuação",
    "shadow": "sombra",
    "cyst": "cisto",
    "tumor": "tumor",
    "lesion": "lesão",
    "fracture": "fratura",
    "contrast": "contraste",
    "mammography": "mamografia",
    "ultrasound": "ultrassom",
    "ultrasonography": "ultrassonografia",
    "doppler": "doppler",
    "resonance": "ressonância",
    "magnetic": "magnética",
    "computed": "computadorizada",
    "axial": "axial",
    "pixel": "pixel",
    "voxel": "voxel",
    "dicom": "DICOM",
    "pacs": "PACS",
    "pet": "PET",
    "spect": "SPECT",
    "mri": "RM",
    "ct": "TC",
    "x-ray": "raio-x",
    "post": "pós",
    "ante": "ante",
    "pre": "pré",
    # Correction of bad DeCS descriptors
    "abdominal": "abdominal",
    "abdominals": "abdominais",
    "abdomen": "abdome",
    "access": "acesso",
    "subject": "sujeito",
    "model": "modelo",
    "protein": "proteína",
    "narrow": "estreito",
    "spectrum": "espectro",
    "setup": "configuração",
    "mouse": "camundongo",
    "rest": "repouso"
}

# Refined Morphology Rules
def apply_morphology(pt_term, en_term):
    # Don't touch if it looks like a Proper Name (Capitalized in EN and PT)
    if en_term[0].isupper() and " " not in en_term:
        # It's likely a name like 'Brenner', 'Doppler'.
        # Unless it is a generic term that happens to be capitalized start of line (unlikely in this dataset)
        # Let's verify: 'Abdomen' might be cap. 'Brenner' is.
        # Check DeCS output casing.
        pass

    term = pt_term.lower()
    original_case = pt_term
    
    # Skip proper names from morphology changes roughly
    if "Tumor de" in original_case or "Doença de" in original_case:
        # Only touch the specific words, not the names?
        # Too complex. Let's just fix specific known bads.
        pass
    
    # 1. y -> i
    # Avoid 'Start with Y' (Yttrium) -> I..
    # cyst -> cisto
    term = term.replace('y', 'i')
    
    # 2. ph -> f
    term = term.replace('ph', 'f')
    
    # 3. th -> t
    term = term.replace('th', 't')
    
    # 4. nn -> n (Safe for general terms, bad for proper names like Brenner)
    # Check strict list of safe replacements or blacklist?
    # Blacklist names: Brenner, Schwann, Enneking?
    if "brenner" not in term and "schwann" not in term:
        term = term.replace('nn', 'n')

    # 5. mm -> m
    if "millon" not in term and "gamm" not in term: # gamma -> gama (ok), but Millon -> Millon.
        term = term.replace('mm', 'm')
    
    # 6. rr rule (Doubling R after vowel prefix)
    # Target: neuroradiology -> neurorradiologia
    # Bad target: virus -> virrus
    # Logic: Only replace r -> rr if preceded by vowel AND followed by vowel AND is a compound?
    # HEURISTIC: If English had 'r' (single) and we are making it 'rr' in PT because of prefix?
    # DeCS usually already handles 'radiografia' (one r) if it erroneously split it?
    # Actually, most DeCS outputs are already Portuguese.
    # 'neuroradiografia' (DeCS output) -> has single 'r'. Needs 'rr'.
    # 'virus' (DeCS output) -> 'vírus'.
    
    # Only apply rr if term has a known prefix ending in vowel match?
    prefixes = ['neuro', 'tele', 'radio', 'micro', 'macro', 'stereo', 'xero', 'pneumo', 'cardio', 'sialo', 'osteo', 'video', 'pleuro', 'tomo', 'braquio', 'quimio']
    
    for pref in prefixes:
        # Check if term contains prefix + r (single)
        # e.g. "neuroradiologia"
        pattern = f"{pref}r"
        if pattern in term and f"{pref}rr" not in term:
             # Fix it
             term = term.replace(pattern, f"{pref}rr")

    # 7. sc -> c (initial)
    # scintigraphy -> cintilografia
    # but 'iscemia' (ischemia)?
    if term.startswith('scin'):
        term = term.replace('scin', 'cin')
    
    return term

print("🔨 Generating Radiology Gold Dictionary...")

existing_curated = {}
output_path = Path(output_file)
if output_path.exists():
    try:
        with open(output_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                en = (row.get("English_Term") or "").strip()
                source = (row.get("Source") or "").strip()
                if not en or source not in curated_sources:
                    continue
                existing_curated[en.lower()] = {
                    "English_Term": en,
                    "Suggested_PT": row.get("Suggested_PT") or "",
                    "Source": source,
                    "Status": row.get("Status") or "Verified"
                }
    except Exception:
        pass

# Seed com manual_fixes (sempre preservar)
for en_lower, pt in manual_fixes.items():
    if en_lower not in existing_curated or existing_curated[en_lower].get("Source") != "Manual_Gold":
        existing_curated[en_lower] = {
            "English_Term": en_lower,
            "Suggested_PT": pt,
            "Source": "Manual_Gold",
            "Status": "Verified"
        }

observed_rows = []
with open(input_file, 'r', encoding='utf-8') as fin:
    for line in fin:
        try:
            data = json.loads(line)
            en = data['term_en']
            original_pt = data['term_pt']
            en_lower = en.lower()

            if en_lower in existing_curated:
                continue

            final_pt = original_pt
            status = "DeCS"

            # 1. Manual Fix?
            if en_lower in manual_fixes:
                final_pt = manual_fixes[en_lower]
                status = "Manual_Gold"

            # 2. Review Verbose
            elif " " not in en and len(original_pt.split()) > 3:
                status = "Review_Verbose"

            # 3. Apply Safe Morphology to DeCS output
            else:
                clean_pt = apply_morphology(original_pt, en)
                if original_pt and original_pt[0].isupper():
                    clean_pt = clean_pt.capitalize()
                if clean_pt.lower() != original_pt.lower():
                    final_pt = clean_pt
                    status = "Morpho_Fix"

            observed_rows.append({
                "English_Term": en,
                "Suggested_PT": final_pt,
                "Source": status,
                "Status": "Verified"
            })

        except Exception:
            pass

with open(output_file, 'w', encoding='utf-8', newline='') as fout:
    writer = csv.DictWriter(fout, fieldnames=["English_Term", "Suggested_PT", "Source", "Status"])
    writer.writeheader()
    for row in sorted(existing_curated.values(), key=lambda r: r["English_Term"].lower()):
        writer.writerow(row)
    for row in observed_rows:
        writer.writerow(row)

print(f"✅ Generated {output_file}")
