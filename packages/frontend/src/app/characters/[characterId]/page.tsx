'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { getCharacter } from '@/lib/api/characters';
import { Character } from '@velora/shared';

export default function CharacterDetailPage({
  params,
}: {
  params: { characterId: string };
}) {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) {
      router.push('/login');
      return;
    }

    loadCharacter();
  }, [user, accessToken, params.characterId, router]);

  const loadCharacter = async () => {
    try {
      const response = await getCharacter(params.characterId, accessToken!);
      setCharacter(response.character);
    } catch (error: any) {
      console.error('Failed to load character:', error);
      setError(error.message || 'Failed to load character');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading character details...</p>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Character not found'}</p>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Velora</h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">{character.name}</h2>
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {character.personalityTraits.tone}
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Background
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {character.personalityTraits.background}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Speaking Style
              </h3>
              <p className="text-gray-700">
                {character.personalityTraits.speakingStyle}
              </p>
            </div>

            {character.personalityTraits.interests &&
              character.personalityTraits.interests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {character.personalityTraits.interests.map(
                      (interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500 space-y-1">
                <p>
                  Usage Count: {character.usageCount} conversation
                  {character.usageCount !== 1 ? 's' : ''}
                </p>
                <p>
                  Created: {new Date(character.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <Link
              href={`/chat?characterId=${character.characterId}`}
              className="flex-1 px-6 py-3 bg-blue-600 text-white text-center rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Start Chat
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
