/**
 * Atom mapping utility using the RXNMapper web service.
 *
 * Converts a substrate + product SMILES pair into atom-mapped reaction SMILES
 * so CLIPZyme can trace which atoms transform during the reaction.
 *
 * Falls back gracefully: if the service is unreachable or the mapping fails,
 * returns null and the caller should proceed with the original (unmapped) SMILES.
 */

const RXNMAPPER_API = 'https://rxnmapper.ai/api/attention-guided-rxnmapper';

/** Minimum confidence threshold — mappings below this are treated as failed. */
const MIN_CONFIDENCE = 0.5;

export interface AtomMappingResult {
  /** Atom-mapped substrate SMILES, e.g. [CH3:1][C:2](=[O:3])... */
  mappedSubstrate: string;
  /** Atom-mapped product SMILES */
  mappedProduct: string;
  /** RXNMapper confidence score (0–1) */
  confidence: number;
  /** Full mapped reaction SMILES: mappedSubstrate>>mappedProduct */
  raw: string;
}

/**
 * Calls RXNMapper to produce atom-mapped SMILES for a reaction.
 *
 * @returns AtomMappingResult on success, or null if mapping fails/is unavailable.
 */
export async function atomMap(
  substrateSmiles: string,
  productSmiles: string,
): Promise<AtomMappingResult | null> {
  const sub = substrateSmiles.trim();
  const prod = productSmiles.trim();
  if (!sub || !prod) return null;

  const rxnSmiles = `${sub}>>${prod}`;

  try {
    const response = await fetch(RXNMAPPER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rxn_smiles: [rxnSmiles] }),
      signal: AbortSignal.timeout(15_000), // 15 s timeout
    });

    if (!response.ok) return null;

    const data = await response.json() as {
      results?: Array<{ mapped_rxn?: string; confidence?: number }>;
    };

    const result = data?.results?.[0];
    if (!result?.mapped_rxn) return null;

    const confidence = result.confidence ?? 0;
    if (confidence < MIN_CONFIDENCE) return null;

    // Reaction SMILES format: reactants>>products  (no reagents here)
    const parts = result.mapped_rxn.split('>>');
    if (parts.length < 2) return null;

    return {
      mappedSubstrate: parts[0],
      mappedProduct:   parts[parts.length - 1],
      confidence,
      raw: result.mapped_rxn,
    };
  } catch {
    // Network error, timeout, parse failure — fail silently
    return null;
  }
}
