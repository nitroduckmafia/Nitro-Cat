# SynBioBeta Booth Demo — NitroCat Pre-computation

## Goal

Pre-compute NitroCat enzyme-screening results for 10 × 10 reaction puzzle sets so
the booth demo runs instantly with zero API latency during visitor interactions.
Each set contains 9 "doable" reactions (CLIPZyme finds enzymes) and 1 "impossible"
reaction (CLIPZyme finds nothing), shuffled at a random position.

---

## Input

`synbiobeta_demo_sets.json` — 60.7 KB, checked into the repo root.

Top-level structure:

```jsonc
[
  {
    "set_id": 1,
    "impossible_ec": "3.10.1.1",
    "impossible_ec_name": "N-sulfoglucosamine sulfohydrolase",
    "impossible_position": 9,   // 1-indexed position of impossible reaction
    "reactions": [              // always 10 items, shuffled
      {
        "id": "D13",
        "ec": "2.4.1.91",
        "ec_name": "Quercetin 3-O-glucosyltransferase (UGT)",
        "substrate_name": "quercetin + UDP-glucose",
        "product_name": "isoquercitrin + UDP",
        "reaction_smiles": "Oc1ccc(...)cc1O.OC[C@H]1O...>>...",
        "story": "UGT-catalysed glucosylation of quercetin...",
        "is_impossible": false
        // impossible reactions also have:
        // "n_training_examples": 1
      },
      ...
    ]
  },
  ...
]
```

---

## NitroCat API

Base URL: `https://nitrocat.tech` (or local dev: `http://localhost:8000`)

### Endpoint

```
POST /api/screen
Content-Type: application/json

{
  "reaction_smiles": "N[C@@H](Cc1ccccc1)C(=O)O>>OC(=O)/C=C/c1ccccc1.N",
  "top_k": 5
}
```

### Response

```jsonc
{
  "results": [
    {
      "rank": 1,
      "enzyme_name": "Phenylalanine ammonia-lyase",
      "uniprot_id": "Q9MAQ4",
      "organism": "Arabidopsis thaliana",
      "score": 0.847,
      "ec": "4.3.1.24",
      "sequence_length": 716
    },
    ...
  ],
  "query_smiles": "...",
  "n_results": 5,
  "screening_time_ms": 230
}
```

For **impossible** reactions: `results` will be empty or all scores < 0.1.

---

## What to build

### 1. Pre-computation script — `precompute_demo.py`

```
python precompute_demo.py \
  --input  synbiobeta_demo_sets.json \
  --output synbiobeta_demo_precomputed.json \
  --api    https://nitrocat.tech \
  --top_k  5 \
  --delay  0.5          # seconds between API calls, be gentle
```

For each of the 100 reactions (10 sets × 10 reactions):
1. POST to `/api/screen` with `reaction_smiles` and `top_k`
2. Attach the full API response to the reaction object as `"screening_result"`
3. Add a boolean `"has_hits"` = `len(results) > 0 and results[0]["score"] >= 0.3`
4. Save progress incrementally (crash-safe) — write after every reaction

**Output shape per reaction:**

```jsonc
{
  ...all original fields...,
  "screening_result": { ...API response... },
  "has_hits": true,
  "screened_at": "2026-04-25T12:34:56Z"
}
```

**Crash safety:** Write a `.partial` file after every reaction; rename to final
output only when all 100 are done. On restart, skip already-screened reactions
by checking for `"screening_result"` in the loaded partial.

**Error handling:**
- Retry up to 3× on HTTP 5xx / timeout (exponential backoff: 2s, 4s, 8s)
- On permanent failure, store `"screening_result": null` and `"has_hits": false`
- Print a warning; do not crash the whole run

**Progress bar:** use `tqdm` — show set number, reaction id, EC number.

---

### 2. Validation script — `validate_precomputed.py`

Quick sanity check after pre-computation:

```
python validate_precomputed.py synbiobeta_demo_precomputed.json
```

Checks:
- All 10 sets present, each has exactly 10 reactions
- Every reaction has `screening_result` (not null)
- `has_hits` is consistent with `screening_result`
- Impossible reactions: `has_hits` should be `false` — flag any that are `true`
  (this is scientifically interesting — may mean CLIPZyme surprised us)
- Doable reactions: count how many have `has_hits == true` vs `false`
- Print per-set summary table

---

### 3. Demo server — `demo_server.py`

Tiny FastAPI server that serves the pre-computed data to the booth frontend.

```
uvicorn demo_server:app --port 4242
```

Endpoints:

```
GET  /sets                    → list of {set_id, impossible_ec, impossible_ec_name}
GET  /sets/{set_id}           → full set with all reactions + screening_results
GET  /sets/{set_id}/reveal    → same but with impossible_position included
```

The frontend should only call `/reveal` after the visitor has made their guess.

---

### 4. Molecule image helper — `render_reactions.py`

Pre-render SVG images for all unique molecules using RDKit so the frontend
doesn't need RDKit.

```
python render_reactions.py \
  --input  synbiobeta_demo_precomputed.json \
  --outdir static/mol_images/
```

For each reaction:
- Split SMILES at `>>` into reactants and products
- Split reactants/products at `.`
- Render each unique SMILES as 300 × 200 SVG using `Chem.Draw.MolToImage` or
  `rdkit.Chem.Draw.rdMolDraw2D.MolDraw2DSVG`
- Save as `static/mol_images/{canonical_smiles_hash}.svg`
- Write an index `static/mol_images/index.json`: `{smiles: filename}`

---

## Output files

| File | Purpose |
|---|---|
| `synbiobeta_demo_precomputed.json` | Pre-computed results, all 100 reactions |
| `static/mol_images/*.svg` | Pre-rendered molecule images |
| `static/mol_images/index.json` | SMILES → filename map |

---

## Environment

```bash
pip install requests tqdm fastapi uvicorn rdkit
```

Required env vars:

```bash
export NITROCAT_API_URL="https://nitrocat.tech"   # or http://localhost:8000
export NITROCAT_API_KEY="..."                      # if auth is needed
```

---

## Key constants

```python
TOP_K = 5
HIT_THRESHOLD = 0.3     # score above which we consider a result a "hit"
REQUEST_DELAY = 0.5     # seconds between API calls
MAX_RETRIES = 3
TIMEOUT = 30            # seconds per request
```

---

## Demo logic (for frontend reference)

1. Load `synbiobeta_demo_precomputed.json`
2. Pick a set (rotate through sets 1–10 per visitor group)
3. Display 10 reactions as cards — show substrate name, product name, molecule
   images, EC class, and `story`
4. Visitor taps the card they think is impossible
5. Reveal: highlight correct card (impossible one) in red, others in green
6. Show NitroCat's screening result for each reaction — top hits for doable ones,
   empty results for the impossible one
7. Show the `story` for the impossible reaction explaining *why* CLIPZyme can't
   find it (`n_training_examples` makes a good visual: "1 example in 46,000")

---

## Notes

- Reaction SMILES include full cofactors (NADPH, ATP, CoA etc.) — the long SMILES
  are correct but visually noisy. For display, consider showing only the organic
  substrate/product pair (split on `.` and show the shortest component, or the
  component not containing nucleotide SMARTS `n1cnc2c(N)ncnc12`).
- All 100 reaction SMILES are RDKit-validated. Safe to call `Chem.MolFromSmiles`
  on any component.
- `impossible_position` is 1-indexed. Use it only for the reveal — never show it
  before the visitor guesses.
- The `id` field (D01–D39, IMP01–IMP10) is stable across sets; use it as a
  cache key if you re-run pre-computation.
