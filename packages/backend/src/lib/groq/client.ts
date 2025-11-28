import Groq from 'groq-sdk';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { ChatContextMessage, GeneratedCharacterProfile, PersonalityTone } from '@velora/shared';

let groqClient: Groq | null = null;
let cachedApiKey: string | null = null;

async function getGroqApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  if (process.env.GROQ_API_KEY) {
    cachedApiKey = process.env.GROQ_API_KEY;
    return cachedApiKey;
  }

  const secretName = process.env.GROQ_API_KEY_SECRET_NAME || 'velora/groq-api-key';
  const client = new SecretsManagerClient({});

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  if (response.SecretString) {
    try {
      const secret = JSON.parse(response.SecretString);
      cachedApiKey = secret.GROQ_API_KEY || secret;
    } catch {
      // If parsing fails, the secret is a plain string
      cachedApiKey = response.SecretString;
    }
  } else {
    throw new Error('Groq API key not found in Secrets Manager');
  }

  return cachedApiKey;
}

async function getGroqClient(): Promise<Groq> {
  if (groqClient) {
    return groqClient;
  }

  const apiKey = await getGroqApiKey();
  groqClient = new Groq({ apiKey });
  return groqClient;
}

export async function streamChatCompletion(
  messages: ChatContextMessage[],
  onToken: (token: string) => Promise<void>
): Promise<{ content: string; tokens: number; model: string }> {
  const groq = await getGroqClient();

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
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
    model: 'llama-3.3-70b-versatile',
  };
}

export async function generateCharacterFromPrompt(prompt: string): Promise<GeneratedCharacterProfile> {
  const groq = await getGroqClient();

  const systemPrompt = `You are a character designer for an AI companion service. Generate a detailed character profile based on the user's description. Return ONLY a JSON object with the following structure:
{
  "name": "string (character name)",
  "tone": "string (one of: playful, serious, romantic, professional, caring, adventurous)",
  "background": "string (2-3 sentences about character background)",
  "interests": ["array", "of", "3-5", "interests"],
  "speakingStyle": "string (describe how they communicate)",
  "systemPrompt": "string (detailed instructions for the AI to roleplay this character)"
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
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
