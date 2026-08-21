# AnalystOS

Local-first, source-backed research state for public-equity analysis. The first delivered increment is the Phase 1 source-and-evidence kernel: immutable source records, observations, classified claims, directional evidence, persistent questions, SEC EDGAR access, a local UI, and MCP tools.

## Quick start

1. Copy `.env.example` to `.env` and set a truthful `SEC_USER_AGENT`.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Apply `db/migrations/001_source_evidence_kernel.sql` using your preferred PostgreSQL client.
4. Run `npm test`.
5. Run `npm run dev`, then open `http://localhost:3000`.
6. Run `npm run mcp` to connect an MCP-capable client over stdio.

The included runnable kernel uses `.analystos/research-state.json` for local demo persistence, keeping test and starter usage dependency-free. PostgreSQL is the documented production schema and the next persistence adapter target.

## First research flow

Use `SecEdgarProvider` from `src/providers/sec-edgar.ts` to find and fetch a filing, pass its normalized text to `ResearchKernel.ingestText`, then call `extractObservations`, `proposeClaim`, and `createQuestion`. Use `lineage(claimId)` to audit the complete claim → evidence → observation → source path.

## Design guarantees

Sources are immutable; observations are not claims; claims are not hypotheses; contradictions are retained; and the system can represent insufficient evidence instead of manufacturing certainty.
