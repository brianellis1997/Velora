import { apiRequest } from './client';
import { User, UserProfile } from '@velora/shared';

export async function getProfile(token: string): Promise<{ user: User }> {
  return apiRequest('/users/profile', {
    method: 'GET',
    token,
  });
}

export async function updateProfile(
  profile: UserProfile,
  preferences: { voiceEnabled?: boolean } | undefined,
  token: string
): Promise<{ user: User }> {
  return apiRequest('/users/profile', {
    method: 'PUT',
    body: {
      profile,
      metadata: preferences ? { preferences } : undefined,
    },
    token,
  });
}
