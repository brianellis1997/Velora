import { apiRequest } from './client';
import { Character, CreateCharacterInput } from '@velora/shared';

export async function createCharacter(
  input: CreateCharacterInput,
  token: string
): Promise<{ character: Character }> {
  return apiRequest('/characters', {
    method: 'POST',
    body: input,
    token,
  });
}

export async function listCharacters(
  token: string
): Promise<{ characters: Character[] }> {
  return apiRequest('/characters', {
    method: 'GET',
    token,
  });
}

export async function getCharacter(
  characterId: string,
  token: string
): Promise<{ character: Character }> {
  return apiRequest(`/characters/${characterId}`, {
    method: 'GET',
    token,
  });
}

export async function deleteCharacter(
  characterId: string,
  token: string
): Promise<void> {
  return apiRequest(`/characters/${characterId}`, {
    method: 'DELETE',
    token,
  });
}
