import { z } from 'zod';

/**
 * Shared context that flows between agents in the orchestration pipeline
 */
export interface AgentContext {
  executionId: string;
  leadId: string;
  workspaceId: string;
  stepNumber: number;

  // Accumulated data from previous agents
  extractedData?: {
    name: string;
    category: string;
    services: string[];
    contact_info: { email?: string; phone?: string };
    summary: string;
  };

  financialAnalysis?: {
    estimated_revenue_range: string;
    company_size: 'micro' | 'small' | 'medium' | 'large';
    budget_probability: number;
    reasoning: string;
  };

  marketingInsights?: {
    targetPersona: string;
    painPoints: string[];
    messagingAngle: string;
    coldEmailDraft: string;
    reasoning: string;
  };

  strategicRecommendation?: {
    priorityScore: number; // 0-100
    conversionProbability: number; // 0.0 - 1.0
    recommendedAction: 'immediate_outreach' | 'nurture' | 'disqualify';
    reasoning: string;
  };
}

/**
 * Standard agent response with reasoning transparency
 */
export interface AgentResponse<T = any> {
  output: T;
  reasoning: string; // explicit chain-of-thought
  confidence: number; // 0-100
  contextToShare: Record<string, any>; // what to pass to next agent
  durationMs: number;
  tokensUsed?: number;
}

/**
 * Zod schemas for agent outputs (for structured generation)
 */
export const ExtractorOutputSchema = z.object({
  name: z.string().describe('Name of the business'),
  category: z.string().describe('Primary business category/industry'),
  services: z.array(z.string()).describe('List of services offered'),
  contact_info: z.object({
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
  summary: z.string().describe('A 1 sentence summary of the business'),
  reasoning: z.string().describe('Why these fields were extracted this way'),
  confidence: z.number().min(0).max(100).describe('Confidence in extraction quality'),
});

export const FinanceOutputSchema = z.object({
  estimated_revenue_range: z.string().describe('e.g. $10k - $50k / month'),
  company_size: z.enum(['micro', 'small', 'medium', 'large']),
  budget_probability: z.number().min(0).max(100).describe('Probability they have budget for B2B tools'),
  financial_health_score: z.number().min(0).max(100).describe('Overall financial health score'),
  reasoning: z.string().describe('Analytical reasoning for financial estimates. Clinical tone.'),
  confidence: z.number().min(0).max(100),
});

export const MarketingOutputSchema = z.object({
  target_persona: z.string().describe('Who would buy from this business'),
  pain_points: z.array(z.string()).describe('Top 3 pain points we can solve'),
  messaging_angle: z.string().describe('How to position our product to them'),
  messaging_fit_score: z.number().min(0).max(100).describe('How well our product fits their needs'),
  reasoning: z.string().describe('Why this messaging approach. No buzzwords.'),
  confidence: z.number().min(0).max(100),
});

export const StrategyOutputSchema = z.object({
  priority_score: z.number().min(0).max(100).describe('Overall lead quality score'),
  conversion_probability: z.number().min(0).max(1).describe('Probability of conversion (0.0 - 1.0)'),
  estimated_deal_value: z.number().describe('Predicted deal size in USD'),
  priority_tier: z.enum(['A', 'B', 'C', 'D']).describe('A=hot lead, D=disqualify'),
  recommended_action: z.enum(['immediate_outreach', 'nurture', 'disqualify']),
  strategic_alignment_score: z.number().min(0).max(100).describe('How well this lead aligns with our ICP'),
  reasoning: z.string().describe('Strategic synthesis across all agents. Why this recommendation?'),
  confidence: z.number().min(0).max(100),
});
