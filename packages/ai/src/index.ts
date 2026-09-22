export * from './provider';
export * from './types';
export * from './orchestrator';
export * from './agents/extractor';
export * from './agents/finance';
export * from './agents/marketing';
export * from './agents/strategy';

// Sales agents
export { analyzeLeadForSales } from './agents/smart-sales';
export { generateColdEmail } from './agents/cold-email';

// SQL search agent (natural-language → SQL for leads table)
export { generateLeadsSearchSql } from './agents/sql-search';

// Swarm AI Agent System (v2 — replaces old orchestrators)
export * from './swarm';
export { runLeadScoringSwarm } from './swarm/workflows/lead-scoring.workflow';
