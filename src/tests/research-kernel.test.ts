import test from 'node:test';
import assert from 'node:assert/strict';
import { ResearchKernel } from '../services/research-kernel.ts';

test('source → observation → claim → evidence preserves lineage', () => {
  const kernel = new ResearchKernel('.analystos/test-state.json');
  const source = kernel.ingestText({ providerId: 'fixture', sourceType: 'EARNINGS_RELEASE', tier: 'PRIMARY', title: 'Synthetic fixture', text: 'Management stated that graduate applications increased 18 percent in the reported period. The company also noted that its private loan underwriting remains selective.' });
  const [observation] = kernel.extractObservations(source.id); const claim = kernel.proposeClaim(observation.id);
  const lineage = kernel.lineage(claim.id);
  assert.equal(lineage.evidence.length, 1); assert.equal(lineage.evidence[0].source.id, source.id); assert.equal(lineage.evidence[0].observation?.id, observation.id);
});
test('contradictory evidence makes a claim conflicted without removing either link', () => {
  const kernel = new ResearchKernel(); const source = kernel.ingestText({ providerId: 'fixture', sourceType: 'NOTE', tier: 'SECONDARY', title: 'Fixture', text: 'Synthetic source contains enough words to create a direct observation for testing purposes.' }); const observation = kernel.extractObservations(source.id)[0]; const claim = kernel.proposeClaim(observation.id); kernel.linkEvidence({ claimId: claim.id, observationId: observation.id, sourceId: source.id, direction: 'SUPPORTS' }); kernel.linkEvidence({ claimId: claim.id, observationId: observation.id, sourceId: source.id, direction: 'CONTRADICTS' }); assert.equal(kernel.lineage(claim.id).claim.status, 'CONFLICTED'); assert.equal(kernel.lineage(claim.id).evidence.length, 3);
});
test('questions rank deterministically and validate scores', () => {
  const kernel = new ResearchKernel(); kernel.createQuestion({ question: 'Lower value question?', importance: 0.4, uncertainty: 0.5, thesisImpact: 0.5 }); kernel.createQuestion({ question: 'Thesis-critical open question?', importance: 1, uncertainty: 0.9, thesisImpact: 0.9 }); assert.equal(kernel.listQuestions()[0].question, 'Thesis-critical open question?'); assert.throws(() => kernel.createQuestion({ question: 'Bad', importance: 2, uncertainty: 0, thesisImpact: 0 }));
});
