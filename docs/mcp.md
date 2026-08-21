# MCP

Run `npm run mcp`. The stdio JSON-RPC server exposes:

- `research_list_sources` — immutable source records.
- `research_get_claim_lineage` — claim → evidence → observation → source traversal.
- `research_create_question` — validated persistent question creation.
- `research_list_theses` — current thesis state.
- `research_get_thesis` — thesis revisions, conditions, risks, catalysts, forecasts, and contradictions.
- `research_create_thesis` — thesis plus immutable initial revision.
- `research_revise_thesis` — a new revision without overwriting history.

The server intentionally exposes no arbitrary SQL or filesystem APIs.
