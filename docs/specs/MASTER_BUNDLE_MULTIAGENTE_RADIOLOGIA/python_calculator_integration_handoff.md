# Integração de cálculos via Python (anti-erros de conta) — Handoff completo

Objetivo: eliminar erros aritméticos do LLM (percentuais, razões, índices e conversões), garantindo que **o modelo nunca calcule**.

Princípio: o LLM **não faz aritmética**. Ele apenas:
1) extrai os números do caso,
2) cria uma lista `compute_requests[]` (JSON) com os cálculos necessários,
3) recebe `compute_results[]` (JSON) calculados por Python,
4) renderiza o laudo final usando somente os resultados retornados.

---

## Arquitetura recomendada (alto nível)

1. **Extractor (LLM)** → gera `ReportJSON` + `compute_requests[]` (sem contas)
2. **Calculator (Python, determinístico)** → executa somente fórmulas permitidas e devolve `compute_results[]`
3. **QA (LLM + regras determinísticas)** → valida consistência, banlist e se os cálculos obrigatórios existem
4. **Renderer (LLM)** → escreve o laudo final incorporando `compute_results[]`

Pontos-chave:
- Fórmulas são **whitelist** (nada de eval, nada de código arbitrário).
- Entradas e saídas são validadas por schema (Zod no backend, Pydantic no Python).
- Se um cálculo obrigatório falhar (`ok=false`), o pipeline deve reescrever o trecho sem o índice e sinalizar revisão, ou reexecutar a etapa de extração para obter números faltantes.

---

## Contratos JSON (padrão)

### ComputeRequest
```json
{
  "id": "adrenal_1",
  "type": "adrenal_csi",
  "inputs": {
    "ip": 312.4,
    "op": 148.2,
    "spleen_ip": 280.0,
    "spleen_op": 276.0
  },
  "meta": {
    "unit": "a.u.",
    "source": "ROI signal",
    "notes": "T1 in-phase/out-of-phase"
  }
}
```

### ComputeResult
```json
{
  "id": "adrenal_1",
  "type": "adrenal_csi",
  "ok": true,
  "results": {
    "sii_percent": 52.6,
    "csi_ratio": 0.474,
    "adrenal_spleen_ratio": 0.480
  },
  "error": null
}
```

### Regras de arredondamento (fixas)
- Percentuais (ex.: SII): 1 casa decimal
- Razões (ex.: OP/IP, A/S): 3 casas decimais
- Se houver divisão por zero ou input ausente: `ok=false` e `error` preenchido

---

## Fórmulas whitelist (exemplos úteis)

### 1) Adrenal CSI (RM com deslocamento químico)
Entradas:
- `ip`: sinal T1 em fase (in-phase)
- `op`: sinal T1 fora de fase (out-of-phase)
- `spleen_ip` e `spleen_op` (opcionais) para A/S-CSI

Saídas:
- `sii_percent = ((ip - op) / ip) * 100`
- `csi_ratio = op / ip`
- `adrenal_spleen_ratio = (op/ip)_adrenal / (op/ip)_spleen` (se baço disponível)

### 2) IMC (exemplo genérico)
- `bmi = weight_kg / (height_m^2)`

### 3) Superfície corporal (BSA, se quiser)
- `bsa = sqrt( (height_cm * weight_kg) / 3600 )`

Observação: não adicione fórmulas “ad hoc”. Cada fórmula nova deve entrar como um novo `type` e ganhar testes.

---

## Opção A (recomendada): microserviço Python (FastAPI) "calculator"

Vantagens:
- previsível, fácil de escalar, fácil de testar e auditar
- isolado do backend principal
- baixa chance de travar o processo principal

### A.1. Estrutura sugerida
```
services/
  calculator/
    calculator_service.py
    requirements.txt
    tests/
      test_calcs.py
```

### A.2. Código exemplo (FastAPI + Pydantic, whitelist)
```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Literal, Optional
import math

app = FastAPI(title="Radiology Calculator", version="1.0")

CalcType = Literal["adrenal_csi", "bmi", "bsa"]

class CalcReq(BaseModel):
    id: str
    type: CalcType
    inputs: dict

class CalcBatch(BaseModel):
    calculations: List[CalcReq]

class CalcRes(BaseModel):
    id: str
    type: CalcType
    ok: bool
    results: Optional[dict] = None
    error: Optional[str] = None

def safe_div(a: float, b: float) -> float:
    if b == 0 or math.isclose(b, 0.0):
        raise ZeroDivisionError("division by zero")
    return a / b

@app.post("/compute", response_model=List[CalcRes])
def compute(batch: CalcBatch):
    out: List[CalcRes] = []
    for c in batch.calculations:
        try:
            t = c.type
            x = c.inputs

            if t == "adrenal_csi":
                ip = float(x.get("ip"))
                op = float(x.get("op"))
                sii = (ip - op) * 100.0 / ip
                ratio_ad = safe_div(op, ip)

                a_s = None
                if x.get("spleen_ip") is not None and x.get("spleen_op") is not None:
                    sp_ip = float(x.get("spleen_ip"))
                    sp_op = float(x.get("spleen_op"))
                    ratio_sp = safe_div(sp_op, sp_ip)
                    a_s = safe_div(ratio_ad, ratio_sp)

                out.append(CalcRes(
                    id=c.id,
                    type=t,
                    ok=True,
                    results={
                        "sii_percent": round(sii, 1),
                        "csi_ratio": round(ratio_ad, 3),
                        "adrenal_spleen_ratio": (round(a_s, 3) if a_s is not None else None),
                    }
                ))

            elif t == "bmi":
                w = float(x.get("weight_kg"))
                h = float(x.get("height_m"))
                bmi = safe_div(w, h * h)
                out.append(CalcRes(id=c.id, type=t, ok=True, results={"bmi": round(bmi, 1)}))

            elif t == "bsa":
                w = float(x.get("weight_kg"))
                h = float(x.get("height_cm"))
                bsa = math.sqrt((h * w) / 3600.0)
                out.append(CalcRes(id=c.id, type=t, ok=True, results={"bsa": round(bsa, 3)}))

            else:
                raise ValueError(f"unsupported calc type: {t}")

        except Exception as e:
            out.append(CalcRes(id=c.id, type=c.type, ok=False, error=str(e)))

    return out
```

