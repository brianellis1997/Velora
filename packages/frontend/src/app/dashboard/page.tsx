'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { listCharacters, deleteCharacter } from '@/lib/api/characters';
import { Character } from '@velora/shared';
import { Avatar } from '@/components/Avatar';

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthStore();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) {
      router.push('/login');
      return;
    }

    loadCharacters();
  }, [user, accessToken, router]);

  const loadCharacters = async () => {
    try {
      const response = await listCharacters(accessToken!);
      setCharacters(response.characters);
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (characterId: string, characterName: string) => {
    if (!confirm(`Are you sure you want to delete ${characterName}? This cannot be undone.`)) {
      return;
    }

    setDeleting(characterId);
    try {
      await deleteCharacter(characterId, accessToken!);
      setCharacters(characters.filter(c => c.characterId !== characterId));
    } catch (error) {
      console.error('Failed to delete character:', error);
      alert('Failed to delete character. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Velora</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, {user.username}</span>
            <Link
              href="/profile"
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Your AI Companions</h2>
          <Link
            href="/characters/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Create New Character
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading your characters...</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">
              You haven't created any characters yet
            </p>
            <Link
              href="/characters/new"
              className="text-blue-600 hover:underline"
            >
              Create your first character
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <div
                key={character.characterId}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex flex-col items-center mb-4">
                  <Avatar
                    src={character.avatar}
                    alt={character.name}
                    size="lg"
                    fallback={character.name[0]}
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">{character.name}</h3>
                <p className="text-gray-600 mb-2">
                  {character.personalityTraits.tone}
                </p>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {character.personalityTraits.background}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/chat?characterId=${character.characterId}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
                  >
                    Chat
                  </Link>
                  <Link
                    href={`/characters/${character.characterId}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(character.characterId, character.name)}
                    disabled={deleting === character.characterId}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    title="Delete character"
                  >
                    {deleting === character.characterId ? '...' : '🗑'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
