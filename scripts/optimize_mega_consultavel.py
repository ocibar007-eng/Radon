#!/usr/bin/env python3
"""
Optimize the mega consultable markdown for chat-based LLM ingestion.

Goals:
  - Higher signal density (remove excessive blank lines / code fences)
  - Preserve information content (no guideline text removed)
  - Normalize common PDF-to-text artifacts (<=/>=, <, >, unicode glitches)
  - Keep line count <= original (typically much smaller)

Default input:
  exports/mega_consultavel_157md_60k.md

Default output:
  exports/mega_consultavel_157md_60k_ai.md
  exports/mega_consultavel_157md_60k_ai.zip
"""

from __future__ import annotations

import argparse
import re
import unicodedata
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IN = ROOT / "exports" / "mega_consultavel_157md_60k.md"
DEFAULT_OUT = ROOT / "exports" / "mega_consultavel_157md_60k_ai.md"
DEFAULT_ZIP = ROOT / "exports" / "mega_consultavel_157md_60k_ai.zip"
MD_DOCS_DIR = ROOT / "data" / "recommendations" / "md_docs"


_REPLACEMENTS = [
    ("", "≤"),
    ("", "≥"),
    ("ΓÇô", "–"),
    ("ΓÇö", "—"),
    ("ΓÇó", "•"),
    ("┬«", "®"),
    ("Â®", "®"),
    ("Â", ""),
    ("", "-"),
]


def _normalize_artifacts(s: str) -> str:
    out = s
    for a, b in _REPLACEMENTS:
        out = out.replace(a, b)

    # Operators: OCR/operator substitutions.
    # ",6 mm" -> "<6 mm" (also "(,100 mm3)" -> "(<100 mm3)")
    out = re.sub(r"(^|[\s(\[]),\s*(?=\d)", r"\1<", out)
    # ".8 mm" / "(.250 mm3)" -> ">8 mm" / "(>250 mm3)"
    out = re.sub(r"\s\.\s+(?=\d)", " > ", out)  # spaced operator (". 3 cm")
    out = re.sub(r"(^|[\s(\[])\.(?=\d)", r"\1>", out)

    return out.rstrip()


def _canon_key(s: str) -> str:
    # Match filenames even if there are encoding glitches by normalizing to "words".
    s = unicodedata.normalize("NFKD", s)
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s


def _build_filename_map(md_docs_dir: Path) -> dict[str, list[str]]:
    m: dict[str, list[str]] = {}
    for p in sorted(md_docs_dir.glob("*.md")):
        key = _canon_key(p.name)
        m.setdefault(key, []).append(p.name)
    return m


def _best_filename(name: str, key_to_names: dict[str, list[str]]) -> str:
    # Prefer exact match, otherwise try fuzzy key match (unique only).
    if (MD_DOCS_DIR / name).exists():
        return name
    key = _canon_key(name)
    cands = key_to_names.get(key) or []
    if len(cands) == 1:
        return cands[0]
    return name


_DOC_HDR_RE = re.compile(r"^##\s+(\d+)\.\s+(.*)$")
# Meta lines in the original file are usually: "- **Key:** Value" (colon inside bold)
_META_RE = re.compile(r"^- \*\*(.+?):\*\*\s*(.*)$")


@dataclass
class DocHeader:
    number: int
    filename_raw: str


def _count_lines(path: Path) -> int:
    return path.read_text(encoding="utf-8", errors="replace").count("\n") + 1


def optimize(in_path: Path, out_path: Path, zip_path: Path | None) -> None:
    src_lines = in_path.read_text(encoding="utf-8", errors="replace").splitlines()
    key_to_names = _build_filename_map(MD_DOCS_DIR)

    out: list[str] = []
    out.append("# Mega Consultavel — AI Optimized (md_docs)")
    out.append("")
    out.append(f"- Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    out.append(f"- Source: `{in_path.relative_to(ROOT)}`")
    out.append("- Changes: removed ``` fences; collapsed blank lines; normalized common PDF artifacts (≤/≥, <, >, ®, dashes).")
    out.append("")

    i = 0
    while i < len(src_lines):
        raw = src_lines[i]
        line = _normalize_artifacts(raw)

        # Drop the big index block entirely; it is navigation noise for LLMs.
        if line.strip() == "## Índice":
            # Skip until first doc header.
            i += 1
            while i < len(src_lines):
                probe = _normalize_artifacts(src_lines[i])
                if _DOC_HDR_RE.match(probe):
                    break
                i += 1
            continue

        # Drop fenced code markers, keep the content.
        if line.startswith("```"):
            i += 1
            continue

        m = _DOC_HDR_RE.match(line)
        if m:
            num = int(m.group(1))
            filename_raw = m.group(2).strip()
            filename_norm = _normalize_artifacts(filename_raw)
            filename_best = _best_filename(filename_norm, key_to_names)
            relpath = f"data/recommendations/md_docs/{filename_best}"
            # Ensure doc sections are visually separated (helps chunking).
            if out and out[-1] != "":
                out.append("")
            out.append(f"## {num:03d} | `{relpath}`")

            # Collect meta lines immediately following the header.
            meta: list[tuple[str, str]] = []
            j = i + 1
            while j < len(src_lines):
                cand = _normalize_artifacts(src_lines[j])
                if cand.startswith("```"):
                    j += 1
                    continue
                mm = _META_RE.match(cand)
                if mm:
                    meta.append((mm.group(1).strip(), mm.group(2).strip()))
                    j += 1
                    continue
                if not cand.strip():
                    j += 1
                    continue
                break
            if meta:
                meta_parts = [f"{k}={v}" for k, v in meta]
                out.append(f"- Meta: {' | '.join(meta_parts)}")
            out.append("")  # separator
            i = j
            continue

        # Drop source blank lines; we'll add our own structure-driven spacing.
        if not line.strip():
            i += 1
            continue

        # Keep headings visually separated to help retrieval chunking.
        if line.startswith("### "):
            if out and out[-1] != "":
                out.append("")
            out.append(line)
            out.append("")
            i += 1
            continue

        if line.startswith("**Table") or line.startswith("**Lista"):
            if out and out[-1] != "":
                out.append("")
            out.append(line)
            i += 1
            continue

        out.append(line)
        i += 1

    out_text = "\n".join(out).rstrip() + "\n"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(out_text, encoding="utf-8")

    if zip_path is not None:
        if zip_path.exists():
            zip_path.unlink()
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.write(out_path, arcname=out_path.name)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default=str(DEFAULT_IN))
    ap.add_argument("--out", dest="out_path", default=str(DEFAULT_OUT))
    ap.add_argument("--zip", dest="zip_path", default=str(DEFAULT_ZIP))
    ap.add_argument("--no-zip", action="store_true")
    args = ap.parse_args()

    in_path = Path(args.in_path)
    out_path = Path(args.out_path)
    zip_path = None if args.no_zip else Path(args.zip_path)

    optimize(in_path, out_path, zip_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
