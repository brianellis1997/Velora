import { APIGatewayProxyHandler } from 'aws-lambda';
import { listVoices } from '../../lib/tts/elevenlabsClient';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { getUserIdFromEvent } from '../../lib/utils/auth';
import { getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('ListVoicesFunction');

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('List voices request received');

    await getUserIdFromEvent(event);

    const voices = await listVoices();

    logger.info('Voices retrieved successfully', { count: voices.length });

    return successResponse({
      voices: voices.map((voice) => ({
        voiceId: voice.voice_id,
        name: voice.name,
        category: voice.category,
        labels: voice.labels,
        previewUrl: voice.preview_url,
      })),
    });
  } catch (error: any) {
    logger.error('List voices failed', error);

    return errorResponse(
      error.message || 'Failed to list voices',
      getErrorStatusCode(error),
      error.name
    );
  }
};
