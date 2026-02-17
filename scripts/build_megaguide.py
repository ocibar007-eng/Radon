#!/usr/bin/env python3
"""
Process ALL markdown files through extract_document.py and build the mega-guide.
"""
import os
import sys
import json
import glob
import hashlib
from datetime import datetime
from collections import defaultdict

# Add scripts dir to path
sys.path.insert(0, os.path.dirname(__file__))
from extract_document import process_file

MD_DIR = "/Users/lucasdonizetecamargos/Downloads/app (6)/data/recommendations/md_docs"
OUTPUT_DIR = "/Users/lucasdonizetecamargos/Downloads/app (6)/data/recommendations"

# Known duplicates (keep first, skip rest)
SKIP_FILES = {
    "ESUR-SPIWG-male-infertility (1).md",
    "InjuryScoringTables-3 (1).md",
    "esgar_updated_guideline_2025_dup.md",
    "Arquivo.zip",
}

# Files that are duplicates of others (keep better-named version)
DUPLICATE_MAP = {
    "10.1148@radiol.2019182646.md": "bosniak_v2019.md",
    "macmahon2005.md": "fleischner_2005.md",
    "macmahon2017.md": "fleischner_2017.pdf .md",
    "pi_rads_v2_1.md": "PIRADS-2019.md",
    "percist_pet_response_criteria_2009.md": "Wahl_PERCIST_JNM_2009.md",
    "tnm_8th_edition_complete.md": "TNM-Classification-of-Malignant-Tumours-8th-edition.md",
    "irecist_lancet_oncology_2017.md": "Manuscript_IRECIST_Lancet-Oncology_Seymour-et-al_revision_FINAL_clean_nov25.md",
    "dixe-de-oliveira-santo-et-al-2023-grading-abdominal-trauma-changes-in-and-implications-of-the-revised-2018-aast-ois-for.md": "aast_abdominal_trauma_grading_2023.md",
    "aast_injury_scoring_tables_v3.md": "InjuryScoringTables-3.md",
    "myeloma_wbmri_guidelines_2019.md": "messiou-et-al-2019-guidelines-for-acquisition-interpretation-and-reporting-of-whole-body-mri-in-myeloma-myeloma.md",
    "peacock2020.md": "myeloma_peacock_2020.md",
    "merican College of Radiology ACR Appropriateness Criteria® Postmenopausal Subacute or Chronic Pelvic Pain.md": "American College of Radiology ACR Appropriateness Criteria® Postmenopausal Subacute or Chronic Pelvic Pain.md",
}

THEME_LABELS = {
    "fígado": "Fígado / Hepatobiliar",
    "próstata": "Próstata",
    "rim": "Rim / Renal",
    "adrenal": "Adrenal",
    "ginecologia": "Ginecologia / Pelve Feminina",
    "pulmão": "Pulmão / Tórax",
    "oncologia_resposta": "Oncologia — Critérios de Resposta",
    "tnm_estadiamento": "TNM / Estadiamento",
    "vascular": "Vascular",
    "digestivo": "Digestivo / Gastrointestinal",
    "trauma": "Trauma",
    "urologia": "Urologia / Escrotal",
    "mieloma": "Mieloma / Hematologia",
    "hernia": "Hérnias",
}

THEME_ORDER = [
    "fígado", "próstata", "rim", "adrenal", "ginecologia",
    "pulmão", "oncologia_resposta", "tnm_estadiamento",
    "vascular", "digestivo", "trauma", "urologia", "mieloma", "hernia"
]


def build_catalog_table(all_extractions):
    """Build document catalog as markdown table."""
    lines = [
        "## Catálogo de Documentos\n",
        "| # | Título | Ano | Sociedade | Tipo | Temas | DOI/PMID |",
        "|---|--------|-----|-----------|------|-------|----------|",
    ]
    for i, ext in enumerate(all_extractions, 1):
        m = ext["metadata"]
        title = m["title"][:80] + ("..." if len(m["title"]) > 80 else "")
        themes = ", ".join(m["themes"][:3]) if m["themes"] else "—"
        doi = m["doi_pmid"] if m["doi_pmid"] != "<AUSENTE>" else "—"
        lines.append(f"| {i} | {title} | {m['year']} | {m['society']} | {m['type']} | {themes} | {doi} |")

    return "\n".join(lines)


