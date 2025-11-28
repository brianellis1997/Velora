import { apiRequest } from './client';

export interface Voice {
  voiceId: string;
  name: string;
  category: string;
  labels: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  previewUrl?: string;
}

export interface VoiceSuggestion {
  voiceId: string;
  voiceName: string;
  reasoning: string;
}

export async function listVoices(token: string): Promise<{ voices: Voice[] }> {
  return apiRequest('/tts/voices', {
    method: 'GET',
    token,
  });
}

export async function suggestVoice(
  characterId: string,
  token: string
): Promise<VoiceSuggestion> {
  return apiRequest(`/characters/${characterId}/suggest-voice`, {
    method: 'GET',
    token,
  });
}

export async function synthesizeSpeech(
  text: string,
  voiceId: string,
  token: string
): Promise<{ audioContent: string; contentType: string }> {
  return apiRequest('/tts/synthesize', {
    method: 'POST',
    body: {
      text,
      voiceId,
    },
    token,
  });
}
