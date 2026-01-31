#!/usr/bin/env python3
"""
Vocabulary Gate for EN→PT-BR radiology reports.
Uses dictionary_full to guard allowed terminology.
"""

import argparse
import csv
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple, Union


def _normalize_key(term: str) -> str:
    t = term.strip().lower()
    t = re.sub(r"[_-]+", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t


def _candidate_keys(term: str) -> List[str]:
    raw = term.strip()
    ordered: List[str] = []
    seen = set()

    def add(key: str):
        if key and key not in seen:
            ordered.append(key)
            seen.add(key)

    base = _normalize_key(raw)
    add(base)

    # hyphen/underscore/space variants (lower priority than base)
    if " " in base:
        add(base.replace(" ", "-"))
        add(base.replace(" ", "_"))
    if "-" in raw:
        add(_normalize_key(raw.replace("-", " ")))
    if "_" in raw:
        add(_normalize_key(raw.replace("_", " ")))

    # singular/plural trivial (lowest priority)
    if base.endswith("s") and len(base) > 3:
        add(base[:-1])
    elif base and not base.endswith("s"):
        add(base + "s")

    return ordered


def _is_probably_english(text: str) -> bool:
    tokens = re.findall(r"[A-Za-z']+", text)
    if not tokens:
        return False
    ascii_tokens = [t for t in tokens if re.fullmatch(r"[A-Za-z']+", t)]
    ratio = len(ascii_tokens) / len(tokens)
    english_stopwords = {
        "and", "or", "with", "without", "of", "for", "from", "to", "in", "on", "by", "at",
        "the", "a", "an", "is", "are", "was", "were", "as", "into", "over", "under"
    }
    return ratio >= 0.7 and any(t.lower() in english_stopwords for t in tokens)


@dataclass
class LookupResult:
    term_out: str
    status: str
    source: str
    notes: str
    domain: str
    confidence: float
    term_en: str


class VocabularyGate:
    def __init__(
        self,
        dictionary_path: Union[str, Path] = "dist/dictionary_full.csv",
        log_path: Union[str, Path] = "needs_review_hits.jsonl",
        alternatives_path: Optional[Union[str, Path]] = None,
    ):
        self.dictionary_path = Path(dictionary_path)
        self.log_path = Path(log_path)
        self.alternatives_path = Path(alternatives_path) if alternatives_path else None

        self._dict = self._load_dictionary(self.dictionary_path)
        self._alternatives = self._load_alternatives(self.alternatives_path) if self.alternatives_path else {}

    def _load_dictionary(self, path: Path) -> Dict[str, dict]:
        if not path.exists():
            raise FileNotFoundError(f"Dictionary not found: {path}")
        entries: Dict[str, dict] = {}
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                term_en = row.get("term_en", "").strip()
                if not term_en:
                    continue
                key = _normalize_key(term_en)
                entries[key] = row
        return entries

    def _load_alternatives(self, path: Optional[Path]) -> Dict[str, str]:
        if not path or not path.exists():
            return {}
        mapping: Dict[str, str] = {}
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                term = (row.get("term_en") or "").strip().lower()
                alt = (row.get("alt_en") or row.get("alternative_en") or row.get("alt") or "").strip().lower()
                if term and alt:
                    mapping[term] = alt
        return mapping

    def _lookup_raw(self, term_en: str) -> Optional[dict]:
        for key in _candidate_keys(term_en):
            rec = self._dict.get(key)
            if rec:
                return rec
        return None

    def lookup(self, term_en: str) -> LookupResult:
        rec = self._lookup_raw(term_en)
        if not rec:
            return LookupResult(
                term_out=term_en,
                status="needs_review",
                source="NotFound",
                notes="not_in_dictionary",
                domain="other",
                confidence=0.0,
                term_en=term_en,
            )

        status = rec.get("status", "needs_review")
        term_pt = rec.get("term_pt", "")
        source = rec.get("source", "Normalized")
        notes = rec.get("notes", "")
        domain = rec.get("domain", "other")
        confidence = float(rec.get("confidence", 0.0) or 0.0)

        if status == "ok":
            term_out = term_pt
        elif status == "keep_en":
            term_out = term_en
        else:
            alt = self._alternatives.get(_normalize_key(term_en))
            if alt:
                alt_rec = self._lookup_raw(alt)
                if alt_rec and alt_rec.get("status") in {"ok", "keep_en"}:
                    alt_status = alt_rec.get("status")
                    term_out = alt_rec.get("term_pt") if alt_status == "ok" else alt_rec.get("term_en", alt)
                    notes = (notes + " | " if notes else "") + f"substitute:{alt}"
                    status = "ok" if alt_status == "ok" else "keep_en"
                    source = alt_rec.get("source", source)
                    domain = alt_rec.get("domain", domain)
                    confidence = float(alt_rec.get("confidence", confidence) or confidence)
                else:
                    term_out = term_en
            else:
                term_out = term_en

        # Safety guard
        if status == "ok" and term_out.lower() == term_en.lower():
            status = "needs_review"
            notes = (notes + " | " if notes else "") + "pt_eq_en_demoted"
            term_out = term_en

        if status == "ok" and _is_probably_english(term_out):
            status = "needs_review"
            notes = (notes + " | " if notes else "") + "mostly_english_demoted"
            term_out = term_en

        return LookupResult(
            term_out=term_out,
            status=status,
            source=source,
            notes=notes,
            domain=domain,
            confidence=confidence,
            term_en=term_en,
        )

    def _log_needs_review(self, term_en: str, context: str, result: LookupResult):
        entry = {
            "term_en": term_en,
            "term_out": result.term_out,
            "status": result.status,
            "domain": result.domain,
            "source": result.source,
            "notes": result.notes,
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with self.log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def validate_and_rewrite(self, text_or_tokens: Union[str, Iterable[str]]) -> Tuple[Union[str, List[str]], List[dict]]:
        report = []
        if isinstance(text_or_tokens, str):
            original = text_or_tokens
            parts = original.split(" ")
            rewritten_parts = []
            for part in parts:
                stripped = part.strip()
                if not stripped:
                    rewritten_parts.append(part)
                    continue
                prefix = re.match(r"^\W+", part)
                suffix = re.search(r"\W+$", part)
                core = part
                if prefix:
                    core = core[len(prefix.group(0)) :]
                if suffix:
                    core = core[: -len(suffix.group(0))]

                if not core:
                    rewritten_parts.append(part)
                    continue

                result = self.lookup(core)
                term_out = result.term_out
                action = result.status

                if result.status == "needs_review":
                    self._log_needs_review(core, original, result)
                    action = "kept_en_needs_review"

                rewritten = (prefix.group(0) if prefix else "") + term_out + (suffix.group(0) if suffix else "")
                rewritten_parts.append(rewritten)

                report.append({
                    "term_en": core,
                    "term_out": term_out,
                    "status": result.status,
                    "domain": result.domain,
                    "source": result.source,
                    "notes": result.notes,
                    "action": action,
                })
            return " ".join(rewritten_parts), report

        else:
            rewritten_tokens = []
            for term in text_or_tokens:
                result = self.lookup(term)
                term_out = result.term_out
                action = result.status

                if result.status == "needs_review":
                    self._log_needs_review(term, " ".join(text_or_tokens), result)
                    action = "kept_en_needs_review"

                rewritten_tokens.append(term_out)
                report.append({
                    "term_en": term,
                    "term_out": term_out,
                    "status": result.status,
                    "domain": result.domain,
                    "source": result.source,
                    "notes": result.notes,
                    "action": action,
                })
        return rewritten_tokens, report


_DEFAULT_GATE: Optional[VocabularyGate] = None
_DEFAULT_PATHS: Tuple[str, str] = ("", "")


def lookup(term_en: str, dict_path: str = "dist/dictionary_full.csv", log_path: str = "needs_review_hits.jsonl") -> dict:
    global _DEFAULT_GATE, _DEFAULT_PATHS
    if _DEFAULT_GATE is None or _DEFAULT_PATHS != (dict_path, log_path):
        _DEFAULT_GATE = VocabularyGate(dictionary_path=dict_path, log_path=log_path)
        _DEFAULT_PATHS = (dict_path, log_path)
    res = _DEFAULT_GATE.lookup(term_en)
    return {
        "term_out": res.term_out,
        "status": res.status,
        "source": res.source,
        "notes": res.notes,
        "domain": res.domain,
        "confidence": res.confidence,
    }


def validate_and_rewrite(
    text_or_tokens: Union[str, Iterable[str]],
    dict_path: str = "dist/dictionary_full.csv",
    log_path: str = "needs_review_hits.jsonl",
) -> Tuple[Union[str, List[str]], List[dict]]:
    global _DEFAULT_GATE, _DEFAULT_PATHS
    if _DEFAULT_GATE is None or _DEFAULT_PATHS != (dict_path, log_path):
        _DEFAULT_GATE = VocabularyGate(dictionary_path=dict_path, log_path=log_path)
        _DEFAULT_PATHS = (dict_path, log_path)
    return _DEFAULT_GATE.validate_and_rewrite(text_or_tokens)




def _cli():
    parser = argparse.ArgumentParser(description="Vocabulary Gate CLI")
    parser.add_argument("--dict", default="dist/dictionary_full.csv", help="Caminho do dicionário")
    parser.add_argument("--log", default="needs_review_hits.jsonl", help="Log append-only")
    parser.add_argument("--terms", nargs="*", help="Lista de termos EN")
    parser.add_argument("--input", help="Arquivo com termos EN (1 por linha)")
    parser.add_argument("--text", help="Texto completo para validar e reescrever")
    args = parser.parse_args()

    gate = VocabularyGate(dictionary_path=args.dict, log_path=args.log)

    if args.text:
        rewritten, report = gate.validate_and_rewrite(args.text)
        print(rewritten)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return

    terms = []
    if args.terms:
        terms.extend(args.terms)
    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    terms.append(line.strip())

    if not terms:
        print("No terms provided. Use --terms or --input or --text.")
        return

    rewritten, report = gate.validate_and_rewrite(terms)

    for row in report:
        print(f"{row['term_en']}\t{row['term_out']}\t{row['status']}\t{row['source']}\t{row['notes']}")


if __name__ == "__main__":
    _cli()
