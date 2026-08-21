# Providers

Providers use a common `ResearchProvider` interface and declare capabilities. Current Phase 1 adapters are SEC EDGAR, local files, and generic web/provider contracts.

SEC EDGAR resolves tickers through the SEC company ticker file, lists company submissions, fetches canonical filing pages, retrieves XBRL company facts, obeys a configurable request rate, and supplies a descriptive User-Agent. A local-file provider records the original path, checksum, normalized text, and parse state. Authenticated providers require explicit authorized APIs, OAuth, exports, or SDKs; AnalystOS does not scrape browser sessions or bypass paywalls.
