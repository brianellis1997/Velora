'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { getProfile, updateProfile } from '@/lib/api/users';

export default function ProfilePage() {
  const router = useRouter();
  const { user, accessToken, setUser } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<string>('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user || !accessToken) {
      router.push('/login');
      return;
    }

    loadProfile();
  }, [user, accessToken, router]);

  const loadProfile = async () => {
    try {
      const response = await getProfile(accessToken!);
      const profile = response.user.profile;
      const prefs = response.user.metadata?.preferences;

      if (profile) {
        setFullName(profile.fullName || '');
        setAge(profile.age?.toString() || '');
        setLocation(profile.location || '');
        setBio(profile.bio || '');
        setInterests(profile.interests?.join(', ') || '');
      }

      if (prefs) {
        setVoiceEnabled(prefs.voiceEnabled || false);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const interestsArray = interests
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const profileData = {
        fullName: fullName || undefined,
        age: age ? parseInt(age) : undefined,
        location: location || undefined,
        bio: bio || undefined,
        interests: interestsArray.length > 0 ? interestsArray : undefined,
      };

      const preferences = {
        voiceEnabled,
      };

      const response = await updateProfile(profileData, preferences, accessToken!);

      setUser(response.user);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading profile...</p>
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

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-2">Your Profile</h2>
          <p className="text-sm text-gray-600 mb-6">
            This information helps your AI companions provide personalized responses.
            All fields are optional.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="number"
                id="age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your age"
                min="13"
                max="120"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City, Country"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                About Me
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{bio.length}/500 characters</p>
            </div>

            <div>
              <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">
                Interests
              </label>
              <input
                type="text"
                id="interests"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Gaming, Reading, Travel (comma-separated)"
              />
              <p className="text-xs text-gray-500 mt-1">Enter up to 10 interests, separated by commas</p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold mb-4">Voice Settings</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="voiceEnabled"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="voiceEnabled" className="ml-2 text-sm text-gray-700">
                  Enable voice responses in chat
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                When enabled, you can play voice audio for character responses
              </p>
            </div>

            {message && (
              <div
                className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
