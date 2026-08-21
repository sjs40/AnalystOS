# Architecture

AnalystOS keeps deterministic research state separate from AI reasoning. The Phase 1 kernel owns source ingestion, checksums, normalization, observations, claims, evidence, and questions. AI may propose objects, but the boundary validates every object and retains its provenance.

The production persistence design is PostgreSQL in `db/migrations/001_source_evidence_kernel.sql`. `ResearchKernel` is a dependency-free JSON-backed reference implementation for local demos and tests; it deliberately mirrors the production ontology, rather than becoming a second domain model.

Providers implement capability-based contracts. Workflows ask for capabilities (`filings`, `web_page`, `local_files`) and the router selects eligible providers. The SEC implementation caches at the source layer by content checksum and rate-limits requests. Raw content belongs in `RAW_STORAGE_PATH`; normalized, immutable source records retain metadata and checksums.

The MCP server exposes a narrow, purpose-built research surface instead of database access. The small local web server renders read-only state for inspection. Both use the same kernel.
