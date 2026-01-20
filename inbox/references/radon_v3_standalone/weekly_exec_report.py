import json
import os
from datetime import datetime, timedelta

# CONFIG
DATASET_FILE = "./logs/dataset.jsonl"
OUTPUT_FILE = "./weekly_report.md"
COST_PER_1K_INPUT = 0.0001 # Estimate Flash
COST_PER_1K_OUTPUT = 0.0004 
COST_PRO_INPUT = 0.00125 # Estimate Pro
COST_PRO_OUTPUT = 0.00375

def generate_exec_report():
    if not os.path.exists(DATASET_FILE):
        print("❌ no dataset found")
        return

    # Load Last 7 Days (Mock: Load all for now)
    entries = []
    with open(DATASET_FILE, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    entries.append(json.loads(line))
                except: pass

    total_cases = len(entries)
    if total_cases == 0:
        print("⚠️ No cases.")
        return

    # METRICS
    s1_count = len([e for e in entries if e.get('risk_level') == 'S1'])
    s2_count = len([e for e in entries if e.get('risk_level') == 'S2'])
    
    # Cost Approx (Naive token count by string len / 4)
    total_cost = 0.0
    for e in entries:
        # Layer 2 is Pro
        l2_in = len(e['inputs']['dictation']) / 4
        l2_out = len(e['outputs'].get('layer2_draft', '')) / 4
        cost_l2 = (l2_in/1000 * COST_PRO_INPUT) + (l2_out/1000 * COST_PRO_OUTPUT)
        
        # Layer 3 is Flash
        l3_in = l2_out
        l3_out = len(e['outputs'].get('layer3_final', '')) / 4
        cost_l3 = (l3_in/1000 * COST_PER_1K_INPUT) + (l3_out/1000 * COST_PER_1K_OUTPUT)
        
        total_cost += cost_l2 + cost_l3

    avg_cost = total_cost / total_cases if total_cases > 0 else 0
    avg_latency = sum([e['telemetry'].get('layer2_latency_ms', 0) for e in entries]) / total_cases

    # Top Errors
    all_issues = []
    for e in entries:
        if 'qa_issues' in e['outputs']:
            all_issues.extend(e['outputs']['qa_issues'])
            
    # Simple Counter
    from collections import Counter
    top_issues = Counter(all_issues).most_common(5)

    # Status Color
    status = "🟢 ON TRACK"
    if s1_count > 5: status = "🟡 AT RISK"
    if s1_count > 15: status = "🔴 CRITICAL"

    report = f"""# 📊 Relatório Executivo Semanal - Radon V3
**Semana:** {datetime.now().strftime('%W/%Y')}
**Status Geral:** {status}

## 🎯 Resumo de Produção
*   **Total de Laudos:** {total_cases}
*   **Fila Vermelha (S1):** {s1_count} ({(s1_count/total_cases)*100:.1f}%)
*   **Fila Laranja (S2):** {s2_count}
*   **Custo Médio:** ${avg_cost:.4f} / laudo
*   **Latência Média:** {avg_latency/1000:.2f}s

## 🏆 Top 5 Bloqueios (Erros Automação)
"""
    if not top_issues:
        report += "*   *Nenhum bloqueio registrado.*\n"
    else:
        for issue, count in top_issues:
            report += f"*   **{count}x**: {issue}\n"

    report += """
## 💡 Ações Sugeridas
"""
    if s1_count > 0:
        report += "*   [ ] Revisar fila S1 prioritariamente (Riscos Clínicos).\n"
    if avg_cost > 0.15:
        report += "*   [ ] Investigar aumento de custo (tokens de input).\n"
    
    report += f"\n*Gerado automaticamente em {datetime.now().isoformat()}*"

    with open(OUTPUT_FILE, 'w') as f:
        f.write(report)
    
    print(f"✅ Executive Report Generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_exec_report()
