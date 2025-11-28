'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { getCharacter } from '@/lib/api/characters';
import { createConversation, listConversations, getMessages, transcribeAudio } from '@/lib/api/chat';
import { synthesizeSpeech } from '@/lib/api/tts';
import { getProfile } from '@/lib/api/users';
import { Character, Message, Conversation } from '@velora/shared';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';
import { Avatar } from '@/components/Avatar';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get('characterId');

  const { user, accessToken } = useAuthStore();
  const [character, setCharacter] = useState<Character | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [synthesizingAudio, setSynthesizingAudio] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef<string>('');

  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
    error: recordingError,
  } = useAudioRecorder();

  const { isPlaying, playAudio, stopAudio } = useAudioPlayer();

  useEffect(() => {
    if (!user || !accessToken || !characterId) {
      router.push('/login');
      return;
    }

    loadCharacterAndConversation();
  }, [user, accessToken, characterId, router]);

  const loadCharacterAndConversation = async () => {
    try {
      const [charResponse, profileResponse, conversationsResponse] = await Promise.all([
        getCharacter(characterId!, accessToken!),
        getProfile(accessToken!),
        listConversations(accessToken!),
      ]);

      setCharacter(charResponse.character);
      setVoiceEnabled(profileResponse.user.metadata?.preferences?.voiceEnabled || false);

      const characterConversations = conversationsResponse.conversations
        .filter((c) => c.characterId === characterId)
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.createdAt).getTime() -
            new Date(a.lastMessageAt || a.createdAt).getTime()
        );

      setConversations(characterConversations);

      const existingConversation = characterConversations[0];

      const conversation = existingConversation
        ? existingConversation
        : await createConversation(characterId!, accessToken!).then(
            (r) => r.conversation
          );

      setConversationId(conversation.conversationId);

      const messagesResponse = await getMessages(
        conversation.conversationId,
        accessToken!
      );
      setMessages(messagesResponse.messages);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (messageIndex: number, messageContent: string) => {
    if (!character?.voiceConfig || !accessToken) return;

    try {
      setSynthesizingAudio(messageIndex);
      const response = await synthesizeSpeech(
        messageContent,
        character.voiceConfig.voiceId,
        accessToken
      );
      playAudio(response.audioContent);
    } catch (error) {
      console.error('Failed to synthesize speech:', error);
    } finally {
      setSynthesizingAudio(null);
    }
  };

  const handleNewConversation = async () => {
    if (!characterId || !accessToken) return;

    try {
      const response = await createConversation(characterId, accessToken);
      const newConversation = response.conversation;

      setConversations([newConversation, ...conversations]);
      setConversationId(newConversation.conversationId);
      setMessages([]);
      setShowSidebar(false);

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleSwitchConversation = async (convId: string) => {
    if (!accessToken) return;

    try {
      setConversationId(convId);
      const messagesResponse = await getMessages(convId, accessToken);
      setMessages(messagesResponse.messages);
      setShowSidebar(false);

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    } catch (error) {
      console.error('Failed to switch conversation:', error);
    }
  };

  const connectWebSocket = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected to:', WS_URL);
        resolve(ws);
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        const data = JSON.parse(event.data);

        if (data.type === 'token') {
          streamingContentRef.current += data.content;
          setStreamingMessage(streamingContentRef.current);
        } else if (data.type === 'done') {
          const finalContent = streamingContentRef.current;
          setMessages((prev) => [
            ...prev,
            {
              messageId: data.messageId,
              conversationId: conversationId!,
              role: 'assistant',
              content: finalContent,
              timestamp: new Date().toISOString(),
            } as Message,
          ]);
          setStreamingMessage('');
          streamingContentRef.current = '';
          setSending(false);
        } else if (data.type === 'error') {
          console.error('Chat error:', data.error);
          setSending(false);
          setStreamingMessage('');
          streamingContentRef.current = '';
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setSending(false);
        reject(error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
      };

      wsRef.current = ws;

      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId || !user) return;

    const messageContent = inputValue;
    const userMessage: Message = {
      messageId: Math.random().toString(),
      conversationId,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.log('Establishing WebSocket connection...');
        await connectWebSocket();
      }

      const payload = {
        conversationId,
        content: messageContent,
        userId: user.userId,
      };

      console.log('Sending WebSocket message:', payload);
      wsRef.current?.send(JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to send message:', error);
      setSending(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  useEffect(() => {
    if (audioBlob && accessToken) {
      handleTranscription();
    }
  }, [audioBlob, accessToken]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleTranscription = async () => {
    if (!audioBlob || !accessToken) return;

    try {
      setTranscribing(true);
      const result = await transcribeAudio(audioBlob, accessToken);
      setInputValue(result.text);
      clearRecording();
    } catch (error) {
      console.error('Transcription failed:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Character not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Conversation History"
            >
              ☰
            </button>
            <Avatar
              src={character.avatar}
              alt={character.name}
              size="sm"
              fallback={character.name[0]}
            />
            <div>
              <h1 className="text-xl font-bold">{character.name}</h1>
              <p className="text-sm text-gray-500">
                {character.personalityTraits.tone}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </nav>

      {showSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowSidebar(false)} />
      )}

      <div className={`fixed left-0 top-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 z-50 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Conversations</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <button
            onClick={handleNewConversation}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + New Conversation
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-120px)]">
          {conversations.map((conv) => (
            <button
              key={conv.conversationId}
              onClick={() => handleSwitchConversation(conv.conversationId)}
              className={`w-full p-4 text-left border-b hover:bg-gray-50 transition ${conv.conversationId === conversationId ? 'bg-blue-50' : ''}`}
            >
              <p className="font-medium text-sm truncate">
                {new Date(conv.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">
                {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString() : 'No messages yet'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="flex items-end gap-2">
                {message.role === 'assistant' && (
                  <Avatar
                    src={character?.avatar}
                    alt={character?.name || 'Character'}
                    size="sm"
                    fallback={character?.name?.[0]}
                  />
                )}
                {message.role === 'assistant' && voiceEnabled && character?.voiceConfig && (
                  <button
                    onClick={() => handlePlayAudio(index, message.content)}
                    disabled={synthesizingAudio === index || isPlaying}
                    className="mb-1 p-2 text-gray-500 hover:text-blue-600 transition disabled:opacity-50"
                    title="Play audio"
                  >
                    {synthesizingAudio === index ? (
                      <span className="text-sm">⏳</span>
                    ) : (
                      <span className="text-sm">🔊</span>
                    )}
                  </button>
                )}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {streamingMessage && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <Avatar
                  src={character?.avatar}
                  alt={character?.name || 'Character'}
                  size="sm"
                  fallback={character?.name?.[0]}
                />
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-white text-gray-900 shadow">
                  {streamingMessage}
                  <span className="animate-pulse">▊</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !sending && !transcribing) {
                sendMessage();
              }
            }}
            placeholder={transcribing ? 'Transcribing...' : 'Type your message...'}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={sending || transcribing}
          />
          <button
            onClick={handleMicrophoneClick}
            disabled={sending || transcribing}
            className={`px-4 py-2 rounded-lg transition ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? '⏹' : '🎤'}
          </button>
          <button
            onClick={sendMessage}
            disabled={sending || !inputValue.trim() || transcribing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        {recordingError && (
          <div className="max-w-4xl mx-auto mt-2 text-sm text-red-600">
            {recordingError}
          </div>
        )}
      </div>
    </div>
  );
}
