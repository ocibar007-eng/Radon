#!/usr/bin/env python3
"""
Extract structured medical content from a single markdown file.
Extracts: metadata, tables, thresholds, criteria/scores, algorithms, formulas, notes.
Outputs JSON to stdout.
"""
import re
import json
import sys
import os
import hashlib


def extract_metadata(lines, filename):
    """Extract document metadata from first ~80 lines."""
    meta = {
        "filename": filename,
        "title": "<AUSENTE>",
        "authors": "<AUSENTE>",
        "year": "<AUSENTE>",
        "source_journal": "<AUSENTE>",
        "version": "<AUSENTE>",
        "doi_pmid": "<AUSENTE>",
        "type": "<AUSENTE>",
        "society": "<AUSENTE>",
        "language": "en",
        "themes": [],
        "observations": ""
    }

    header_text = "\n".join(lines[:80])

    # Title: usually the first non-empty line
    for line in lines[:10]:
        stripped = line.strip()
        if stripped and len(stripped) > 5 and not stripped.startswith("#"):
            meta["title"] = stripped
            break
        elif stripped.startswith("#"):
            meta["title"] = stripped.lstrip("#").strip()
            break

    # Year
    year_match = re.search(r'\b(19[89]\d|20[0-2]\d)\b', header_text)
    if year_match:
        meta["year"] = year_match.group(1)

    # DOI
    doi_match = re.search(r'(10\.\d{4,}/[^\s,;]+)', header_text)
    if doi_match:
        meta["doi_pmid"] = doi_match.group(1)

    # Society/Organization detection
    orgs = {
        "ACR": r'\bACR\b',
        "ESUR": r'\bESUR\b',
        "ESGAR": r'\bESGAR\b',
        "EAU": r'\bEAU\b',
        "ESHRE": r'\bESHRE\b',
        "ESMO": r'\bESMO\b',
        "ESGO": r'\bESGO\b',
        "ESTRO": r'\bESTRO\b',
        "AAST": r'\bAAST\b',
        "ESVS": r'\bESVS\b',
        "SVS": r'\bSVS\b',
        "ESC": r'\bESC\b',
        "AJCC": r'\bAJCC\b',
        "UICC": r'\bUICC\b',
        "SRU": r'\bSRU\b',
        "AIUM": r'\bAIUM\b',
        "SPR": r'\bSPR\b',
        "NCCN": r'\bNCCN\b',
        "FIGO": r'\bFIGO\b',
        "AUA": r'\bAUA\b',
        "EHS": r'\bEHS\b',
        "GEIS": r'\bGEIS\b',
        "UEG": r'\bUEG\b',
        "ESGE": r'\bESGE\b',
        "SAR": r'\bSAR\b',
    }
    found_orgs = []
    full_text_sample = "\n".join(lines[:200])
    for org, pattern in orgs.items():
        if re.search(pattern, full_text_sample):
            found_orgs.append(org)
    if found_orgs:
        meta["society"] = ", ".join(found_orgs)

    # Type detection
    fname_lower = filename.lower()
    full_lower = full_text_sample.lower()
    if "guideline" in fname_lower or "guideline" in full_lower[:2000]:
        meta["type"] = "Guideline"
    elif "consensus" in fname_lower or "consensus" in full_lower[:2000] or "consenso" in full_lower[:2000]:
        meta["type"] = "Consenso"
    elif "appropriateness" in fname_lower or "appropriateness" in full_lower[:2000]:
        meta["type"] = "Guideline (ACR Appropriateness Criteria)"
    elif "practice parameter" in full_lower[:2000]:
        meta["type"] = "Practice Parameter"
    elif "review" in full_lower[:2000]:
        meta["type"] = "Review"
    elif any(x in fname_lower for x in ["lexicon", "template", "algorithm"]):
        meta["type"] = "Reference Material"
    else:
        meta["type"] = "Article"

    # Theme detection
    theme_map = {
        "fígado": ["li-rads", "lirads", "liver", "hepatic", "hepato", "hcc", "ceus", "steatosis", "nafld", "iron overload"],
        "próstata": ["pi-rads", "pirads", "prostate", "psma", "pi-rr"],
        "rim": ["bosniak", "renal", "kidney", "rcc"],
        "adrenal": ["adrenal", "incidental adrenal"],
        "ginecologia": ["o-rads", "orad", "ovarian", "adnexal", "endometri", "uterine", "cervix", "cervical",
                       "pelvic pain", "amenorrhea", "fibroids", "pelvic floor"],
        "pulmão": ["lung-rads", "lungrads", "fleischner", "pulmonary", "lung nodule", "thoracic"],
        "oncologia_resposta": ["recist", "irecist", "percist", "cheson", "response criteria", "lymphoma"],
        "tnm_estadiamento": ["tnm", "staging", "ajcc"],
        "vascular": ["thrombosis", "dvt", "venous", "aortic aneurysm", "aaa", "pulmonary embolism", "tep", "tev"],
        "digestivo": ["pancrea", "ipmn", "gallbladder", "esophag", "achalasia", "colorectal", "appendic",
                      "diverticul", "mesenteric", "gist"],
        "trauma": ["aast", "injury scoring", "trauma grading"],
        "urologia": ["scrotal", "infertility", "testicular"],
        "mieloma": ["myeloma", "plasmocytoma"],
        "hernia": ["hernia", "groin"],
    }
    for theme, keywords in theme_map.items():
        for kw in keywords:
            if kw in fname_lower or kw in full_lower[:3000]:
                if theme not in meta["themes"]:
                    meta["themes"].append(theme)

    # Version
    ver_match = re.search(r'[Vv](?:ersion)?\s*([\d.]+)', header_text)
    if ver_match:
        meta["version"] = ver_match.group(0)

    # Authors (look for patterns like "Name1, Name2, Name3" or "et al")
    for line in lines[:30]:
        if "et al" in line or (line.count(",") >= 2 and any(c.isupper() for c in line[:3])):
            author_text = line.strip()
            if len(author_text) > 10 and len(author_text) < 500:
                meta["authors"] = author_text[:300]
                break

    # Language
    pt_indicators = ["consenso", "tratamento", "diagnóstico", "avaliação", "sociedade brasileira"]
    if any(ind in full_lower[:2000] for ind in pt_indicators):
        meta["language"] = "pt-BR"

    return meta


