# Research Rules

Sources are immutable. A source is not edited after ingestion; changed upstream content is a new source version.

Observations record what a source says. Claims represent a conclusion or proposition and must be classified (`FACT`, `MANAGEMENT_CLAIM`, `INFERENCE`, and so on). Evidence links claims to sources and can support, contradict, contextualize, or remain neutral. A contradiction updates a claim to `CONFLICTED`; it never removes either side.

Primary sources dominate where available. Discovery-only sources may create questions or candidates but cannot automatically promote a factual claim. Insufficient evidence is a valid outcome, represented by `INSUFFICIENT_EVIDENCE`, `UNRESOLVED`, or `UNKNOWABLE`.
