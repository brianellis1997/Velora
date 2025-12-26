import OpenAI from 'openai';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { ChatContextMessage, GeneratedCharacterProfile, PersonalityTone } from '@velora/shared';

let xaiClient: OpenAI | null = null;
let cachedApiKey: string | null = null;

async function getXaiApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  if (process.env.XAI_API_KEY) {
    cachedApiKey = process.env.XAI_API_KEY;
    return cachedApiKey;
  }

  const secretName = process.env.XAI_API_KEY_SECRET_NAME || 'velora/xai-api-key';
  const client = new SecretsManagerClient({});

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  if (response.SecretString) {
    try {
      const secret = JSON.parse(response.SecretString);
      cachedApiKey = secret.XAI_API_KEY || secret;
    } catch {
      cachedApiKey = response.SecretString;
    }
  } else {
    throw new Error('xAI API key not found in Secrets Manager');
  }

  return cachedApiKey;
}

async function getXaiClient(): Promise<OpenAI> {
  if (xaiClient) {
    return xaiClient;
  }

  const apiKey = await getXaiApiKey();
  xaiClient = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
  });
  return xaiClient;
}

export async function streamChatCompletion(
  messages: ChatContextMessage[],
  onToken: (token: string) => Promise<void>
): Promise<{ content: string; tokens: number; model: string }> {
  const xai = await getXaiClient();

  const stream = await xai.chat.completions.create({
    model: 'grok-3',
    messages: messages as any,
    stream: true,
    temperature: 0.9,
    max_tokens: 1024,
    top_p: 1,
  });

  let fullContent = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      fullContent += delta;
      await onToken(delta);
    }
  }

  return {
    content: fullContent,
    tokens: fullContent.split(/\s+/).length * 1.3,
    model: 'grok-3',
  };
}

export async function generateCharacterFromPrompt(prompt: string): Promise<GeneratedCharacterProfile> {
  const xai = await getXaiClient();

  const systemPrompt = `You are a character designer for an AI companion service. Generate a detailed character profile based on the user's description. Return ONLY a JSON object with the following structure:
{
  "name": "string (character name)",
  "tone": "string (one of: playful, serious, romantic, professional, caring, adventurous)",
  "background": "string (2-3 sentences about character background)",
  "interests": ["array", "of", "3-5", "interests"],
  "speakingStyle": "string (describe how they communicate)",
  "systemPrompt": "string (detailed instructions for the AI to roleplay this character)"
}`;

  const response = await xai.chat.completions.create({
    model: 'grok-3',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create a character based on this description: ${prompt}` },
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  const profile = JSON.parse(content);

  return {
    name: profile.name || 'AI Companion',
    tone: profile.tone as PersonalityTone || 'caring',
    background: profile.background || 'A friendly AI companion.',
    interests: profile.interests || ['conversation', 'helping people'],
    speakingStyle: profile.speakingStyle || 'Friendly and supportive',
    systemPrompt: profile.systemPrompt || `You are ${profile.name}, a friendly AI companion.`,
  };
}