def build_theme_section(theme_key, theme_label, extractions_for_theme):
    """Build a theme section for the mega-guide."""
    lines = [f"### {theme_label}\n"]

    # --- Tables ---
    all_tables = []
    for ext in extractions_for_theme:
        fname = ext["metadata"]["filename"]
        for table in ext["tables"]:
            all_tables.append((fname, table))

    if all_tables:
        lines.append("#### Tabelas\n")
        for fname, table in all_tables:
            lines.append(f"**{table['title']}**")
            lines.append(f"*Fonte: {fname} | linhas {table['line_start']}–{table['line_end']}*\n")
            lines.append(table["content"])
            lines.append("")

    # --- Thresholds ---
    all_thresholds = []
    for ext in extractions_for_theme:
        fname = ext["metadata"]["filename"]
        for th in ext["thresholds"]:
            all_thresholds.append((fname, th))

    if all_thresholds:
        lines.append("#### Valores de Referência e Thresholds\n")
        for fname, th in all_thresholds:
            lines.append(f"- **{th['match']}** — {th['context'][:150]}")
            lines.append(f"  *Fonte: {fname} | linha {th['line']}*\n")

    # --- Criteria/Scores ---
    all_criteria = []
    for ext in extractions_for_theme:
        fname = ext["metadata"]["filename"]
        for cr in ext["criteria_scores"]:
            all_criteria.append((fname, cr))

    if all_criteria:
        lines.append("#### Critérios / Scores / Classificações\n")
        for fname, cr in all_criteria:
            lines.append(f"**{cr['system']}**")
            lines.append(f"```")
            lines.append(cr["context"][:500])
            lines.append(f"```")
            lines.append(f"*Fonte: {fname} | linha {cr['line']}*\n")

    # --- Algorithms ---
    all_algos = []
    for ext in extractions_for_theme:
        fname = ext["metadata"]["filename"]
        for algo in ext["algorithms"]:
            all_algos.append((fname, algo))

    if all_algos:
        lines.append("#### Algoritmos / Recomendações\n")
        for fname, algo in all_algos:
            lines.append(f"```")
            lines.append(algo["context"][:600])
            lines.append(f"```")
            lines.append(f"*Fonte: {fname} | linha {algo['line']}*\n")

    # --- Formulas ---
    all_formulas = []
    for ext in extractions_for_theme:
        fname = ext["metadata"]["filename"]
        for formula in ext["formulas"]:
            all_formulas.append((fname, formula))

    if all_formulas:
        lines.append("#### Fórmulas\n")
        for fname, formula in all_formulas:
            lines.append(f"```")
            lines.append(formula["context"][:400])
            lines.append(f"```")
            lines.append(f"*Fonte: {fname} | linha {formula['line']}*\n")

    # --- Notes ---
    all_notes = []
    for ext in extractions_for_theme:
        fname = ext["metadata"]["filename"]
        for note in ext["notes_pitfalls"]:
            all_notes.append((fname, note))

    if all_notes:
        lines.append("#### Notas / Armadilhas\n")
        for fname, note in all_notes:
            lines.append(f"> {note['context'][:300]}")
            lines.append(f"> *Fonte: {fname} | linha {note['line']}*\n")

    # --- Content Blocks ---
    all_blocks = []
    for ext in extractions_for_theme:
        fname = ext["metadata"]["filename"]
        for block in ext["content_blocks"][:10]:  # Limit per doc
            all_blocks.append((fname, block))

    if all_blocks:
        lines.append("#### Seções Relevantes (blocos de conteúdo)\n")
        for fname, block in all_blocks[:30]:  # Global limit per theme
            lines.append(f"**{block['heading']}** ({fname})")
            # Escape headings inside content to prevent structure leakage
            escaped_content = block["content"][:1500].replace("\n#", "\n  >")
            if escaped_content.startswith("#"):
                escaped_content = "  >" + escaped_content[1:]
            lines.append(f"<details><summary>Ver conteúdo (linhas {block['line_start']}–{block['line_end']})</summary>\n")
            lines.append("```")
            lines.append(escaped_content)
            lines.append("```")
            lines.append(f"\n</details>\n")

    return "\n".join(lines)


