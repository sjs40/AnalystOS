# Evaluation

Unit tests exercise input validation, deterministic question priority, lineage, contradiction preservation, thesis revisioning, and structured thesis components. The SLM Phase 2 evaluation executes question → source → observation → claim → hypothesis → thesis → counter-evidence → revision using a clearly marked synthetic fixture. It requires a preserved contradiction, two retained revisions, visible required/kill conditions, and an unresolved outcome. Integration tests should mock SEC/network calls and verify source caching.

The Phase 3 evaluation uses a multi-company synthetic corpus. It expects exactly one cross-company pattern only when a shared explicit signal tag has evidence from two distinct companies, then verifies breadth and source lineage. A separate contradiction evaluation verifies that the system preserves each claim and its evidence rather than emitting a vague “mixed” result.
