#!/usr/bin/env python3
"""
Doc-by-doc metrics + batch summaries for data/recommendations/md_docs.

Default (compact):
  - exports/md_docs_metrics_report.md
  - exports/md_docs_metrics_report.json

Full mode (also generates a ~20k-line deliverable):
  - exports/md_docs_metrics_report_20k.md
  - exports/md_docs_metrics_report_20k.json
  - exports/md_docs_metrics_report_20k.zip

This uses the extraction heuristics from scripts/extract_document.py (no LLM summarization).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import time
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Local import (scripts/ directory).
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_document import process_file  # type: ignore


DEFAULT_MD_DIR = Path("data/recommendations/md_docs")
DEFAULT_OUT_MD = Path("exports/md_docs_metrics_report.md")
DEFAULT_OUT_JSON = Path("exports/md_docs_metrics_report.json")
DEFAULT_TARGET_LINES = 20000

DEFAULT_EXCLUDE_FILENAMES: set[str] = set()


def _read_bytes(p: Path) -> bytes:
    return p.read_bytes()


def _safe_int(x: Any, default: int = 0) -> int:
    try:
        return int(x)
    except Exception:
        return default


def _is_missing(val: Any) -> bool:
    return val is None or val == "<AUSENTE>" or val == "" or val == []


def _flatten(s: str) -> str:
    return " ".join((s or "").split())


def _short(s: str, n: int) -> str:
    s = _flatten(s or "")
    if len(s) <= n:
        return s
    return s[: max(0, n - 3)].rstrip() + "..."


def _md_escape_pipe(s: str) -> str:
    return (s or "").replace("|", "\\|")


def _fmt_list(xs: List[str], limit: int = 3) -> str:
    if not xs:
        return "-"
    ys = xs[:limit]
    out = ", ".join(ys)
    if len(xs) > limit:
        out += f" (+{len(xs) - limit})"
    return out


def _dedupe_preserve_order(xs: List[str]) -> List[str]:
    seen: set[str] = set()
    out: List[str] = []
    for x in xs:
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def _missing_meta_fields(meta: Dict[str, Any]) -> List[str]:
    missing: List[str] = []
    for k in ("title", "authors", "year", "doi_pmid", "society", "version"):
        if _is_missing(meta.get(k, "<AUSENTE>")):
            missing.append(k)
    return missing


def _unique_criteria_systems(criteria_scores: List[Dict[str, Any]]) -> List[str]:
    systems: List[str] = []
    for it in criteria_scores or []:
        sysname = (it or {}).get("system")
        if isinstance(sysname, str) and sysname:
            systems.append(sysname)
    return _dedupe_preserve_order(systems)


def _fmt_line_item(line: int, left: str, right: str, max_right: int = 180) -> str:
    l = _flatten(left)
    r = _short(_flatten(right), max_right) if right else ""
    if r:
        return f"L{line} | {l} | {r}"
    return f"L{line} | {l}"


def _fmt_ctx_item(line: int, ctx: str, max_ctx: int = 240) -> str:
    return f"L{line} | {_short(_flatten(ctx), max_ctx)}"


ACTIONABLE_RE = re.compile(
    r"("
    r"recommendation|recomendac[aã]o|follow[- ]?up|surveillance|"
    r"should\\b|must\\b|avoid\\b|contraind|"
    r"algorithm|algoritmo|criteria|crit[eé]rio|classification|classifica[cç][aã]o|"
    r"cut[- ]?off|cutoff|threshold|limiar|"
    r"table\\b|tabela\\b"
    r")",
    re.IGNORECASE,
)
RECOMMEND_RE = re.compile(r"(recommendation|recomendac[aã]o|follow[- ]?up|surveillance)", re.IGNORECASE)
CRITICAL_RE = re.compile(r"(must\\b|should\\b|avoid\\b|contraind)", re.IGNORECASE)
NUM_RE = re.compile(r"\\d")
UNIT_RE = re.compile(r"(\\bmm\\b|\\bcm\\b|\\bhu\\b|\\b%\\b|\\bkpa\\b|\\bml\\b|\\bng/ml\\b)", re.IGNORECASE)
INEQ_RE = re.compile(r"(<=|>=|<|>)")
NUMERIC_LINE_RE = re.compile(r"\\b\\d[\\d.,]*\\s*(mm|cm|hu|%|kpa|ml|min|mmhg)\\b", re.IGNORECASE)


def _build_actionable_lines(lines: List[str], per_doc_cap: int = 120) -> List[str]:
    """
    Extract "actionable" raw lines from the original markdown. These are used as an
    additional budget-fill appendix so the ~20k deliverable contains searchable, high-signal
    content instead of meaningless padding.
    """
    scored: List[Tuple[int, int, str]] = []
    seen: set[str] = set()
    for i, ln in enumerate(lines, 1):
        s = _flatten(ln)
        if len(s) < 20:
            continue
        if not ACTIONABLE_RE.search(s):
            continue

        # Deduplicate using the full (flattened) line. Using a truncated key can
        # collapse distinct long lines that share a prefix, reducing usefulness.
        if s in seen:
            continue
        seen.add(s)

        s_short = _short(s, 220)

        score = 0
        if RECOMMEND_RE.search(s):
            score += 4
        if CRITICAL_RE.search(s):
            score += 3
        if INEQ_RE.search(s):
            score += 2
        if UNIT_RE.search(s):
            score += 2
        if NUM_RE.search(s):
            score += 1

        scored.append((score, i, s_short))

    scored.sort(key=lambda t: (-t[0], t[1]))
    out: List[str] = []
    for _, line_no, text in scored[:per_doc_cap]:
        out.append(f"L{line_no} | {text}")
    return out


def _build_numeric_lines(lines: List[str], per_doc_cap: int = 300) -> List[str]:
    """
    Extract lines that likely contain hard thresholds/measurements (number + unit).
    Used as a secondary budget-fill appendix.
    """
    out: List[Tuple[int, int, str]] = []
    seen: set[str] = set()
    for i, ln in enumerate(lines, 1):
        s = _flatten(ln)
        # Allow short value lines like "8 mm", common in converted tables.
        if len(s) < 6:
            continue
        if not NUMERIC_LINE_RE.search(s) and not INEQ_RE.search(s):
            continue
        if s in seen:
            continue
        seen.add(s)

        score = 0
        if INEQ_RE.search(s):
            score += 3
        if NUMERIC_LINE_RE.search(s):
            score += 2
        # More digits often means more "threshold-like" content.
        score += min(3, len(NUM_RE.findall(s)))

        out.append((score, i, _short(s, 220)))

    out.sort(key=lambda t: (-t[0], t[1]))
    return [f"L{line_no} | {text}" for _, line_no, text in out[:per_doc_cap]]


@dataclass(frozen=True)
class DocMetrics:
    # Minimal/compact doc view (written to the compact JSON).
    filename: str
    relpath: str
    line_count: int
    byte_count: int
    content_hash: str

    title: str
    year: str
    doi_pmid: str
    society: str
    doc_type: str
    language: str
    themes: List[str]

    tables: int
    thresholds: int
    criteria_scores: int
    algorithms: int
    formulas: int
    notes_pitfalls: int
    content_blocks: int

    missing_fields: List[str]
    criteria_systems: List[str]
    threshold_examples: List[str]
    algorithm_examples: List[str]

    error: Optional[str] = None


@dataclass
class DocFull:
    # Full doc view (written to the 20k JSON).
    relpath: str
    filename: str
    line_count: int
    byte_count: int
    content_hash: str

    title: str
    authors: str
    year: str
    doi_pmid: str
    society: str
    version: str
    doc_type: str
    language: str
    themes: List[str]

    tables: int
    thresholds: int
    criteria_scores: int
    algorithms: int
    formulas: int
    notes_pitfalls: int
    content_blocks: int

    missing_fields: List[str]
    criteria_systems: List[str]

    # One-line formatted entries (no path).
    fmt_tables: List[str]
    fmt_thresholds: List[str]
    fmt_criteria: List[str]
    fmt_algorithms: List[str]
    fmt_formulas: List[str]
    fmt_notes: List[str]
    fmt_actionable_lines: List[str]
    fmt_numeric_lines: List[str]

    scores: Dict[str, float]
    flags: List[str]

    error: Optional[str] = None


def compute_doc(md_path: Path, repo_root: Path, include_full: bool) -> Tuple[DocMetrics, Optional[DocFull]]:
    rel = str(md_path.relative_to(repo_root))
    raw = _read_bytes(md_path)
    byte_count = len(raw)
    # Keep consistent with extract_document.py's `split("\n")` behavior.
    line_count = raw.decode("utf-8", errors="replace").count("\n") + 1
    raw_lines = raw.decode("utf-8", errors="replace").split("\n")

    ext = process_file(str(md_path))
    meta = ext.get("metadata", {}) or {}
    stats = ext.get("stats", {}) or {}

    def get_meta(key: str) -> Any:
        return meta.get(key, "<AUSENTE>")

    missing = _missing_meta_fields(meta)
    systems = _unique_criteria_systems(ext.get("criteria_scores", []) or [])

    # Small samples for compact QA.
    th_examples: List[str] = []
    for it in (ext.get("thresholds", []) or [])[:3]:
        match = (it or {}).get("match")
        ctx = (it or {}).get("context", "")
        if isinstance(match, str) and match:
            th_examples.append(_short(match, 80) + (f" | {_short(str(ctx), 80)}" if ctx else ""))

    algo_examples: List[str] = []
    for it in (ext.get("algorithms", []) or [])[:2]:
        ctx = (it or {}).get("context", "")
        if isinstance(ctx, str) and ctx.strip():
            algo_examples.append(_short(ctx, 160))

    compact = DocMetrics(
        filename=str(get_meta("filename")) if isinstance(get_meta("filename"), str) else md_path.name,
        relpath=rel,
        line_count=line_count,
        byte_count=byte_count,
        content_hash=str(stats.get("content_hash", "")),
        title=str(get_meta("title")),
        year=str(get_meta("year")),
        doi_pmid=str(get_meta("doi_pmid")),
        society=str(get_meta("society")),
        doc_type=str(get_meta("type")),
        language=str(get_meta("language")),
        themes=list(get_meta("themes") or []),
        tables=_safe_int(len(ext.get("tables", []) or [])),
        thresholds=_safe_int(len(ext.get("thresholds", []) or [])),
        criteria_scores=_safe_int(len(ext.get("criteria_scores", []) or [])),
        algorithms=_safe_int(len(ext.get("algorithms", []) or [])),
        formulas=_safe_int(len(ext.get("formulas", []) or [])),
        notes_pitfalls=_safe_int(len(ext.get("notes_pitfalls", []) or [])),
        content_blocks=_safe_int(len(ext.get("content_blocks", []) or [])),
        missing_fields=missing,
        criteria_systems=systems,
        threshold_examples=th_examples,
        algorithm_examples=algo_examples,
        error=None,
    )

    if not include_full:
        return compact, None

    # Full formatting for 20k report.
    fmt_tables: List[str] = []
    for t in (ext.get("tables", []) or []):
        title = str((t or {}).get("title", "Table"))
        ls = _safe_int((t or {}).get("line_start", 0))
        le = _safe_int((t or {}).get("line_end", 0))
        rows = _safe_int((t or {}).get("rows", 0))
        fmt_tables.append(f"L{ls}-{le} | {_short(title, 140)} | rows={rows}")

    fmt_thresholds: List[str] = []
    for th in (ext.get("thresholds", []) or []):
        line_no = _safe_int((th or {}).get("line", 0))
        match = str((th or {}).get("match", ""))
        ctx = str((th or {}).get("context", ""))
        if match:
            fmt_thresholds.append(_fmt_line_item(line_no, match, ctx, max_right=180))

    fmt_criteria: List[str] = []
    for cr in (ext.get("criteria_scores", []) or []):
        line_no = _safe_int((cr or {}).get("line", 0))
        system = str((cr or {}).get("system", ""))
        ctx = str((cr or {}).get("context", ""))
        if system:
            fmt_criteria.append(_fmt_line_item(line_no, system, ctx, max_right=180))

    fmt_algorithms: List[str] = []
    for al in (ext.get("algorithms", []) or []):
        line_no = _safe_int((al or {}).get("line", 0))
        ctx = str((al or {}).get("context", ""))
        if ctx.strip():
            fmt_algorithms.append(_fmt_ctx_item(line_no, ctx, max_ctx=240))

    fmt_formulas: List[str] = []
    for fo in (ext.get("formulas", []) or []):
        line_no = _safe_int((fo or {}).get("line", 0))
        ctx = str((fo or {}).get("context", ""))
        if ctx.strip():
            fmt_formulas.append(_fmt_ctx_item(line_no, ctx, max_ctx=240))

    fmt_notes: List[str] = []
    for no in (ext.get("notes_pitfalls", []) or []):
        line_no = _safe_int((no or {}).get("line", 0))
        ctx = str((no or {}).get("context", ""))
        if ctx.strip():
            fmt_notes.append(_fmt_ctx_item(line_no, ctx, max_ctx=240))

    total_extracted = (
        compact.tables
        + compact.thresholds
        + compact.criteria_scores
        + compact.algorithms
        + compact.formulas
        + compact.notes_pitfalls
        + compact.content_blocks
    )
    meta_score = (6 - len(missing)) / 6.0
    value_score = (
        compact.tables * 8
        + compact.algorithms * 5
        + compact.criteria_scores * 3
        + compact.thresholds * 2
        + compact.formulas * 2
        + compact.notes_pitfalls * 1
        + compact.content_blocks * 6
    )
    yield_per_1k = (float(total_extracted) / max(1.0, float(line_count))) * 1000.0
    scores = {
        "meta_score": meta_score,
        "value_score": float(value_score),
        "yield_per_1k_lines": yield_per_1k,
        "total_extracted": float(total_extracted),
    }

    # High cap so the 20k deliverable can be filled with useful, searchable content
    # (instead of blank-line padding) when appendices are emitted.
    fmt_actionable = _build_actionable_lines(raw_lines, per_doc_cap=1000)
    fmt_numeric = _build_numeric_lines(raw_lines, per_doc_cap=800)

    full = DocFull(
        relpath=rel,
        filename=compact.filename,
        line_count=line_count,
        byte_count=byte_count,
        content_hash=compact.content_hash,
        title=str(get_meta("title")),
        authors=str(get_meta("authors")),
        year=str(get_meta("year")),
        doi_pmid=str(get_meta("doi_pmid")),
        society=str(get_meta("society")),
        version=str(get_meta("version")),
        doc_type=str(get_meta("type")),
        language=str(get_meta("language")),
        themes=list(get_meta("themes") or []),
        tables=compact.tables,
        thresholds=compact.thresholds,
        criteria_scores=compact.criteria_scores,
        algorithms=compact.algorithms,
        formulas=compact.formulas,
        notes_pitfalls=compact.notes_pitfalls,
        content_blocks=compact.content_blocks,
        missing_fields=missing,
        criteria_systems=systems,
        fmt_tables=fmt_tables,
        fmt_thresholds=fmt_thresholds,
        fmt_criteria=fmt_criteria,
        fmt_algorithms=fmt_algorithms,
        fmt_formulas=fmt_formulas,
        fmt_notes=fmt_notes,
        fmt_actionable_lines=fmt_actionable,
        fmt_numeric_lines=fmt_numeric,
        scores=scores,
        flags=[],
        error=None,
    )

    return compact, full


def _batch(iterable: List[DocMetrics], size: int) -> List[List[DocMetrics]]:
    return [iterable[i : i + size] for i in range(0, len(iterable), size)]


def _render_batch_table(rows: List[DocMetrics]) -> List[str]:
    lines: List[str] = []
    lines.append("| # | File | Year | Society | Type | Themes | Lns | T | Th | Cr | Al | F | N | Miss |")
    lines.append("|---:|------|:----:|---------|------|--------|---:|--:|---:|---:|---:|--:|--:|------|")
    for i, d in enumerate(rows, 1):
        themes = _fmt_list([t for t in d.themes if isinstance(t, str)], limit=3)
        miss = ", ".join(d.missing_fields) if d.missing_fields else "-"
        lines.append(
            "| {i} | `{file}` | {year} | {soc} | {typ} | {themes} | {lns} | {t} | {th} | {cr} | {al} | {f} | {n} | {miss} |".format(
                i=i,
                file=_md_escape_pipe(d.relpath),
                year=_md_escape_pipe(_short(d.year, 6)),
                soc=_md_escape_pipe(_short(d.society, 16)),
                typ=_md_escape_pipe(_short(d.doc_type, 22)),
                themes=_md_escape_pipe(_short(themes, 26)),
                lns=d.line_count,
                t=d.tables,
                th=d.thresholds,
                cr=d.criteria_scores,
                al=d.algorithms,
                f=d.formulas,
                n=d.notes_pitfalls,
                miss=_md_escape_pipe(_short(miss, 26)),
            )
        )
    return lines


def _render_batch_summary(rows: List[DocMetrics]) -> List[str]:
    lines: List[str] = []
    totals = Counter()
    missing = Counter()
    theme = Counter()
    systems = Counter()
    errors = 0

    for d in rows:
        if d.error:
            errors += 1
        totals["tables"] += d.tables
        totals["thresholds"] += d.thresholds
        totals["criteria_scores"] += d.criteria_scores
        totals["algorithms"] += d.algorithms
        totals["formulas"] += d.formulas
        totals["notes_pitfalls"] += d.notes_pitfalls
        totals["content_blocks"] += d.content_blocks
        for f in d.missing_fields:
            missing[f] += 1
        for t in d.themes:
            if isinstance(t, str) and t:
                theme[t] += 1
        for s in d.criteria_systems:
            systems[s] += 1

    lines.append(
        "- Totals: "
        f"T={totals['tables']}, Th={totals['thresholds']}, Cr={totals['criteria_scores']}, "
        f"Al={totals['algorithms']}, F={totals['formulas']}, N={totals['notes_pitfalls']}, "
        f"Blk={totals['content_blocks']}, Errors={errors}."
    )

    if missing:
        top_missing = ", ".join([f"{k}({v})" for k, v in missing.most_common(6)])
        lines.append(f"- Missing metadata (top): {top_missing}.")
    else:
        lines.append("- Missing metadata (top): none.")

    if theme:
        top_themes = ", ".join([f"{k}({v})" for k, v in theme.most_common(6)])
        lines.append(f"- Themes (top): {top_themes}.")

    if systems:
        top_systems = ", ".join([f"{k}({v})" for k, v in systems.most_common(8)])
        lines.append(f"- Criteria systems mentioned (top): {top_systems}.")

    return lines


def render_compact_report(
    docs: List[DocMetrics],
    out_md: Path,
    out_json: Path,
    batch_size: int,
    md_dir: Path,
) -> None:
    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_json.parent.mkdir(parents=True, exist_ok=True)

    out_json.write_text(json.dumps([d.__dict__ for d in docs], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines: List[str] = []
    lines.append("# md_docs Metrics Report")
    lines.append("")
    lines.append(f"- Source dir: `{md_dir}`")
    lines.append(f"- Docs: {len(docs)}")
    lines.append(f"- Batch size: {batch_size}")
    lines.append(f"- JSON: `{out_json}`")
    lines.append("")

    lines.append("## Overall Summary")
    lines.append("")
    lines.extend(_render_batch_summary(docs))
    lines.append("")

    # Duplicates by content_hash
    by_hash: Dict[str, List[DocMetrics]] = defaultdict(list)
    for d in docs:
        if d.content_hash:
            by_hash[d.content_hash].append(d)
    dup_groups = [(h, xs) for h, xs in by_hash.items() if len(xs) >= 2]
    dup_groups.sort(key=lambda t: (-len(t[1]), t[0]))

    lines.append("## Potential Duplicates (by content_hash)")
    lines.append("")
    if not dup_groups:
        lines.append("- None detected.")
    else:
        for h, xs in dup_groups[:30]:
            files = ", ".join(f"`{x.relpath}`" for x in xs[:6])
            more = f" (+{len(xs)-6})" if len(xs) > 6 else ""
            lines.append(f"- `{h}`: {files}{more}")
    lines.append("")

    batches = _batch(docs, batch_size)
    for bi, rows in enumerate(batches, 1):
        start = (bi - 1) * batch_size + 1
        end = start + len(rows) - 1
        lines.append(f"## Batch {bi:02d} (#{start}-{end})")
        lines.append("")
        lines.extend(_render_batch_table(rows))
        lines.append("")
        lines.extend(_render_batch_summary(rows))
        lines.append("")
        lines.append("### Quick QA (samples)")
        lines.append("")
        for d in rows:
            lines.append(f"#### `{d.relpath}`")
            lines.append("")
            if d.error:
                lines.append(f"- ERROR: {d.error}")
                lines.append("")
                continue
            lines.append(f"- Title: {_md_escape_pipe(_short(d.title, 120))}")
            lines.append(
                f"- Year: {d.year} | Society: {_md_escape_pipe(_short(d.society, 40))} | "
                f"Type: {_md_escape_pipe(_short(d.doc_type, 40))} | Lang: {d.language}"
            )
            if d.themes:
                lines.append(f"- Themes: {', '.join(d.themes[:8])}{'...' if len(d.themes) > 8 else ''}")
            if d.criteria_systems:
                lines.append(
                    f"- Criteria systems: {', '.join(d.criteria_systems[:12])}{'...' if len(d.criteria_systems) > 12 else ''}"
                )
            if d.threshold_examples:
                lines.append("- Threshold examples:")
                for ex in d.threshold_examples:
                    lines.append(f"  - {_md_escape_pipe(_short(ex, 180))}")
            if d.algorithm_examples:
                lines.append("- Algorithm examples:")
                for ex in d.algorithm_examples:
                    lines.append(f"  - {_md_escape_pipe(_short(ex, 220))}")
            if d.missing_fields:
                lines.append(f"- Missing metadata: {', '.join(d.missing_fields)}")
            lines.append("")

    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _duplicates_map(docs: List[DocMetrics]) -> Dict[str, List[str]]:
    by_hash: Dict[str, List[str]] = defaultdict(list)
    for d in docs:
        if d.content_hash:
            by_hash[d.content_hash].append(d.relpath)
    return {h: sorted(xs) for h, xs in by_hash.items() if len(xs) >= 2}


def _render_overall_summary_full(docs: List[DocFull]) -> List[str]:
    totals = Counter()
    missing = Counter()
    theme = Counter()
    systems = Counter()

    for d in docs:
        totals["tables"] += d.tables
        totals["thresholds"] += d.thresholds
        totals["criteria_scores"] += d.criteria_scores
        totals["algorithms"] += d.algorithms
        totals["formulas"] += d.formulas
        totals["notes_pitfalls"] += d.notes_pitfalls
        totals["content_blocks"] += d.content_blocks
        for f in d.missing_fields:
            missing[f] += 1
        for t in d.themes:
            if isinstance(t, str) and t:
                theme[t] += 1
        for s in d.criteria_systems:
            systems[s] += 1

    lines: List[str] = []
    lines.append(
        "- Totals: "
        f"T={totals['tables']}, Th={totals['thresholds']}, Cr={totals['criteria_scores']}, "
        f"Al={totals['algorithms']}, F={totals['formulas']}, N={totals['notes_pitfalls']}, "
        f"Blk={totals['content_blocks']}."
    )

    if missing:
        top_missing = ", ".join([f"{k}({v})" for k, v in missing.most_common(10)])
        lines.append(f"- Missing metadata (top): {top_missing}.")
    if theme:
        top_themes = ", ".join([f"{k}({v})" for k, v in theme.most_common(10)])
        lines.append(f"- Themes (top): {top_themes}.")
    if systems:
        top_systems = ", ".join([f"{k}({v})" for k, v in systems.most_common(12)])
        lines.append(f"- Criteria systems mentioned (top): {top_systems}.")
    return lines


def _render_rankings(docs: List[DocFull]) -> List[str]:
    lines: List[str] = []
    lines.append("## Rankings")
    lines.append("")

    def add_ranking(title: str, key: str) -> None:
        lines.append(f"### {title}")
        lines.append("")
        ranked = sorted(docs, key=lambda d: (-getattr(d, key), d.relpath))
        for d in ranked[:15]:
            cnt = getattr(d, key)
            lines.append(f"- {cnt:>4} | `{d.relpath}` | {_short(d.title, 100)}")
        lines.append("")

    add_ranking("Top 15 by algorithms", "algorithms")
    add_ranking("Top 15 by thresholds", "thresholds")
    add_ranking("Top 15 by criteria_scores", "criteria_scores")
    add_ranking("Top 15 by notes_pitfalls", "notes_pitfalls")

    lines.append("### Top 15 by meta completeness")
    lines.append("")
    ranked_meta = sorted(docs, key=lambda d: (len(d.missing_fields), d.relpath))
    for d in ranked_meta[:15]:
        lines.append(f"- miss={len(d.missing_fields)} | `{d.relpath}` | {_short(d.title, 100)}")
    lines.append("")
    return lines


def _write_zip(zip_path: Path, files: List[Path]) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            zf.write(f, arcname=f.name)


def render_report_20k(
    docs_compact: List[DocMetrics],
    docs_full: List[DocFull],
    out_md_20k: Path,
    out_json_20k: Path,
    batch_size: int,
    target_lines: int,
    md_dir: Path,
) -> None:
    out_md_20k.parent.mkdir(parents=True, exist_ok=True)
    out_json_20k.parent.mkdir(parents=True, exist_ok=True)

    dup_map = _duplicates_map(docs_compact)

    for d in docs_full:
        flags: List[str] = []
        if d.content_hash and d.content_hash in dup_map:
            flags.append("DUPLICATE_CLUSTER")
        total_extracted = int(d.scores.get("total_extracted", 0.0))
        if d.line_count > 2000 and total_extracted < 3:
            flags.append("LOW_YIELD")
        if any(x in d.missing_fields for x in ("year", "doi_pmid", "society")):
            flags.append("MISSING_CORE_META")
        d.flags = flags

    payload = {
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "source_dir": str(md_dir),
        "docs": [d.__dict__ for d in docs_full],
        "duplicates": dup_map,
        "target_lines": target_lines,
        "batch_size": batch_size,
    }
    out_json_20k.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines: List[str] = []
    lines.append("# md_docs Metrics Report (20k)")
    lines.append("")
    lines.append(f"- Source dir: `{md_dir}`")
    lines.append(f"- Docs: {len(docs_full)}")
    lines.append(f"- Batch size: {batch_size}")
    lines.append(f"- Target lines: {target_lines}")
    lines.append(f"- JSON: `{out_json_20k}`")
    lines.append("")

    lines.append("## Overall Summary")
    lines.append("")
    lines.extend(_render_overall_summary_full(docs_full))
    lines.append("")

    lines.append("## Duplicates (by content_hash)")
    lines.append("")
    if not dup_map:
        lines.append("- None detected.")
    else:
        for h, xs in sorted(dup_map.items(), key=lambda t: (-len(t[1]), t[0]))[:60]:
            canonical = xs[0]
            others = xs[1:]
            others_str = ", ".join(f"`{p}`" for p in others[:8])
            more = f" (+{len(others)-8})" if len(others) > 8 else ""
            lines.append(f"- `{h}` (n={len(xs)}) canonical=`{canonical}` dupes={others_str}{more}")
    lines.append("")

    lines.extend(_render_rankings(docs_full))

    LIMITS = {
        "tables": 2,
        "thresholds": 8,
        "criteria": 8,
        "algorithms": 4,
        "formulas": 2,
        "notes": 6,
        # Not in the original plan, but used to fill to 20k with still-useful lines.
        "actionable": 5,
    }

    batches_compact = _batch(docs_compact, batch_size)
    batches_full = [docs_full[i : i + batch_size] for i in range(0, len(docs_full), batch_size)]
    assert len(batches_compact) == len(batches_full)

    for bi, (rows_c, rows_f) in enumerate(zip(batches_compact, batches_full), 1):
        start = (bi - 1) * batch_size + 1
        end = start + len(rows_c) - 1
        lines.append(f"## Batch {bi:02d} (#{start}-{end})")
        lines.append("")
        lines.extend(_render_batch_table(rows_c))
        lines.append("")
        lines.extend(_render_batch_summary(rows_c))
        lines.append("")
        lines.append("### Mini-dossies")
        lines.append("")

        for d in rows_f:
            lines.append(f"#### `{d.relpath}`")
            lines.append("")
            if d.error:
                lines.append(f"- ERROR: {d.error}")
                lines.append("")
                continue

            lines.append(
                f"- Path: `{d.relpath}` | Lines: {d.line_count} | Bytes: {d.byte_count} | content_hash: `{d.content_hash}`"
            )
            lines.append(f"- Title: {_short(d.title, 160)}")
            lines.append(
                f"- Year: {d.year} | Society: {_short(d.society, 60)} | Type: {_short(d.doc_type, 60)} | Lang: {d.language}"
            )
            lines.append(f"- Themes: {_fmt_list([t for t in d.themes if isinstance(t, str)], limit=8)}")
            lines.append(f"- Missing metadata: {', '.join(d.missing_fields) if d.missing_fields else '-'}")

            ms = d.scores.get("meta_score", 0.0)
            vs = d.scores.get("value_score", 0.0)
            yp = d.scores.get("yield_per_1k_lines", 0.0)
            te = d.scores.get("total_extracted", 0.0)
            lines.append(
                f"- Scores: meta_score={ms:.2f} | value_score={vs:.0f} | yield_per_1k_lines={yp:.2f} | total_extracted={int(te)}"
            )
            lines.append(f"- Flags: {', '.join(d.flags) if d.flags else '-'}")
            if d.criteria_systems:
                lines.append(
                    f"- Criteria systems: {', '.join(d.criteria_systems[:16])}{'...' if len(d.criteria_systems) > 16 else ''}"
                )

            def add_sample_block(label: str, items: List[str], limit: int) -> None:
                if not items:
                    return
                lines.append(f"- {label} (sample):")
                for it in items[:limit]:
                    lines.append(f"  - {it}")

            add_sample_block("Tables", d.fmt_tables, LIMITS["tables"])
            add_sample_block("Thresholds", d.fmt_thresholds, LIMITS["thresholds"])
            add_sample_block("Criteria/Scores", d.fmt_criteria, LIMITS["criteria"])
            add_sample_block("Algorithms", d.fmt_algorithms, LIMITS["algorithms"])
            add_sample_block("Formulas", d.fmt_formulas, LIMITS["formulas"])
            add_sample_block("Notes/Pitfalls", d.fmt_notes, LIMITS["notes"])
            add_sample_block("Actionable lines", d.fmt_actionable_lines, LIMITS["actionable"])

            lines.append("")

    # Appendices (budget fill)
    lines.append("## Appendices (Budget Fill)")
    lines.append("")
    lines.append(
        "Appendices dump remaining extracted items (beyond the per-doc sample limits) until the line target is reached."
    )
    lines.append("")

    # Remaining lists (path-prefixed), respecting the per-doc sample limits.
    def rem(pref: str, items: List[str], used: int) -> List[str]:
        return [f"- `{pref}` {x}" for x in items[used:]]

    remaining_algorithms: List[str] = []
    remaining_criteria: List[str] = []
    remaining_thresholds: List[str] = []
    remaining_formulas: List[str] = []
    remaining_notes: List[str] = []
    remaining_tables: List[str] = []
    remaining_actionable: List[str] = []
    remaining_numeric: List[str] = []

    for d in docs_full:
        remaining_algorithms.extend(rem(d.relpath, d.fmt_algorithms, LIMITS["algorithms"]))
        remaining_criteria.extend(rem(d.relpath, d.fmt_criteria, LIMITS["criteria"]))
        remaining_thresholds.extend(rem(d.relpath, d.fmt_thresholds, LIMITS["thresholds"]))
        remaining_formulas.extend(rem(d.relpath, d.fmt_formulas, LIMITS["formulas"]))
        remaining_notes.extend(rem(d.relpath, d.fmt_notes, LIMITS["notes"]))
        remaining_tables.extend(rem(d.relpath, d.fmt_tables, LIMITS["tables"]))
        remaining_actionable.extend(rem(d.relpath, d.fmt_actionable_lines, LIMITS["actionable"]))
        # Numeric lines aren't shown in the per-doc sample blocks; keep them for budget fill.
        remaining_numeric.extend(rem(d.relpath, d.fmt_numeric_lines, 0))

    def append_items(title: str, items: List[str], target: int) -> None:
        nonlocal lines
        if len(lines) >= target:
            return
        lines.append(f"### {title}")
        lines.append("")
        for it in items:
            if len(lines) >= target:
                break
            lines.append(it)
        lines.append("")

    # Leave room for footer/padding (10 lines).
    soft_target = max(0, target_lines - 10)

    append_items("Appendix A: Algorithms (remaining)", remaining_algorithms, soft_target)
    append_items("Appendix B: Criteria/Scores (remaining)", remaining_criteria, soft_target)
    append_items("Appendix C: Thresholds (remaining)", remaining_thresholds, soft_target)
    append_items("Appendix D: Formulas (remaining)", remaining_formulas, soft_target)
    append_items("Appendix E: Notes/Pitfalls (remaining)", remaining_notes, soft_target)
    append_items("Appendix F: Tables (remaining)", remaining_tables, soft_target)

    # If still short, fill with raw actionable lines.
    if len(lines) < soft_target:
        append_items("Appendix G: Actionable Lines (regex hits)", remaining_actionable, soft_target)

    # If still short, fill with numeric/unit lines (hard thresholds and measurements).
    if len(lines) < soft_target:
        append_items("Appendix H: Numeric Lines (units/inequalities)", remaining_numeric, soft_target)

    # Hard cap + exact line target.
    if len(lines) > target_lines:
        lines = lines[: target_lines - 2] + ["## TRUNCATED (line cap reached)", ""]
    if len(lines) < target_lines:
        lines.append("## End Of Report")
        lines.append(f"(Padding with blank lines to reach {target_lines} total lines.)")
        while len(lines) < target_lines:
            lines.append("")

    out_md_20k.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--md-dir", default=str(DEFAULT_MD_DIR), help="Directory containing .md docs")
    ap.add_argument("--out-md", default=str(DEFAULT_OUT_MD), help="Output markdown report")
    ap.add_argument("--out-json", default=str(DEFAULT_OUT_JSON), help="Output JSON report")
    ap.add_argument("--batch-size", type=int, default=10, help="Docs per batch")
    ap.add_argument(
        "--mode",
        choices=["compact", "full20k"],
        default="compact",
        help="compact = current report; full20k = also generate a ~20k-line report",
    )
    ap.add_argument(
        "--target-lines",
        type=int,
        default=0,
        help="If >0, generate a second report capped/padded to exactly this many lines (defaults to 20000 in full20k mode).",
    )
    ap.add_argument("--limit", type=int, default=0, help="Process only first N docs (0 = all)")
    ap.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Exclude filename (can be repeated). Matches basename only.",
    )
    args = ap.parse_args()

    repo_root = Path(".").resolve()
    md_dir = Path(args.md_dir).resolve()
    out_md = Path(args.out_md).resolve()
    out_json = Path(args.out_json).resolve()

    if not md_dir.exists():
        raise SystemExit(f"md-dir not found: {md_dir}")

    exclude = DEFAULT_EXCLUDE_FILENAMES | set(args.exclude)
    md_files = sorted([p for p in md_dir.glob("*.md") if p.is_file()], key=lambda p: p.name.lower())
    md_files = [p for p in md_files if p.name not in exclude]
    if args.limit and args.limit > 0:
        md_files = md_files[: args.limit]

    needs_full = args.mode == "full20k" or (args.target_lines and args.target_lines > 0)
    target_lines = int(args.target_lines or 0)
    if args.mode == "full20k" and target_lines <= 0:
        target_lines = DEFAULT_TARGET_LINES

    t0 = time.time()
    docs_compact: List[DocMetrics] = []
    docs_full: List[DocFull] = []

    for i, p in enumerate(md_files, 1):
        try:
            d, full = compute_doc(p, repo_root=repo_root, include_full=needs_full)
        except Exception as e:
            d = DocMetrics(
                filename=p.name,
                relpath=str(p.relative_to(repo_root)),
                line_count=0,
                byte_count=p.stat().st_size,
                content_hash="",
                title="<ERROR>",
                year="<ERROR>",
                doi_pmid="<ERROR>",
                society="<ERROR>",
                doc_type="<ERROR>",
                language="<ERROR>",
                themes=[],
                tables=0,
                thresholds=0,
                criteria_scores=0,
                algorithms=0,
                formulas=0,
                notes_pitfalls=0,
                content_blocks=0,
                missing_fields=[],
                criteria_systems=[],
                threshold_examples=[],
                algorithm_examples=[],
                error=str(e),
            )
            full = None

        docs_compact.append(d)
        if needs_full:
            if full is None:
                docs_full.append(
                    DocFull(
                        relpath=d.relpath,
                        filename=d.filename,
                        line_count=d.line_count,
                        byte_count=d.byte_count,
                        content_hash=d.content_hash,
                        title=d.title,
                        authors="<ERROR>",
                        year=d.year,
                        doi_pmid=d.doi_pmid,
                        society=d.society,
                        version="<ERROR>",
                        doc_type=d.doc_type,
                        language=d.language,
                        themes=d.themes,
                        tables=d.tables,
                        thresholds=d.thresholds,
                        criteria_scores=d.criteria_scores,
                        algorithms=d.algorithms,
                        formulas=d.formulas,
                        notes_pitfalls=d.notes_pitfalls,
                        content_blocks=d.content_blocks,
                        missing_fields=[],
                        criteria_systems=[],
                        fmt_tables=[],
                        fmt_thresholds=[],
                        fmt_criteria=[],
                        fmt_algorithms=[],
                        fmt_formulas=[],
                        fmt_notes=[],
                        fmt_actionable_lines=[],
                        fmt_numeric_lines=[],
                        scores={
                            "meta_score": 0.0,
                            "value_score": 0.0,
                            "yield_per_1k_lines": 0.0,
                            "total_extracted": 0.0,
                        },
                        flags=[],
                        error=d.error,
                    )
                )
            else:
                docs_full.append(full)

        if i % 10 == 0 or i == len(md_files):
            elapsed = time.time() - t0
            print(f"[{i}/{len(md_files)}] processed (elapsed {elapsed:.1f}s)")

    render_compact_report(
        docs=docs_compact,
        out_md=out_md,
        out_json=out_json,
        batch_size=args.batch_size,
        md_dir=md_dir,
    )
    print(f"Wrote report: {out_md}")
    print(f"Wrote JSON:   {out_json}")

    if needs_full:
        out_md_20k = out_md.with_name(out_md.stem + "_20k" + out_md.suffix)
        out_json_20k = out_json.with_name(out_json.stem + "_20k" + out_json.suffix)
        render_report_20k(
            docs_compact=docs_compact,
            docs_full=docs_full,
            out_md_20k=out_md_20k,
            out_json_20k=out_json_20k,
            batch_size=args.batch_size,
            target_lines=target_lines,
            md_dir=md_dir,
        )
        zip_path = out_md_20k.with_suffix(".zip")
        _write_zip(zip_path, [out_md_20k, out_json_20k])
        print(f"Wrote 20k report: {out_md_20k}")
        print(f"Wrote 20k JSON:   {out_json_20k}")
        print(f"Wrote zip:        {zip_path}")


if __name__ == "__main__":
    main()
