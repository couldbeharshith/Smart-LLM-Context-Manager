'use client';

import { useEffect, useRef } from 'react';
import { ContextTurn } from '@/types';

interface ContextPanelProps {
  contextTurns: ContextTurn[];
  isLoading: boolean;
}

export default function ContextPanel({ contextTurns, isLoading }: ContextPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [contextTurns]);

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.7) return 'border-l-green-500';
    if (similarity >= 0.5) return 'border-l-yellow-500';
    return 'border-l-blue-500';
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 0.7) return { text: 'High', color: 'bg-green-900/50 text-green-400' };
    if (similarity >= 0.5) return { text: 'Med', color: 'bg-yellow-900/50 text-yellow-400' };
    return { text: 'Low', color: 'bg-blue-900/50 text-blue-400' };
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
      {contextTurns.length === 0 && !isLoading && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block p-3 bg-zinc-900 rounded-full mb-3">
              <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">Send a message to see relevant context</p>
          </div>
        </div>
      )}

      {isLoading && contextTurns.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block p-3 bg-zinc-900 rounded-full mb-3 animate-pulse">
              <svg className="w-8 h-8 text-zinc-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-zinc-400 text-sm">Processing...</p>
          </div>
        </div>
      )}

      {contextTurns.map((turn, index) => {
        const badge = getSimilarityBadge(turn.similarity);
        return (
          <div
            key={`${turn.id}-${index}`}
            className={`bg-zinc-900/50 border-l-2 ${getSimilarityColor(turn.similarity)} rounded p-3 animate-fade-in`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Turn #{turn.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${badge.color}`}>
                {badge.text}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-500 text-xs">User:</span>
                <p className="text-white mt-0.5">{turn.user}</p>
              </div>
              
              <div>
                <span className="text-zinc-500 text-xs">Assistant:</span>
                <p className="text-zinc-300 mt-0.5">{turn.assistant}</p>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${turn.similarity * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-zinc-500">
                {(turn.similarity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
