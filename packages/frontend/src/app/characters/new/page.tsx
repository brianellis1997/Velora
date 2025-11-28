'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { createCharacter, updateCharacter } from '@/lib/api/characters';
import { transcribeAudio } from '@/lib/api/chat';
import { listVoices, suggestVoice, Voice } from '@/lib/api/tts';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';

export default function NewCharacterPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcribing, setTranscribing] = useState(false);

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [createdCharacterId, setCreatedCharacterId] = useState<string | null>(null);
  const [suggestedVoice, setSuggestedVoice] = useState<{
    voiceId: string;
    voiceName: string;
    reasoning: string;
  } | null>(null);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [loadingVoice, setLoadingVoice] = useState(false);

  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
    error: recordingError,
  } = useAudioRecorder();

  useEffect(() => {
    if (audioBlob && accessToken) {
      handleTranscription();
    }
  }, [audioBlob, accessToken]);

  const handleTranscription = async () => {
    if (!audioBlob || !accessToken) return;

    try {
      setTranscribing(true);
      setError('');
      const result = await transcribeAudio(audioBlob, accessToken);
      setPrompt((prev) => (prev ? prev + ' ' + result.text : result.text));
      clearRecording();
    } catch (err: any) {
      setError(err.message || 'Transcription failed');
    } finally {
      setTranscribing(false);
    }
  };

  const handleMicrophoneClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      router.push('/login');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await createCharacter({ prompt }, accessToken);
      const characterId = response.character.characterId;
      setCreatedCharacterId(characterId);

      setLoadingVoice(true);

      const voicesResponse = await listVoices(accessToken);
      setAvailableVoices(voicesResponse.voices);

      let suggestion = null;
      let retries = 5;
      let delay = 2000;
      while (retries > 0) {
        try {
          suggestion = await suggestVoice(characterId, accessToken);
          break;
        } catch (err: any) {
          retries--;
          if (retries === 0) {
            console.warn('Voice suggestion failed after retries, allowing manual selection');
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 5000);
        }
      }

      if (suggestion) {
        setSuggestedVoice(suggestion);
        setSelectedVoiceId(suggestion.voiceId);
      }
      setShowVoiceModal(true);
      setLoading(false);
      setLoadingVoice(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create character');
      setLoading(false);
      setLoadingVoice(false);
    }
  };

  const handleSaveVoice = async () => {
    if (!createdCharacterId || !accessToken || !selectedVoiceId) return;

    setLoadingVoice(true);
    try {
      const selectedVoice = availableVoices.find((v) => v.voiceId === selectedVoiceId);
      if (!selectedVoice) return;

      await updateCharacter(
        createdCharacterId,
        {
          voiceConfig: {
            provider: 'elevenlabs',
            voiceId: selectedVoice.voiceId,
            voiceName: selectedVoice.name,
            autoAssigned: selectedVoiceId === suggestedVoice?.voiceId,
          },
        },
        accessToken
      );

      router.push(`/chat?characterId=${createdCharacterId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save voice');
    } finally {
      setLoadingVoice(false);
    }
  };

  const handleSkipVoice = () => {
    if (createdCharacterId) {
      router.push(`/chat?characterId=${createdCharacterId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600">Velora</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-4xl font-bold mb-4">Create Your AI Companion</h2>
        <p className="text-gray-600 mb-8">
          Describe your ideal companion and our AI will bring them to life
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-lg font-medium">
                Describe your companion
              </label>
              <button
                type="button"
                onClick={handleMicrophoneClick}
                disabled={loading || transcribing}
                className={`px-4 py-2 rounded-lg transition ${
                  isRecording
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } disabled:opacity-50`}
                title={isRecording ? 'Stop recording' : 'Use voice input'}
              >
                {isRecording ? '⏹ Stop' : '🎤 Dictate'}
              </button>
            </div>
            <textarea
              required
              minLength={10}
              rows={6}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={
                transcribing
                  ? 'Transcribing your voice...'
                  : 'Example: Create a playful and adventurous character who loves hiking and has a quirky sense of humor. She\'s supportive and always knows how to cheer me up.'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={transcribing}
            />
            <p className="text-sm text-gray-500 mt-2">
              {transcribing
                ? 'Transcribing your audio...'
                : 'Minimum 10 characters. Be as detailed as you like!'}
            </p>
            {recordingError && (
              <p className="text-sm text-red-600 mt-2">{recordingError}</p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating Character...' : 'Create Character'}
            </button>
          </div>
        </form>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Tips for creating great characters:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Include personality traits (playful, serious, caring, etc.)</li>
            <li>Mention interests and hobbies</li>
            <li>Describe their speaking style</li>
            <li>Add a background story if you'd like</li>
          </ul>
        </div>
      </div>

      {showVoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">Choose a Voice</h3>

              {loadingVoice ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Finding the perfect voice...</p>
                </div>
              ) : (
                <>
                  {suggestedVoice && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-semibold mb-2">🎯 AI Suggested Voice:</p>
                      <p className="text-lg font-medium text-blue-600 mb-1">
                        {suggestedVoice.voiceName}
                      </p>
                      <p className="text-sm text-gray-600">{suggestedVoice.reasoning}</p>
                    </div>
                  )}

                  <div className="space-y-2 mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Or choose from all available voices:
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {availableVoices.map((voice) => (
                        <label
                          key={voice.voiceId}
                          className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                        >
                          <input
                            type="radio"
                            name="voice"
                            value={voice.voiceId}
                            checked={selectedVoiceId === voice.voiceId}
                            onChange={() => setSelectedVoiceId(voice.voiceId)}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{voice.name}</p>
                            <p className="text-sm text-gray-600">
                              {voice.labels.gender && `${voice.labels.gender}`}
                              {voice.labels.age && ` • ${voice.labels.age}`}
                              {voice.labels.accent && ` • ${voice.labels.accent}`}
                            </p>
                            {voice.labels.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {voice.labels.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleSkipVoice}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Skip (No Voice)
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveVoice}
                      disabled={!selectedVoiceId || loadingVoice}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {loadingVoice ? 'Saving...' : 'Continue to Chat'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
