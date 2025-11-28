import { PersonalityTraits } from '@velora/shared';
import { listVoices, ElevenLabsVoice } from './elevenlabsClient';
import { Logger } from '../utils/logger';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const logger = new Logger('VoiceMatcher');
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

let cachedGroqApiKey: string | null = null;

async function getGroqApiKey(): Promise<string> {
  if (cachedGroqApiKey) {
    return cachedGroqApiKey;
  }

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: 'velora/groq-api-key',
      })
    );

    if (!response.SecretString) {
      throw new Error('Groq API key secret is empty');
    }

    cachedGroqApiKey = response.SecretString;
    return cachedGroqApiKey;
  } catch (error) {
    logger.error('Failed to retrieve Groq API key from Secrets Manager', error);
    throw error;
  }
}

export interface VoiceMatchResult {
  voiceId: string;
  voiceName: string;
  reasoning: string;
}

export async function suggestVoiceForCharacter(
  characterName: string,
  personalityTraits: PersonalityTraits,
  systemPrompt: string
): Promise<VoiceMatchResult> {
  try {
    const voices = await listVoices();

    const voiceDescriptions = voices
      .map((voice, index) => {
        const labels = [];
        if (voice.labels.gender) labels.push(`Gender: ${voice.labels.gender}`);
        if (voice.labels.age) labels.push(`Age: ${voice.labels.age}`);
        if (voice.labels.accent) labels.push(`Accent: ${voice.labels.accent}`);
        if (voice.labels.description) labels.push(`Description: ${voice.labels.description}`);

        return `${index + 1}. ${voice.name} (ID: ${voice.voice_id})
   ${labels.join(', ')}`;
      })
      .join('\n\n');

    const prompt = `You are a voice matching expert. Analyze this character and suggest the BEST matching voice from the available options.

CHARACTER DETAILS:
Name: ${characterName}
Age: ${personalityTraits.age || 'Not specified'}
Gender: ${personalityTraits.gender || 'Not specified'}
Occupation: ${personalityTraits.occupation || 'Not specified'}
Background: ${personalityTraits.background || 'Not specified'}
Personality: ${systemPrompt.substring(0, 500)}

AVAILABLE VOICES:
${voiceDescriptions}

TASK:
Select the SINGLE BEST voice that matches this character's age, gender, personality, and background.
Consider:
- Age appropriateness (a 22-year-old should NOT sound like a 50-year-old)
- Gender match
- Accent and cultural background
- Personality fit (energetic character needs energetic voice, calm character needs calm voice)

Respond ONLY in this exact JSON format:
{
  "voiceId": "the voice ID",
  "voiceName": "the voice name",
  "reasoning": "brief explanation (1-2 sentences) why this voice is the best match"
}`;

    const groqApiKey = await getGroqApiKey();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Groq API error during voice matching', {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from Groq API');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse voice match response');
    }

    const result: VoiceMatchResult = JSON.parse(jsonMatch[0]);

    const selectedVoice = voices.find((v) => v.voice_id === result.voiceId);
    if (!selectedVoice) {
      throw new Error(`Selected voice ID ${result.voiceId} not found in available voices`);
    }

    logger.info('Successfully matched voice for character', {
      characterName,
      voiceId: result.voiceId,
      voiceName: result.voiceName,
    });

    return result;
  } catch (error) {
    logger.error('Failed to suggest voice for character', error);
    throw error;
  }
}
