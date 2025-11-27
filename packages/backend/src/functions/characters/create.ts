import { APIGatewayProxyHandler } from 'aws-lambda';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { generateCharacterFromPrompt } from '../../lib/groq/client';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { ValidationError, UnauthorizedError, getErrorStatusCode } from '../../lib/utils/errors';
import { CreateCharacterInputSchema } from '@velora/shared';

const logger = new Logger('CreateCharacterFunction');
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Create character request received');

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const body = JSON.parse(event.body || '{}');
    const validatedInput = CreateCharacterInputSchema.parse(body);

    let characterData;

    if (validatedInput.prompt) {
      logger.info('Generating character from prompt', { prompt: validatedInput.prompt });
      const generated = await generateCharacterFromPrompt(validatedInput.prompt);

      characterData = {
        name: validatedInput.name || generated.name,
        systemPrompt: generated.systemPrompt,
        personalityTraits: {
          tone: generated.tone,
          interests: generated.interests,
          background: generated.background,
          speakingStyle: generated.speakingStyle,
        },
      };
    } else if (validatedInput.personalityTraits) {
      if (!validatedInput.name) {
        throw new ValidationError('Name is required when creating character manually');
      }

      characterData = {
        name: validatedInput.name,
        systemPrompt: `You are ${validatedInput.name}, a ${validatedInput.personalityTraits.tone} AI companion.

Background: ${validatedInput.personalityTraits.background}
Interests: ${validatedInput.personalityTraits.interests.join(', ')}
Speaking Style: ${validatedInput.personalityTraits.speakingStyle}

Instructions:
- Stay in character at all times
- Be engaging and emotionally responsive
- Remember context from this conversation
- Keep responses concise (1-3 paragraphs unless asked for more)`,
        personalityTraits: validatedInput.personalityTraits,
      };
    } else {
      throw new ValidationError('Either prompt or personalityTraits must be provided');
    }

    const character = await characterRepo.create({
      userId,
      ...characterData,
    });

    logger.info('Character created successfully', { characterId: character.characterId });

    return successResponse({ character }, 201);
  } catch (error: any) {
    logger.error('Create character failed', error);

    return errorResponse(
      error.message || 'Failed to create character',
      getErrorStatusCode(error),
      error.name
    );
  }
};
