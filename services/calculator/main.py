from fastapi import FastAPI
from schemas import CalcBatch, CalcResult
from formulas import FORMULAS

app = FastAPI(title="Radon Calculator Service")

@app.get("/health")
def health():
    return {"status": "ok", "formulas_available": list(FORMULAS.keys())}

@app.post("/compute", response_model=list[CalcResult])
def compute(batch: CalcBatch) -> list[CalcResult]:
    results = []
    for req in batch.requests:
        if req.formula not in FORMULAS:
            results.append(CalcResult(
                ref_id=req.ref_id,
                formula=req.formula,
                result=None,
                error=f"Formula '{req.formula}' not found",
            ))
            continue

        try:
            fn = FORMULAS[req.formula]
            result = fn(**req.inputs)
            results.append(CalcResult(
                ref_id=req.ref_id,
                formula=req.formula,
                result=result,
                error=None,
            ))
        except Exception as e:
            results.append(CalcResult(
                ref_id=req.ref_id,
                formula=req.formula,
                result=None,
                error=str(e),
            ))

    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
