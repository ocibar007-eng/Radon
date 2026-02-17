#!/usr/bin/env python3
"""
Build small, high-signal "system packs" from md_docs for chat-based LLM use.

Why: A single mega-file is high coverage but low density; these packs extract
canonical tables/blocks for key guideline systems, with basic cleanup of common
PDF-to-text artifacts (<=/>=, <, >).

Outputs (default):
  exports/system_packs/index.md
  exports/system_packs/<system_id>.md
  exports/system_packs.zip

Notes:
  - This script is intentionally conservative: it does NOT "correct" numbers.
  - It only normalizes obvious operator artifacts (e.g. '' -> '≤', ',6 mm' -> '<6 mm').
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Iterator


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC_DIR = ROOT / "data" / "recommendations" / "md_docs"
DEFAULT_REPORT_JSON = ROOT / "exports" / "md_docs_metrics_report_20k.json"
DEFAULT_OUT_DIR = ROOT / "exports" / "system_packs"
DEFAULT_ZIP = ROOT / "exports" / "system_packs.zip"


# Common PDF/text extraction artifacts seen in this repo.
_REPLACEMENTS = [
    ("", "≤"),  # Private Use Area glyphs often used for <= / >=
    ("", "≥"),
    ("ΓÇô", "–"),
    ("ΓÇö", "—"),
    ("ΓÇó", "•"),
    ("┬«", "®"),
    ("Â®", "®"),
    ("Â", ""),
    ("", "-"),
]


def _normalize_line(line: str) -> str:
    s = line.rstrip("\n")
    for a, b in _REPLACEMENTS:
        s = s.replace(a, b)

    # Operators: handle common OCR/operator substitutions.
    # ",6 mm" -> "<6 mm" (also ",1%" -> "<1%")
    s = re.sub(r"(^|[\s(\[]),\s*(?=\d)", r"\1<", s)
    # ".8 mm" -> ">8 mm"
    s = re.sub(r"\s\.\s+(?=\d)", " > ", s)  # spaced operator
    s = re.sub(r"(^|[\s(\[])\.(?=\d)", r"\1>", s)  # token-start operator
    # " . 3 cm" -> " > 3 cm"
    # (handled above)

    # Collapse excessive internal whitespace, but keep leading spaces for table-ish blocks.
    if s.startswith((" ", "\t")):
        lead = re.match(r"^[ \t]+", s)
        prefix = lead.group(0) if lead else ""
        rest = s[len(prefix) :]
        rest = re.sub(r"[ \t]{2,}", " ", rest)
        s = prefix + rest
    else:
        s = re.sub(r"[ \t]{2,}", " ", s)
    return s.rstrip()


def _normalize_block(lines: Iterable[str]) -> list[str]:
    out: list[str] = []
    blank_run = 0
    for raw in lines:
        s = _normalize_line(raw)
        if not s.strip():
            blank_run += 1
            # Keep at most one blank line inside blocks.
            if blank_run > 1:
                continue
            out.append("")
            continue
        blank_run = 0
        out.append(s)
    # Trim trailing blanks.
    while out and not out[-1].strip():
        out.pop()
    return out


@dataclass(frozen=True)
class BlockSpec:
    name: str
    start: re.Pattern[str]
    stop: re.Pattern[str] | None = None
    max_lines: int = 260
    first_only: bool = True


@dataclass
class ExtractedBlock:
    name: str
    start_line: int  # 1-based
    end_line: int  # 1-based
    lines: list[str]


def _read_lines(path: Path) -> list[str]:
    # Preserve line count: splitlines() without keepends.
    return path.read_text(encoding="utf-8", errors="replace").splitlines()


def _find_first_match(lines: list[str], pat: re.Pattern[str]) -> int | None:
    for i, line in enumerate(lines):
        if pat.search(line):
            return i
    return None


def _extract_blocks(lines: list[str], specs: list[BlockSpec]) -> list[ExtractedBlock]:
    blocks: list[ExtractedBlock] = []
    for spec in specs:
        starts: list[int] = []
        for i, line in enumerate(lines):
            if spec.start.search(line):
                starts.append(i)
                if spec.first_only:
                    break
        for start in starts:
            end = min(len(lines) - 1, start + spec.max_lines - 1)
            if spec.stop is not None:
                for j in range(start + 1, min(len(lines), start + spec.max_lines)):
                    if spec.stop.search(lines[j]):
                        end = j - 1
                        break
            raw_block = lines[start : end + 1]
            norm = _normalize_block(raw_block)
            if not norm:
                continue
            blocks.append(
                ExtractedBlock(
                    name=spec.name,
                    start_line=start + 1,
                    end_line=end + 1,
                    lines=norm,
                )
            )
    return blocks


def _iter_numeric_lines(lines: list[str]) -> Iterator[tuple[int, str]]:
    # High-signal lines: numbers + units/operators.
    unit_re = re.compile(r"\b(mm|cm|mGy|HU|%|mm3|mL|min|years?|months?)\b", re.IGNORECASE)
    op_re = re.compile(r"[<>≤≥]=?|\bto\b", re.IGNORECASE)
    for i, line in enumerate(lines):
        s = _normalize_line(line)
        if not s.strip():
            continue
        if any(ch.isdigit() for ch in s) and (unit_re.search(s) or op_re.search(s)):
            yield (i + 1, s)


def _load_report_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _md_code_block(lines: list[str]) -> list[str]:
    return ["```text", *lines, "```"]


def _write_pack(
    out_path: Path,
    *,
    title: str,
    system_id: str,
    sources: list[dict],
    blocks_by_source: list[tuple[dict, list[ExtractedBlock]]],
    extra_numeric_by_source: list[tuple[dict, list[tuple[int, str]]]],
) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    md: list[str] = []
    md.append(f"# {title}")
    md.append("")
    md.append(f"- System id: `{system_id}`")
    md.append(f"- Generated at: {now}")
    md.append("")

    md.append("## Canonical Sources (deduplicated)")
    for s in sources:
        bits = [f"`{s['relpath']}`"]
        if s.get("title") and s["title"] != "<AUSENTE>":
            bits.append(s["title"])
        meta = []
        for k in ("year", "doi_pmid", "society", "doc_type", "language"):
            v = s.get(k)
            if v and v != "<AUSENTE>":
                meta.append(f"{k}={v}")
        if meta:
            bits.append(f"({' | '.join(meta)})")
        md.append(f"- {' — '.join(bits)}")
    md.append("")

    md.append("## Canonical Blocks / Tables")
    any_blocks = False
    for src, blocks in blocks_by_source:
        if not blocks:
            continue
        any_blocks = True
        md.append(f"### From `{src['relpath']}`")
        md.append("")
        for b in blocks:
            md.append(f"#### {b.name}")
            md.append(f"Source: `{src['relpath']}` L{b.start_line}-L{b.end_line}")
            md.append("")
            md.extend(_md_code_block(b.lines))
            md.append("")
    if not any_blocks:
        md.append("_No blocks matched the current anchors for this system._")
        md.append("")

    md.append("## Extra High-Signal Numeric Lines (sample)")
    for src, pairs in extra_numeric_by_source:
        if not pairs:
            continue
        md.append(f"### From `{src['relpath']}`")
        md.append("")
        for ln, text in pairs:
            md.append(f"- L{ln} | {text}")
        md.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(md).rstrip() + "\n", encoding="utf-8")


def _zip_dir(src_dir: Path, zip_path: Path) -> None:
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(src_dir.rglob("*")):
            if p.is_dir():
                continue
            zf.write(p, arcname=str(p.relative_to(src_dir)))


def _dedupe_paths(report: dict, relpaths: list[str]) -> list[str]:
    # Dedupe by content_hash if we can.
    if not report:
        seen = set()
        out = []
        for rp in relpaths:
            if rp in seen:
                continue
            seen.add(rp)
            out.append(rp)
        return out

    by_path = {d["relpath"]: d for d in report.get("docs", [])}
    dupmap: dict[str, list[str]] = report.get("duplicates", {}) or {}

    # Build reverse map: relpath -> canonical relpath (first alpha in cluster).
    canonical_of: dict[str, str] = {}
    for _h, paths in dupmap.items():
        canon = sorted(paths)[0]
        for p in paths:
            canonical_of[p] = canon

    chosen: dict[str, str] = {}
    for rp in relpaths:
        if rp not in by_path:
            # Keep unknown paths as-is.
            chosen[rp] = rp
            continue
        canon = canonical_of.get(rp, rp)
        chosen[canon] = canon
    return sorted(chosen.values())


def _src_info(report: dict, relpath: str) -> dict:
    if report:
        for d in report.get("docs", []):
            if d.get("relpath") == relpath:
                return {
                    "relpath": relpath,
                    "title": d.get("title"),
                    "year": d.get("year"),
                    "doi_pmid": d.get("doi_pmid"),
                    "society": d.get("society"),
                    "doc_type": d.get("doc_type"),
                    "language": d.get("language"),
                    "content_hash": d.get("content_hash"),
                }
    return {"relpath": relpath}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src-dir", default=str(DEFAULT_SRC_DIR))
    ap.add_argument("--report-json", default=str(DEFAULT_REPORT_JSON))
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    ap.add_argument("--zip", dest="zip_path", default=str(DEFAULT_ZIP))
    args = ap.parse_args()

    src_dir = Path(args.src_dir)
    report_json = Path(args.report_json)
    out_dir = Path(args.out_dir)
    zip_path = Path(args.zip_path)

    report = _load_report_json(report_json)

    # Packs we generate by default. This is intentionally small and focused.
    # You can add more systems here over time.
    systems = [
        {
            "id": "bosniak_v2019",
            "title": "Bosniak v2019 (cystic renal masses) — pack",
            "relpaths": [
                "data/recommendations/md_docs/10.1148@radiol.2019182646.md",
                "data/recommendations/md_docs/bosniak_v2019.md",
            ],
            "blocks": [
                BlockSpec(
                    name="Table 1 — Current Bosniak classification (excerpt)",
                    start=re.compile(r"^Table\s+1\s*:", re.IGNORECASE),
                    stop=re.compile(r"^Table\s+2\s*:", re.IGNORECASE),
                    max_lines=160,
                ),
                BlockSpec(
                    name="Table 2 — Proposed update (2019) (excerpt)",
                    start=re.compile(r"^Table\s+2\s*:", re.IGNORECASE),
                    stop=re.compile(r"^Table\s+3\s*:", re.IGNORECASE),
                    max_lines=260,
                ),
                BlockSpec(
                    name="Table 3 — Definitions/terms (excerpt)",
                    start=re.compile(r"^Table\s+3\s*:", re.IGNORECASE),
                    max_lines=260,
                ),
            ],
        },
        {
            "id": "fleischner_2017",
            "title": "Fleischner Society 2017 (incidental pulmonary nodules) — pack",
            "relpaths": [
                "data/recommendations/md_docs/fleischner_2017.pdf .md",
                "data/recommendations/md_docs/macmahon2017.md",
            ],
            "blocks": [
                BlockSpec(
                    name="Recommendations Table — Solid + Subsolid nodules (excerpt)",
                    start=re.compile(r"^A:\s*Solid\s+Nodules\*", re.IGNORECASE),
                    stop=re.compile(r"^Recommendations\s+for\s+Managing|^General\s+Recommendations", re.IGNORECASE),
                    max_lines=260,
                ),
            ],
        },
        {
            "id": "li_rads_ct_mri_v2018",
            "title": "LI-RADS CT/MRI v2018 (core) — pack",
            "relpaths": [
                "data/recommendations/md_docs/LI-RADS-CT-MRI-2018-Core (2).md",
                "data/recommendations/md_docs/li_rads_v2018.md",
            ],
            "blocks": [
                BlockSpec(
                    name="Who to apply / who not to apply (excerpt)",
                    start=re.compile(r"^Apply\s+in\s+patients\s+at\s+high\s+risk\s+for\s+HCC", re.IGNORECASE),
                    max_lines=140,
                ),
                BlockSpec(
                    name="Categories (excerpt)",
                    start=re.compile(r"^CT/MRI\s+LI-RADS", re.IGNORECASE),
                    max_lines=180,
                ),
                BlockSpec(
                    name="Revised LR-5 criteria (excerpt)",
                    start=re.compile(r"^Revised,\s*simplified\s*criteria\s*for\s*LR-5\s*:", re.IGNORECASE),
                    max_lines=200,
                ),
                BlockSpec(
                    name="Ancillary features (excerpt)",
                    start=re.compile(r"^Step\s+2\.?\s+Optional:\s+Apply\s+Ancillary\s+Features", re.IGNORECASE),
                    max_lines=180,
                ),
                BlockSpec(
                    name="Treatment response categories (excerpt)",
                    start=re.compile(r"^LI-RADS.*Treatment\s+Response\s+Categories", re.IGNORECASE),
                    max_lines=180,
                ),
            ],
        },
        {
            "id": "recist_1_1_and_irecist",
            "title": "RECIST 1.1 (2009) + iRECIST (immunotherapy) — pack",
            "relpaths": [
                "data/recommendations/md_docs/RECISTGuidelines.md",
                "data/recommendations/md_docs/recist_1_1_eortc_2009.md",
                "data/recommendations/md_docs/Manuscript_IRECIST_Lancet-Oncology_Seymour-et-al_revision_FINAL_clean_nov25.md",
                "data/recommendations/md_docs/irecist_lancet_oncology_2017.md",
            ],
            "blocks": [
                BlockSpec(
                    name="RECIST 1.1 — Response criteria (target + non-target lesions) (excerpt)",
                    start=re.compile(r"^4\.3\.", re.IGNORECASE),
                    stop=re.compile(r"^4\.4\.", re.IGNORECASE),
                    max_lines=320,
                ),
                BlockSpec(
                    name="iRECIST — iUPD/iCPD (excerpt)",
                    start=re.compile(r"^iRECIST\s+defines\s+iUPD", re.IGNORECASE),
                    stop=re.compile(r"^Continued\s+treatment\s+after\s+iUPD", re.IGNORECASE),
                    max_lines=260,
                    first_only=True,
                ),
            ],
        },
        {
            "id": "lung_rads_v1_1",
            "title": "Lung-RADS v1.1 — Assessment Categories — pack",
            "relpaths": [
                "data/recommendations/md_docs/Lung-RADS-v1-1-Assessment-Categories.md",
                "data/recommendations/md_docs/LungRADS-v1-Assessment-Categories.md",
            ],
            "blocks": [
                BlockSpec(
                    name="Assessment categories table (excerpt)",
                    start=re.compile(r"^Lung.?RADS", re.IGNORECASE),
                    max_lines=260,
                )
            ],
        },
        {
            "id": "pi_rads_v2_1",
            "title": "PI-RADS v2.1 (prostate MRI) — pack",
            "relpaths": [
                "data/recommendations/md_docs/PIRADS-2019.md",
                "data/recommendations/md_docs/pi_rads_v2_1.md",
                "data/recommendations/md_docs/PIRADS-Report-Template.md",
            ],
            "blocks": [
                BlockSpec(
                    name="Assessment Without Adequate DWI (table excerpt)",
                    start=re.compile(r"^Assessment Without Adequate DWI", re.IGNORECASE),
                    stop=re.compile(r"^Assessment Without Adequate DCE", re.IGNORECASE),
                    max_lines=220,
                ),
                BlockSpec(
                    name="Assessment Without Adequate DCE (table excerpt)",
                    start=re.compile(r"^Assessment Without Adequate DCE", re.IGNORECASE),
                    max_lines=160,
                ),
                BlockSpec(
                    name="Dominant sequence rules (PZ vs TZ) (excerpt)",
                    start=re.compile(r"^For the PZ, DWI is the primary determining sequence", re.IGNORECASE),
                    max_lines=80,
                ),
                BlockSpec(
                    name="Report template skeleton (excerpt)",
                    start=re.compile(r"^INDICATION:", re.IGNORECASE),
                    stop=re.compile(r"^Here is an example", re.IGNORECASE),
                    max_lines=260,
                ),
                BlockSpec(
                    name="Assessment categories definitions (excerpt)",
                    start=re.compile(r"^PI.?RADS.*Assessment Categories", re.IGNORECASE),
                    max_lines=60,
                ),
            ],
        },
        {
            "id": "o_rads_mri",
            "title": "O-RADS MRI (adnexal risk stratification) — pack",
            "relpaths": [
                "data/recommendations/md_docs/O-RADS-MRI-Risk-Score-Assessment.md",
                "data/recommendations/md_docs/O-RADS-MRI-Assessment-Categories-Algorithm.md",
            ],
            "blocks": [
                BlockSpec(
                    name="Risk stratification & management table (excerpt)",
                    start=re.compile(r"^O-RADS.*Risk Stratification", re.IGNORECASE),
                    max_lines=260,
                ),
                BlockSpec(
                    name="Assessment categories algorithm (excerpt)",
                    start=re.compile(r"^O-RADS.*Assessment Categories", re.IGNORECASE),
                    max_lines=320,
                ),
            ],
        },
    ]

    # Recreate output dir.
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    index_lines: list[str] = []
    index_lines.append("# System Packs Index")
    index_lines.append("")
    index_lines.append(f"- Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    index_lines.append(f"- Source dir: `{src_dir}`")
    index_lines.append("")
    index_lines.append("## Packs")

    for sys in systems:
        sys_id = sys["id"]
        relpaths = _dedupe_paths(report, sys["relpaths"])
        sources = [_src_info(report, rp) for rp in relpaths]

        blocks_by_source: list[tuple[dict, list[ExtractedBlock]]] = []
        extra_numeric_by_source: list[tuple[dict, list[tuple[int, str]]]] = []

        for src in sources:
            rp = src["relpath"]
            abs_path = ROOT / rp
            if not abs_path.exists():
                blocks_by_source.append((src, []))
                extra_numeric_by_source.append((src, []))
                continue
            lines = _read_lines(abs_path)
            blocks = _extract_blocks(lines, sys["blocks"])

            # Extra numeric lines: sample the first 40 unique lines (after normalization).
            seen = set()
            sample: list[tuple[int, str]] = []
            for ln, text in _iter_numeric_lines(lines):
                if text in seen:
                    continue
                seen.add(text)
                sample.append((ln, text))
                if len(sample) >= 40:
                    break

            blocks_by_source.append((src, blocks))
            extra_numeric_by_source.append((src, sample))

        out_path = out_dir / f"{sys_id}.md"
        _write_pack(
            out_path,
            title=sys["title"],
            system_id=sys_id,
            sources=sources,
            blocks_by_source=blocks_by_source,
            extra_numeric_by_source=extra_numeric_by_source,
        )

        index_lines.append(f"- `{out_path.relative_to(out_dir)}`")
        for s in sources:
            index_lines.append(f"  - source: `{s['relpath']}`")

    (out_dir / "index.md").write_text("\n".join(index_lines).rstrip() + "\n", encoding="utf-8")
    _zip_dir(out_dir, zip_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
