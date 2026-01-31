#!/usr/bin/env python3
"""
Builds full EN→PT-BR dictionary from a normalized corpus.
"""

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple


def load_jsonl(path: Path) -> List[dict]:
    data = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data


def load_csv_terms(path: Path, term_field: str = "term_en") -> Dict[str, dict]:
    items = {}
    if not path.exists():
        return items
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            term = (row.get(term_field) or row.get("English_Term") or "").strip().lower()
            if not term:
                continue
            items[term] = row
    return items


def load_generic_terms(path: Path) -> set:
    terms = set()
    if not path.exists():
        return terms
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            term = (row.get("term_en") or row.get("English_Term") or "").strip().lower()
            if term:
                terms.add(term)
    return terms


def load_radiology_gold(path: Path) -> Dict[str, dict]:
    curated = {}
    if not path.exists():
        return curated
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            source = (row.get("Source") or "").strip()
            if source not in {"Manual_Gold", "Morpho_Fix", "Review_Verbose"}:
                continue
            term = (row.get("English_Term") or "").strip().lower()
            if not term:
                continue
            curated[term] = row
    return curated


def load_radiology_lexicon(path: Path) -> set:
    terms = set()
    if not path.exists():
        return terms
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    for item in data:
        for key in ("preferred_en",):
            val = item.get(key)
            if val:
                terms.add(val.lower())
        for syn in item.get("synonyms_en", []) or []:
            terms.add(str(syn).lower())
    return terms


def is_probable_english_ok(term_pt: str) -> bool:
    tokens = re.findall(r"[A-Za-z']+", term_pt)
    if not tokens:
        return False
    ascii_tokens = [t for t in tokens if re.fullmatch(r"[A-Za-z']+", t)]
    ratio = len(ascii_tokens) / len(tokens)
    english_stopwords = {
        "and", "or", "with", "without", "of", "for", "from", "to", "in", "on", "by", "at",
        "the", "a", "an", "is", "are", "was", "were", "as", "into", "over", "under"
    }
    return ratio >= 0.7 and any(t.lower() in english_stopwords for t in tokens)


def detect_radiology(term_en: str, term_pt: str, radiology_terms: set, radiology_gold: Dict[str, dict]) -> bool:
    tl = term_en.lower()
    if tl in radiology_gold or tl in radiology_terms:
        return True
    strong_patterns = [
        r"\bct\b", r"\bmri\b", r"\bpet\b", r"\bspect\b", r"\bdicom\b", r"\bpacs\b",
        r"x[-\s]?ray", r"roentgen", r"radiograph", r"radiolog", r"fluoroscop",
        r"tomograph", r"ultrasound", r"sonograph", r"doppler", r"mammograph",
        r"angiograph", r"scintigraph", r"hounsfield", r"\bt1\b", r"\bt2\b", r"\bflair\b",
        r"\bcontrast\b", r"\bsequenc", r"\bsequence\b", r"\baxial\b", r"\bsagittal\b", r"\bcoronal\b",
    ]
    return any(re.search(pat, tl) for pat in strong_patterns) or any(re.search(pat, term_pt.lower()) for pat in strong_patterns)


def map_source(record_sources: List[str], status: str) -> str:
    if status == "keep_en":
        return "KeepEN"
    if any(s.startswith("override") for s in record_sources):
        return "Override"
    if "decs_api" in record_sources:
        return "DeCS"
    if "dict" in record_sources or "dict_partial" in record_sources:
        return "Dict"
    if "rule_suffix" in record_sources or "normalizer" in record_sources:
        return "Normalized"
    return "Normalized"


