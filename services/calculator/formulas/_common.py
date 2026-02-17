"""
Helpers comuns para fórmulas de cálculo.
"""
from typing import Optional
import unicodedata

def _normalize_text(value: Optional[str]) -> str:
    if value is None:
        return ""
    text = str(value)
    normalized = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return stripped.lower().strip()


def _safe_div(numerator: float, denominator: float, precision: Optional[int] = None):
    if denominator in (0, None):
        return None
    value = numerator / denominator
    if precision is None:
        return value
    return round(value, precision)


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return bool(value)
    return _normalize_text(value) in {"true", "sim", "yes", "1"}


def _volume_ellipsoid(d1: float, d2: float, d3: float, factor: float = 0.52, precision: int = 2) -> float:
    return round(factor * d1 * d2 * d3, precision)


def _ri_value(psv: float, edv: float) -> Optional[float]:
    return _safe_div(psv - edv, psv, 2)


def _result(value, category: Optional[str] = None, **extras):
    payload = {"value": value}
    if category is not None:
        payload["category"] = category
    payload.update(extras)
    return payload