def extract_tables(lines):
    """Extract markdown tables AND space-aligned tabular content from PDF conversion."""
    tables = []
    current_table = []
    table_context = ""
    in_table = False

    # 1) Standard pipe-format markdown tables
    for i, line in enumerate(lines):
        stripped = line.strip()

        if "|" in stripped and not in_table:
            if i + 1 < len(lines) and re.match(r'\s*\|[\s\-:|]+\|', lines[i + 1].strip()):
                in_table = True
                for j in range(max(0, i - 5), i):
                    ctx = lines[j].strip()
                    if ctx and (ctx.startswith("#") or ctx.startswith("Table") or ctx.startswith("Tabela")):
                        table_context = ctx
                        break
                current_table = [stripped]
                continue

        if in_table:
            if "|" in stripped:
                current_table.append(stripped)
            else:
                if len(current_table) >= 2:
                    tables.append({
                        "title": table_context or f"Table at line {i - len(current_table)}",
                        "content": "\n".join(current_table),
                        "line_start": i - len(current_table),
                        "line_end": i,
                        "rows": len(current_table) - 2
                    })
                current_table = []
                table_context = ""
                in_table = False

    if in_table and len(current_table) >= 2:
        tables.append({
            "title": table_context or f"Table at line {len(lines) - len(current_table)}",
            "content": "\n".join(current_table),
            "line_start": len(lines) - len(current_table),
            "line_end": len(lines),
            "rows": len(current_table) - 2
        })

    # 2) Space-aligned tabular content (from PDF conversion)
    # Detect blocks of lines that have consistent multi-space alignment
    space_table = []
    space_context = ""
    for i, line in enumerate(lines):
        # Lines with 3+ spaces separating columns, at least 2 "columns"
        parts = re.split(r'\s{3,}', line.strip())
        if len(parts) >= 2 and len(line.strip()) > 15:
            if not space_table:
                # Find context heading above
                for j in range(max(0, i - 5), i):
                    ctx = lines[j].strip()
                    if ctx and (ctx.startswith("#") or "Table" in ctx or "Tabela" in ctx
                               or "Figure" in ctx or "Figura" in ctx):
                        space_context = ctx
                        break
            space_table.append(line.rstrip())
        else:
            if len(space_table) >= 3:  # At least 3 rows = likely a table
                tables.append({
                    "title": space_context or f"Space-aligned table at line {i - len(space_table)}",
                    "content": "\n".join(space_table),
                    "line_start": i - len(space_table),
                    "line_end": i,
                    "rows": len(space_table),
                    "format": "space-aligned"
                })
            space_table = []
            space_context = ""

    if len(space_table) >= 3:
        tables.append({
            "title": space_context or f"Space-aligned table at line {len(lines) - len(space_table)}",
            "content": "\n".join(space_table),
            "line_start": len(lines) - len(space_table),
            "line_end": len(lines),
            "rows": len(space_table),
            "format": "space-aligned"
        })

    return tables


