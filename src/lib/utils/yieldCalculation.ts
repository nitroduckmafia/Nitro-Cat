// Integrated Michaelis–Menten kinetics for batch reactors.
//
// Governing equation (integrated M–M):
//   Vmax * t = P + Km * ln( S0 / (S0 - P) )
//
// where:
//   Vmax = kcat * [E]            (mol · L⁻¹ · s⁻¹)
//   [E]  = m_E / (MW_E * V)      (mol · L⁻¹)
//   S0   = m_S / (MW_S * V)      (mol · L⁻¹)   — initial substrate concentration
//   P    = m_P / (MW_P * V)      (mol · L⁻¹)   — product concentration at time t
//
// All inputs are expected in SI-ish coherent units (grams, mol, litres, seconds).

export interface YieldParams {
  mwE: number;   // g/mol  — enzyme molecular weight (from UniProt, Da = g/mol)
  mwS: number;   // g/mol  — substrate molecular weight (from PubChem)
  mwP: number;   // g/mol  — product molecular weight (from PubChem)
  kcat: number;  // s⁻¹    — turnover number (from BRENDA, backend)
  km: number;    // mol/L  — Michaelis constant (from BRENDA, backend)
  mE: number;    // g      — mass of enzyme used
  mS: number;    // g      — mass of substrate used
  V: number;     // L      — reaction volume
}

/**
 * Product concentration P(t) — numerical root of
 *   Vmax*t − (P + Km * ln(S0/(S0 − P))) = 0
 * using Newton's method (stand-in for scipy.optimize.fsolve).
 * Returns P clamped to [0, S0].
 */
export function productConcentration(t: number, p: YieldParams): number {
  const Vmax = (p.kcat * p.mE) / (p.mwE * p.V);
  const S0 = p.mS / (p.mwS * p.V);
  if (!isFinite(Vmax) || !isFinite(S0) || Vmax <= 0 || S0 <= 0) return 0;

  let P = S0 * 0.5;
  for (let i = 0; i < 200; i++) {
    if (P >= S0) P = S0 * (1 - 1e-9);
    if (P <= 0)  P = S0 * 1e-9;
    const f = Vmax * t - (P + p.km * Math.log(S0 / (S0 - P)));
    const df = -(1 + p.km / (S0 - P));
    const dP = f / df;
    P -= dP;
    if (Math.abs(dP) < 1e-14) break;
  }
  return Math.max(0, Math.min(P, S0));
}

/**
 * Mass of product at time t (grams), using
 *   m_P = m_S * (MW_P / MW_S) * (P(t) / S0)
 */
export function massProductAtTime(t: number, p: YieldParams): number {
  const S0 = p.mS / (p.mwS * p.V);
  if (S0 <= 0) return 0;
  const P = productConcentration(t, p);
  return p.mS * (p.mwP / p.mwS) * (P / S0);
}

/**
 * Analytical inverse: time required to reach a given product mass m_P.
 *
 *   t = (MW_E·V)/(kcat·m_E) · [ m_P/(MW_P·V) + Km · ln( (m_S/MW_S) / (m_S/MW_S − m_P/MW_P) ) ]
 */
export function reactionTimeForMassProduct(mP: number, p: YieldParams): number {
  const prefactor = (p.mwE * p.V) / (p.kcat * p.mE);
  const nS = p.mS / p.mwS;
  const nP = mP / p.mwP;
  if (nS - nP <= 0) return Infinity;
  const bracket = mP / (p.mwP * p.V) + p.km * Math.log(nS / (nS - nP));
  return prefactor * bracket;
}

/**
 * Convenience wrapper — predicted yield reported as mass of product (grams)
 * assuming a target fractional conversion of the substrate (default 99%).
 * Also reports the reaction time required to reach that conversion.
 */
export function predictYield(
  p: YieldParams,
  targetConversion = 0.99,
): { massProductG: number; timeS: number } {
  // Target product mass from stoichiometry m_P = f · m_S · (MW_P / MW_S)
  const mP = targetConversion * p.mS * (p.mwP / p.mwS);
  const t = reactionTimeForMassProduct(mP, p);
  return { massProductG: mP, timeS: t };
}
