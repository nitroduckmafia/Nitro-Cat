// External biological-data fetchers used by the yield prediction card.
//
// PubChem — molecular weight by CID.
// UniProt — protein mass by accession (Daltons ≡ g/mol numerically).

export async function fetchPubChemMolecularWeight(cid: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularWeight/JSON`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const mw = data?.PropertyTable?.Properties?.[0]?.MolecularWeight;
    const parsed = typeof mw === 'number' ? mw : parseFloat(mw);
    return isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function fetchPubChemMolecularWeightBySmiles(smiles: string): Promise<number | null> {
  try {
    const res = await fetch(
      'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/property/MolecularWeight/JSON',
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `smiles=${encodeURIComponent(smiles)}` },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const mw = data?.PropertyTable?.Properties?.[0]?.MolecularWeight;
    const parsed = typeof mw === 'number' ? mw : parseFloat(mw);
    return isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function fetchUniProtMolecularWeight(accession: string): Promise<number | null> {
  try {
    const res = await fetch(`https://rest.uniprot.org/uniprotkb/${accession}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const mw = data?.sequence?.molWeight; // Daltons
    return typeof mw === 'number' && isFinite(mw) ? mw : null;
  } catch {
    return null;
  }
}
