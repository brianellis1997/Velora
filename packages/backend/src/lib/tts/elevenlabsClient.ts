import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Logger } from '../utils/logger';

const logger = new Logger('ElevenLabsClient');
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: 'velora/elevenlabs-api-key',
      })
    );

    if (!response.SecretString) {
      throw new Error('ElevenLabs API key secret is empty');
    }

    cachedApiKey = response.SecretString;
    return cachedApiKey;
  } catch (error) {
    logger.error('Failed to retrieve ElevenLabs API key from Secrets Manager', error);
    throw error;
  }
}

export interface ElevenLabsVoice {
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

export interface ListVoicesResponse {
  voices: ElevenLabsVoice[];
}

export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const apiKey = await getApiKey();

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('ElevenLabs API error', { status: response.status, error: errorText });
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data: ListVoicesResponse = await response.json();
    logger.info('Retrieved voices from ElevenLabs', { count: data.voices.length });

    return data.voices;
  } catch (error) {
    logger.error('Failed to list voices from ElevenLabs', error);
    throw error;
  }
}

export interface SynthesizeSpeechOptions {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export async function synthesizeSpeech(options: SynthesizeSpeechOptions): Promise<string> {
  const apiKey = await getApiKey();
  const { text, voiceId, modelId = 'eleven_monolingual_v1', voiceSettings } = options;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: voiceSettings || {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('ElevenLabs TTS error', { status: response.status, error: errorText });
      throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    logger.info('Successfully synthesized speech', {
      voiceId,
      textLength: text.length,
      audioSize: audioBuffer.byteLength,
    });

    return base64Audio;
  } catch (error) {
    logger.error('Failed to synthesize speech', error);
    throw error;
  }
}
