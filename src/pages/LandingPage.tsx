import "@/styles/landing.css";

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.53 10.53 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5Z" />
  </svg>
);

const ArrowUpRightIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);

type Repo = {
  name: string;
  role: string;
  blurb: string;
  url: string;
};

const REPOS: Repo[] = [
  {
    name: "clipzyme_CoBaCo",
    role: "The model — CoBaCo",
    blurb:
      "Our fork of CLIPZyme. CoBaCo (Constraint Batch Construction) reshapes the training batches so no two enzymes of the same EC4 class land together — eliminating the false negatives that plague contrastive enzyme–reaction training.",
    url: "https://github.com/nitroduckmafia/clipzyme_CoBaCo",
  },
  {
    name: "clipzyme-claire-pipeline",
    role: "The pipeline — CLIPZyme + CLAIRE",
    blurb:
      "An offline research and benchmarking pipeline that pairs CLIPZyme/CoBaCo (ranked enzyme candidates) with CLAIRE (EC-number prediction), then evaluates how well the two agree across EC levels.",
    url: "https://github.com/nitroduckmafia/clipzyme-claire-pipeline",
  },
  {
    name: "NitroCat-backend",
    role: "The backend + benchmarking",
    blurb:
      "The FastAPI service behind NitroCat. It runs CLIPZyme screening for a reaction and enriches the hits with kinetic and annotation data from UniProt, SABIO-RK and BRENDA, plus a Rhea reaction-similarity search.",
    url: "https://github.com/nitroduckmafia/NitroCat-backend",
  },
  {
    name: "Nitro-Cat",
    role: "The frontend",
    blurb:
      "This web interface. Chemists draw a reaction as substrate + product, and NitroCat returns ranked biocatalysts with their kinetics and external annotations — ready to compare and order.",
    url: "https://github.com/nitroduckmafia/Nitro-Cat",
  },
];

const FACTS: Array<{ label: string; value: string }> = [
  { label: "Built by", value: "Nitroduck, Inc." },
  { label: "Year", value: "2026" },
  { label: "Core engine", value: "CLIPZyme" },
  { label: "Status", value: "Archived" },
];

export const LandingPage = () => {
  return (
    <div className="nc-landing nc-info">
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">
            <img className="brand-logo" src="/images/nitroduck-logo.png" alt="" />
            <div className="brand-text">
              <span className="brand-name">NitroCat</span>
              <span className="brand-sub">by NitroDuck</span>
            </div>
          </div>
          <a className="nav-contact" href="https://nitroduck.tech" target="_blank" rel="noopener noreferrer">
            nitroduck.tech
          </a>
        </div>
      </nav>

      <section className="info-hero">
        <span className="info-badge">Project archive</span>
        <h1 className="info-title">
          NitroCat — finding the right <span className="accent">enzyme</span> for any reaction
        </h1>
        <p className="info-lead">
          NitroCat was an enzyme-discovery platform that helped medicinal and synthetic chemists
          find the optimal biocatalyst for a reaction in seconds — no deep biology required. Draw a
          substrate and a product, and NitroCat ranked the enzymes most likely to catalyse the
          transformation, turning biocatalytic late-stage functionalisation into a single step.
        </p>

        <div className="info-facts">
          {FACTS.map((f) => (
            <div className="info-fact" key={f.label}>
              <div className="info-fact-label">{f.label}</div>
              <div className="info-fact-value">{f.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="info-section">
        <div className="info-section-inner">
          <h2 className="info-h2">How it worked</h2>
          <div className="info-prose">
            <p>
              At its core NitroCat ran on{" "}
              <a href="https://github.com/pgmikhael/CLIPZyme" target="_blank" rel="noopener noreferrer">
                CLIPZyme
              </a>{" "}
              (Mikhael et al.), a reaction-conditioned virtual-screening model that embeds a reaction
              and a protein into a shared space and scores how well an enzyme fits a given
              transformation.
            </p>
            <p>
              We trained our own variant, <strong>CoBaCo</strong> — Constraint Batch Construction. In
              contrastive training every other entry in a batch is treated as a negative, but two
              enzymes sharing the same EC4 class catalyse the same kind of reaction, so treating them
              as opposites is a <em>false negative</em>. CoBaCo filters each batch to hold at most one
              enzyme per EC4 class, removing those false negatives and sharpening the model.
            </p>
            <p>
              Around the model we built a full system: an offline{" "}
              <strong>CLIPZyme + CLAIRE</strong> pipeline that cross-checked CLIPZyme's ranked enzymes
              against{" "}
              <a href="https://github.com/zishuozeng/CLAIRE" target="_blank" rel="noopener noreferrer">
                CLAIRE
              </a>
              's EC-number predictions, a FastAPI backend that enriched results with kinetics and
              annotations from UniProt, SABIO-RK and BRENDA (plus a Rhea similarity search), and the
              web interface you are looking at now.
            </p>
          </div>
        </div>
      </section>

      <section className="info-section alt">
        <div className="info-section-inner">
          <h2 className="info-h2">The pieces</h2>
          <p className="info-section-sub">
            Four open repositories — the model, the pipeline, the backend and this frontend.
          </p>
          <div className="info-repos">
            {REPOS.map((repo) => (
              <a
                key={repo.name}
                className="info-repo"
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="info-repo-top">
                  <span className="info-repo-gh">
                    <GitHubIcon />
                  </span>
                  <span className="info-repo-role">{repo.role}</span>
                </div>
                <h3 className="info-repo-name">{repo.name}</h3>
                <p className="info-repo-blurb">{repo.blurb}</p>
                <span className="info-repo-link">
                  View on GitHub
                  <ArrowUpRightIcon />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-section-inner">
          <div className="info-pivot">
            <h2 className="info-h2">Where NitroCat went</h2>
            <p>
              NitroCat was developed by <strong>Nitroduck, Inc.</strong> The project has since been
              stopped — Nitroduck has pivoted, and the code here is preserved as a record of the work.
            </p>
            <p>
              To see what Nitroduck is building now, visit{" "}
              <a href="https://nitroduck.tech" target="_blank" rel="noopener noreferrer">
                nitroduck.tech
              </a>
              .
            </p>
            <a className="info-pivot-cta" href="https://nitroduck.tech" target="_blank" rel="noopener noreferrer">
              Visit nitroduck.tech
              <ArrowUpRightIcon />
            </a>
          </div>
        </div>
      </section>

      <footer className="info-footer">
        <p className="info-credits">
          NitroCat was developed by <strong>Pravoslav Žilka</strong>, <strong>Matúš Grieš</strong> and{" "}
          <strong>Matej Zámečník</strong>.
        </p>
        <p className="info-rights">All rights reserved, NitroDuck, Inc. 2026</p>
      </footer>
    </div>
  );
};

export default LandingPage;
