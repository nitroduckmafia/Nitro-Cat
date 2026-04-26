export interface Enzyme {
  id: string;
  name: string;
  ecNumber: string;
  score: number; // 0-1
  organism: string;
  description: string;
  optimalPh: string;
  optimalTemp: string;
  kcat: string;
  km: string;
  projectedYield: string;
  vendor: string;
  vendorLogo: string;
  price: string;
  catalogNumber: string;
}

export interface GroupStatNumeric {
  median: number;
  q1: number;
  q3: number;
  mean: number;
  min: number;
  max: number;
  n: number;
}

export interface GroupStatCofactor {
  name: string;
  count: number;
}

export interface GroupStats {
  n_enzymes: number;
  temperature: GroupStatNumeric | null;
  ph: GroupStatNumeric | null;
  km_mM: GroupStatNumeric | null;
  kcat_per_s: GroupStatNumeric | null;
  cofactors: GroupStatCofactor[];
}
