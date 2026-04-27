import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LANDING_REACTIONS, type LandingReaction } from "@/data/landing-reactions";
import "@/styles/landing.css";

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="arrow"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

const STEPS: Array<{ text: ReactNode }> = [
  { text: "Draw the reaction you want" },
  {
    text: (
      <>
        Our <span className="em">ML-powered model</span> scans 250,000+ biocatalysts to find the best matches
      </>
    ),
  },
  {
    text: (
      <>
        Order a <span className="em">custom biocatalytic kit</span> for YOUR reaction
      </>
    ),
  },
  { text: "Add your substrate and incubate" },
  { text: "Analyse your results" },
];

const CaseModal = ({ reaction, onClose }: { reaction: LandingReaction; onClose: () => void }) => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const hasInt = !!reaction.intermediate;

  return (
    <div
      className="nc-landing-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`case-${reaction.id}-title`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="nc-landing-modal">
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <header className="modal-header">
          <span className="modal-tag">
            Case 0{reaction.id} · {reaction.target}
          </span>
          <h2 className="modal-title" id={`case-${reaction.id}-title`}>
            {reaction.titleFull}
          </h2>
          <p className="modal-cite">{reaction.citation}</p>
        </header>

        <div className="modal-body">
          {hasInt ? (
            <div className="rxn has-int">
              <div className="rxn-col">
                <div className="rxn-mol">
                  <img src={reaction.substrate} alt="Substrate" />
                </div>
                <div className="rxn-mol-lbl">Substrate</div>
              </div>
              <div className="rxn-arrow">
                <span className="arrow-lbl">CYP2D6</span>
                <div className="arrow-line" />
                <span className="arrow-cat">+ OH</span>
              </div>
              <div className="rxn-col">
                <div className="rxn-mol">
                  <img src={reaction.intermediate ?? ""} alt="Intermediate" />
                </div>
                <div className="rxn-mol-lbl">Intermediate</div>
              </div>
              <div className="rxn-arrow">
                <span className="arrow-lbl">DAST</span>
                <div className="arrow-line" />
                <span className="arrow-cat">+ F</span>
              </div>
              <div className="rxn-col">
                <div className="rxn-mol">
                  <img src={reaction.product} alt="Product" />
                </div>
                <div className="rxn-mol-lbl">Product</div>
              </div>
            </div>
          ) : (
            <div className="rxn">
              <div className="rxn-col">
                <div className="rxn-mol">
                  <img src={reaction.substrate} alt="Substrate" />
                </div>
                <div className="rxn-mol-lbl">Substrate</div>
              </div>
              <div className="rxn-arrow">
                <span className="arrow-lbl">Biocatalyst</span>
                <div className="arrow-line" />
                <span className="arrow-cat">{reaction.transform}</span>
              </div>
              <div className="rxn-col">
                <div className="rxn-mol">
                  <img src={reaction.product} alt="Product" />
                </div>
                <div className="rxn-mol-lbl">Product</div>
              </div>
            </div>
          )}

          <div className="compare">
            <div className="pane bad">
              <div className="pane-h">
                <span className="pip" /> Chemical re-synthesis
              </div>
              <ul className="pane-list">
                <li>
                  <span className="ic">
                    <XIcon />
                  </span>
                  <span>{reaction.chem.steps}</span>
                </li>
                <li>
                  <span className="ic">
                    <XIcon />
                  </span>
                  <span>{reaction.chem.building}</span>
                </li>
                <li>
                  <span className="ic">
                    <XIcon />
                  </span>
                  <span>{reaction.chem.time}</span>
                </li>
              </ul>
            </div>
            <div className="vs">
              <div className="vs-circle">VS</div>
            </div>
            <div className="pane good">
              <div className="pane-h">
                <span className="pip" /> {reaction.bio.note ? reaction.bio.note : "Biocatalytic LSF"}
              </div>
              <ul className="pane-list">
                <li>
                  <span className="ic">
                    <CheckIcon />
                  </span>
                  <span>{reaction.bio.steps}</span>
                </li>
                <li>
                  <span className="ic">
                    <CheckIcon />
                  </span>
                  <span>{reaction.bio.building}</span>
                </li>
                <li>
                  <span className="ic">
                    <CheckIcon />
                  </span>
                  <span>{reaction.bio.time}</span>
                </li>
              </ul>
            </div>
          </div>

          {reaction.metrics.length > 0 && (
            <div className="metrics">
              {reaction.metrics.map((m, idx) => (
                <div className="metric" key={`${m.label}-${idx}`}>
                  <div className="metric-lbl">{m.label}</div>
                  <div className="metric-val">
                    {m.single ? (
                      <span className="single">{m.single}</span>
                    ) : (
                      <>
                        <span className="before">{m.before}</span>
                        <span className="arr">→</span>
                        <span className="after">{m.after}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {reaction.highlight && (
            <div className="highlight">
              <span className="star">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span>{reaction.highlight}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);
  const activeReaction = activeCaseId !== null ? LANDING_REACTIONS.find((r) => r.id === activeCaseId) ?? null : null;

  const handleStart = () => navigate("/reactions/new");

  return (
    <div className="nc-landing">
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">
            <span className="brand-mark">N</span>
            <span>NitroCat</span>
          </div>
          <button type="button" className="nav-cta" onClick={handleStart}>
            Try NitroCat <ArrowRightIcon />
          </button>
        </div>
      </nav>

      <section className="hero">
        <h1 className="h1">NitroCat</h1>
        <p className="h1-sub">by NitroDuck</p>

        <p className="subhead">
          <span style={{ color: "var(--ink)" }}>
            Turn your <span className="accent">ADMET design into reality</span>
          </span>{" "}
          — in just <span className="hi">1 reaction</span> and <span className="hi">1 week</span>.
        </p>

        <div className="hero-grid">
          <p className="body-lead">Biocatalytic late-stage functionalisation — made simple!</p>

          <ol className="steps">
            {STEPS.map((s, i) => (
              <li className="step fade-up" key={i}>
                <span className="step-num" />
                <span className="step-text">{s.text}</span>
              </li>
            ))}
          </ol>

          <div className="cta-row" id="cta">
            <button type="button" className="cta" onClick={handleStart}>
              Find my biocatalyst
              <ArrowRightIcon />
            </button>
            <div className="badges">
              <div className="badge">
                <span className="badge-icon">
                  <CheckIcon />
                </span>
                <span>Completely free in-silico analysis for every reaction</span>
              </div>
              <div className="badge">
                <span className="badge-icon">
                  <CheckIcon />
                </span>
                <span>Money-back guarantee if the reaction doesn't work</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase">
        <div className="showcase-inner">
          <div className="showcase-head">
            <h2 className="showcase-h2">
              C–H hydroxylations <span className="lite">— Success Cases</span>
            </h2>
          </div>

          <div className="cards">
            {LANDING_REACTIONS.map((r, i) => (
              <button
                type="button"
                className="card"
                aria-label={`Open case ${i + 1}: ${r.titleShort}`}
                key={r.id}
                onClick={() => setActiveCaseId(r.id)}
              >
                <div className="card-tag">
                  <span className="num">0{i + 1}</span> Case study
                </div>
                <div className="card-mol">
                  <img src={r.substrate} alt={`Substrate ${i + 1}`} />
                  <span className="plus">→</span>
                  <img src={r.product} alt={`Product ${i + 1}`} />
                </div>
                <h3 className="card-title">{r.titleShort}</h3>
                <div className="card-meta">
                  <span className="card-meta-right">
                    View case
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 17L17 7M9 7h8v8" />
                    </svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">All rights reserved, NitroDuck, Inc. 2026</footer>

      {activeReaction && <CaseModal reaction={activeReaction} onClose={() => setActiveCaseId(null)} />}
    </div>
  );
};

export default LandingPage;
