#!/usr/bin/env python3
"""
Auto-popula generic_terms.csv e generic_overrides.csv a partir de critical.txt.
"""

import argparse
import csv
import re
from pathlib import Path

STOP = {
    "and", "or", "of", "to", "in", "on", "for", "with", "without", "by", "from", "at", "as",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "access", "model", "subject", "setup", "rest", "mouse",
}

OVR = {
    "and": "e",
    "or": "ou",
    "of": "de",
    "to": "para",
    "with": "com",
    "without": "sem",
    "access": "acesso",
    "model": "modelo",
    "subject": "sujeito",
    "setup": "configuração",
    "rest": "repouso",
    "mouse": "camundongo",
    "protein": "proteína",
}


def load_existing_terms(path: Path):
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


def load_existing_overrides(path: Path):
    overrides = {}
    if not path.exists():
        return overrides
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            term = (row.get("term_en") or row.get("English_Term") or "").strip().lower()
            if not term:
                continue
            overrides[term] = {
                "term_en": term,
                "term_pt": (row.get("term_pt") or row.get("Suggested_PT") or "").strip(),
                "notes": (row.get("notes") or "").strip(),
                "source": (row.get("source") or row.get("Source") or "").strip(),
            }
    return overrides


def main():
    parser = argparse.ArgumentParser(description="Populate generic terms from critical list")
    parser.add_argument("--critical", default="critical.txt", help="Arquivo de críticos (1 termo por linha)")
    parser.add_argument("--generic-out", default="generic_terms.csv", help="Saída generic_terms.csv")
    parser.add_argument("--overrides-out", default="generic_overrides.csv", help="Saída generic_overrides.csv")
    args = parser.parse_args()

    critical_path = Path(args.critical)
    generic_out = Path(args.generic_out)
    overrides_out = Path(args.overrides_out)

    existing_generic = load_existing_terms(generic_out)
    existing_overrides = load_existing_overrides(overrides_out)

    terms = []
    with critical_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            term = re.split(r"[\t;,]", line, maxsplit=1)[0].strip()
            if term:
                terms.append(term.lower())

    generic = sorted(set(
        t for t in terms
        if t in STOP or (t.isalpha() and len(t) <= 4)
    ))

    merged_generic = sorted(existing_generic.union(generic))

    with generic_out.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["term_en", "notes"])
        for t in merged_generic:
            writer.writerow([t, "auto_from_critical" if t in generic else "existing"])

    for t, pt in OVR.items():
        if t not in existing_overrides:
            existing_overrides[t] = {
                "term_en": t,
                "term_pt": pt,
                "notes": "auto_override_from_critical",
                "source": "auto",
            }

    with overrides_out.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["term_en", "term_pt", "notes", "source"])
        for t in sorted(existing_overrides.keys()):
            row = existing_overrides[t]
            writer.writerow([row["term_en"], row["term_pt"], row["notes"], row["source"]])

    print(f"OK: {len(merged_generic)} genéricos -> {generic_out}")
    print(f"OK: {len(existing_overrides)} overrides -> {overrides_out}")


if __name__ == "__main__":
    main()
