#!/usr/bin/env python3
"""
Pós-processamento do corpus de traduções:
- aplica overrides
- aplica normalizer_rules.yaml (match exato)
- aplica sanity filter para DeCS verboso em termos genéricos
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict

import yaml

from medical_translation_pipeline import (
    load_overrides,
    load_generic_terms,
    determine_status,
    is_verbose_generic_decs,
)


def load_normalizer_map(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    mapping: Dict[str, str] = {}
    for rule in data.get("replace", []):
        target = rule.get("to")
        variants = rule.get("from", [])
        if not target or not isinstance(variants, list):
            continue
        for variant in variants:
            if not variant:
                continue
            mapping[variant.lower()] = target
    return mapping


def apply_normalizer(term_pt: str, mapping: Dict[str, str]) -> str:
    if not mapping:
        return term_pt
    return mapping.get(term_pt.lower(), term_pt)


def main():
    parser = argparse.ArgumentParser(description="Pós-processar traduções")
    parser.add_argument("--input", "-i", default="translations.full.jsonl", help="Arquivo de entrada (.jsonl)")
    parser.add_argument("--output", "-o", default="translations.normalized.jsonl", help="Arquivo de saída (.jsonl)")
    parser.add_argument("--apply-overrides", action="store_true", help="Aplicar overrides")
    parser.add_argument("--apply-normalizer", action="store_true", help="Aplicar normalizer_rules.yaml")
    parser.add_argument("--apply-sanity", action="store_true", help="Aplicar sanity filter para DeCS verboso")
    parser.add_argument("--normalizer-path", default="normalizer_rules.yaml", help="Caminho do normalizer_rules.yaml")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    script_dir = Path(__file__).parent

    overrides = load_overrides([
        script_dir / "radiology_gold.csv",
        script_dir / "overrides.csv",
        script_dir / "generic_overrides.csv",
    ]) if args.apply_overrides else {}
    generic_terms = load_generic_terms(script_dir / "generic_terms.csv") if args.apply_sanity else set()
    normalizer_map = load_normalizer_map(Path(args.normalizer_path)) if args.apply_normalizer else {}

    english_stopwords = {
        "and", "or", "with", "without", "of", "for", "from", "to", "in", "on", "by", "at",
        "the", "a", "an", "is", "are", "was", "were", "as", "into", "over", "under"
    }

    def tokenize_ascii(text: str):
        return re.findall(r"[A-Za-z']+", text)

    def ascii_token_ratio(tokens):
        if not tokens:
            return 0.0
        ascii_tokens = [t for t in tokens if re.fullmatch(r"[A-Za-z']+", t)]
        return len(ascii_tokens) / len(tokens)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    total = 0
    changed = 0

    with open(input_path, "r", encoding="utf-8") as fin, open(output_path, "w", encoding="utf-8") as fout:
        for line in fin:
            if not line.strip():
                continue
            total += 1
            rec = json.loads(line)

            term_en = rec.get("term_en", "")
            term_pt = rec.get("term_pt", "")
            status = rec.get("status", "")
            sources = rec.get("sources", [])
            notes = rec.get("notes", "")
            confidence = rec.get("confidence", 0.0)

            original_pt = term_pt
            original_status = status

            term_en_norm = term_en.lower()
            override = overrides.get(term_en_norm) if overrides else None
            if override:
                term_pt = override.term_pt
                sources = ["override_manual" if override.source == "Manual_Gold" else "override"]
                notes = f"Override ({override.source})"
                confidence = 0.99 if override.source == "Manual_Gold" else 0.95
                status = determine_status(confidence, term_en, term_pt)
            else:
                if args.apply_normalizer:
                    normalized = apply_normalizer(term_pt, normalizer_map)
                    if normalized != term_pt:
                        term_pt = normalized
                        if status in {"ok", "ambiguous", "needs_review"}:
                            status = determine_status(confidence, term_en, term_pt)
                        notes = (notes + " | " if notes else "") + "Normalizado"
                        sources = sources + ["normalizer"] if sources else ["normalizer"]

                if args.apply_sanity and status == "ok" and "decs_api" in sources:
                    tokens = tokenize_ascii(term_pt)
                    if tokens and ascii_token_ratio(tokens) >= 0.7 and any(t.lower() in english_stopwords for t in tokens):
                        status = "needs_review"
                        confidence = min(confidence, 0.55)
                        notes = (notes + " | " if notes else "") + "DeCS em inglês (demovido)"
                    elif term_en_norm in generic_terms:
                        status = "needs_review"
                        confidence = min(confidence, 0.55)
                        notes = (notes + " | " if notes else "") + "Genérico via DeCS (demovido)"
                    elif is_verbose_generic_decs(term_en, term_pt, generic_terms):
                        status = "needs_review"
                        confidence = min(confidence, 0.55)
                        notes = (notes + " | " if notes else "") + "DeCS verboso (demovido)"

            if term_pt != original_pt or status != original_status:
                changed += 1

            rec["term_pt"] = term_pt
            rec["status"] = status
            rec["sources"] = sources
            rec["notes"] = notes
            rec["confidence"] = confidence

            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"✅ Pós-processamento concluído: {total} registros")
    print(f"   Alterados: {changed}")
    print(f"   Saída: {output_path}")


if __name__ == "__main__":
    main()
