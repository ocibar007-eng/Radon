#!/usr/bin/env python3
"""
Split the optimized mega consultavel file into 1 file per document for better LLM retrieval.

Input (default):
  exports/mega_consultavel_157md_60k_ai.md

Outputs (default):
  exports/mega_consultavel_157md_60k_ai_split/
    index.md
    manifest.json
    001__<docname>.md
    ...
  exports/mega_consultavel_157md_60k_ai_split.zip
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import unicodedata
import zipfile
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IN = ROOT / "exports" / "mega_consultavel_157md_60k_ai.md"
DEFAULT_OUT_DIR = ROOT / "exports" / "mega_consultavel_157md_60k_ai_split"
DEFAULT_ZIP = ROOT / "exports" / "mega_consultavel_157md_60k_ai_split.zip"


DOC_HDR_RE = re.compile(r"^##\s+(\d{3})\s+\|\s+`([^`]+)`\s*$")


def _safe_ascii_filename(name: str, *, max_len: int = 140) -> str:
    # Normalize to ASCII for broad zip portability.
    s = unicodedata.normalize("NFKD", name)
    s = s.encode("ascii", "ignore").decode("ascii")
    s = s.replace(" ", "_")
    s = re.sub(r"_+", "_", s)
    # Keep a conservative set of filename characters for broad portability.
    s = re.sub(r"[^A-Za-z0-9._@()+-]", "_", s)
    s = s.strip("._")
    if not s:
        s = "doc.md"
    if not s.lower().endswith(".md"):
        s += ".md"
    if len(s) > max_len:
        # Keep extension.
        ext = ".md"
        stem = s[: -len(ext)]
        s = stem[: max_len - len(ext)] + ext
    return s


def _zip_dir(src_dir: Path, zip_path: Path) -> None:
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(src_dir.rglob("*")):
            if p.is_dir():
                continue
            zf.write(p, arcname=str(p.relative_to(src_dir)))


def split(in_path: Path, out_dir: Path, zip_path: Path | None) -> dict:
    lines = in_path.read_text(encoding="utf-8", errors="replace").splitlines()

    # Find doc sections.
    starts: list[tuple[int, str, str]] = []  # (idx, num, relpath)
    for idx, line in enumerate(lines):
        m = DOC_HDR_RE.match(line)
        if not m:
            continue
        starts.append((idx, m.group(1), m.group(2)))

    if not starts:
        raise SystemExit(f"No doc headers found in: {in_path}")

    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest: list[dict] = []

    # Optional: intro before first doc.
    intro = lines[: starts[0][0]]
    if any(s.strip() for s in intro):
        intro_path = out_dir / "000__intro.md"
        intro_path.write_text("\n".join(intro).rstrip() + "\n", encoding="utf-8")
        manifest.append(
            {
                "num": "000",
                "relpath": None,
                "out_file": intro_path.name,
                "lines": len(intro),
            }
        )

    for i, (start_idx, num, relpath) in enumerate(starts):
        end_idx = (starts[i + 1][0] - 1) if i + 1 < len(starts) else (len(lines) - 1)
        chunk = lines[start_idx : end_idx + 1]
        basename = relpath.split("/")[-1]
        out_name = f"{num}__{_safe_ascii_filename(basename)}"
        out_path = out_dir / out_name
        out_path.write_text("\n".join(chunk).rstrip() + "\n", encoding="utf-8")
        manifest.append(
            {
                "num": num,
                "relpath": relpath,
                "out_file": out_name,
                "lines": len(chunk),
            }
        )

    index_lines: list[str] = []
    index_lines.append("# Mega Consultavel — Split Index")
    index_lines.append("")
    index_lines.append(f"- Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    index_lines.append(f"- Source: `{in_path.relative_to(ROOT)}`")
    index_lines.append(f"- Docs: {len(starts)}")
    index_lines.append("")
    index_lines.append("## Files")
    for item in manifest:
        if item["num"] == "000":
            index_lines.append(f"- 000 | intro | `{item['out_file']}`")
        else:
            index_lines.append(f"- {item['num']} | `{item['relpath']}` | `{item['out_file']}`")

    (out_dir / "index.md").write_text("\n".join(index_lines).rstrip() + "\n", encoding="utf-8")
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if zip_path is not None:
        _zip_dir(out_dir, zip_path)

    return {"docs": len(starts), "out_dir": str(out_dir), "zip": str(zip_path) if zip_path else None}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default=str(DEFAULT_IN))
    ap.add_argument("--out-dir", dest="out_dir", default=str(DEFAULT_OUT_DIR))
    ap.add_argument("--zip", dest="zip_path", default=str(DEFAULT_ZIP))
    ap.add_argument("--no-zip", action="store_true")
    args = ap.parse_args()

    in_path = Path(args.in_path)
    out_dir = Path(args.out_dir)
    zip_path = None if args.no_zip else Path(args.zip_path)

    split(in_path, out_dir, zip_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
