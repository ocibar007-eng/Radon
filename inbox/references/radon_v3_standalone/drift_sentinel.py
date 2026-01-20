import json
import os
from collections import Counter

# CONFIG
DATASET_FILE = "./logs/dataset.jsonl"
DRIFT_REPORT_FILE = "./drift_suggestions.json"

def analyze_drift():
    if not os.path.exists(DATASET_FILE):
        return

    auto_fixes = []
    qa_issues = []

    with open(DATASET_FILE, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    entry = json.loads(line)
                    # Detect Auto Fixes based on difference or risk flags
                    if "S2_AUTO_FIXES_APPLIED" in entry.get('risk_flags', []):
                        # Naive extraction: In reality we should log the specific fixes.
                        # For MVP we just count the fact that fixes happen.
                        auto_fixes.append("general_auto_fix") 
                        
                    # Better: Extract from telemetry if we logged specifics (we didn't yet, but we will assume we can parse logs later)
                    # For now, let's look at QA Issues
                    if 'qa_issues' in entry['outputs']:
                        qa_issues.extend(entry['outputs']['qa_issues'])
                except: pass

    # Simulate Finding "Unknown Terms" (Mock Logic for MVP)
    # In a real system, we'd tokenise dictation and check against dictionary.
    # Here, we'll suggest adding frequent "QA Issues" to the Banlist officially if not already.

    issues_counter = Counter(qa_issues)
    suggestions = []

    for issue, count in issues_counter.most_common(10):
        if "META-TEXT" in issue:
             suggestions.append({
                 "type": "ADD_TO_BANLIST",
                 "term": issue.replace("META-TEXT DETECTED: ", "").replace('"', ''),
                 "reason": f"Detected {count} times in output",
                 "status": "PENDING_APPROVAL"
             })
    
    # Mocking a frequent dictation term drift
    suggestions.append({
        "type": "ADD_TO_GLOSSARY",
        "term": "fibromótico",
        "correction": "fibrótico",
        "reason": "Probable recurrent STT error (simulated)",
        "status": "PENDING_APPROVAL"
    })

    report = {
        "timestamp": "now",
        "drift_detected": len(suggestions) > 0,
        "suggestions": suggestions
    }

    with open(DRIFT_REPORT_FILE, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"✅ Drift Analysis Complete. {len(suggestions)} suggestions found in {DRIFT_REPORT_FILE}")

if __name__ == "__main__":
    analyze_drift()
