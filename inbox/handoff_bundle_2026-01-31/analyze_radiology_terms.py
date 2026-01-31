#!/usr/bin/env python3
import argparse
import json
import re
from pathlib import Path
from typing import List

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "has", "he", "in", "is", "it", "its", "of", "on", "or", "that",
    "the", "to", "was", "were", "with", "without",
}

STRONG_PATTERNS = [
    r"\bct\b", r"\bmri\b", r"\bpet\b", r"\bspect\b",
    r"\bdicom\b", r"\bpacs\b",
    r"\bx[-\s]?ray\b", r"\braio[-\s]?x\b",
    r"\bradiograph\w*", r"\bradiograf\w*",
    r"\bradiolog\w*", r"\bradiolog\w*",
    r"\bfluoroscop\w*", r"\bfluoroscop\w*",
    r"\btomograph\w*", r"\btomograf\w*",
    r"\bultrasound\w*", r"\bultrasonograph\w*", r"\bultrasson\w*",
    r"\bsonograph\w*", r"\bdoppler\w*",
    r"\bmammograph\w*", r"\bmammograf\w*",
    r"\bangiograph\w*", r"\bangiograf\w*",
    r"\bscintigraph\w*", r"\bcintilograf\w*",
    r"\bvoxel\b", r"\bpixel\b", r"\bhounsfield\b",
    r"\bcontrast\b", r"\bcontraste\b",
    r"\bsequence\b", r"\bsequencia\b", r"\bsequência\b",
    r"\baxial\b", r"\bsagittal\b", r"\bcoronal\b", r"\bmultiplanar\b",
]

WEAK_PATTERNS = [
    r"\blesion\w*", r"\bles[aã]o\w*",
    r"\btumou?r\w*", r"\bcyst\w*", r"\bcist\w*",
    r"\bfracture\w*", r"\bfratur\w*",
    r"\bopacity\w*", r"\bopacidad\w*", r"\bopacidade\w*",
    r"\blucency\w*", r"\blucenc\w*", r"\blucidez\w*",
    r"\bdensity\w*", r"\bdensidad\w*", r"\bdensidade\w*",
    r"\battenuation\w*", r"\batenuac\w*",
    r"\benhancement\w*", r"\brealce\w*",
    r"\bsignal\w*", r"\bsinal\w*",
]

STRONG_REGEX = [re.compile(pat, re.IGNORECASE) for pat in STRONG_PATTERNS]
WEAK_REGEX = [re.compile(pat, re.IGNORECASE) for pat in WEAK_PATTERNS]


def _match_count(text: str, regexes: List[re.Pattern]) -> int:
    return sum(1 for r in regexes if r.search(text))


def is_radiology_term(term_en: str, term_pt: str) -> bool:
    if term_en.strip().lower() in STOPWORDS:
        return False
    if term_pt.strip().lower() in STOPWORDS:
        return False

    strong = _match_count(term_en, STRONG_REGEX) + _match_count(term_pt, STRONG_REGEX)
    weak = _match_count(term_en, WEAK_REGEX) + _match_count(term_pt, WEAK_REGEX)

    if strong >= 1:
        return True
    if strong == 0 and weak >= 2:
        return True
    return False


def main(input_file: str, output_file: str) -> None:
    found_terms = []
    total_ok = 0

    print(f"🔍 Analyzing Radiology Terms in {input_file}...")

    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get('status') == 'ok':
                    total_ok += 1
                    term_en = data.get('term_en', '')
                    term_pt = data.get('term_pt', '')

                    if is_radiology_term(term_en, term_pt):
                        found_terms.append(data)
            except Exception:
                continue

    print(f"\n📊 RESULTS")
    print(f"Total 'ok' terms scanned: {total_ok}")
    if total_ok:
        print(f"Radiology-related terms found: {len(found_terms)} ({len(found_terms)/total_ok*100:.1f}%)")
    else:
        print(f"Radiology-related terms found: {len(found_terms)} (0.0%)")

    print("\n🏆 Top 50 Examples:")
    found_terms.sort(key=lambda x: x['term_en'])

    for t in found_terms[:50]:
        print(f"  ✅ {t['term_en']} -> {t['term_pt']}")

    print(f"\n💾 Saving radiology subset to '{output_file}'...")
    with open(output_file, 'w', encoding='utf-8') as f:
        for t in found_terms:
            f.write(json.dumps(t, ensure_ascii=False) + '\n')


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze radiology terms")
    parser.add_argument('--input', '-i', default='translations.full.jsonl', help='Arquivo de entrada (.jsonl)')
    parser.add_argument('--output', '-o', default='radiology_terms.jsonl', help='Arquivo de saída (.jsonl)')
    args = parser.parse_args()

    main(args.input, args.output)
