import { z } from 'zod';

export interface HandoffTarget {
  agentName: string;
  description: string;
  inputContext?: Record<string, unknown>;
}

export interface SwarmTool {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (params: unknown, context: SwarmContext) => Promise<unknown>;
}

/** Model type compatible with generateObject from AI SDK. Uses `any` to handle provider model type variance. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SwarmModel = any;

export interface SwarmAgent {
  name: string;
  instructions: string;
  model: SwarmModel;
  schema: z.ZodObject<any>;
  handoffs: HandoffTarget[];
  tools: SwarmTool[];
  capabilities: string[];
  maxIterations?: number;
}

/**
 * Parallel fan-out instruction emitted by coordinator agents.
 * The run-loop runs all listed agents concurrently via Promise.all,
 * stores results under `groupKey`, then routes to `nextAfterAll`.
 */
export interface ParallelFanOut {
  agents: string[];
  groupKey: string;
  nextAfterAll: string;
}

export interface SwarmContext {
  executionId: string;
  workspaceId: string;
  leadId?: string;
  agentOutputs: Map<string, unknown>;
  data: Record<string, unknown>;
  startTime: number;
  iterationCount: number;
  tokenUsage: { agentName: string; tokens: number }[];
}

export interface SwarmAgentResult {
  output: unknown;
  handoff?: string;
  handoffContext?: Record<string, unknown>;
  toolCalls?: { toolName: string; result: unknown }[];
  reasoning: string;
  confidence: number;
  tokensUsed?: number;
}

export interface SwarmRunResult {
  executionId: string;
  success: boolean;
  steps: {
    agentName: string;
    iteration: number;
    output: unknown;
    reasoning: string;
    confidence: number;
    durationMs: number;
    tokensUsed?: number;
    handoff?: string;
    /** Which agent handed off to this one. */
    handoffFrom?: string;
    /** Set for agents run inside a parallel fan-out group. */
    parallelGroup?: string;
    /** Tool calls made during this step. */
    toolCalls?: { toolName: string; result: unknown }[];
  }[];
  finalOutput: unknown;
  totalDurationMs: number;
  totalTokensUsed: number;
}

export const MAX_SWARM_ITERATIONS = 10;
