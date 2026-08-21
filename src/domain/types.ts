export const SOURCE_TIERS = ['PRIMARY', 'AUTHORITATIVE_SECONDARY', 'SECONDARY', 'DISCOVERY_ONLY'] as const;
export type SourceTier = typeof SOURCE_TIERS[number];
export type ParseStatus = 'PENDING' | 'PARSED' | 'FAILED' | 'UNSUPPORTED';
export type EntityType = 'COMPANY' | 'PRODUCT' | 'TECHNOLOGY' | 'INDUSTRY' | 'THEME' | 'PERSON' | 'ORGANIZATION' | 'GOVERNMENT_AGENCY' | 'GEOGRAPHY' | 'EVENT';
export type ClaimType = 'FACT' | 'MANAGEMENT_CLAIM' | 'ESTIMATE' | 'INFERENCE' | 'HYPOTHESIS_STATEMENT' | 'OPINION';
export type ClaimStatus = 'CANDIDATE' | 'SUPPORTED' | 'WEAKLY_SUPPORTED' | 'CONFLICTED' | 'INSUFFICIENT_EVIDENCE' | 'REJECTED' | 'STALE';
export type EvidenceDirection = 'SUPPORTS' | 'CONTRADICTS' | 'CONTEXT' | 'NEUTRAL';
export type QuestionStatus = 'OPEN' | 'INVESTIGATING' | 'PARTIALLY_ANSWERED' | 'ANSWERED' | 'UNRESOLVED' | 'UNKNOWABLE' | 'ARCHIVED';
export type HypothesisStatus = 'PROPOSED' | 'TESTING' | 'SUPPORTED' | 'REFUTED' | 'INCONCLUSIVE';
export type ThesisStatus = 'EXPLORING' | 'ACTIVE' | 'STRENGTHENING' | 'WEAKENING' | 'CONFLICTED' | 'BROKEN' | 'CLOSED';
export type ConditionType = 'REQUIRED' | 'KILL';
export type DiscoveryCandidateType = 'SIGNAL' | 'PATTERN' | 'THEME_CANDIDATE' | 'CONTRADICTION';
export type DiscoveryStatus = 'INBOX' | 'REVIEWING' | 'ACCEPTED' | 'DISMISSED';
export type RelationshipType = 'SUPPLIES' | 'CUSTOMER_OF' | 'COMPETES_WITH' | 'EXPOSED_TO' | 'AFFECTS' | 'RELATED_TO' | 'LEADS' | 'FOLLOWS';

export interface Entity { id: string; type: EntityType; name: string; aliases: string[]; metadata: Record<string, unknown>; createdAt: string; }
export interface Company extends Entity { type: 'COMPANY'; legalName: string; commonName?: string; ticker?: string; cik?: string; website?: string; investorRelationsUrl?: string; }
export interface Source { id: string; providerId: string; providerExternalId?: string; sourceType: string; tier: SourceTier; title?: string; canonicalUrl?: string; companyId?: string; entityIds: string[]; publishedAt?: string; retrievedAt: string; rawStorageLocation?: string; normalizedText?: string; checksum: string; metadata: Record<string, unknown>; parseStatus: ParseStatus; createdAt: string; }
export interface Observation { id: string; sourceId: string; text: string; sourceLocator?: Record<string, string | number>; entityIds: string[]; observedAt?: string; extractionConfidence: number; createdAt: string; }
export interface Claim { id: string; text: string; type: ClaimType; status: ClaimStatus; entityIds: string[]; themeIds: string[]; confidence?: number; createdBy: 'USER' | 'AI' | 'IMPORT'; createdAt: string; updatedAt: string; }
export interface Evidence { id: string; claimId: string; observationId?: string; sourceId: string; direction: EvidenceDirection; strength?: number; rationale?: string; createdAt: string; }
export interface ResearchQuestion { id: string; question: string; status: QuestionStatus; importance: number; uncertainty: number; thesisImpact: number; parentQuestionId?: string; entityIds: string[]; currentAnswer?: string; answerConfidence?: number; createdAt: string; updatedAt: string; }
export interface ResearchRun { id: string; workflow: string; status: 'RUNNING' | 'COMPLETED' | 'FAILED'; input: Record<string, unknown>; output?: Record<string, unknown>; startedAt: string; completedAt?: string; }
export interface Hypothesis { id: string; statement: string; status: HypothesisStatus; entityIds: string[]; themeIds: string[]; supportingClaimIds: string[]; contradictingClaimIds: string[]; confidence?: number; createdAt: string; updatedAt: string; }
export interface Thesis { id: string; title: string; companyId?: string; status: ThesisStatus; currentRevisionId: string; confidence: number; variantPerception?: string; hypothesisIds: string[]; questionIds: string[]; createdAt: string; updatedAt: string; }
export interface ThesisRevision { id: string; thesisId: string; revisionNumber: number; summary: string; confidence: number; status: ThesisStatus; evidenceIds: string[]; hypothesisIds: string[]; questionIds: string[]; changeSummary: string; createdAt: string; }
export interface ThesisCondition { id: string; thesisId: string; type: ConditionType; statement: string; status: 'OPEN' | 'MET' | 'TRIGGERED' | 'EXPIRED'; evidenceIds: string[]; createdAt: string; updatedAt: string; }
export interface Risk { id: string; thesisId: string; statement: string; likelihood: number; impact: number; evidenceIds: string[]; createdAt: string; }
export interface Catalyst { id: string; thesisId: string; statement: string; expectedAt?: string; evidenceIds: string[]; createdAt: string; }
export interface Forecast { id: string; thesisId: string; metric: string; period: string; value: number; unit: string; assumptions: string[]; createdAt: string; }
export interface Contradiction { id: string; thesisId?: string; claimAId: string; claimBId: string; description: string; status: 'OPEN' | 'EXPLAINED' | 'RESOLVED'; createdAt: string; }
export interface Theme { id: string; name: string; description?: string; status: 'CANDIDATE' | 'ACTIVE' | 'ARCHIVED'; entityIds: string[]; createdAt: string; updatedAt: string; }
export interface ResearchEvent { id: string; title: string; occurredAt?: string; description?: string; entityIds: string[]; sourceIds: string[]; createdAt: string; }
export interface Relationship { id: string; fromEntityId: string; toEntityId: string; type: RelationshipType; confidence?: number; evidenceIds: string[]; createdAt: string; }
export interface DiscoveryCandidate { id: string; type: DiscoveryCandidateType; title: string; description: string; status: DiscoveryStatus; confidence: number; themeId?: string; companyIds: string[]; sourceIds: string[]; claimIds: string[]; evidenceIds: string[]; tags: string[]; createdAt: string; updatedAt: string; }
export interface ThemeMetrics { themeId: string; breadth: number; acceleration: number; candidateCount: number; companyIds: string[]; }

export function questionPriority(question: Pick<ResearchQuestion, 'importance' | 'uncertainty' | 'thesisImpact'>): number {
  return Number((question.importance * question.uncertainty * question.thesisImpact).toFixed(4));
}
export function assertScore(value: number, name: string): void { if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be between 0 and 1`); }