def main():
    parser = argparse.ArgumentParser(description="Build dictionary outputs from normalized corpus")
    parser.add_argument("--input", "-i", default="translations.normalized.jsonl", help="Corpus normalizado (.jsonl)")
    parser.add_argument("--outdir", "-o", default="dist", help="Diretório de saída")
    args = parser.parse_args()

    input_path = Path(args.input)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    corpus = load_jsonl(input_path)

    # Uniqueness by term_en_norm (fallback term_en lower)
    seen = set()
    unique = []
    duplicates = 0
    for rec in corpus:
        key = (rec.get("term_en_norm") or rec.get("term_en") or "").lower()
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
        unique.append(rec)

    radiology_gold = load_radiology_gold(Path("radiology_gold.csv"))
    generic_overrides = load_csv_terms(Path("generic_overrides.csv"))
    generic_terms = load_generic_terms(Path("generic_terms.csv"))
    radiology_lexicon_terms = load_radiology_lexicon(Path("radiology.lexicon.json"))

    full_records = []

    for rec in unique:
        term_en = rec.get("term_en", "")
        term_en_norm = (rec.get("term_en_norm") or term_en).lower()
        term_pt = rec.get("term_pt", "")
        status = rec.get("status", "needs_review")
        sources = rec.get("sources", []) or []
        confidence = rec.get("confidence", 0.0)
        notes = rec.get("notes", "")

        source_label = map_source(sources, status)

        # Apply generic overrides first
        if term_en_norm in generic_overrides:
            row = generic_overrides[term_en_norm]
            term_pt = row.get("term_pt") or row.get("Suggested_PT") or term_pt
            status = "ok"
            source_label = "Override"
            confidence = 0.95
            notes = "generic_override"
            domain_override = "generic"
        else:
            domain_override = None

        # Apply curated radiology gold
        if term_en_norm in radiology_gold and domain_override is None:
            row = radiology_gold[term_en_norm]
            term_pt = row.get("Suggested_PT") or term_pt
            src = row.get("Source") or "Manual_Gold"
            source_label = src
            if src == "Review_Verbose":
                status = "needs_review"
                confidence = min(confidence, 0.6) if confidence else 0.6
                notes = "radiology_gold_review"
            else:
                status = "ok"
                confidence = 0.99 if src == "Manual_Gold" else 0.9
                notes = "radiology_gold"

        # Rule 3: generic terms cannot be ok via DeCS
        if term_en_norm in generic_terms and status == "ok" and source_label == "DeCS":
            status = "needs_review"
            notes = (notes + " | " if notes else "") + "generic_decs_demoted"

        # Rule 5: ok cannot be pt==en
        if status == "ok" and term_pt.lower() == term_en.lower():
            status = "needs_review"
            notes = (notes + " | " if notes else "") + "pt_eq_en_demoted"

        # Rule 5: ok cannot be mostly English
        if status == "ok" and is_probable_english_ok(term_pt):
            status = "needs_review"
            notes = (notes + " | " if notes else "") + "mostly_english_demoted"

        # Domain detection
        if domain_override == "generic":
            domain = "generic"
        elif detect_radiology(term_en, term_pt, radiology_lexicon_terms, radiology_gold):
            domain = "radiology"
        elif term_en_norm in generic_terms or term_en_norm in generic_overrides:
            domain = "generic"
        else:
            domain = "other"

        # Normalize status
        if status not in {"ok", "keep_en", "needs_review"}:
            status = "needs_review"

        full_records.append({
            "term_en": term_en,
            "term_pt": term_pt,
            "status": status,
            "domain": domain,
            "source": source_label,
            "confidence": round(float(confidence), 4) if confidence is not None else 0.0,
            "notes": notes,
        })

    # Output files
    def write_csv(path: Path, rows: List[dict]):
        with path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["term_en", "term_pt", "status", "domain", "source", "confidence", "notes"])
            writer.writeheader()
            writer.writerows(rows)

    def write_json(path: Path, rows: List[dict]):
        with path.open("w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)

    write_csv(outdir / "dictionary_full.csv", full_records)
    write_json(outdir / "dictionary_full.json", full_records)

    ok_records = [r for r in full_records if r["status"] in {"ok", "keep_en"}]
    needs_records = [r for r in full_records if r["status"] == "needs_review"]
    write_csv(outdir / "dictionary_ok.csv", ok_records)
    write_csv(outdir / "dictionary_needs_review.csv", needs_records)

    radiology_records = [r for r in full_records if r["domain"] == "radiology"]
    generic_records = [r for r in full_records if r["domain"] == "generic"]
    write_csv(outdir / "dictionary_radiology.csv", radiology_records)
    write_csv(outdir / "dictionary_generic.csv", generic_records)
    write_json(outdir / "dictionary_radiology.json", radiology_records)
    write_json(outdir / "dictionary_generic.json", generic_records)

    # Report
    status_counts = Counter(r["status"] for r in full_records)
    source_counts = Counter(r["source"] for r in full_records)
    domain_counts = Counter(r["domain"] for r in full_records)

    violations_ok_en = sum(1 for r in full_records if r["status"] == "ok" and r["term_pt"].lower() == r["term_en"].lower())
    violations_ok_english = sum(1 for r in full_records if r["status"] == "ok" and is_probable_english_ok(r["term_pt"]))
    violations_generic_decs = sum(1 for r in full_records if r["status"] == "ok" and r["source"] == "DeCS" and r["term_en"].lower() in generic_terms)

    report_lines = []
    report_lines.append("# Dictionary Build Report")
    report_lines.append("")
    report_lines.append(f"Input corpus: `{input_path}`")
    report_lines.append("")
    report_lines.append("## Cobertura")
    report_lines.append("")
    report_lines.append(f"- Total termos no corpus (unique): {len(unique)}")
    report_lines.append(f"- Duplicados ignorados: {duplicates}")
    report_lines.append(f"- Total linhas no dictionary_full: {len(full_records)}")
    report_lines.append("")

    report_lines.append("## Distribuição por status")
    report_lines.append("")
    for k, v in status_counts.items():
        report_lines.append(f"- {k}: {v}")
    report_lines.append("")

    report_lines.append("## Distribuição por source")
    report_lines.append("")
    for k, v in source_counts.items():
        report_lines.append(f"- {k}: {v}")
    report_lines.append("")

    report_lines.append("## Distribuição por domain")
    report_lines.append("")
    for k, v in domain_counts.items():
        report_lines.append(f"- {k}: {v}")
    report_lines.append("")

    report_lines.append("## Sanity checks")
    report_lines.append("")
    report_lines.append(f"- ok com pt==en: {violations_ok_en}")
    report_lines.append(f"- ok com PT majoritariamente inglês: {violations_ok_english}")
    report_lines.append(f"- genérico com ok via DeCS: {violations_generic_decs}")
    report_lines.append("")

    report_lines.append("## Amostras")
    report_lines.append("")
    report_lines.append("### needs_review (top 30)")
    for r in needs_records[:30]:
        note = r.get("notes") or ""
        report_lines.append(f"- {r['term_en']} -> {r['term_pt']} | {note}")
    report_lines.append("")

    report_lines.append("### radiology ok (top 30)")
    rad_ok = [r for r in radiology_records if r["status"] == "ok"]
    for r in rad_ok[:30]:
        report_lines.append(f"- {r['term_en']} -> {r['term_pt']} | {r['source']}")

    (outdir / "report.md").write_text("\n".join(report_lines), encoding="utf-8")

    print(f"✅ Dictionary build complete: {len(full_records)} records")
    print(f"   OK: {len(ok_records)} | needs_review: {len(needs_records)}")
    print(f"   Report: {outdir / 'report.md'}")


if __name__ == "__main__":
    main()
