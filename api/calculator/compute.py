import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CALC_DIR = os.path.join(BASE_DIR, 'services', 'calculator')
if CALC_DIR not in sys.path:
    sys.path.append(CALC_DIR)

from formulas import FORMULAS  # noqa: E402


def _parse_body(request):
    body = getattr(request, 'body', None)
    if body is None:
        return None
    if isinstance(body, (bytes, bytearray)):
        raw = body.decode('utf-8')
    elif isinstance(body, str):
        raw = body
    else:
        return None
    raw = raw.strip()
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def handler(request):
    if getattr(request, 'method', 'POST') != 'POST':
        return {
            "statusCode": 405,
            "headers": {"content-type": "application/json"},
            "body": json.dumps({"error": "Method Not Allowed"}),
        }

    body = _parse_body(request)
    if not body or 'requests' not in body:
        return {
            "statusCode": 400,
            "headers": {"content-type": "application/json"},
            "body": json.dumps({"error": "Invalid body"}),
        }

    results = []
    for req in body.get('requests', []):
        formula = req.get('formula')
        inputs = req.get('inputs') or {}
        ref_id = req.get('ref_id')

        if formula not in FORMULAS:
            results.append({
                "ref_id": ref_id,
                "formula": formula,
                "result": None,
                "error": f"Formula '{formula}' not found",
            })
            continue

        try:
            fn = FORMULAS[formula]
            result = fn(**inputs)
            results.append({
                "ref_id": ref_id,
                "formula": formula,
                "result": result,
                "error": None,
            })
        except Exception as exc:
            results.append({
                "ref_id": ref_id,
                "formula": formula,
                "result": None,
                "error": str(exc),
            })

    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(results),
    }