def build_quality_log(all_extractions, duplicate_pairs):
    """Build quality log section."""
    lines = ["## Log de Qualidade\n"]

    # Missing fields
    lines.append("### Campos Ausentes por Documento\n")
    lines.append("| Documento | Campos Ausentes |")
    lines.append("|-----------|----------------|")
    for ext in all_extractions:
        m = ext["metadata"]
        missing = []
        for field in ["title", "authors", "year", "doi_pmid", "society", "version"]:
            if m.get(field) == "<AUSENTE>":
                missing.append(field)
        if missing:
            lines.append(f"| {m['filename'][:60]} | {', '.join(missing)} |")

    # Duplicates handled
    lines.append("\n### Duplicatas Identificadas e Tratadas\n")
    for dup, original in duplicate_pairs.items():
        lines.append(f"- `{dup}` → mantido `{original}`")

    # Items marcados incerto
    lines.append("\n### Itens Incertos (<INCERTO>)\n")
    lines.append("*Nenhum item marcado como incerto na extração automatizada. Revisão manual recomendada.*\n")

    # Possible conflicts
    lines.append("### Possíveis Conflitos entre Documentos\n")
    lines.append("*Análise de conflitos requer revisão manual dos items extraídos por tema.*\n")

    return "\n".join(lines)