def extract_thresholds_and_values(lines, filename):
    """Extract numerical thresholds, reference values, cutoffs."""
    items = []
    patterns = [
        # ≤, ≥, <, > with number and unit
        r'([\w\s]{3,30})\s*[≤≥<>]\s*(\d+[\.\d]*)\s*(mm|cm|mL|HU|%|g/dL|ng/mL|mg/dL|mIU/mL|pmol/L|nmol/L|µmol/L|U/L|IU/L|mm/s|cm/s|m/s|kPa|MHz|T|mm²|cm²|cm³|mL/min|kg/m²|pg/mL|µg/L|mmHg|bpm)',
        # "cutoff" or "threshold" with number
        r'(?:cutoff|threshold|cut-off|limiar)\s*(?:of|de|:)?\s*(\d+[\.\d]*)\s*(mm|cm|mL|HU|%|g/dL|ng/mL|kPa)',
        # "normal" range
        r'(?:normal|reference|referência)\s*(?:range|value|valor)?\s*[:=]?\s*(\d+[\.\d]*)\s*[-–]\s*(\d+[\.\d]*)\s*(mm|cm|%|g/dL|ng/mL)',
    ]

    for i, line in enumerate(lines):
        for pattern in patterns:
            matches = re.finditer(pattern, line, re.IGNORECASE)
            for match in matches:
                context_start = max(0, i - 2)
                context_end = min(len(lines), i + 3)
                context = " ".join(l.strip() for l in lines[context_start:context_end])

                items.append({
                    "type": "threshold_or_value",
                    "match": match.group(0),
                    "context": context[:300],
                    "line": i + 1,
                    "source": filename
                })

    return items


def extract_criteria_and_scores(lines, filename):
    """Extract named classification systems, criteria, and scores."""
    items = []
    known_systems = [
        "Bosniak", "PI-RADS", "PI-RR", "O-RADS", "LI-RADS", "Lung-RADS",
        "RECIST", "iRECIST", "PERCIST", "Cheson", "Lugano",
        "Fleischner", "TNM", "AJCC", "FIGO",
        "Child-Pugh", "MELD", "Deauville", "AAST",
        "BI-RADS", "TI-RADS", "Breslow", "Clark",
        "Gleason", "ISUP", "PIRADS", "mRECIST",
        "Bethesda", "EU-TIRADS", "ACR-TIRADS",
    ]

    for i, line in enumerate(lines):
        for system in known_systems:
            if system.lower() in line.lower():
                # Get surrounding context
                context_start = max(0, i - 2)
                context_end = min(len(lines), i + 5)
                context = "\n".join(l.strip() for l in lines[context_start:context_end])

                # Check if this is a definition/classification line (not just a mention)
                is_definition = any(kw in line.lower() for kw in [
                    "class", "category", "score", "grade", "stage",
                    "assessment", "criteria", "classification", "level"
                ])

                if is_definition:
                    items.append({
                        "type": "criteria_score",
                        "system": system,
                        "context": context[:500],
                        "line": i + 1,
                        "source": filename
                    })

    # Deduplicate by system + approximate line
    seen = set()
    unique_items = []
    for item in items:
        key = f"{item['system']}_{item['line'] // 10}"
        if key not in seen:
            seen.add(key)
            unique_items.append(item)

    return unique_items


def extract_algorithms(lines, filename):
    """Extract algorithmic/step-by-step content and recommendations."""
    items = []
    recommendation_patterns = [
        r'(?:recommendation|recomendação)\s*\d*\s*[:.]',
        r'(?:step|etapa|passo)\s*\d+',
        r'(?:grade|grau)\s*(?:of|de)?\s*(?:recommendation|recomendação)',
        r'(?:level|nível)\s*(?:of|de)?\s*evidence',
        r'(?:class|classe)\s+[IVX]+\s*(?:recommendation)?',
        r'(?:strong|weak|conditional)\s+(?:recommendation|for|against)',
    ]

    for i, line in enumerate(lines):
        for pattern in recommendation_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                context_start = max(0, i - 2)
                context_end = min(len(lines), i + 8)
                context = "\n".join(l.strip() for l in lines[context_start:context_end])

                items.append({
                    "type": "algorithm_recommendation",
                    "context": context[:600],
                    "line": i + 1,
                    "source": filename
                })
                break  # One match per line is enough

    # Deduplicate nearby items
    if not items:
        return items

    unique = [items[0]]
    for item in items[1:]:
        if item["line"] - unique[-1]["line"] > 5:
            unique.append(item)

    return unique


