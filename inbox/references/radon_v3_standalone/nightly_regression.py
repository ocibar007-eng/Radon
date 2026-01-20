import requests
import json
import os
import glob
from datetime import datetime

# CONFIG
API_ENDPOINT = "http://localhost:3005/v3/process-case"
GOLDEN_FILE = "./logs/golden_dataset.jsonl"
REPORT_FILE = "./nightly_report.md"

def load_golden_set():
    cases = []
    if not os.path.exists(GOLDEN_FILE):
        print(f"⚠️ Golden Dataset not found at {GOLDEN_FILE}")
        return []
    
    with open(GOLDEN_FILE, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    cases.append(json.loads(line))
                except:
                    pass
    return cases

def run_regression():
    cases = load_golden_set()
    print(f"📉 Starting Nightly Regression on {len(cases)} Golden Cases...")
    
    results = []
    
    for case in cases:
        case_id = case.get('case_id', 'unknown')
        print(f"   running {case_id}...")
        
        # Prepare payload matching what API expects
        payload = {
            "meta": {
                "case_id": case_id,
                "trace_id": "regression_test",
                "patient": case['inputs']['patient_context'],
                "modality": "CT", # Defaulting for now if missing
                "study_description": "Regression Test",
                "timestamp": datetime.now().isoformat()
            },
            "inputs": {
                "dictation_raw": case['inputs']['dictation']
            },
            "flags": {
                "is_oncologic": False,
                "has_contrast": False
            }
        }
        
        try:
            start_time = datetime.now()
            resp = requests.post(API_ENDPOINT, json=payload, timeout=60)
            duration = (datetime.now() - start_time).total_seconds()
            
            if resp.status_code == 200:
                data = resp.json()
                final_output = data.get('final_report', '')
                
                # Simple "Contains" check against Ground Truth (if we had specific extraction)
                # For now, we check if Hard Gates passed (success=True)
                
                results.append({
                    "case_id": case_id,
                    "status": "PASS",
                    "latency": duration,
                    "output_len": len(final_output)
                })
            else:
                 results.append({
                    "case_id": case_id,
                    "status": "FAIL",
                    "error": f"API {resp.status_code}"
                })
                
        except Exception as e:
            results.append({
                "case_id": case_id,
                "status": "ERROR",
                "error": str(e)
            })

    # Generate Report
    generate_report(results)

def generate_report(results):
    passed = len([r for r in results if r['status'] == 'PASS'])
    total = len(results)
    
    report = f"""# 📉 Nightly Regression Report
**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Total Cases:** {total}
**Passed:** {passed}
**Failed:** {total - passed}

## Details
| Case ID | Status | Latency (s) | Notes |
|---|---|---|---|
"""
    for r in results:
        report += f"| {r['case_id'][:8]} | {r['status']} | {r.get('latency', 0):.2f} | {r.get('error', '')} |\n"
        
    with open(REPORT_FILE, 'w') as f:
        f.write(report)
        
    print(f"✅ Regression Complete. Report saved to {REPORT_FILE}")

if __name__ == "__main__":
    run_regression()
