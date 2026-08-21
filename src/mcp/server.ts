import readline from 'node:readline';
import { ResearchKernel } from '../services/research-kernel.ts';

const kernel = new ResearchKernel(); await kernel.load();
const tools = [
  { name: 'research_list_sources', description: 'List immutable research sources.', inputSchema: { type: 'object', properties: {} } },
  { name: 'research_get_claim_lineage', description: 'Return a claim with its evidence, observations, and sources.', inputSchema: { type: 'object', properties: { claimId: { type: 'string' } }, required: ['claimId'] } },
  { name: 'research_create_question', description: 'Create a persistent research question.', inputSchema: { type: 'object', properties: { question: { type: 'string' }, importance: { type: 'number' }, uncertainty: { type: 'number' }, thesisImpact: { type: 'number' } }, required: ['question', 'importance', 'uncertainty', 'thesisImpact'] } },
];
const reply = (id: unknown, result: unknown) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
readline.createInterface({ input: process.stdin }).on('line', async (line) => { try { const request = JSON.parse(line); if (request.method === 'tools/list') return reply(request.id, { tools }); if (request.method === 'tools/call') { const args = request.params.arguments ?? {}; let value: unknown; if (request.params.name === 'research_list_sources') value = kernel.snapshot().sources; else if (request.params.name === 'research_get_claim_lineage') value = kernel.lineage(args.claimId); else if (request.params.name === 'research_create_question') { value = kernel.createQuestion(args); await kernel.save(); } else throw new Error('Unknown MCP tool'); return reply(request.id, { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }); } reply(request.id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'analystos', version: '0.1.0' } }); } catch (error) { reply(null, { isError: true, content: [{ type: 'text', text: String(error) }] }); } });
