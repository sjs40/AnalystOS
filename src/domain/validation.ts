import { assertScore, type Claim, type Evidence, type ResearchQuestion, type Source } from './types.ts';

export function validateSource(input: Omit<Source, 'id' | 'createdAt'>): void {
  if (!input.providerId || !input.sourceType || !input.checksum) throw new Error('Source requires providerId, sourceType, and checksum');
  if (!input.retrievedAt) throw new Error('Source requires retrievedAt');
}
export function validateQuestion(input: Pick<ResearchQuestion, 'question' | 'importance' | 'uncertainty' | 'thesisImpact'>): void {
  if (!input.question.trim()) throw new Error('Question must not be empty');
  assertScore(input.importance, 'importance'); assertScore(input.uncertainty, 'uncertainty'); assertScore(input.thesisImpact, 'thesisImpact');
}
export function validateEvidence(claim: Claim, evidence: Evidence, sourceIds: Set<string>, observationSourceId?: string): void {
  if (claim.id !== evidence.claimId) throw new Error('Evidence claim ID does not match claim');
  if (!sourceIds.has(evidence.sourceId)) throw new Error('Evidence source does not exist');
  if (observationSourceId && observationSourceId !== evidence.sourceId) throw new Error('Observation must belong to evidence source');
  if (evidence.strength !== undefined) assertScore(evidence.strength, 'evidence strength');
}
