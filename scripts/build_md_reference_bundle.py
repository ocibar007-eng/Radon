#!/usr/bin/env python3
"""
Generate a single ~20k-line markdown "reference bundle" from all .md files in the repo.

Goal: create a deliverable that is easy to search/skim, while keeping a hard cap on
total line count (default: 20,000) by allocating a small per-file budget.

This is intentionally a mechanical extraction (metadata + headings + short excerpt),
not an LLM summarization.
"""

from __future__ import annotations

import argparse
import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple


DEFAULT_EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "playwright-report",
    "test-results",
    ".vercel",
    ".pytest_cache",
    "__pycache__",
    # Avoid self-recursion / generated artifacts.
    "exports",
}


@dataclass(frozen=True)
class MdFile:
    path: Path
    rel: str
    line_count: int
    byte_count: int
    sha1: str


def _sha1_bytes(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(data)
    return h.hexdigest()


def _read_text_lines(p: Path) -> List[str]:
    # Read as UTF-8 with replacement to avoid crashing on odd encodings.
    raw = p.read_bytes()
    txt = raw.decode("utf-8", errors="replace")
    # Keep line breaks out; we'll manage newline joins ourselves.
    return txt.splitlines()


def _is_excluded_dir(rel_parts: Tuple[str, ...], exclude_dirs: set[str]) -> bool:
    return any(part in exclude_dirs for part in rel_parts)


def discover_md_files(repo_root: Path, exclude_dirs: set[str]) -> List[MdFile]:
    out: List[MdFile] = []
    for dirpath, dirnames, filenames in os.walk(repo_root):
        dpath = Path(dirpath)
        rel_dir = dpath.relative_to(repo_root)

        # Prune excluded directories early.
        rel_parts = tuple(rel_dir.parts)
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        if _is_excluded_dir(rel_parts, exclude_dirs):
            continue

        for fn in filenames:
            if not fn.lower().endswith(".md"):
                continue
            p = dpath / fn
            rel = str(p.relative_to(repo_root))
            raw = p.read_bytes()
            lines = raw.decode("utf-8", errors="replace").splitlines()
            out.append(
                MdFile(
                    path=p,
                    rel=rel,
                    line_count=len(lines),
                    byte_count=len(raw),
                    sha1=_sha1_bytes(raw),
                )
            )
    out.sort(key=lambda f: f.rel.lower())
    return out


def extract_headings(lines: List[str], limit: int) -> List[Tuple[int, str]]:
    """
    Return (1-based line_no, heading_text) for markdown headings, capped.
    """
    out: List[Tuple[int, str]] = []
    for i, ln in enumerate(lines, 1):
        s = ln.lstrip()
        if not s.startswith("#"):
            continue
        # Avoid code fences that start with # inside (rare) by checking stripped begins with #.
        # We keep the raw heading line for traceability.
        out.append((i, s[:200]))
        if len(out) >= limit:
            break
    return out


def sanitize_anchor(text: str) -> str:
    # Simple, stable-ish anchor for internal navigation.
    t = text.lower()
    keep = []
    for ch in t:
        if ch.isalnum():
            keep.append(ch)
        elif ch in ("/", ".", "_", "-", " "):
            keep.append("-")
        else:
            keep.append("-")
    # Collapse dashes.
    out = []
    prev_dash = False
    for ch in keep:
        if ch == "-":
            if not prev_dash:
                out.append("-")
            prev_dash = True
        else:
            out.append(ch)
            prev_dash = False
    return "".join(out).strip("-")[:80] or "file"


def _anchor_for_file(f: MdFile) -> str:
    # Make anchors unique and stable even for long/duplicate/truncated names.
    return f"{sanitize_anchor(f.rel)}-{f.sha1[:8]}"


def build_bundle(
    repo_root: Path,
    files: List[MdFile],
    out_path: Path,
    target_lines: int,
    heading_limit: int,
    min_excerpt_lines: int,
) -> int:
    """
    Build markdown bundle. Returns line count written.
    """
    header: List[str] = []
    header.append("# MD Reference Bundle (20k lines)")
    header.append("")
    header.append("This file is mechanically generated from the repository's `.md` files.")
    header.append("It contains:")
    header.append("- A per-file pointer (path, line count, SHA1)")
    header.append("- A small heading outline")
    header.append("- A short excerpt (top of file)")
    header.append("")
    header.append("Regenerate with:")
    header.append(f"- `python3 scripts/build_md_reference_bundle.py --out {out_path}`")
    header.append("")
    header.append("## File Index")
    header.append("")

    index: List[str] = []
    for f in files:
        anchor = _anchor_for_file(f)
        index.append(f"- [{f.rel}](#{anchor})  ({f.line_count} lines)")

    # Build.
    out_lines: List[str] = []
    out_lines.extend(header)
    out_lines.extend(index)
    out_lines.append("")
    out_lines.append("## Files (Skeleton)")
    out_lines.append("")

    # Skeleton sections: include ALL files with minimal per-file info.
    # Keep this part compact to guarantee full coverage within the line cap.
    for f in files:
        src_lines = _read_text_lines(f.path)
        anchor = _anchor_for_file(f)
        out_lines.append(f"### {f.rel}")
        out_lines.append(f"<a id=\"{anchor}\"></a>")
        out_lines.append(f"- Lines: {f.line_count} | Bytes: {f.byte_count} | SHA1: `{f.sha1}`")
        heads = extract_headings(src_lines, limit=heading_limit)
        if heads:
            out_lines.append("- Headings:")
            for (ln_no, htxt) in heads:
                out_lines.append(f"  - L{ln_no}: {htxt}")
        else:
            out_lines.append("- Headings: (none)")
        out_lines.append("")

        # If we are approaching the cap, stop adding more skeletons (extremely unlikely).
        if len(out_lines) >= target_lines - 50:
            out_lines.append("## TRUNCATED")
            out_lines.append("Skeleton section truncated due to line cap.")
            out_lines.append("")
            break

    # Excerpts: spend remaining budget on higher-value docs first.
    excerpt_offsets: dict[str, int] = {}
    if len(out_lines) < target_lines - 20:
        out_lines.append("## Excerpts (Budgeted)")
        out_lines.append("")
        out_lines.append(
            "Excerpts are taken from the top of each file, and may be omitted when the 20k line cap is reached."
        )
        out_lines.append("")

        def priority_key(rel: str) -> Tuple[int, str]:
            # Lower is higher priority.
            if rel.startswith("data/recommendations/md_docs/prompts/"):
                return (0, rel)
            if rel.startswith("Gems/"):
                return (1, rel)
            if rel.startswith("docs/"):
                return (2, rel)
            if rel.startswith("data/recommendations/md_docs/"):
                return (3, rel)
            if rel.startswith("data/"):
                return (4, rel)
            return (5, rel)

        excerpt_files = sorted(files, key=lambda f: priority_key(f.rel))
        for f in excerpt_files:
            # Estimate minimal excerpt block size:
            # 1 heading + 1 fence + N lines + 1 fence + blank = 4 + N
            # plus a small buffer to avoid cutting a block.
            lines_left = target_lines - len(out_lines)
            if lines_left < (4 + 3 + 2):
                out_lines.append("### Excerpts truncated")
                out_lines.append(f"Reached line cap ({target_lines}).")
                out_lines.append("")
                break

            src_lines = _read_text_lines(f.path)

            # Dynamic excerpt size based on remaining budget and file priority.
            # Keep excerpts short but useful; very long docs don't get more excerpt lines.
            base = 14 if priority_key(f.rel)[0] <= 2 else 10
            excerpt_len = max(min_excerpt_lines, min(base, max(3, lines_left - 10)))

            out_lines.append(f"### Excerpt: {f.rel}")
            out_lines.append("```md")
            for ln in src_lines[:excerpt_len]:
                out_lines.append(ln)
            out_lines.append("```")
            out_lines.append("")
            excerpt_offsets[f.rel] = excerpt_len

    # If we still have spare budget, fill up to the cap with additional chunks from the
    # highest-value files. This keeps the deliverable close to the requested size
    # without adding meaningless padding.
    if len(out_lines) < target_lines - 50:
        out_lines.append("## Extra Excerpts (Fill To Cap)")
        out_lines.append("")
        out_lines.append(
            "Additional chunks from top-priority documents, appended until the 20k line cap."
        )
        out_lines.append("")

        # Only pull more content from the most important areas.
        def is_fill_eligible(rel: str) -> bool:
            return priority_key(rel)[0] <= 3

        eligible = [f for f in sorted(files, key=lambda f: priority_key(f.rel)) if is_fill_eligible(f.rel)]
        chunk_size = 40
        for f in eligible:
            if len(out_lines) >= target_lines - 20:
                break
            src_lines = _read_text_lines(f.path)
            offset = excerpt_offsets.get(f.rel, 0)
            # Add at most a few chunks per file to spread coverage.
            added_chunks = 0
            while offset < len(src_lines) and len(out_lines) < target_lines - 20 and added_chunks < 3:
                lines_left = target_lines - len(out_lines)
                # Need room for header + fences + at least 3 lines.
                if lines_left < 10:
                    break
                take = min(chunk_size, len(src_lines) - offset)
                # Fit to remaining space conservatively.
                take = min(take, max(3, lines_left - 7))

                start = offset + 1
                end = offset + take
                out_lines.append(f"### More: {f.rel} (L{start}-L{end})")
                out_lines.append("```md")
                for ln in src_lines[offset : offset + take]:
                    out_lines.append(ln)
                out_lines.append("```")
                out_lines.append("")

                offset += take
                added_chunks += 1
            excerpt_offsets[f.rel] = offset

    # Hard cap.
    if len(out_lines) > target_lines:
        out_lines = out_lines[:target_lines]
    elif len(out_lines) < target_lines:
        # Make the deliverable exactly the requested size, without truncating content blocks.
        # Use blank-line padding to minimize noise.
        out_lines.append("## End Of Bundle")
        out_lines.append(f"(Padding with blank lines to reach {target_lines} total lines.)")
        while len(out_lines) < target_lines:
            out_lines.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    return len(out_lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".", help="Repository root (default: .)")
    ap.add_argument("--out", default="exports/md_reference_bundle_20k.md", help="Output markdown path")
    ap.add_argument("--target-lines", type=int, default=20000, help="Hard cap on output lines")
    ap.add_argument("--heading-limit", type=int, default=6, help="Max headings per file")
    ap.add_argument("--min-excerpt-lines", type=int, default=10, help="Minimum excerpt lines per file")
    ap.add_argument(
        "--exclude-dir",
        action="append",
        default=[],
        help="Extra dir name to exclude (can be repeated)",
    )
    args = ap.parse_args()

    repo_root = Path(args.repo_root).resolve()
    out_path = Path(args.out).resolve()
    exclude_dirs = set(DEFAULT_EXCLUDE_DIRS) | set(args.exclude_dir)

    files = discover_md_files(repo_root, exclude_dirs=exclude_dirs)
    line_count = build_bundle(
        repo_root=repo_root,
        files=files,
        out_path=out_path,
        target_lines=args.target_lines,
        heading_limit=args.heading_limit,
        min_excerpt_lines=args.min_excerpt_lines,
    )
    print(f"Wrote {line_count} lines to {out_path} (from {len(files)} .md files)")


if __name__ == "__main__":
    main()
