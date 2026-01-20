from pydantic import BaseModel
from typing import Any, Optional

class CalcRequest(BaseModel):
    formula: str
    inputs: dict[str, Any]
    ref_id: Optional[str] = None

class CalcResult(BaseModel):
    ref_id: Optional[str]
    formula: str
    result: Any
    error: Optional[str] = None

class CalcBatch(BaseModel):
    requests: list[CalcRequest]
