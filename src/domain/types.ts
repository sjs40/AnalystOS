export const SOURCE_TIERS = ['PRIMARY', 'AUTHORITATIVE_SECONDARY', 'SECONDARY', 'DISCOVERY_ONLY'] as const;
export type SourceTier = typeof SOURCE_TIERS[number];
export type ParseStatus = 'PENDING' | 'PARSED' | 'FAILED' | 'UNSUPPORTED';
export type EntityType = 'COMPANY' | 'PRODUCT' | 'TECHNOLOGY' | 'INDUSTRY' | 'THEME' | 'PERSON' | 'ORGANIZATION' | 'GOVERNMENT_AGENCY' | 'GEOGRAPHY' | 'EVENT';
export type ClaimType = 'FACT' | 'MANAGEMENT_CLAIM' | 'ESTIMATE' | 'INFERENCE' | 'HYPOTHESIS_STATEMENT' | 'OPINION';
export type ClaimStatus = 'CANDIDATE' | 'SUPPORTED' | 'WEAKLY_SUPPORTED' | 'CONFLICTED' | 'INSUFFICIENT_EVIDENCE' | 'REJECTED' | 'STALE';
export type EvidenceDirection = 'SUPPORTS' | 'CONTRADICTS' | 'CONTEXT' | 'NEUTRAL';
export type QuestionStatus = 'OPEN' | 'INVESTIGATING' | 'PARTIALLY_ANSWERED' | 'ANSWERED' | 'UNRESOLVED' | 'UNKNOWABLE' | 'ARCHIVED';

export interface Entity { id: string; type: EntityType; name: string; aliases: string[]; metadata: Record<string, unknown>; createdAt: string; }
export interface Company extends Entity { type: 'COMPANY'; legalName: string; commonName?: string; ticker?: string; cik?: string; website?: string; investorRelationsUrl?: string; }
export interface Source { id: string; providerId: string; providerExternalId?: string; sourceType: string; tier: SourceTier; title?: string; canonicalUrl?: string; companyId?: string; entityIds: string[]; publishedAt?: string; retrievedAt: string; rawStorageLocation?: string; normalizedText?: string; checksum: string; metadata: Record<string, unknown>; parseStatus: ParseStatus; createdAt: string; }
export interface Observation { id: string; sourceId: string; text: string; sourceLocator?: Record<string, string | number>; entityIds: string[]; observedAt?: string; extractionConfidence: number; createdAt: string; }
export interface Claim { id: string; text: string; type: ClaimType; status: ClaimStatus; entityIds: string[]; themeIds: string[]; confidence?: number; createdBy: 'USER' | 'AI' | 'IMPORT'; createdAt: string; updatedAt: string; }
export interface Evidence { id: string; claimId: string; observationId?: string; sourceId: string; direction: EvidenceDirection; strength?: number; rationale?: string; createdAt: string; }
export interface ResearchQuestion { id: string; question: string; status: QuestionStatus; importance: number; uncertainty: number; thesisImpact: number; parentQuestionId?: string; entityIds: string[]; currentAnswer?: string; answerConfidence?: number; createdAt: string; updatedAt: string; }
export interface ResearchRun { id: string; workflow: string; status: 'RUNNING' | 'COMPLETED' | 'FAILED'; input: Record<string, unknown>; output?: Record<string, unknown>; startedAt: string; completedAt?: string; }

export function questionPriority(question: Pick<ResearchQuestion, 'importance' | 'uncertainty' | 'thesisImpact'>): number {
  return Number((question.importance * question.uncertainty * question.thesisImpact).toFixed(4));
}
export function assertScore(value: number, name: string): void { if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be between 0 and 1`); }
