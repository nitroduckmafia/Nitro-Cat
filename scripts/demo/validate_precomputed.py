# validate_precomputed.py
import json, sys
from pathlib import Path

HIT_THRESHOLD = 0.3


def check(path: str) -> bool:
    data: list[dict] = json.loads(Path(path).read_text())
    ok = True

    if len(data) != 10:
        print(f"[FAIL] Expected 10 sets, got {len(data)}")
        ok = False

    print(f"{'set_id':>6}  {'doable hits':>11}  {'doable miss':>11}  {'imp. surprise':>13}")
    print("-" * 50)

    for s in data:
        sid = s["set_id"]
        reactions = s["reactions"]

        if len(reactions) != 10:
            print(f"[FAIL] Set {sid}: expected 10 reactions, got {len(reactions)}")
            ok = False

        hits = misses = surprises = 0
        for rxn in reactions:
            rid = rxn["id"]
            sr = rxn.get("screening_result")
            if sr is None:
                print(f"  [FAIL] {rid}: screening_result is null")
                ok = False
                continue

            # re-derive has_hits from stored result and check consistency
            results = sr.get("results", []) if sr else []
            expected_hits = bool(results) and results[0]["score"] >= HIT_THRESHOLD
            if rxn.get("has_hits") != expected_hits:
                print(f"  [FAIL] {rid}: has_hits mismatch (stored={rxn.get('has_hits')}, derived={expected_hits})")
                ok = False

            if rxn.get("is_impossible"):
                if rxn.get("has_hits"):
                    print(f"  [NOTE] {rid}: impossible reaction has hits — CLIPZyme surprised us!")
                    surprises += 1
            else:
                if rxn.get("has_hits"):
                    hits += 1
                else:
                    misses += 1

        print(f"{sid:>6}  {hits:>11}  {misses:>11}  {surprises:>13}")

    return ok


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <precomputed.json>")
        sys.exit(1)
    sys.exit(0 if check(sys.argv[1]) else 1)
