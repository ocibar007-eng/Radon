#!/usr/bin/env python3
"""
Gerador de Relatório de QA v2.0
================================
Inclui novas métricas de qualidade:
- changed_ratio
- ok_but_unchanged_count (deve ser 0)
- suspicious_translations
"""

import json
import random
import re
import argparse
from collections import Counter
from datetime import datetime
from pathlib import Path

def generate_qa_report(
    input_txt: str = None,
    input_jsonl: str = None,
    output_dir: str = None,
    suspects_out: str = None,
    critical_out: str = None,
    suspicious_out: str = None,
    info_out: str = None
):
    """Gera o relatório de QA completo."""
    script_dir = Path(__file__).parent
    txt_path = Path(input_txt) if input_txt else script_dir / "medical-wordlist-98k.txt"
    jsonl_path = Path(input_jsonl) if input_jsonl else script_dir / "translations.full.jsonl"
    output_dir = Path(output_dir) if output_dir else script_dir
    output_path = output_dir / "qa_report.md"
    
    print("=" * 60)
    print("GERADOR DE RELATÓRIO DE QA v2.0")
    print("=" * 60)
    
    print(f"\n📂 Carregando arquivos...")
    
    with open(txt_path, 'r', encoding='utf-8') as f:
        input_terms = [line.rstrip('\n\r') for line in f.readlines()]
    
    translations = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            translations.append(json.loads(line))
    
    input_count = len(input_terms)
    output_count = len(translations)
    
    print(f"   Input (.txt): {input_count} termos")
    print(f"   Output (.jsonl): {output_count} registros")
    
    # ===== VALIDAÇÕES ESTRUTURAIS =====
    validations = {}
    
    # 1. Contagem
    validations['count_match'] = {
        'name': 'Contagem input == output',
        'expected': input_count,
        'actual': output_count,
        'pass': input_count == output_count
    }
    
    # 2. Ordem preservada
    order_preserved = True
    for i, (inp_term, out_rec) in enumerate(zip(input_terms, translations)):
        if out_rec['term_en'] != inp_term:
            order_preserved = False
            break
    validations['order_preserved'] = {'name': 'Ordem preservada', 'pass': order_preserved}
    
    # 3. IDs sequenciais
    ids = [t['id'] for t in translations]
    expected_ids = list(range(1, output_count + 1))
    validations['ids_sequential'] = {
        'name': 'IDs únicos e sequenciais',
        'pass': ids == expected_ids
    }
    
    # 4. Campos preenchidos
    missing_status = [t for t in translations if not t['status']]
    missing_type = [t for t in translations if not t['type_guess']]
    validations['fields_filled'] = {
        'name': 'Status e type_guess preenchidos',
        'pass': len(missing_status) == 0 and len(missing_type) == 0
    }
    
    # ===== NOVAS MÉTRICAS DE QUALIDADE =====
    
    # 5. ok_but_unchanged (CRÍTICO - deve ser 0)
    ok_but_unchanged = [t for t in translations 
                        if t['status'] == 'ok' and t['term_pt'].lower() == t['term_en'].lower()]
    validations['ok_but_unchanged'] = {
        'name': 'ok_but_unchanged_count == 0',
        'count': len(ok_but_unchanged),
        'pass': len(ok_but_unchanged) == 0,
        'examples': [t['term_en'] for t in ok_but_unchanged[:10]]
    }
    
    # 6. changed_ratio
    changed = [t for t in translations if t['term_pt'].lower() != t['term_en'].lower()]
    changed_ratio = len(changed) / output_count if output_count > 0 else 0
    validations['changed_ratio'] = {
        'name': 'Taxa de mudança (term_pt != term_en)',
        'ratio': changed_ratio,
        'count': len(changed),
        'pass': True  # Informativo
    }
    
    # 7. Buckets: critical / suspicious / info
    critical = []
    suspicious = []
    info = []

    english_stopwords = {
        "and", "or", "with", "without", "of", "for", "from", "to", "in", "on", "by", "at",
        "the", "a", "an", "is", "are", "was", "were", "as", "into", "over", "under"
    }

    product_suffixes = ("Pro", "Plus", "Ultra", "Max", "Mini", "Lite", "X", "AI", "HD", "XR", "3D", "4D")

    def tokenize_words(text: str):
        return re.findall(r"[A-Za-zÀ-ÿ']+", text)

    def ascii_token_ratio(tokens):
        if not tokens:
            return 0.0
        ascii_tokens = [t for t in tokens if re.fullmatch(r"[A-Za-z']+", t)]
        return len(ascii_tokens) / len(tokens)

    def has_control_chars(text: str) -> bool:
        return bool(re.search(r"[\x00-\x1F\x7F]", text))

    def only_punct_or_empty(text: str) -> bool:
        return not re.search(r"[A-Za-zÀ-ÿ0-9]", text)

    def is_probable_camelcase(term: str) -> bool:
        return bool(re.search(r"[a-z][A-Z]", term))

    def is_probable_product_name(term: str) -> bool:
        if not is_probable_camelcase(term):
            return False
        if re.search(r"\d", term):
            return True
        if term.endswith(product_suffixes):
            return True
        if re.search(r"[A-Z]{2,}", term):
            return True
        return False

    for t in translations:
        term_en = t['term_en']
        term_pt = t['term_pt']
        status = t['status']
        sources = t.get('sources', [])

        en_len = len(term_en)
        pt_len = len(term_pt)
        pt_tokens = tokenize_words(term_pt)
        pt_token_count = len(pt_tokens)

        # CRITICAL: ok mas não mudou
        if status == 'ok' and term_pt.lower() == term_en.lower():
            critical.append({
                'type': 'ok_unchanged',
                'term_en': term_en,
                'term_pt': term_pt
            })

        # CRITICAL: vazio / só pontuação
        if not term_pt or only_punct_or_empty(term_pt):
            critical.append({
                'type': 'pt_empty_or_punct',
                'term_en': term_en,
                'term_pt': term_pt
            })

        # CRITICAL: caracteres de controle
        if term_pt and has_control_chars(term_pt):
            critical.append({
                'type': 'control_chars',
                'term_en': term_en,
                'term_pt': term_pt
            })

        # CRITICAL: artefatos óbvios
        if re.search(r"(http|www\.|@|#|CID:|SNOMED|ICD-?10|LOINC)", term_pt, re.IGNORECASE):
            critical.append({
                'type': 'artifact_token',
                'term_en': term_en,
                'term_pt': term_pt
            })

        # CRITICAL: muito inglês em PT quando status ok
        if status == 'ok' and pt_tokens:
            ratio = ascii_token_ratio(pt_tokens)
            if ratio >= 0.7 and any(tok.lower() in english_stopwords for tok in pt_tokens):
                critical.append({
                    'type': 'mostly_english_ok',
                    'term_en': term_en,
                    'term_pt': term_pt
                })

        # SUSPICIOUS: comprimento desproporcional
        if status == 'ok' and en_len > 0 and pt_len > 3 * en_len and pt_token_count >= 6:
            suspicious.append({
                'type': 'length_ratio_high',
                'term_en': term_en,
                'term_pt': term_pt
            })

        # SUSPICIOUS: cara de frase/definição
        if status == 'ok':
            comma_count = term_pt.count(',')
            if ';' in term_pt or ':' in term_pt or comma_count >= 2:
                suspicious.append({
                    'type': 'sentence_like',
                    'term_en': term_en,
                    'term_pt': term_pt
                })
            if re.search(r"\(.*\d+.*\)", term_pt):
                suspicious.append({
                    'type': 'parentheses_with_number',
                    'term_en': term_en,
                    'term_pt': term_pt
                })

        # SUSPICIOUS: CamelCase alterado só se parece nome próprio/produto
        if status == 'ok' and is_probable_camelcase(term_en) and term_pt != term_en:
            if is_probable_product_name(term_en):
                suspicious.append({
                    'type': 'camelcase_product_altered',
                    'term_en': term_en,
                    'term_pt': term_pt
                })
            else:
                info.append({
                    'type': 'camelcase_altered_info',
                    'term_en': term_en,
                    'term_pt': term_pt
                })

        # INFO: DeCS verboso mas plausível
        if status == 'ok' and 'decs_api' in sources and pt_len >= 40 and pt_token_count >= 6:
            info.append({
                'type': 'decs_verbose',
                'term_en': term_en,
                'term_pt': term_pt
            })

    validations['critical_issues'] = {
        'name': 'Problemas críticos',
        'count': len(critical),
        'pass': len(critical) < 100,
        'examples': critical[:20]
    }
    validations['suspicious_translations'] = {
        'name': 'Traduções suspeitas (monitoramento)',
        'count': len(suspicious),
        'pass': True,
        'examples': suspicious[:20]
    }
    validations['info_translations'] = {
        'name': 'Info (auditoria)',
        'count': len(info),
        'pass': True,
        'examples': info[:20]
    }

    def write_list(path_value, items):
        if not path_value:
            return
        try:
            unique_terms = []
            seen = set()
            for s in items:
                term = s.get('term_en')
                if term and term not in seen:
                    seen.add(term)
                    unique_terms.append(term)
            with open(path_value, 'w', encoding='utf-8') as f:
                for term in unique_terms:
                    f.write(term + '\n')
        except Exception:
            pass

    if suspects_out and not suspicious_out:
        suspicious_out = suspects_out

    write_list(critical_out, critical)
    write_list(suspicious_out, suspicious)
    write_list(info_out, info)
    
    # ===== ESTATÍSTICAS =====
    status_counts = Counter(t['status'] for t in translations)
    type_counts = Counter(t['type_guess'] for t in translations)
    source_counts = Counter(tuple(t['sources']) for t in translations)
    
    # Top problemas
    problem_terms = [t for t in translations 
                     if t['status'] in ['ambiguous', 'untranslated', 'needs_review']][:50]
    
    # Amostra aleatória
    random.seed(42)
    sample = random.sample(translations, min(200, len(translations)))
    sample.sort(key=lambda x: x['id'])
    
    # ===== GERAR RELATÓRIO =====
    report = []
    report.append("# Relatório de QA v2.0 - Pipeline de Tradução Médica")
    report.append("")
    report.append(f"**Data de geração:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"**Arquivo de entrada:** `{txt_path.name}`")
    report.append(f"**Arquivo de saída:** `{jsonl_path.name}`")
    report.append("")
    report.append("---")
    report.append("")
    
    # Checklist
    report.append("## ✅ Checklist de Validação")
    report.append("")
    report.append("| # | Critério | Resultado | Detalhes |")
    report.append("|---|----------|-----------|----------|")
    
    all_pass = True
    criteria = [
        ('1', 'Linhas output == input', validations['count_match']),
        ('2', 'Ordem preservada', validations['order_preserved']),
        ('3', 'IDs sequenciais', validations['ids_sequential']),
        ('4', 'Campos preenchidos', validations['fields_filled']),
        ('5', '**ok_but_unchanged == 0**', validations['ok_but_unchanged']),
        ('6', 'Problemas críticos < 100', validations['critical_issues']),
    ]
    
    for num, desc, val in criteria:
        status = "✅ PASS" if val['pass'] else "❌ FAIL"
        if not val['pass']:
            all_pass = False
        details = ""
        if 'expected' in val:
            details = f"Esperado: {val['expected']}, Obtido: {val['actual']}"
        elif 'count' in val:
            details = f"Count: {val['count']}"
        report.append(f"| {num} | {desc} | {status} | {details} |")
    
    report.append("")
    report.append(f"### Resultado Final: {'✅ TODOS OS CRITÉRIOS PASSARAM' if all_pass else '❌ HÁ FALHAS'}")
    report.append("")
    report.append("---")
    report.append("")
    
    # Métricas de qualidade
    report.append("## 📊 Métricas de Qualidade")
    report.append("")
    report.append("| Métrica | Valor |")
    report.append("|---------|-------|")
    report.append(f"| Total registros | {output_count:,} |")
    report.append(f"| **changed_ratio** (PT ≠ EN) | **{100*changed_ratio:.2f}%** ({len(changed):,}) |")
    report.append(f"| ok_but_unchanged_count | {len(ok_but_unchanged)} |")
    report.append(f"| Problemas críticos | {len(critical)} |")
    report.append(f"| Traduções suspeitas | {len(suspicious)} |")
    report.append(f"| Info (auditoria) | {len(info)} |")
    report.append("")
    report.append("---")
    report.append("")
    
    # Distribuição por status
    report.append("## Status Distribution")
    report.append("")
    report.append("| Status | Qtd | % |")
    report.append("|--------|-----|---|")
    for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        pct = 100 * count / output_count
        report.append(f"| `{status}` | {count:,} | {pct:.2f}% |")
    report.append("")
    
    # Distribuição por source
    report.append("## Source Distribution")
    report.append("")
    report.append("| Source | Qtd | % |")
    report.append("|--------|-----|---|")
    for src, count in sorted(source_counts.items(), key=lambda x: -x[1])[:10]:
        pct = 100 * count / output_count
        report.append(f"| `{src}` | {count:,} | {pct:.2f}% |")
    report.append("")
    report.append("---")
    report.append("")
    
    # ok_but_unchanged examples (se houver)
    if ok_but_unchanged:
        report.append("## ⚠️ FALSOS POSITIVOS (ok_but_unchanged)")
        report.append("")
        report.append("| term_en | term_pt | source |")
        report.append("|---------|---------|--------|")
        for t in ok_but_unchanged[:20]:
            report.append(f"| {t['term_en']} | {t['term_pt']} | {t['sources']} |")
        report.append("")
    
    # Critical
    if critical:
        report.append("## ❗ Problemas Críticos")
        report.append("")
        report.append("| Tipo | term_en | term_pt |")
        report.append("|------|---------|---------|")
        for s in critical[:20]:
            report.append(f"| {s['type']} | {s['term_en'][:30]} | {s['term_pt'][:30]} |")
        report.append("")

    # Suspicious
    if suspicious:
        report.append("## ⚠️ Traduções Suspeitas")
        report.append("")
        report.append("| Tipo | term_en | term_pt |")
        report.append("|------|---------|---------|")
        for s in suspicious[:20]:
            report.append(f"| {s['type']} | {s['term_en'][:30]} | {s['term_pt'][:30]} |")
        report.append("")

    # Info
    if info:
        report.append("## ℹ️ Info (auditoria)")
        report.append("")
        report.append("| Tipo | term_en | term_pt |")
        report.append("|------|---------|---------|")
        for s in info[:20]:
            report.append(f"| {s['type']} | {s['term_en'][:30]} | {s['term_pt'][:30]} |")
        report.append("")
    
    # Top 50 para revisão
    report.append("## Top 50 Termos para Revisão")
    report.append("")
    report.append("| ID | term_en | status | type |")
    report.append("|----|---------|--------|------|")
    for t in problem_terms:
        report.append(f"| {t['id']} | {t['term_en'][:35]} | {t['status']} | {t['type_guess']} |")
    report.append("")
    report.append("---")
    report.append("")
    
    # Amostra
    report.append("## Amostra Aleatória (200 itens, seed=42)")
    report.append("")
    report.append("| ID | term_en | term_pt | status |")
    report.append("|----|---------|---------|--------|")
    for t in sample:
        en = t['term_en'][:30] + "..." if len(t['term_en']) > 30 else t['term_en']
        pt = t['term_pt'][:30] + "..." if len(t['term_pt']) > 30 else t['term_pt']
        report.append(f"| {t['id']} | {en} | {pt} | {t['status']} |")
    report.append("")
    report.append("---")
    report.append("")
    report.append("*Relatório gerado pelo Pipeline de Tradução Médica v2.0*")
    
    print(f"\n💾 Salvando relatório em: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    
    print(f"\n📊 RESULTADO")
    print("-" * 40)
    print(f"Critérios validados: {sum(1 for v in validations.values() if v.get('pass', True))}/{len(validations)}")
    print(f"ok_but_unchanged: {len(ok_but_unchanged)}")
    print(f"critical_issues: {len(critical)}")
    print(f"suspicious: {len(suspicious)}")
    print(f"info: {len(info)}")
    print(f"changed_ratio: {100*changed_ratio:.2f}%")
    print(f"Status final: {'✅ PASS' if all_pass else '❌ FAIL'}")
    
    print(f"\n✅ Relatório de QA v2.0 gerado!")
    return all_pass, validations

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Gerador de Relatório de QA')
    parser.add_argument('--input-txt', help='Arquivo de entrada (.txt)')
    parser.add_argument('--input-jsonl', help='Arquivo de traduções (.jsonl)')
    parser.add_argument('--output-dir', '-o', help='Diretório de saída')
    parser.add_argument('--suspects-out', help='Salvar lista de term_en suspeitos (monitoramento)')
    parser.add_argument('--critical-out', help='Salvar lista de term_en críticos')
    parser.add_argument('--suspicious-out', help='Salvar lista de term_en suspeitos')
    parser.add_argument('--info-out', help='Salvar lista de term_en info')
    args = parser.parse_args()
    
    generate_qa_report(
        args.input_txt,
        args.input_jsonl,
        args.output_dir,
        args.suspects_out,
        args.critical_out,
        args.suspicious_out,
        args.info_out
    )