def extract_formulas(lines, filename):
    """Extract mathematical formulas and equations."""
    items = []
    formula_patterns = [
        r'(?:formula|fórmula|equation|equação|calculated?\s+(?:as|by|using))',
        r'=\s*\(?\s*\w+\s*[×x\*/\+\-]\s*\w+',
        r'(?:volume|area|índice|index|ratio|score)\s*=',
        r'\$[^$]+\$',  # LaTeX inline
        r'\\\[.*\\\]',  # LaTeX display
    ]

    for i, line in enumerate(lines):
        for pattern in formula_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                context_start = max(0, i - 2)
                context_end = min(len(lines), i + 5)
                context = "\n".join(l.strip() for l in lines[context_start:context_end])

                items.append({
                    "type": "formula",
                    "context": context[:500],
                    "line": i + 1,
                    "source": filename
                })
                break

    return items


def extract_notes_and_pitfalls(lines, filename):
    """Extract important notes, warnings, pitfalls."""
    items = []
    note_patterns = [
        r'(?:note|nota|nb|n\.b\.)\s*[:.]',
        r'(?:important|importante|atenção|attention|warning|caution)',
        r'(?:pitfall|armadilha|limitation|limitação)',
        r'(?:contraindica|contra-indica)',
        r'(?:red flag|sinal de alarme|alerta)',
        r'(?:must not|não deve|should not|avoid|evitar)',
    ]

    for i, line in enumerate(lines):
        for pattern in note_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                context_start = max(0, i - 1)
                context_end = min(len(lines), i + 5)
                context = "\n".join(l.strip() for l in lines[context_start:context_end])

                items.append({
                    "type": "note_pitfall",
                    "context": context[:400],
                    "line": i + 1,
                    "source": filename
                })
                break

    # Deduplicate nearby
    if not items:
        return items

    unique = [items[0]]
    for item in items[1:]:
        if item["line"] - unique[-1]["line"] > 3:
            unique.append(item)

    return unique


def extract_content_blocks(lines, filename):
    """Extract large content blocks around headings — captures full sections."""
    blocks = []
    heading_indices = []

    for i, line in enumerate(lines):
        if line.strip().startswith("#"):
            heading_indices.append(i)

    for idx, hi in enumerate(heading_indices):
        # Section from this heading to next heading
        end = heading_indices[idx + 1] if idx + 1 < len(heading_indices) else min(hi + 100, len(lines))
        section_lines = lines[hi:end]
        heading = lines[hi].strip().lstrip("#").strip()

        # Only keep sections that seem actionable
        section_text = "\n".join(section_lines)
        actionable_keywords = [
            "class", "category", "score", "grade", "stage", "criteria",
            "algorithm", "recommendation", "table", "formula", "threshold",
            "protocol", "assessment", "definition", "management",
            "diagnosis", "treatment", "follow-up", "surveillance",
            "classification", "staging", "grading", "evaluation",
        ]

        if any(kw in section_text.lower() for kw in actionable_keywords):
            blocks.append({
                "heading": heading,
                "content": section_text[:2000],  # Cap section size
                "line_start": hi + 1,
                "line_end": end,
                "source": filename
            })

    return blocks


def process_file(filepath):
    """Process a single file and return structured extraction."""
    filename = os.path.basename(filepath)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')

    result = {
        "metadata": extract_metadata(lines, filename),
        "tables": extract_tables(lines),
        "thresholds": extract_thresholds_and_values(lines, filename),
        "criteria_scores": extract_criteria_and_scores(lines, filename),
        "algorithms": extract_algorithms(lines, filename),
        "formulas": extract_formulas(lines, filename),
        "notes_pitfalls": extract_notes_and_pitfalls(lines, filename),
        "content_blocks": extract_content_blocks(lines, filename),
        "stats": {
            "total_lines": len(lines),
            "total_chars": len(content),
            "content_hash": hashlib.md5(content.encode()).hexdigest()[:12]
        }
    }

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_document.py <file.md>", file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]
    result = process_file(filepath)
    print(json.dumps(result, ensure_ascii=False, indent=2))
