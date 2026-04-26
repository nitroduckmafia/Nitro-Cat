# precompute_demo.py
import argparse, json, os, time
from datetime import datetime, timezone
from pathlib import Path

import requests
from tqdm import tqdm

TOP_K = 5
HIT_THRESHOLD = 0.3
REQUEST_DELAY = 0.5
MAX_RETRIES = 3
TIMEOUT = 30


def screen(smiles: str, api: str, top_k: int, api_key: str | None) -> dict:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(
                f"{api}/api/screen",
                json={"reaction_smiles": smiles, "top_k": top_k},
                headers=headers,
                timeout=TIMEOUT,
            )
            if r.status_code < 500:
                r.raise_for_status()
                return r.json()
            raise requests.HTTPError(response=r)
        except (requests.HTTPError, requests.Timeout, requests.ConnectionError) as e:
            if attempt == MAX_RETRIES - 1:
                raise
            wait = 2 ** (attempt + 1)
            tqdm.write(f"  [retry {attempt+1}/{MAX_RETRIES}] {e} — waiting {wait}s")
            time.sleep(wait)
    raise RuntimeError("unreachable")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="synbiobeta_demo_sets.json")
    ap.add_argument("--output", default="scripts/demo/data/synbiobeta_demo_precomputed.json")
    ap.add_argument("--api", default=os.getenv("NITROCAT_API_URL", "https://nitrocat.tech"))
    ap.add_argument("--top_k", type=int, default=TOP_K)
    ap.add_argument("--delay", type=float, default=REQUEST_DELAY)
    args = ap.parse_args()

    api_key = os.getenv("NITROCAT_API_KEY")
    out_path = Path(args.output)
    partial_path = Path(str(out_path) + ".partial")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    sets: list[dict] = json.loads(Path(args.input).read_text(encoding="utf-8"))

    # load partial progress — resume after crash
    screened_ids: set[str] = set()
    working: dict[int, dict] = {s["set_id"]: json.loads(json.dumps(s)) for s in sets}
    if partial_path.exists():
        partial = json.loads(partial_path.read_text())
        for s in partial:
            working[s["set_id"]] = s
            for rxn in s["reactions"]:
                if rxn.get("screening_result") is not None:
                    screened_ids.add(rxn["id"])
        tqdm.write(f"Resuming — {len(screened_ids)} reactions already done.")

    total = sum(len(s["reactions"]) for s in sets)
    bar = tqdm(total=total, initial=len(screened_ids), unit="rxn")

    for s in sets:
        for rxn in s["reactions"]:
            rid = rxn["id"]
            if rid in screened_ids:
                continue

            bar.set_description(f"set={s['set_id']} id={rid} ec={rxn['ec']}")
            result = None
            has_hits = False
            try:
                result = screen(rxn["reaction_smiles"], args.api, args.top_k, api_key)
                has_hits = (
                    bool(result.get("results"))
                    and result["results"][0]["score"] >= HIT_THRESHOLD
                )
            except Exception as e:
                tqdm.write(f"  [WARN] {rid} failed permanently: {e}")

            for wr in working[s["set_id"]]["reactions"]:
                if wr["id"] == rid:
                    wr["screening_result"] = result
                    wr["has_hits"] = has_hits
                    wr["screened_at"] = datetime.now(timezone.utc).isoformat()
                    break

            partial_path.write_text(json.dumps(list(working.values()), indent=2))
            bar.update(1)
            time.sleep(args.delay)

    bar.close()
    partial_path.rename(out_path)
    print(f"Done. Output: {out_path}")


if __name__ == "__main__":
    main()
