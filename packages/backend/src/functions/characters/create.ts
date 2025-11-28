import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { generateCharacterFromPrompt } from '../../lib/groq/client';
import { generateCharacterImage } from '../../lib/images/xaiImageClient';
import { uploadCharacterImage, getPresignedImageUrl } from '../../lib/s3/imageStorage';
import { getAvatarModelUrl } from '../../lib/avatars/readyPlayerMe';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { ValidationError, UnauthorizedError, getErrorStatusCode } from '../../lib/utils/errors';
import { CreateCharacterInputSchema } from '@velora/shared';
import { getUserIdFromEvent } from '../../lib/utils/auth';

const logger = new Logger('CreateCharacterFunction');
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Create character request received');

    const userId = await getUserIdFromEvent(event);

    const body = JSON.parse(event.body || '{}');
    const validatedInput = CreateCharacterInputSchema.parse(body);

    let characterData;
    let generatedProfile = null;

    if (validatedInput.prompt) {
      logger.info('Generating character from prompt', { prompt: validatedInput.prompt });
      generatedProfile = await generateCharacterFromPrompt(validatedInput.prompt);

      characterData = {
        name: validatedInput.name || generatedProfile.name,
        systemPrompt: generatedProfile.systemPrompt,
        personalityTraits: {
          tone: generatedProfile.tone,
          interests: generatedProfile.interests,
          background: generatedProfile.background,
          speakingStyle: generatedProfile.speakingStyle,
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

    if (generatedProfile) {
      try {
        logger.info('Starting image and 3D model generation');

        const [imageBuffer, modelUrl] = await Promise.all([
          generateCharacterImage(generatedProfile),
          getAvatarModelUrl(generatedProfile),
        ]);

        logger.info('Image buffer generated', { sizeBytes: imageBuffer.length });

        logger.info('Uploading image to S3');
        await uploadCharacterImage(character.characterId, imageBuffer);
        logger.info('Image uploaded successfully');

        logger.info('Generating presigned URL');
        const avatarUrl = await getPresignedImageUrl(character.characterId);
        logger.info('Presigned URL generated', { avatarUrl });

        character.avatar = avatarUrl;
        character.modelUrl = modelUrl || undefined;

        logger.info('Updating character with avatar and model URLs');
        await characterRepo.update(userId, character.characterId, {
          avatar: avatarUrl,
          modelUrl: modelUrl || undefined,
        });

        logger.info('Image and 3D model generated successfully', {
          characterId: character.characterId,
          avatarUrl,
          modelUrl,
        });
      } catch (imageError: any) {
        logger.error('Failed to generate image/model, continuing without avatar', {
          error: imageError.message,
          stack: imageError.stack,
          characterId: character.characterId,
        });
      }
    }

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
