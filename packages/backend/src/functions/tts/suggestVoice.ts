import { APIGatewayProxyHandler } from 'aws-lambda';
import { suggestVoiceForCharacter } from '../../lib/tts/voiceMatcher';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { getUserIdFromEvent } from '../../lib/utils/auth';
import { getErrorStatusCode, NotFoundError } from '../../lib/utils/errors';

const logger = new Logger('SuggestVoiceFunction');
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Suggest voice request received');

    const userId = await getUserIdFromEvent(event);

    const characterId = event.pathParameters?.characterId;

    if (!characterId) {
      return errorResponse('Character ID is required', 400);
    }

    const character = await characterRepo.getById(characterId);

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      return errorResponse('Unauthorized to access this character', 403);
    }

    const voiceMatch = await suggestVoiceForCharacter(
      character.name,
      character.personalityTraits,
      character.systemPrompt
    );

    logger.info('Voice suggested successfully', {
      characterId,
      voiceId: voiceMatch.voiceId,
      voiceName: voiceMatch.voiceName,
    });

    return successResponse({
      voiceId: voiceMatch.voiceId,
      voiceName: voiceMatch.voiceName,
      reasoning: voiceMatch.reasoning,
    });
  } catch (error: any) {
    logger.error('Suggest voice failed', error);

    return errorResponse(
      error.message || 'Failed to suggest voice',
      getErrorStatusCode(error),
      error.name
    );
  }
};
