import { APIGatewayProxyHandler } from 'aws-lambda';
import Groq from 'groq-sdk';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { ValidationError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('TranscribeFunction');

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

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Transcription request received');

    const apiKey = await getGroqApiKey();

    if (!event.body) {
      throw new ValidationError('Audio data is required');
    }

    const body = JSON.parse(event.body);
    const base64Audio = body.audio;

    if (!base64Audio) {
      throw new ValidationError('Audio field is required');
    }

    // Decode base64 audio data
    const audioData = Buffer.from(base64Audio, 'base64');

    if (audioData.length === 0) {
      throw new ValidationError('Audio data is empty');
    }

    logger.info(`Processing audio data: ${audioData.length} bytes`);

    const groq = new Groq({ apiKey });

    // Create a File-like object from the buffer
    const audioFile = new File([audioData], 'audio.webm', {
      type: event.headers['content-type'] || 'audio/webm',
    });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'en',
    });

    logger.info(`Transcription completed: ${transcription.text.substring(0, 100)}...`);

    return successResponse({
      text: transcription.text,
    });
  } catch (error: any) {
    logger.error('Transcription failed', error);

    return errorResponse(
      error.message || 'Transcription failed',
      getErrorStatusCode(error),
      error.name
    );
  }
};
