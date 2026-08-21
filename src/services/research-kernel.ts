import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Catalyst, Claim, Company, Contradiction, Evidence, Forecast, Hypothesis, Observation, ResearchQuestion, Risk, Source, Thesis, ThesisCondition, ThesisRevision } from '../domain/types.ts';
import { questionPriority } from '../domain/types.ts';
import { validateEvidence, validateQuestion, validateSource } from '../domain/validation.ts';

type Store = { companies: Company[]; sources: Source[]; observations: Observation[]; claims: Claim[]; evidence: Evidence[]; questions: ResearchQuestion[]; hypotheses: Hypothesis[]; theses: Thesis[]; thesisRevisions: ThesisRevision[]; conditions: ThesisCondition[]; risks: Risk[]; catalysts: Catalyst[]; forecasts: Forecast[]; contradictions: Contradiction[] };
const empty = (): Store => ({ companies: [], sources: [], observations: [], claims: [], evidence: [], questions: [], hypotheses: [], theses: [], thesisRevisions: [], conditions: [], risks: [], catalysts: [], forecasts: [], contradictions: [] });
const now = () => new Date().toISOString();

/** File-backed reference implementation. PostgreSQL is the production schema; this makes local demos/tests dependency-free. */
export class ResearchKernel {
  private state: Store = empty();
  private readonly file: string;
  constructor(file = '.analystos/research-state.json') { this.file = file; }
  async load(): Promise<void> { try { this.state = { ...empty(), ...JSON.parse(await readFile(this.file, 'utf8')) as Partial<Store> }; } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
  async save(): Promise<void> { await mkdir(join(this.file, '..'), { recursive: true }); await writeFile(this.file, JSON.stringify(this.state, null, 2)); }
  createCompany(input: Omit<Company, 'id' | 'type' | 'name' | 'createdAt' | 'aliases' | 'metadata'> & Partial<Pick<Company, 'aliases' | 'metadata'>>): Company {
    if (!input.legalName.trim()) throw new Error('Company legalName must not be empty'); const company: Company = { ...input, id: randomUUID(), type: 'COMPANY', name: input.commonName ?? input.legalName, aliases: input.aliases ?? [], metadata: input.metadata ?? {}, createdAt: now() }; this.state.companies.push(company); return company;
  }
  ingestSource(input: Omit<Source, 'id' | 'createdAt'>): Source {
    validateSource(input); const prior = this.state.sources.find((source) => source.providerId === input.providerId && source.checksum === input.checksum); if (prior) return prior;
    const source: Source = { ...input, id: randomUUID(), createdAt: now() }; this.state.sources.push(source); return source;
  }
  ingestText(input: { providerId: string; sourceType: string; tier: Source['tier']; title: string; text: string; canonicalUrl?: string; metadata?: Record<string, unknown> }): Source {
    return this.ingestSource({ providerId: input.providerId, sourceType: input.sourceType, tier: input.tier, title: input.title, canonicalUrl: input.canonicalUrl, entityIds: [], retrievedAt: now(), normalizedText: input.text, checksum: createHash('sha256').update(input.text).digest('hex'), metadata: input.metadata ?? {}, parseStatus: 'PARSED' });
  }
  async ingestLocalFile(path: string, sourceType = 'USER_FILE'): Promise<Source> { const content = await readFile(path); const text = content.toString('utf8'); return this.ingestSource({ providerId: 'local-file', sourceType, tier: 'PRIMARY', title: basename(path), entityIds: [], retrievedAt: now(), rawStorageLocation: path, normalizedText: text, checksum: createHash('sha256').update(content).digest('hex'), metadata: { originalFilename: basename(path), synthetic: false }, parseStatus: 'PARSED' }); }
  extractObservations(sourceId: string): Observation[] {
    const source = this.requireSource(sourceId); if (!source.normalizedText) return [];
    const sentences = source.normalizedText.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) ?? [];
    return sentences.filter((sentence) => sentence.trim().length >= 25).slice(0, 12).map((sentence, index) => {
      const observation: Observation = { id: randomUUID(), sourceId, text: sentence.trim(), sourceLocator: { paragraph: index + 1 }, entityIds: source.entityIds, extractionConfidence: 0.65, createdAt: now() }; this.state.observations.push(observation); return observation;
    });
  }
  proposeClaim(observationId: string, type: Claim['type'] = 'MANAGEMENT_CLAIM'): Claim {
    const observation = this.state.observations.find((item) => item.id === observationId); if (!observation) throw new Error('Observation not found');
    const claim: Claim = { id: randomUUID(), text: observation.text, type, status: 'CANDIDATE', entityIds: observation.entityIds, themeIds: [], confidence: observation.extractionConfidence, createdBy: 'AI', createdAt: now(), updatedAt: now() }; this.state.claims.push(claim);
    this.linkEvidence({ claimId: claim.id, observationId, sourceId: observation.sourceId, direction: 'CONTEXT', strength: observation.extractionConfidence, rationale: 'Candidate claim derived from a direct observation.' }); return claim;
  }
  linkEvidence(input: Omit<Evidence, 'id' | 'createdAt'>): Evidence {
    const claim = this.state.claims.find((item) => item.id === input.claimId); if (!claim) throw new Error('Claim not found'); const observation = input.observationId ? this.state.observations.find((item) => item.id === input.observationId) : undefined;
    validateEvidence(claim, { ...input, id: 'pending', createdAt: now() }, new Set(this.state.sources.map((source) => source.id)), observation?.sourceId);
    const evidence: Evidence = { ...input, id: randomUUID(), createdAt: now() }; this.state.evidence.push(evidence); this.refreshClaimStatus(claim.id); return evidence;
  }
  createQuestion(input: Omit<ResearchQuestion, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'entityIds'> & Partial<Pick<ResearchQuestion, 'status' | 'entityIds'>>): ResearchQuestion {
    validateQuestion(input); const question: ResearchQuestion = { ...input, id: randomUUID(), status: input.status ?? 'OPEN', entityIds: input.entityIds ?? [], createdAt: now(), updatedAt: now() }; this.state.questions.push(question); return question;
  }
  lineage(claimId: string): { claim: Claim; evidence: Array<Evidence & { observation?: Observation; source: Source }> } {
    const claim = this.state.claims.find((item) => item.id === claimId); if (!claim) throw new Error('Claim not found'); return { claim, evidence: this.state.evidence.filter((item) => item.claimId === claimId).map((evidence) => ({ ...evidence, observation: evidence.observationId ? this.state.observations.find((item) => item.id === evidence.observationId) : undefined, source: this.requireSource(evidence.sourceId) })) };
  }
  listQuestions(): Array<ResearchQuestion & { priority: number }> { return this.state.questions.map((question) => ({ ...question, priority: questionPriority(question) })).sort((a, b) => b.priority - a.priority); }
  createHypothesis(input: Omit<Hypothesis, 'id' | 'createdAt' | 'updatedAt' | 'supportingClaimIds' | 'contradictingClaimIds'> & Partial<Pick<Hypothesis, 'supportingClaimIds' | 'contradictingClaimIds'>>): Hypothesis {
    if (!input.statement.trim()) throw new Error('Hypothesis must not be empty'); if (input.confidence !== undefined && (input.confidence < 0 || input.confidence > 1)) throw new Error('hypothesis confidence must be between 0 and 1');
    const hypothesis: Hypothesis = { ...input, id: randomUUID(), supportingClaimIds: input.supportingClaimIds ?? [], contradictingClaimIds: input.contradictingClaimIds ?? [], createdAt: now(), updatedAt: now() }; this.state.hypotheses.push(hypothesis); return hypothesis;
  }
  createThesis(input: { title: string; summary: string; confidence: number; status?: Thesis['status']; companyId?: string; variantPerception?: string; hypothesisIds?: string[]; questionIds?: string[]; evidenceIds?: string[] }): Thesis {
    if (!input.title.trim() || !input.summary.trim()) throw new Error('Thesis requires title and summary'); if (input.confidence < 0 || input.confidence > 1) throw new Error('thesis confidence must be between 0 and 1');
    const thesisId = randomUUID(); const revision: ThesisRevision = { id: randomUUID(), thesisId, revisionNumber: 1, summary: input.summary, confidence: input.confidence, status: input.status ?? 'EXPLORING', evidenceIds: input.evidenceIds ?? [], hypothesisIds: input.hypothesisIds ?? [], questionIds: input.questionIds ?? [], changeSummary: 'Initial thesis revision.', createdAt: now() };
    const thesis: Thesis = { id: thesisId, title: input.title, companyId: input.companyId, status: revision.status, currentRevisionId: revision.id, confidence: input.confidence, variantPerception: input.variantPerception, hypothesisIds: revision.hypothesisIds, questionIds: revision.questionIds, createdAt: now(), updatedAt: now() }; this.state.theses.push(thesis); this.state.thesisRevisions.push(revision); return thesis;
  }
  reviseThesis(thesisId: string, input: { summary: string; confidence: number; status: Thesis['status']; evidenceIds?: string[]; hypothesisIds?: string[]; questionIds?: string[]; changeSummary?: string }): ThesisRevision {
    const thesis = this.requireThesis(thesisId); if (!input.summary.trim()) throw new Error('Revision summary must not be empty'); if (input.confidence < 0 || input.confidence > 1) throw new Error('thesis confidence must be between 0 and 1'); const previous = this.revisions(thesisId).at(-1)!;
    const revision: ThesisRevision = { id: randomUUID(), thesisId, revisionNumber: previous.revisionNumber + 1, summary: input.summary, confidence: input.confidence, status: input.status, evidenceIds: input.evidenceIds ?? previous.evidenceIds, hypothesisIds: input.hypothesisIds ?? previous.hypothesisIds, questionIds: input.questionIds ?? previous.questionIds, changeSummary: input.changeSummary ?? this.describeRevisionChange(previous, input), createdAt: now() };
    this.state.thesisRevisions.push(revision); thesis.currentRevisionId = revision.id; thesis.status = revision.status; thesis.confidence = revision.confidence; thesis.hypothesisIds = revision.hypothesisIds; thesis.questionIds = revision.questionIds; thesis.updatedAt = now(); return revision;
  }
  addCondition(input: Omit<ThesisCondition, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'evidenceIds'> & Partial<Pick<ThesisCondition, 'status' | 'evidenceIds'>>): ThesisCondition { this.requireThesis(input.thesisId); const condition: ThesisCondition = { ...input, id: randomUUID(), status: input.status ?? 'OPEN', evidenceIds: input.evidenceIds ?? [], createdAt: now(), updatedAt: now() }; this.state.conditions.push(condition); return condition; }
  addRisk(input: Omit<Risk, 'id' | 'createdAt' | 'evidenceIds'> & Partial<Pick<Risk, 'evidenceIds'>>): Risk { this.requireThesis(input.thesisId); if (input.likelihood < 0 || input.likelihood > 1 || input.impact < 0 || input.impact > 1) throw new Error('risk scores must be between 0 and 1'); const risk: Risk = { ...input, id: randomUUID(), evidenceIds: input.evidenceIds ?? [], createdAt: now() }; this.state.risks.push(risk); return risk; }
  addCatalyst(input: Omit<Catalyst, 'id' | 'createdAt' | 'evidenceIds'> & Partial<Pick<Catalyst, 'evidenceIds'>>): Catalyst { this.requireThesis(input.thesisId); const catalyst: Catalyst = { ...input, id: randomUUID(), evidenceIds: input.evidenceIds ?? [], createdAt: now() }; this.state.catalysts.push(catalyst); return catalyst; }
  addForecast(input: Omit<Forecast, 'id' | 'createdAt'>): Forecast { this.requireThesis(input.thesisId); if (!Number.isFinite(input.value)) throw new Error('forecast value must be finite'); const forecast: Forecast = { ...input, id: randomUUID(), createdAt: now() }; this.state.forecasts.push(forecast); return forecast; }
  recordContradiction(input: Omit<Contradiction, 'id' | 'createdAt' | 'status'> & Partial<Pick<Contradiction, 'status'>>): Contradiction { if (!this.state.claims.some((claim) => claim.id === input.claimAId) || !this.state.claims.some((claim) => claim.id === input.claimBId)) throw new Error('Contradictions require two existing claims'); const contradiction: Contradiction = { ...input, id: randomUUID(), status: input.status ?? 'OPEN', createdAt: now() }; this.state.contradictions.push(contradiction); return contradiction; }
  thesisDetail(thesisId: string): { thesis: Thesis; revisions: ThesisRevision[]; conditions: ThesisCondition[]; risks: Risk[]; catalysts: Catalyst[]; forecasts: Forecast[]; contradictions: Contradiction[] } { const thesis = this.requireThesis(thesisId); return { thesis, revisions: this.revisions(thesisId), conditions: this.state.conditions.filter((item) => item.thesisId === thesisId), risks: this.state.risks.filter((item) => item.thesisId === thesisId), catalysts: this.state.catalysts.filter((item) => item.thesisId === thesisId), forecasts: this.state.forecasts.filter((item) => item.thesisId === thesisId), contradictions: this.state.contradictions.filter((item) => item.thesisId === thesisId) }; }
  snapshot(): Store { return structuredClone(this.state); }
  private requireSource(id: string): Source { const source = this.state.sources.find((item) => item.id === id); if (!source) throw new Error('Source not found'); return source; }
  private requireThesis(id: string): Thesis { const thesis = this.state.theses.find((item) => item.id === id); if (!thesis) throw new Error('Thesis not found'); return thesis; }
  private revisions(thesisId: string): ThesisRevision[] { return this.state.thesisRevisions.filter((item) => item.thesisId === thesisId).sort((a, b) => a.revisionNumber - b.revisionNumber); }
  private describeRevisionChange(previous: ThesisRevision, next: { confidence: number; status: Thesis['status'] }): string { const confidence = next.confidence === previous.confidence ? 'Confidence unchanged.' : `Confidence ${next.confidence > previous.confidence ? 'increased' : 'decreased'} from ${previous.confidence} to ${next.confidence}.`; return `${confidence} Status ${previous.status} → ${next.status}.`; }
  private refreshClaimStatus(id: string): void { const claim = this.state.claims.find((item) => item.id === id)!; const directions = this.state.evidence.filter((item) => item.claimId === id).map((item) => item.direction); claim.status = directions.includes('SUPPORTS') && directions.includes('CONTRADICTS') ? 'CONFLICTED' : directions.includes('SUPPORTS') ? 'SUPPORTED' : claim.status; claim.updatedAt = now(); }
}
