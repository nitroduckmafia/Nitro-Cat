# demo_server.py
import json, os
from copy import deepcopy
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

DATA_PATH = os.getenv(
    "DEMO_DATA_PATH",
    str(Path(__file__).parent / "data" / "synbiobeta_demo_precomputed.json"),
)

app = FastAPI(title="NitroCat Demo Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_sets: dict[int, dict] = {}


@app.on_event("startup")
def load_data() -> None:
    raw: list[dict] = json.loads(Path(DATA_PATH).read_text())
    for s in raw:
        _sets[s["set_id"]] = s
    print(f"Loaded {len(_sets)} sets from {DATA_PATH}")


@app.get("/sets")
def list_sets() -> list[dict]:
    return [
        {"set_id": s["set_id"], "impossible_ec": s["impossible_ec"], "impossible_ec_name": s["impossible_ec_name"]}
        for s in _sets.values()
    ]


@app.get("/sets/{set_id}")
def get_set(set_id: int) -> dict:
    if set_id not in _sets:
        raise HTTPException(status_code=404, detail=f"Set {set_id} not found")
    s = deepcopy(_sets[set_id])
    s.pop("impossible_position", None)  # hide until reveal
    return s


@app.get("/sets/{set_id}/reveal")
def reveal_set(set_id: int) -> dict:
    if set_id not in _sets:
        raise HTTPException(status_code=404, detail=f"Set {set_id} not found")
    return deepcopy(_sets[set_id])  # includes impossible_position
