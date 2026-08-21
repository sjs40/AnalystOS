import type { SourceTier } from '../domain/types.ts';

export type ProviderCapability = 'filings' | 'financials' | 'company_ir' | 'transcripts' | 'web_search' | 'web_page' | 'government_data' | 'local_files' | 'market_data' | 'estimates' | 'authenticated_content';
export interface ProviderSearchQuery { query: string; companyTicker?: string; form?: string; from?: string; to?: string; }
export interface ProviderSearchResult { externalId: string; title: string; url: string; snippet?: string; publishedAt?: string; metadata?: Record<string, unknown>; }
export interface RawSourceDocument { externalId?: string; title?: string; url?: string; mimeType?: string; content: Uint8Array; publishedAt?: string; metadata: Record<string, unknown>; }
export interface ProviderHealth { ok: boolean; detail?: string; }
export interface ResearchProvider { id: string; name: string; capabilities: ProviderCapability[]; search(query: ProviderSearchQuery): Promise<ProviderSearchResult[]>; fetch(request: { url?: string; externalId?: string }): Promise<RawSourceDocument>; healthCheck(): Promise<ProviderHealth>; }
export interface AuthenticatedProvider extends ResearchProvider { authenticate(): Promise<{ status: 'authenticated' | 'needs_credentials' }>; refreshAuth?(): Promise<{ status: 'authenticated' | 'needs_credentials' }>; logout?(): Promise<void>; }
export interface RoutedProvider { provider: ResearchProvider; capability: ProviderCapability; }
export class ProviderRouter {
  private readonly providers: ResearchProvider[];
  constructor(providers: ResearchProvider[]) { this.providers = providers; }
  forCapability(capability: ProviderCapability): ResearchProvider[] { return this.providers.filter((provider) => provider.capabilities.includes(capability)); }
}
export function tierForProvider(providerId: string): SourceTier { return providerId === 'sec-edgar' ? 'PRIMARY' : providerId === 'local-file' ? 'PRIMARY' : 'SECONDARY'; }
