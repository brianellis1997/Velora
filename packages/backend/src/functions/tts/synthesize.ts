import { APIGatewayProxyHandler } from 'aws-lambda';
import { synthesizeSpeech } from '../../lib/tts/elevenlabsClient';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { getUserIdFromEvent } from '../../lib/utils/auth';
import { getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('SynthesizeSpeechFunction');

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Synthesize speech request received');

    await getUserIdFromEvent(event);

    const body = JSON.parse(event.body || '{}');
    const { text, voiceId, modelId, voiceSettings } = body;

    if (!text || typeof text !== 'string') {
      return errorResponse('Text is required and must be a string', 400);
    }

    if (!voiceId || typeof voiceId !== 'string') {
      return errorResponse('Voice ID is required and must be a string', 400);
    }

    if (text.length > 5000) {
      return errorResponse('Text exceeds maximum length of 5000 characters', 400);
    }

    const base64Audio = await synthesizeSpeech({
      text,
      voiceId,
      modelId,
      voiceSettings,
    });

    logger.info('Speech synthesized successfully', {
      voiceId,
      textLength: text.length,
    });

    return successResponse({
      audioContent: base64Audio,
      contentType: 'audio/mpeg',
    });
  } catch (error: any) {
    logger.error('Synthesize speech failed', error);

    return errorResponse(
      error.message || 'Failed to synthesize speech',
      getErrorStatusCode(error),
      error.name
    );
  }
};
