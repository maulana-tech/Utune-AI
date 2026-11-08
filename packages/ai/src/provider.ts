import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

// ─── Providers ───────────────────────────────────────────────────────────────

export const nvidia = createOpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY || '',
});

export const sumopod = process.env.SUMOPOD_API_KEY
  ? createOpenAI({
      baseURL: 'https://ai.sumopod.com/v1',
      apiKey: process.env.SUMOPOD_API_KEY,
    })
  : null;

/** Google Gemini/Gemma via OpenAI-compatible endpoint */
export const google = process.env.GOOGLE_API_KEY
  ? createOpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: process.env.GOOGLE_API_KEY,
    })
  : null;

export const anthropic = process.env.ANTHROPIC_API_KEY
  ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/** OpenRouter: single gateway for Anthropic, OpenAI, Meta, Mistral, Google, etc. */
export const openrouter = process.env.OPENROUTER_API_KEY
  ? createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      // OpenRouter asks (not requires) these headers for analytics
      headers: {
        ...(process.env.OPENROUTER_SITE_URL && { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL }),
        ...(process.env.OPENROUTER_APP_NAME && { 'X-Title': process.env.OPENROUTER_APP_NAME }),
      },
    })
  : null;

/** AWS Bedrock: managed Claude/Llama/Mistral/Titan via AWS.
 *  Supports two auth modes:
 *  - Bearer token (new): AWS_BEARER_TOKEN_BEDROCK (env var picked up by AWS SDK >=3.6xx).
 *    We pass `bedrockOptions` to bypass ai-sdk's IAM-cred requirement.
 *  - IAM credentials (classic): AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY.
 */
const bedrockRegion = process.env.AWS_REGION || process.env.BEDROCK_REGION || 'us-east-1';
export const bedrock = process.env.AWS_BEARER_TOKEN_BEDROCK
  ? createAmazonBedrock({ bedrockOptions: { region: bedrockRegion } })
  : (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    ? createAmazonBedrock({
        region: bedrockRegion,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
      })
    : null;

// ─── Helper: resolve model name to a LanguageModel ──────────────────────────
// Syntax: "<provider>:<model>" — provider is optional (defaults to nvidia).
// Supported providers: nvidia | google | anthropic | sumopod | openrouter | bedrock

function resolveModel(name: string) {
  const idx = name.indexOf(':');
  if (idx > 0) {
    const provider = name.slice(0, idx);
    const model = name.slice(idx + 1);
    if (provider === 'nvidia') return nvidia(model);
    if (provider === 'google' && google) return google(model);
    if (provider === 'anthropic' && anthropic) return anthropic(model) as unknown as ReturnType<typeof nvidia>;
    if (provider === 'sumopod' && sumopod) return sumopod(model);
    if (provider === 'openrouter' && openrouter) return openrouter(model);
    if (provider === 'bedrock' && bedrock) return bedrock(model) as unknown as ReturnType<typeof nvidia>;
  }
  return nvidia(name);
}

// ─── Models (env-overridable) ──────────────────────────────────────────────

const fastOverride = process.env.AI_FAST_MODEL;
export const fastModel = fastOverride
  ? resolveModel(fastOverride)
  : nvidia('meta/llama-3.1-8b-instruct');

const standardOverride = process.env.AI_STANDARD_MODEL;
export const defaultModel = standardOverride
  ? resolveModel(standardOverride)
  : nvidia('meta/llama-3.1-70b-instruct');

const heavyOverride = process.env.AI_HEAVY_MODEL;
export const heavyModel = heavyOverride
  ? resolveModel(heavyOverride)
  : nvidia('meta/llama-3.1-70b-instruct');

export const models = {
  fast: fastModel,
  standard: defaultModel,
  heavy: heavyModel,
  router: defaultModel,
};

// ─── Fallback models (used when primary fails) ─────────────────────────────
// If NVIDIA_API_KEY isn't set, fallback == primary fast model (same tier, same provider)
// so callers still get *something* instead of a crash.

const haveNvidia = !!process.env.NVIDIA_API_KEY;

export const fallbackModels = {
  fast: haveNvidia ? nvidia('meta/llama-3.1-8b-instruct') : fastModel,
  standard: haveNvidia ? nvidia('meta/llama-3.1-8b-instruct') : fastModel,
  heavy: haveNvidia ? nvidia('meta/llama-3.1-8b-instruct') : fastModel,
};
