export type LandingMetric =
  | { label: string; before: string; after: string; delta?: string; single?: never }
  | { label: string; single: string; before?: never; after?: never; delta?: never };

export type LandingReaction = {
  id: number;
  titleShort: string;
  titleDetail: string;
  titleFull: string;
  target: string;
  transform: string;
  biocatalyst?: string;
  citation: string;
  citationUrl: string;
  substrate: string;
  product: string;
  intermediate: string | null;
  metrics: LandingMetric[];
  chem: { steps: string; building: string; time: string };
  bio: { steps: string; building: string; time: string; note?: string };
  highlight: string | null;
};

export const LANDING_REACTIONS: LandingReaction[] = [
  {
    id: 1,
    titleShort: "High metabolic clearance + excessive lipophilicity of PDE2A inhibitor",
    titleDetail: "desired hydroxylation required 8-step resynthesis",
    titleFull:
      "High metabolic clearance + excessive lipophilicity of PDE2A inhibitor → desired hydroxylation required 8-step resynthesis",
    target: "PDE2A inhibitor",
    transform: "+ OH",
    citation: "Stepan et al., ACS Medicinal Chemistry Letters, 2018",
    citationUrl: "https://pubs.acs.org/doi/10.1021/acsmedchemlett.7b00343",
    substrate: "/images/landing/reaction_1_substrate.png",
    product: "/images/landing/reaction_1_product.png",
    intermediate: null,
    metrics: [
      { label: "HLM Clint", before: "16", after: "<8" },
      { label: "LipE", before: "5.9", after: "7.4" },
      { label: "IC₅₀", single: "0.4 nM → 0.4 nM" },
    ],
    chem: { steps: "8 steps re-synthesis", building: "4 new building blocks", time: "3 – 6 weeks" },
    bio: { steps: "1 step biocatalytic LSF", building: "1 biocatalyst", time: "<1 week" },
    highlight: null,
  },
  {
    id: 2,
    titleShort: "Tylactone antibiotic SAR exploration was blocked",
    titleDetail: "17 steps re-synthesis needed",
    titleFull: "Tylactone antibiotic SAR's exploration was blocked → 17 steps re-synthesis needed",
    target: "Tylactone macrolide (juvenimicin)",
    transform: "+ OH",
    biocatalyst: "TylI-RhFRED",
    citation: "Lowell et al., Journal of the American Chemical Society, 2017",
    citationUrl: "https://pubs.acs.org/doi/10.1021/jacs.7b02875",
    substrate: "/images/landing/reaction_2_substrate.png",
    product: "/images/landing/reaction_2_product.png",
    intermediate: null,
    metrics: [{ label: "MIC", single: "60× improvement" }],
    chem: { steps: "17 steps re-synthesis", building: "11 building blocks", time: "6 – 12 weeks" },
    bio: { steps: "1 step biocatalytic LSF", building: "1 biocatalyst (TylI-RhFRED)", time: "<1 week" },
    highlight: null,
  },
  {
    id: 3,
    titleShort: "Antiparasitic lead was too lipophilic",
    titleDetail: "desired hydroxylation needed 5-steps resynthesis",
    titleFull: "Antiparasitic lead was too lipophilic → desired hydroxylation needed 5-steps resynthesis",
    target: "Antiparasitic lead",
    transform: "+ OH",
    biocatalyst: "PolyCYP194",
    citation: "Poon et al., Journal of Medicinal Chemistry, 2025",
    citationUrl: "https://pubs.acs.org/doi/10.1021/acs.jmedchem.5c01467",
    substrate: "/images/landing/reaction_3_substrate.png",
    product: "/images/landing/reaction_3_product.png",
    intermediate: null,
    metrics: [{ label: "clogP", before: "3.6", after: "2.1" }],
    chem: { steps: "5 steps re-synthesis", building: "3 new building blocks", time: "2 – 4 weeks" },
    bio: { steps: "1 step biocatalytic LSF", building: "1 biocatalyst (PolyCYP194)", time: "<1 week" },
    highlight: null,
  },
  {
    id: 4,
    titleShort: "Risperidone was metabolically cleared",
    titleDetail: "desired fluorination needed 4 steps-resynthesis",
    titleFull: "Risperidone was metabolically cleared at C9 → desired fluorination needed 4 steps-resynthesis",
    target: "Risperidone (atypical antipsychotic)",
    transform: "+ OH → + F (chemo-enzymatic)",
    biocatalyst: "CYP2D6 + DAST",
    citation: "Obach et al., Drug Metabolism and Disposition, 2016",
    citationUrl: "https://dmd.aspetjournals.org/article/S0090-9556(24)10056-6/abstract",
    substrate: "/images/landing/reaction_4_substrate.png",
    intermediate: "/images/landing/reaction_4_intermediate.png",
    product: "/images/landing/reaction_4_product.png",
    metrics: [{ label: "HLM Clint", single: "16× improvement" }],
    chem: { steps: "4 steps re-synthesis", building: "1 new building block", time: "3 weeks" },
    bio: {
      steps: "2 steps (CYP2D6 + DAST)",
      building: "1 biocatalyst needed",
      time: "<1 week",
      note: "chemo-enzymatic LSF",
    },
    highlight: null,
  },
];
