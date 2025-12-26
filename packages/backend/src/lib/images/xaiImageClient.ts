import OpenAI from 'openai';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { GeneratedCharacterProfile, PersonalityTone } from '@velora/shared';
import { Logger } from '../utils/logger';

const logger = new Logger('XAIImageClient');

let xaiClient: OpenAI | null = null;
let cachedApiKey: string | null = null;

async function getXaiApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

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
    throw new Error('xAI API key not found');
  }

  return cachedApiKey;
}

async function getXaiClient(): Promise<OpenAI> {
  if (xaiClient) return xaiClient;

  const apiKey = await getXaiApiKey();
  xaiClient = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
  });
  return xaiClient;
}

function buildImagePrompt(profile: GeneratedCharacterProfile): string {
  const toneDescriptors: Record<PersonalityTone, string> = {
    playful: 'cheerful expression, bright eyes, friendly smile',
    serious: 'composed expression, focused gaze, professional demeanor',
    romantic: 'warm smile, soft eyes, gentle expression',
    professional: 'confident posture, sharp features, business attire',
    caring: 'kind eyes, gentle smile, approachable demeanor',
    adventurous: 'energetic expression, determined look, outdoor style',
  };

  const toneDescriptor = toneDescriptors[profile.tone] || 'friendly expression';

  return `Professional character portrait of ${profile.name}, a ${profile.tone} AI companion.
${toneDescriptor}.
Style: High-quality digital art, detailed facial features, portrait orientation.
Background: Soft gradient, clean and simple.
Focus on face and upper body.
${profile.background}`;
}

export async function generateCharacterImage(
  characterProfile: GeneratedCharacterProfile
): Promise<Buffer> {
  try {
    const xai = await getXaiClient();
    const imagePrompt = buildImagePrompt(characterProfile);

    logger.info('Generating character image', {
      characterName: characterProfile.name,
      tone: characterProfile.tone
    });

    const response = await xai.images.generate({
      model: 'grok-2-image',
      prompt: imagePrompt,
      n: 1,
      response_format: 'b64_json',
    });

    const imageData = response.data[0]?.b64_json;
    if (!imageData) {
      throw new Error('No image data returned from xAI');
    }

    const imageBuffer = Buffer.from(imageData, 'base64');
    logger.info('Character image generated successfully', {
      characterName: characterProfile.name,
      sizeBytes: imageBuffer.length,
    });

    return imageBuffer;
  } catch (error: any) {
    logger.error('Failed to generate character image', error);
    throw error;
  }
}