def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting mega-guide extraction pipeline...")

    # Collect files
    files = sorted(glob.glob(os.path.join(MD_DIR, "*.md")))
    print(f"Found {len(files)} markdown files")

    # Filter duplicates and skips
    filtered_files = []
    skipped = []
    for f in files:
        fname = os.path.basename(f)
        if fname in SKIP_FILES:
            skipped.append(fname)
            continue
        if fname in DUPLICATE_MAP:
            skipped.append(f"{fname} (dup of {DUPLICATE_MAP[fname]})")
            continue
        filtered_files.append(f)

    print(f"Processing {len(filtered_files)} unique files (skipped {len(skipped)} duplicates)")

    # Process each file
    all_extractions = []
    errors = []

    for i, filepath in enumerate(filtered_files, 1):
        fname = os.path.basename(filepath)
        try:
            result = process_file(filepath)
            all_extractions.append(result)

            t_count = len(result["tables"])
            th_count = len(result["thresholds"])
            c_count = len(result["criteria_scores"])
            a_count = len(result["algorithms"])

            if i % 20 == 0 or i == len(filtered_files):
                print(f"  [{i}/{len(filtered_files)}] {fname}: {t_count}T {th_count}V {c_count}C {a_count}A")

        except Exception as e:
            errors.append(f"{fname}: {str(e)}")
            print(f"  ERROR: {fname}: {e}")

    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Extraction complete. Building mega-guide...")

    # Save raw extractions as JSON
    json_path = os.path.join(OUTPUT_DIR, "extractions.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_extractions, f, ensure_ascii=False, indent=1)
    print(f"  Saved raw extractions to {json_path}")

    # Group by theme
    theme_groups = defaultdict(list)
    unthemed = []

    for ext in all_extractions:
        themes = ext["metadata"]["themes"]
        if not themes:
            unthemed.append(ext)
        for theme in themes:
            theme_groups[theme].append(ext)

    # Build mega-guide
    mega = []

    # Header
    mega.append(f"# Mega-Guia Consolidado de Radiologia e Medicina")
    mega.append(f"*Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M')}*")
    mega.append(f"*Documentos processados: {len(all_extractions)} | Erros: {len(errors)}*\n")

    # Conventions
    mega.append("## Como Usar / Convenções\n")
    mega.append("- **Fonte exata**: cada item inclui `arquivo | linha` para rastreabilidade")
    mega.append("- **<AUSENTE>**: campo não encontrado no documento")
    mega.append("- **<INCERTO>**: item com ambiguidade que requer revisão manual")
    mega.append("- **Tabelas**: transcritas fielmente do markdown convertido de PDF")
    mega.append("- **Deduplicação**: documentos duplicados foram identificados e removidos")
    mega.append("- **Prioridade**: tabelas > thresholds > critérios > algoritmos > notas\n")

    # TOC
    mega.append("## Sumário\n")
    mega.append("- [Catálogo de Documentos](#catálogo-de-documentos)")
    for theme_key in THEME_ORDER:
        if theme_key in theme_groups:
            label = THEME_LABELS[theme_key]
            anchor = label.lower().replace(" ", "-").replace("/", "").replace("—", "").replace("(", "").replace(")", "")
            mega.append(f"- [{label}](#{anchor})")
    if unthemed:
        mega.append("- [Documentos sem Tema Atribuído](#documentos-sem-tema-atribuído)")
    mega.append("- [Log de Qualidade](#log-de-qualidade)")
    mega.append("- [Referências](#referências)\n")

    # Catalog
    mega.append(build_catalog_table(all_extractions))
    mega.append("")

    # Theme sections
    mega.append("---\n## Temas\n")
    for theme_key in THEME_ORDER:
        if theme_key in theme_groups:
            label = THEME_LABELS[theme_key]
            section = build_theme_section(theme_key, label, theme_groups[theme_key])
            mega.append(section)
            mega.append("\n---\n")

    # Unthemed docs
    if unthemed:
        mega.append("### Documentos sem Tema Atribuído\n")
        for ext in unthemed:
            m = ext["metadata"]
            mega.append(f"- **{m['filename']}** — {m['title'][:100]} ({m['year']})")
        mega.append("")

    # Quality log
    mega.append(build_quality_log(all_extractions, DUPLICATE_MAP))

    # References
    mega.append("\n## Referências\n")
    for i, ext in enumerate(all_extractions, 1):
        m = ext["metadata"]
        doi = f" DOI: {m['doi_pmid']}" if m["doi_pmid"] != "<AUSENTE>" else ""
        mega.append(f"{i}. **{m['title'][:120]}** ({m['year']}). {m['society']}.{doi} [{m['filename']}]")

    # Errors
    if errors:
        mega.append("\n## Erros de Processamento\n")
        for err in errors:
            mega.append(f"- {err}")

    # Write mega-guide
    mega_path = os.path.join(OUTPUT_DIR, "mega_guia_consolidado.md")
    mega_content = "\n".join(mega)
    with open(mega_path, 'w', encoding='utf-8') as f:
        f.write(mega_content)

    # Stats
    total_tables = sum(len(e["tables"]) for e in all_extractions)
    total_thresholds = sum(len(e["thresholds"]) for e in all_extractions)
    total_criteria = sum(len(e["criteria_scores"]) for e in all_extractions)
    total_algos = sum(len(e["algorithms"]) for e in all_extractions)
    total_formulas = sum(len(e["formulas"]) for e in all_extractions)
    total_notes = sum(len(e["notes_pitfalls"]) for e in all_extractions)
    total_blocks = sum(len(e["content_blocks"]) for e in all_extractions)

    print(f"\n{'='*60}")
    print(f"MEGA-GUIDE GENERATED SUCCESSFULLY")
    print(f"{'='*60}")
    print(f"  Documents: {len(all_extractions)}")
    print(f"  Tables: {total_tables}")
    print(f"  Thresholds/Values: {total_thresholds}")
    print(f"  Criteria/Scores: {total_criteria}")
    print(f"  Algorithms/Recs: {total_algos}")
    print(f"  Formulas: {total_formulas}")
    print(f"  Notes/Pitfalls: {total_notes}")
    print(f"  Content Blocks: {total_blocks}")
    print(f"  Mega-guide lines: {len(mega)}")
    print(f"  Mega-guide size: {len(mega_content):,} chars")
    print(f"  Output: {mega_path}")
    print(f"  JSON: {json_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
