import { generateText } from 'ai';
import { bedrock, models } from '@repo/ai';

async function main() {
  console.log('bedrock provider:', bedrock ? 'OK (constructed)' : 'NULL');
  console.log('AWS_REGION:', process.env.AWS_REGION);
  console.log('AWS_BEARER_TOKEN_BEDROCK:', process.env.AWS_BEARER_TOKEN_BEDROCK ? '(set)' : '(empty)');
  console.log('standard model id:', process.env.AI_STANDARD_MODEL);

  const res = await generateText({
    model: models.standard,
    prompt: 'Say "Bedrock works from Sydney" in exactly 5 words.',
    maxTokens: 20,
  });
  console.log('---');
  console.log('response:', res.text);
  console.log('usage:', res.usage);
  process.exit(0);
}

main().catch((e) => {
  console.error('ERROR:', e?.message ?? e);
  if (e?.$metadata) console.error('AWS metadata:', JSON.stringify(e.$metadata, null, 2));
  process.exit(1);
});
