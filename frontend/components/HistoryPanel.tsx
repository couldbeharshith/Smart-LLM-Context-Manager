'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types';

interface HistoryPanelProps {
  messages: Message[];
}

export default function HistoryPanel({ messages }: HistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-xs">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900/50 border border-zinc-800/50 mb-4">
              <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No messages yet</p>
            <p className="text-xs text-zinc-700 mt-1 font-mono">Start the conversation</p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div key={message.id} className="space-y-4 animate-fade-in">
          {/* User Message - Right aligned */}
          <div className="flex items-start gap-3 justify-end">
            <div className="flex-1 max-w-[75%]">
              <div className="flex items-center gap-2 mb-2 justify-end">
                <span className="text-[10px] text-zinc-600 font-mono">{formatTime(message.timestamp)}</span>
              </div>
              <div className="relative bg-blue-600 rounded-2xl rounded-tr-md p-4 shadow-lg shadow-blue-500/10">
                <p className="text-white text-sm leading-relaxed">{message.user}</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>

          {/* Assistant Message - Left aligned */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 max-w-[75%]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-zinc-600 font-mono">{formatTime(message.timestamp)}</span>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl rounded-tl-md p-4 backdrop-blur-sm">
                <p className="text-zinc-300 text-sm leading-relaxed">{message.assistant}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
