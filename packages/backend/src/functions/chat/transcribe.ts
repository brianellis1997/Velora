import { APIGatewayProxyHandler } from 'aws-lambda';
import Groq from 'groq-sdk';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { ValidationError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('TranscribeFunction');

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Transcription request received');

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not configured');
    }

    if (!event.body) {
      throw new ValidationError('Audio data is required');
    }

    // Decode base64 audio data
    const audioData = Buffer.from(event.body, 'base64');

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
