# NitroCat — Frontend

> **Developed at Nitroduck**, as part of the NitroCat enzyme-discovery project.

The web interface for **NitroCat**, an enzyme-discovery platform. Users enter a reaction
(substrate + product SMILES); the app calls the [NitroCat backend](https://github.com/pravoslavzilka/NitroCat-backend)
to retrieve ranked enzyme candidates and reaction matches, and presents them with kinetic
data and external annotations.

## Stack

- **React + Vite + TypeScript**
- **shadcn/ui** (Radix primitives) + **Tailwind CSS**
- **Supabase** for auth / data
- **Playwright** (e2e) and **Vitest** (unit) for tests

## Getting started

```bash
# install (the repo includes a bun lockfile; npm works too)
bun install        # or: npm install

# configure environment (see below), then:
bun run dev        # or: npm run dev      → Vite dev server
bun run build      # production build → dist/
bun run preview    # preview the production build
bun run test       # Vitest unit tests
npx playwright test# e2e tests
```

### Environment variables

Create a `.env` (Vite reads `VITE_`-prefixed vars):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | NitroCat backend base URL (defaults to `http://localhost:8000`). |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key. |

## Project structure

```
src/
├── pages/        # LandingPage, NewReactionPage, dashboard/, NotFound
├── components/   # UI components (incl. reaction/ views)
├── lib/
│   ├── api/      # backend client (client.ts → VITE_API_URL), supabase, external data
│   ├── hooks/    # data hooks (useReaction, useEnzymes, …)
│   └── utils/    # e.g. atom mapping (rxnmapper)
├── hooks/  styles/  types/  data/  design/
└── main.tsx  App.tsx
```

External data sources used for enrichment/links: PubChem, UniProt, rxnmapper.ai.

## Related repositories

- **Backend API:** [`NitroCat-backend`](https://github.com/pravoslavzilka/NitroCat-backend) — the FastAPI service this frontend calls.
- **Model:** [`clipzyme_CoBaCo`](https://github.com/pravoslavzilka/clipzyme_CoBaCo) — CoBaCo fork of CLIPZyme used to train the screening model.
- **Pipeline:** [`clipzyme-claire-pipeline`](https://github.com/pravoslavzilka/clipzyme-claire-pipeline) — offline CLIPZyme + CLAIRE evaluation pipeline.

## Notes

This was a multi-contributor project (see the `matej` / `matus` / `master` / `development`
branches). NitroCat has since been wound down; this repository is preserved as a record of
the work.

## License

© 2026 Nitroduck. All rights reserved. Third-party libraries and services retain their own
licenses.
