# render_reactions.py
import argparse, hashlib, json
from pathlib import Path

from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D


def canonical(smi: str) -> str | None:
    mol = Chem.MolFromSmiles(smi)
    return Chem.MolToSmiles(mol) if mol else None


def render_svg(smi: str, w: int = 300, h: int = 200) -> str:
    mol = Chem.MolFromSmiles(smi)
    drawer = rdMolDraw2D.MolDraw2DSVG(w, h)
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()


def collect_smiles(data: list[dict]) -> set[str]:
    unique: set[str] = set()
    for s in data:
        for rxn in s["reactions"]:
            parts = rxn["reaction_smiles"].split(">>")
            for side in parts:
                for component in side.split("."):
                    c = component.strip()
                    if c:
                        unique.add(c)
    return unique


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="scripts/demo/data/synbiobeta_demo_precomputed.json")
    ap.add_argument("--outdir", default="scripts/demo/static/mol_images/")
    args = ap.parse_args()

    out = Path(args.outdir)
    out.mkdir(parents=True, exist_ok=True)

    data: list[dict] = json.loads(Path(args.input).read_text())
    smiles_set = collect_smiles(data)
    print(f"Rendering {len(smiles_set)} unique SMILES components...")

    index: dict[str, str] = {}
    skipped = 0
    for smi in smiles_set:
        can = canonical(smi)
        if can is None:
            print(f"  [SKIP] invalid SMILES: {smi[:60]}")
            skipped += 1
            continue
        fname = hashlib.sha256(can.encode()).hexdigest()[:16] + ".svg"
        svg = render_svg(can)
        (out / fname).write_text(svg)
        index[smi] = fname

    (out / "index.json").write_text(json.dumps(index, indent=2))
    print(f"Done. {len(index)} SVGs written, {skipped} skipped. Index: {out / 'index.json'}")


if __name__ == "__main__":
    main()
