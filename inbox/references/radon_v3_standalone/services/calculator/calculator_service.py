from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Literal, Optional, Union
import math
import uuid
import uvicorn

app = FastAPI(title="Radon V3 Calculator Service")

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Contracts ---

class ComputeRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    operation: Literal[
        "calculate_volume_ellipsoid",
        "calculate_adrenal_washout",
        "calculate_prostate_density",
        "calculate_bmi",
        "calculate_splenic_volume_chow",
        "classify_hepatic_steatosis"
    ]
    params: Dict[str, float]

class ComputeResult(BaseModel):
    request_id: str
    success: bool
    value: Optional[float] = None
    formatted_string: Optional[str] = None
    error_message: Optional[str] = None
    details: Optional[Dict] = None

# --- Logic ---

def safe_div(n: float, d: float) -> float:
    if d == 0:
        raise ValueError("Division by zero")
    return n / d

@app.post("/compute", response_model=ComputeResult)
async def compute(req: ComputeRequest):
    try:
        result_val = 0.0
        fmt = ""
        details = {}
        
        if req.operation == "calculate_volume_ellipsoid":
            d1 = req.params.get("d1")
            d2 = req.params.get("d2")
            d3 = req.params.get("d3")
            if not all([d1, d2, d3]):
                raise ValueError("Missing dimensions d1, d2, d3")
            
            result_val = 0.52 * d1 * d2 * d3
            fmt = f"{result_val:.1f} cm³"

        elif req.operation == "calculate_adrenal_washout":
            enhanced = req.params.get("enhanced_hu")
            delayed = req.params.get("delayed_hu")
            unenhanced = req.params.get("unenhanced_hu")
            
            if None in [enhanced, delayed, unenhanced]:
                raise ValueError("Missing HU values")
            
            # Absolute Washout
            num_abs = enhanced - delayed
            den_abs = enhanced - unenhanced
            abs_wo = safe_div(num_abs, den_abs) * 100
            
            # Relative Washout
            num_rel = enhanced - delayed
            den_rel = enhanced
            rel_wo = safe_div(num_rel, den_rel) * 100
            
            # Logic for result value: returning Absolute primarily
            result_val = abs_wo
            fmt = f"Absolute: {abs_wo:.1f}% | Relative: {rel_wo:.1f}%"
            details = {"absolute_percent": round(abs_wo, 1), "relative_percent": round(rel_wo, 1)}

        elif req.operation == "calculate_prostate_density":
            psa = req.params.get("psa_ng_ml")
            vol = req.params.get("volume_cc")
            
            if not all([psa, vol]):
                raise ValueError("Missing PSA or Volume")
                
            density = safe_div(psa, vol)
            result_val = density
            fmt = f"{density:.2f} ng/ml/cc"

        elif req.operation == "calculate_bmi":
            weight = req.params.get("weight_kg")
            height = req.params.get("height_m")
            
            if not all([weight, height]):
                raise ValueError("Missing Weight or Height")
            
            bmi = safe_div(weight, (height * height))
            result_val = bmi
            fmt = f"{bmi:.1f} kg/m²"
            
        elif req.operation == "calculate_splenic_volume_chow":
            # Params: height_cm (float), sex ("M"|"F"), length_cm, width_cm, thickness_cm
            height = req.params.get("height_cm")
            sex = req.params.get("sex")
            l = req.params.get("length_cm")
            w = req.params.get("width_cm")
            t = req.params.get("thickness_cm")

            if not all([height, sex, l, w, t]):
                raise ValueError("Missing params for Splenomegaly calc")
            
            # 1. Calculate Estimated Volume (Ellipsoid)
            est_vol = 0.52 * l * w * t
            
            # 2. Calculate ULN (Upper Limit Normal) based on Chow et al.
            uln_len = 0.0
            uln_vol = 0.0
            
            if sex.upper() == "F":
                # ULN len: (0.0282 * H) + 7.5526
                # ULN vol: (7.0996 * H) - 939.5
                uln_len = (0.0282 * height) + 7.5526
                uln_vol = (7.0996 * height) - 939.5
            else:
                # ULN len: (0.0544 * H) + 3.6693
                # ULN vol: (4.3803 * H) - 457.15
                uln_len = (0.0544 * height) + 3.6693
                uln_vol = (4.3803 * height) - 457.15
                
            is_enlarged_vol = est_vol > uln_vol
            is_enlarged_len = l > uln_len
            
            result_val = est_vol
            fmt = f"Vol: {est_vol:.1f} cm³ (ULN: {uln_vol:.1f}) | Len: {l} cm (ULN: {uln_len:.1f})"
            details = {
                "estimated_volume_cc": round(est_vol, 2),
                "uln_volume_cc": round(uln_vol, 2),
                "uln_length_cm": round(uln_len, 2),
                "is_splenomegaly": is_enlarged_vol or is_enlarged_len,
                "criterion": "Chow et al. Radiology 2016"
            }

        elif req.operation == "classify_hepatic_steatosis":
            liver_hu = req.params.get("liver_hu")
            if liver_hu is None:
                raise ValueError("Missing liver_hu")
                
            grade = "Normal/Ausente"
            if liver_hu < 23:
                grade = "Acentuada (Grave)"
            elif 23 <= liver_hu < 40:
                grade = "Moderada"
            elif 40 <= liver_hu < 57:
                grade = "Leve"
            # >= 57 is Normal
            
            result_val = float(liver_hu)
            fmt = f"{liver_hu} HU: Steatosis Grade = {grade}"
            details = {
                "grade": grade,
                "reference": "Starekova J, et al. Radiology 2021"
            }

        return ComputeResult(
            request_id=req.request_id,
            success=True,
            value=result_val,
            formatted_string=fmt,
            details=details
        )

    except Exception as e:
        return ComputeResult(
            request_id=req.request_id,
            success=False,
            error_message=str(e)
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
