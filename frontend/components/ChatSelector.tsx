'use client';

import { useState, useEffect } from 'react';
import { ChatMetadata } from '@/types';

interface ChatSelectorProps {
  onSelectChat: (chatName: string, systemInstructions?: string) => void;
}

export default function ChatSelector({ onSelectChat }: ChatSelectorProps) {
  const [chats, setChats] = useState<Record<string, ChatMetadata>>({});
  const [newChatName, setNewChatName] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await fetch('http://localhost:8000/chats');
      const data = await response.json();
      setChats(data.chats);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const handleCreateOrOpen = async (chatName: string, instructions?: string) => {
    if (!chatName.trim()) return;
    setIsLoading(true);
    await onSelectChat(chatName, instructions);
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-black">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-zinc-900 rounded-lg mb-4">
            <svg className="w-12 h-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Select or Create a Chat</h2>
          <p className="text-zinc-400">Each chat maintains its own context and conversation history</p>
        </div>

        {/* New Chat Input */}
        <div className="mb-8">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Create New Chat or Open Existing
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateOrOpen(newChatName, systemInstructions)}
                placeholder="Enter chat name..."
                className="w-full px-4 py-3 bg-black border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <textarea
                value={systemInstructions}
                onChange={(e) => setSystemInstructions(e.target.value)}
                placeholder="System instructions (optional) - e.g., 'Always reply in 20 words or less'"
                rows={2}
                className="w-full px-4 py-3 bg-black border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
              <button
                onClick={() => handleCreateOrOpen(newChatName, systemInstructions)}
                disabled={isLoading || !newChatName.trim()}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Loading...' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Chats */}
        {Object.keys(chats).length > 0 && (
          <div>
            <h3 className="text-base font-medium text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Chats
            </h3>
            <div className="grid gap-3">
              {Object.entries(chats)
                .sort(([, a], [, b]) => {
                  // Sort by last_accessed in descending order (most recent first)
                  const dateA = new Date(a.last_accessed).getTime();
                  const dateB = new Date(b.last_accessed).getTime();
                  return dateB - dateA;
                })
                .map(([name, metadata]) => (
                <button
                  key={name}
                  onClick={() => handleCreateOrOpen(name, undefined)}
                  disabled={isLoading}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 hover:border-zinc-700 transition-colors text-left group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-base group-hover:text-blue-400 transition-colors">
                        {name}
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          {metadata.message_count} messages
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(metadata.last_accessed)}
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-zinc-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
