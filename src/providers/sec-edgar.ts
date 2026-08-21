import type { ProviderHealth, ProviderSearchQuery, ProviderSearchResult, RawSourceDocument, ResearchProvider } from './contracts.ts';

const SEC = 'https://data.sec.gov';
const ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';
export class SecEdgarProvider implements ResearchProvider {
  id = 'sec-edgar'; name = 'SEC EDGAR'; capabilities: ResearchProvider['capabilities'] = ['filings', 'financials'];
  private lastRequest = 0;
  private readonly userAgent: string;
  private readonly requestsPerSecond: number;
  constructor(userAgent = process.env.SEC_USER_AGENT ?? 'AnalystOS/0.1 contact@example.com', requestsPerSecond = Number(process.env.SEC_MAX_REQUESTS_PER_SECOND ?? 5)) { this.userAgent = userAgent; this.requestsPerSecond = requestsPerSecond; }
  async healthCheck(): Promise<ProviderHealth> { try { const response = await this.request(`${SEC}/submissions/CIK0000320193.json`); return { ok: response.ok, detail: response.statusText }; } catch (error) { return { ok: false, detail: String(error) }; } }
  async search(query: ProviderSearchQuery): Promise<ProviderSearchResult[]> {
    if (!query.companyTicker) throw new Error('SEC search requires companyTicker; resolve ticker to CIK first');
    const companies = await this.json('https://www.sec.gov/files/company_tickers.json') as Record<string, { ticker: string; cik_str: number; title: string }>;
    const match = Object.values(companies).find((item) => item.ticker.toUpperCase() === query.companyTicker!.toUpperCase());
    if (!match) return [];
    const cik = String(match.cik_str).padStart(10, '0'); const submissions = await this.json(`${SEC}/submissions/CIK${cik}.json`) as { filings: { recent: Record<string, string[]> } };
    const recent = submissions.filings.recent; return recent.accessionNumber.map((accession, index) => ({ externalId: accession, title: `${match.title} ${recent.form[index]} ${recent.filingDate[index]}`, url: `${ARCHIVES}/${match.cik_str}/${accession.replaceAll('-', '')}/${recent.primaryDocument[index]}`, publishedAt: recent.filingDate[index], metadata: { cik, form: recent.form[index], accessionNumber: accession, primaryDocument: recent.primaryDocument[index] } })).filter((result) => !query.form || result.metadata?.form === query.form);
  }
  async fetch(request: { url?: string; externalId?: string }): Promise<RawSourceDocument> { if (!request.url) throw new Error('SEC fetch requires canonical filing URL'); const response = await this.request(request.url); if (!response.ok) throw new Error(`SEC fetch failed: ${response.status}`); return { externalId: request.externalId, title: request.url.split('/').at(-1), url: request.url, mimeType: response.headers.get('content-type') ?? undefined, content: new Uint8Array(await response.arrayBuffer()), metadata: { provider: this.id } }; }
  async companyFacts(cik: string): Promise<unknown> { return this.json(`${SEC}/api/xbrl/companyfacts/CIK${cik.padStart(10, '0')}.json`); }
  private async json(url: string): Promise<unknown> { const response = await this.request(url); if (!response.ok) throw new Error(`SEC request failed: ${response.status}`); return response.json(); }
  private async request(url: string): Promise<Response> { const interval = 1000 / Math.max(1, this.requestsPerSecond); const wait = this.lastRequest + interval - Date.now(); if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait)); this.lastRequest = Date.now(); return fetch(url, { headers: { 'User-Agent': this.userAgent, Accept: 'application/json, text/html;q=0.9' } }); }
}
