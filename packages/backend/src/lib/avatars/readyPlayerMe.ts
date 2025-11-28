import { GeneratedCharacterProfile, PersonalityTone } from '@velora/shared';
import { Logger } from '../utils/logger';

const logger = new Logger('ReadyPlayerMe');

const READY_PLAYER_ME_BASE_URL = 'https://models.readyplayer.me';

interface AvatarStyle {
  gender: 'masculine' | 'feminine';
  bodyType: 'halfbody' | 'fullbody';
}

const styleMapping: Record<PersonalityTone, AvatarStyle> = {
  playful: { gender: 'feminine', bodyType: 'halfbody' },
  serious: { gender: 'masculine', bodyType: 'halfbody' },
  romantic: { gender: 'feminine', bodyType: 'halfbody' },
  professional: { gender: 'masculine', bodyType: 'halfbody' },
  caring: { gender: 'feminine', bodyType: 'halfbody' },
  adventurous: { gender: 'masculine', bodyType: 'halfbody' },
};

const DEFAULT_AVATAR_IDS = {
  masculine_halfbody: '64bfa0e78de3f465c18ba5a9.glb',
  feminine_halfbody: '64bfa0e68de3f465c18ba59f.glb',
  masculine_fullbody: '64bfa0e78de3f465c18ba5a8.glb',
  feminine_fullbody: '64bfa0e68de3f465c18ba5a0.glb',
};

export async function generateReadyPlayerMeAvatar(
  characterProfile: GeneratedCharacterProfile
): Promise<string | null> {
  try {
    logger.info('3D avatar generation requested but temporarily disabled', {
      characterName: characterProfile.name,
      tone: characterProfile.tone,
    });

    // Temporarily return null to use 2D avatars
    // TODO: Integrate with Ready Player Me API or use valid public 3D models
    return null;
  } catch (error: any) {
    logger.error('Failed to generate Ready Player Me avatar', error);
    return null;
  }
}

export async function getAvatarModelUrl(characterProfile: GeneratedCharacterProfile): Promise<string | null> {
  return generateReadyPlayerMeAvatar(characterProfile);
}
