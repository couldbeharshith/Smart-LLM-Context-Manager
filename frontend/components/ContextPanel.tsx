'use client';

import { useEffect, useRef } from 'react';
import { ContextTurn } from '@/types';

interface ContextPanelProps {
  contextTurns: ContextTurn[];
  isLoading: boolean;
}

export default function ContextPanel({ contextTurns, isLoading }: ContextPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Read thresholds and colors from environment variables
  const HIGH_THRESHOLD = parseFloat(process.env.NEXT_PUBLIC_SIMILARITY_HIGH_THRESHOLD || '0.7');
  const MED_THRESHOLD = parseFloat(process.env.NEXT_PUBLIC_SIMILARITY_MED_THRESHOLD || '0.5');
  const HIGH_COLOR = process.env.NEXT_PUBLIC_SIMILARITY_HIGH_COLOR || '#10b981';
  const MED_COLOR = process.env.NEXT_PUBLIC_SIMILARITY_MED_COLOR || '#f59e0b';
  const LOW_COLOR = process.env.NEXT_PUBLIC_SIMILARITY_LOW_COLOR || '#ef4444';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [contextTurns]);

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= HIGH_THRESHOLD) return HIGH_COLOR;
    if (similarity >= MED_THRESHOLD) return MED_COLOR;
    return LOW_COLOR;
  };

  const getSimilarityBarColor = (similarity: number) => {
    const color = getSimilarityColor(similarity);
    return color;
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= HIGH_THRESHOLD) return { text: 'High', color: HIGH_COLOR };
    if (similarity >= MED_THRESHOLD) return { text: 'Med', color: MED_COLOR };
    return { text: 'Low', color: LOW_COLOR };
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
      {contextTurns.length === 0 && !isLoading && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-xs">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-900/50 border border-zinc-800/50 mb-3">
              <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-xs text-zinc-500">Send a message</p>
            <p className="text-[10px] text-zinc-700 mt-1 font-mono">Context will appear here</p>
          </div>
        </div>
      )}

      {isLoading && contextTurns.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3 animate-pulse">
              <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-xs text-zinc-500 font-mono">Retrieving...</p>
          </div>
        </div>
      )}

      {contextTurns.map((turn, index) => {
        const badge = getSimilarityBadge(turn.similarity);
        const borderColor = getSimilarityColor(turn.similarity);
        const barColor = getSimilarityBarColor(turn.similarity);
        
        return (
          <div
            key={`${turn.id}-${index}`}
            className="relative bg-zinc-950/30 border-l-2 rounded-r-lg p-3 animate-fade-in"
            style={{ borderLeftColor: borderColor }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 font-mono">#{turn.id}</span>
              <div className="flex items-center gap-2">
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{ 
                    backgroundColor: `${badge.color}1A`,
                    color: badge.color
                  }}
                >
                  {badge.text}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
                  {(turn.similarity * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            {/* Content - More compact */}
            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <span className="text-zinc-500 font-mono shrink-0">Q:</span>
                <p className="text-zinc-200 leading-relaxed">{turn.user}</p>
              </div>
              
              <div className="flex gap-2">
                <span className="text-zinc-500 font-mono shrink-0">A:</span>
                <p className="text-zinc-300 leading-relaxed">{turn.assistant}</p>
              </div>
            </div>

            {/* Similarity bar */}
            <div className="mt-2 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${turn.similarity * 100}%`,
                  backgroundColor: barColor
                }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
