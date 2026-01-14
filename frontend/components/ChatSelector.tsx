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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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
    
    // First, create/open the chat in backend (this stores system instructions)
    try {
      await fetch('http://localhost:8000/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_name: chatName,
          system_instructions: instructions 
        }),
      });
      
      // Then navigate to the chat page
      await onSelectChat(chatName, instructions);
    } catch (error) {
      console.error('Error creating/opening chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = date.getUTCDate();
    return `${month} ${day}`;
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-black">
      <div className="max-w-xl w-full animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-5">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight">Start a conversation</h2>
          <p className="text-sm text-zinc-500 font-mono">Each chat maintains isolated context</p>
        </div>

        {/* New Chat Input */}
        <div className="mb-8">
          <div className="bg-zinc-950/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6 shadow-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 font-mono uppercase tracking-wider">
                  Chat Name
                </label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateOrOpen(newChatName, systemInstructions)}
                  placeholder="e.g., Project Alpha"
                  className="w-full px-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 font-mono uppercase tracking-wider">
                  System Instructions <span className="text-zinc-600">(Optional)</span>
                </label>
                <textarea
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  placeholder="e.g., Always reply in 20 words or less"
                  rows={2}
                  className="w-full px-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none transition-all"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={() => handleCreateOrOpen(newChatName, systemInstructions)}
                disabled={isLoading || !newChatName.trim()}
                className="w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
              >
                {isLoading ? 'Loading...' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Chats */}
        {isMounted && Object.keys(chats).length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-zinc-500 mb-3 font-mono uppercase tracking-wider flex items-center gap-2">
              <div className="h-px flex-1 bg-zinc-800" />
              Recent
              <div className="h-px flex-1 bg-zinc-800" />
            </h3>
            <div className="grid gap-2">
              {Object.entries(chats)
                .sort(([, a], [, b]) => {
                  const dateA = new Date(a.last_accessed).getTime();
                  const dateB = new Date(b.last_accessed).getTime();
                  return dateB - dateA;
                })
                .map(([name, metadata]) => (
                <button
                  key={name}
                  onClick={() => handleCreateOrOpen(name, undefined)}
                  disabled={isLoading}
                  className="bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-4 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all text-left group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors truncate">
                        {name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600 font-mono">
                        <span>{metadata.message_count} msgs</span>
                        <span>·</span>
                        <span>{formatDate(metadata.last_accessed)}</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
