import { v4 as uuidv4 } from 'uuid';
import { SwarmContext } from './types';

export function createSwarmContext(params: {
  workspaceId: string;
  leadId?: string;
  initialData?: Record<string, unknown>;
}): SwarmContext {
  return {
    executionId: uuidv4(),
    workspaceId: params.workspaceId,
    leadId: params.leadId,
    agentOutputs: new Map(),
    data: params.initialData ?? {},
    startTime: Date.now(),
    iterationCount: 0,
    tokenUsage: [],
  };
}
