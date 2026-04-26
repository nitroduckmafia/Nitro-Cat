// demo.ts
export interface EnzymeHit {
  rank: number;
  enzyme_name: string;
  uniprot_id: string;
  organism: string;
  score: number;
  ec: string;
  sequence_length: number;
}

export interface ScreeningResult {
  results: EnzymeHit[];
  n_results: number;
  screening_time_ms: number;
  query_smiles: string;
}

export interface DemoReaction {
  id: string;
  ec: string;
  ec_name: string;
  substrate_name: string;
  product_name: string;
  reaction_smiles: string;
  story: string;
  is_impossible: boolean;
  n_training_examples?: number;
  // populated after precomputation
  screening_result?: ScreeningResult | null;
  has_hits?: boolean;
  screened_at?: string;
}

export interface DemoSet {
  set_id: number;
  impossible_ec: string;
  impossible_ec_name: string;
  impossible_position: number;
  reactions: DemoReaction[];
}
