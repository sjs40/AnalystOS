# MCP

Run `npm run mcp`. The stdio JSON-RPC server exposes:

- `research_list_sources` — immutable source records.
- `research_get_claim_lineage` — claim → evidence → observation → source traversal.
- `research_create_question` — validated persistent question creation.

The server intentionally exposes no arbitrary SQL or filesystem APIs.
