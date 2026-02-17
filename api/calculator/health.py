import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CALC_DIR = os.path.join(BASE_DIR, 'services', 'calculator')
if CALC_DIR not in sys.path:
    sys.path.append(CALC_DIR)

from formulas import FORMULAS  # noqa: E402


def handler(request):
    if getattr(request, 'method', 'GET') != 'GET':
        return {
            "statusCode": 405,
            "headers": {"content-type": "application/json"},
            "body": json.dumps({"error": "Method Not Allowed"}),
        }

    payload = {"status": "ok", "formulas_available": list(FORMULAS.keys())}
    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(payload),
    }
