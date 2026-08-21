# Evaluation

Unit tests exercise input validation, deterministic question priority, lineage, contradiction preservation, thesis revisioning, and structured thesis components. The SLM Phase 2 evaluation executes question → source → observation → claim → hypothesis → thesis → counter-evidence → revision using a clearly marked synthetic fixture. It requires a preserved contradiction, two retained revisions, visible required/kill conditions, and an unresolved outcome. Integration tests should mock SEC/network calls and verify source caching.
