'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { createCharacter } from '@/lib/api/characters';
import { transcribeAudio } from '@/lib/api/chat';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';

export default function NewCharacterPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcribing, setTranscribing] = useState(false);

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
      router.push(`/chat?characterId=${response.character.characterId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create character');
    } finally {
      setLoading(false);
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
    </div>
  );
}