### A.3. Execução
```bash
pip install -r requirements.txt
uvicorn calculator_service:app --host 0.0.0.0 --port 8081
```

### A.4. Integração no backend (Node/TS)
```ts
export async function computeFormulas(payload: any) {
  const res = await fetch(process.env.CALC_URL + "/compute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`calculator failed: ${res.status}`);
  return await res.json();
}
```

### A.5. Observabilidade
- Logar: `case_id`, lista de `type`, `ok`, e `error` (sem PHI desnecessária)
- Salvar artefatos: `compute_requests.json` e `compute_results.json` por caso

---

## Opção B: script Python "spawn" por request (rápida para plugar)

Vantagens:
- simples e rápido de começar

Desvantagens:
- overhead por processo
- mais cuidado com concorrência/timeouts

### B.1. Script calc.py (stdin → stdout)
```python
import json
import sys
import math

def safe_div(a, b):
    if b == 0 or math.isclose(b, 0.0):
        raise ZeroDivisionError("division by zero")
    return a / b

def main():
    payload = json.load(sys.stdin)
    calcs = payload.get("calculations", [])
    out = []

    for c in calcs:
        try:
            t = c["type"]
            cid = c["id"]
            x = c.get("inputs", {})

            if t == "adrenal_csi":
                ip = float(x["ip"])
                op = float(x["op"])
                sii = (ip - op) * 100.0 / ip
                ratio_ad = safe_div(op, ip)
                out.append({
                    "id": cid,
                    "type": t,
                    "ok": True,
                    "results": {
                        "sii_percent": round(sii, 1),
                        "csi_ratio": round(ratio_ad, 3)
                    },
                    "error": None
                })
            else:
                raise ValueError("unsupported calc")

        except Exception as e:
            out.append({"id": c.get("id"), "type": c.get("type"), "ok": False, "results": None, "error": str(e)})

    json.dump(out, sys.stdout)

if __name__ == "__main__":
    main()
```

### B.2. Node/TS chamando o Python
```ts
import { spawn } from "child_process";

export function computeWithPythonSpawn(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const p = spawn("python3", ["calc.py"], { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `python exit ${code}`));
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });

    p.stdin.write(JSON.stringify(payload));
    p.stdin.end();

    // opcional: timeout
    setTimeout(() => {
      p.kill("SIGKILL");
      reject(new Error("python calc timeout"));
    }, 3000);
  });
}
```

---

## Como instruir o LLM (trecho de prompt pronto)

Cole este bloco no prompt do **Extractor**:

```text
REGRA: VOCÊ NÃO DEVE FAZER NENHUMA CONTA.
- Se precisar de índices/percentuais/razões, crie compute_requests[] com os números extraídos.
- NÃO calcule SII/CSI/razões. NÃO estime. NÃO arredonde.
- Se algum número estiver ausente, preencha como null e marque needs_review.
- O texto final do laudo deve usar apenas compute_results[] retornados pelo calculator.
```

No prompt do **Renderer**:

```text
REGRA: VOCÊ NÃO DEVE RECALCULAR.
- Use exclusivamente os valores em compute_results[].
- Se algum compute_result.ok = false, não inclua o índice no texto e sinalize revisão.
```

---

## QA determinístico (obrigatório)

Antes de devolver o laudo:
1) Validar schema do `ReportJSON` e do `compute_results[]`
2) Verificar se todos os cálculos obrigatórios para o caso foram solicitados (ex.: lesão adrenal em CSI)
3) Banlist de meta-texto (ex.: “conforme áudio”, “segundo o input”, “neste laudo”)
4) Blacklist terminológica (ex.: “subsentimétrico”, “zonalidade prostática”)

Se falhar:
- tentar reescrita corretiva (sem mudar fatos)
- se persistir, escalar para modelo mais robusto (gating) ou marcar revisão humana

---

## Critérios de aceitação (para a outra IA implementar)

1) O pipeline nunca devolve índice calculado pelo LLM (somente pelo Python)
2) Para `adrenal_csi`, o serviço retorna SII e OP/IP corretamente com arredondamento fixo
3) Inputs faltantes geram `ok=false` com `error` explícito
4) Logs/artefatos por `case_id`: `compute_requests.json` e `compute_results.json`
5) Testes unitários com valores conhecidos (incluindo divisão por zero)

---

## Decisão recomendada

- Produção/escala: **Opção A (FastAPI)**
- Protótipo rápido/local: **Opção B (spawn)**

