import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Claim, Evidence, Observation, ResearchQuestion, Source } from '../domain/types.ts';
import { questionPriority } from '../domain/types.ts';
import { validateEvidence, validateQuestion, validateSource } from '../domain/validation.ts';

type Store = { sources: Source[]; observations: Observation[]; claims: Claim[]; evidence: Evidence[]; questions: ResearchQuestion[] };
const empty = (): Store => ({ sources: [], observations: [], claims: [], evidence: [], questions: [] });
const now = () => new Date().toISOString();

/** File-backed reference implementation. PostgreSQL is the production schema; this makes local demos/tests dependency-free. */
export class ResearchKernel {
  private state: Store = empty();
  private readonly file: string;
  constructor(file = '.analystos/research-state.json') { this.file = file; }
  async load(): Promise<void> { try { this.state = JSON.parse(await readFile(this.file, 'utf8')) as Store; } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
  async save(): Promise<void> { await mkdir(join(this.file, '..'), { recursive: true }); await writeFile(this.file, JSON.stringify(this.state, null, 2)); }
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
  snapshot(): Store { return structuredClone(this.state); }
  private requireSource(id: string): Source { const source = this.state.sources.find((item) => item.id === id); if (!source) throw new Error('Source not found'); return source; }
  private refreshClaimStatus(id: string): void { const claim = this.state.claims.find((item) => item.id === id)!; const directions = this.state.evidence.filter((item) => item.claimId === id).map((item) => item.direction); claim.status = directions.includes('SUPPORTS') && directions.includes('CONTRADICTS') ? 'CONFLICTED' : directions.includes('SUPPORTS') ? 'SUPPORTED' : claim.status; claim.updatedAt = now(); }
}
