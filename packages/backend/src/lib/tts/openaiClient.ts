import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Logger } from '../utils/logger';

const logger = new Logger('OpenAIClient');
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: 'velora/openai-api-key',
      })
    );

    if (!response.SecretString) {
      throw new Error('OpenAI API key secret is empty');
    }

    cachedApiKey = response.SecretString;
    return cachedApiKey;
  } catch (error) {
    logger.error('Failed to retrieve OpenAI API key from Secrets Manager', error);
    throw error;
  }
}

export interface OpenAIVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  preview_url?: string;
}

export async function listVoices(): Promise<OpenAIVoice[]> {
  const voices: OpenAIVoice[] = [
    {
      voice_id: 'alloy',
      name: 'Alloy',
      category: 'standard',
      labels: {
        gender: 'neutral',
        description: 'A balanced, versatile voice',
      },
    },
    {
      voice_id: 'echo',
      name: 'Echo',
      category: 'standard',
      labels: {
        gender: 'male',
        description: 'A warm, engaging male voice',
      },
    },
    {
      voice_id: 'fable',
      name: 'Fable',
      category: 'standard',
      labels: {
        gender: 'male',
        description: 'An expressive, storytelling voice',
      },
    },
    {
      voice_id: 'onyx',
      name: 'Onyx',
      category: 'standard',
      labels: {
        gender: 'male',
        description: 'A deep, authoritative male voice',
      },
    },
    {
      voice_id: 'nova',
      name: 'Nova',
      category: 'standard',
      labels: {
        gender: 'female',
        description: 'A bright, energetic female voice',
      },
    },
    {
      voice_id: 'shimmer',
      name: 'Shimmer',
      category: 'standard',
      labels: {
        gender: 'female',
        description: 'A soft, friendly female voice',
      },
    },
  ];

  logger.info('Retrieved OpenAI voices', { count: voices.length });
  return voices;
}

export interface SynthesizeSpeechOptions {
  text: string;
  voiceId: string;
  model?: string;
  speed?: number;
}

export async function synthesizeSpeech(options: SynthesizeSpeechOptions): Promise<string> {
  const apiKey = await getApiKey();
  const { text, voiceId, model = 'tts-1', speed = 1.0 } = options;

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice: voiceId,
        speed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI TTS error', { status: response.status, error: errorText });
      throw new Error(`OpenAI TTS error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    logger.info('Successfully synthesized speech with OpenAI', {
      voiceId,
      textLength: text.length,
      audioSize: audioBuffer.byteLength,
    });

    return base64Audio;
  } catch (error) {
    logger.error('Failed to synthesize speech with OpenAI', error);
    throw error;
  }
}
