'use client';

import { useState, useEffect } from 'react';

interface Turn {
  id: number;
  user: string;
  assistant: string;
}

interface SimilarityData {
  [turnId: number]: number; // turnId -> similarity score with respect to latest message
}

interface Stats {
  totalTurns: number;
  avgSimilarity: number;
  highSimilarityPairs: number;
  totalWords: number;
}

interface VisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatName: string;
}

export default function VisualizationModal({ isOpen, onClose, chatName }: VisualizationModalProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
  const [hoveredTurn, setHoveredTurn] = useState<number | null>(null);
  const [similarityData, setSimilarityData] = useState<SimilarityData>({});
  const [activeView, setActiveView] = useState<'linked-list' | 'heatmap'>('linked-list');
  const [stats, setStats] = useState<Stats>({ totalTurns: 0, avgSimilarity: 0, highSimilarityPairs: 0, totalWords: 0 });
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen, chatName]);

  useEffect(() => {
    if (turns.length > 0 && Object.keys(similarityData).length > 0) {
      calculateStats();
    }
  }, [turns, similarityData]);

  const loadChatHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/chat/${chatName}/history`);
      const data = await response.json();
      
      const formattedTurns: Turn[] = data.history.map((turn: any) => ({
        id: turn.id,
        user: turn.user.text,
        assistant: turn.llm.text,
      }));
      
      setTurns(formattedTurns);
      await calculateSimilarities(formattedTurns);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSimilarities = async (turns: Turn[]) => {
    try {
      const response = await fetch(`http://localhost:8000/chat/${chatName}/last_similarities`);
      const data = await response.json();
      
      // Convert to format: { turnId: similarity }
      const scores: SimilarityData = {};
      Object.entries(data.similarity_scores).forEach(([turnId, similarity]) => {
        scores[parseInt(turnId as string)] = similarity as number;
      });
      
      setSimilarityData(scores);
    } catch (error) {
      console.error('Error fetching similarities:', error);
      setSimilarityData({});
    }
  };

  const calculateStats = () => {
    const HIGH_THRESHOLD = parseFloat(process.env.NEXT_PUBLIC_SIMILARITY_HIGH_THRESHOLD || '0.7');
    
    let totalSimilarity = 0;
    let pairCount = 0;
    let highPairs = 0;
    let totalWords = 0;

    // Calculate stats from similarity data (all turns vs latest)
    Object.values(similarityData).forEach(sim => {
      totalSimilarity += sim;
      pairCount++;
      if (sim >= HIGH_THRESHOLD) highPairs++;
    });

    turns.forEach(turn => {
      totalWords += turn.user.split(' ').length + turn.assistant.split(' ').length;
    });

    setStats({
      totalTurns: turns.length,
      avgSimilarity: pairCount > 0 ? totalSimilarity / pairCount : 0,
      highSimilarityPairs: highPairs,
      totalWords,
    });
  };

  const getSimilarity = (turnId: number): number => {
    return similarityData[turnId] || 0;
  };

  const getSimilarityColor = (similarity: number): string => {
    const HIGH_THRESHOLD = parseFloat(process.env.NEXT_PUBLIC_SIMILARITY_HIGH_THRESHOLD || '0.7');
    const MED_THRESHOLD = parseFloat(process.env.NEXT_PUBLIC_SIMILARITY_MED_THRESHOLD || '0.5');
    
    if (similarity >= HIGH_THRESHOLD) return '#10b981';
    if (similarity >= MED_THRESHOLD) return '#f59e0b';
    return '#ef4444';
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const exportVisualization = () => {
    const dataStr = JSON.stringify({ turns, similarities: similarityData, stats }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chatName}-visualization.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-[95vw] h-[90vh] bg-zinc-950 border border-zinc-800/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative bg-zinc-950 border-b border-zinc-800/50 px-6 py-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Context Visualization
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                {chatName} · {turns.length} turns
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:bg-zinc-800/50 transition-colors"
                title="Toggle statistics"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>

              <button
                onClick={exportVisualization}
                className="px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:bg-zinc-800/50 transition-colors"
                title="Export data"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
                <button
                  onClick={() => setActiveView('linked-list')}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                >
                  Linked List
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center hover:bg-zinc-800/50 transition-colors"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && (
          <div className="bg-zinc-950/50 border-b border-zinc-800/50 px-6 py-3">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-black/30 rounded-lg p-3 border border-zinc-800/30">
                <div className="text-xs text-zinc-500 font-mono mb-1">TOTAL TURNS</div>
                <div className="text-xl font-bold text-white">{stats.totalTurns}</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-zinc-800/30">
                <div className="text-xs text-zinc-500 font-mono mb-1">AVG SIMILARITY</div>
                <div className="text-xl font-bold text-white">{(stats.avgSimilarity * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-zinc-800/30">
                <div className="text-xs text-zinc-500 font-mono mb-1">HIGH SIMILARITY TURNS</div>
                <div className="text-xl font-bold text-emerald-400">{stats.highSimilarityPairs}</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-zinc-800/30">
                <div className="text-xs text-zinc-500 font-mono mb-1">TOTAL WORDS</div>
                <div className="text-xl font-bold text-white">{stats.totalWords.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-black">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4 animate-pulse">
                  <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-sm text-zinc-400 font-mono">Loading visualization...</p>
              </div>
            </div>
          ) : (
            <LinkedListView
              turns={turns}
              selectedTurn={selectedTurn}
              hoveredTurn={hoveredTurn}
              onSelectTurn={setSelectedTurn}
              onHoverTurn={setHoveredTurn}
              getSimilarity={getSimilarity}
              getSimilarityColor={getSimilarityColor}
              truncateText={truncateText}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LinkedListView({
  turns,
  selectedTurn,
  hoveredTurn,
  onSelectTurn,
  onHoverTurn,
  getSimilarity,
  getSimilarityColor,
  truncateText,
}: any) {
  const latestTurnId = turns.length > 0 ? turns[turns.length - 1].id : null;
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 text-center">
        <h3 className="text-base font-semibold text-white mb-2">Context Retrieval Visualization</h3>
        <p className="text-sm text-zinc-500 font-mono">
          All turns compared to Turn #{latestTurnId} (most recent query)
        </p>
      </div>

      {/* Compact Grid Layout */}
      <div className="grid grid-cols-4 gap-6">
        {turns.map((turn: any) => {
          const isSelected = selectedTurn === turn.id;
          const isHovered = hoveredTurn === turn.id;
          const similarity = getSimilarity(turn.id);
          const isLatest = turn.id === latestTurnId;
          const similarityColor = getSimilarityColor(similarity);
          
          return (
            <div
              key={turn.id}
              className="relative"
              onMouseEnter={() => onHoverTurn(turn.id)}
              onMouseLeave={() => onHoverTurn(null)}
            >
              {/* Turn Box */}
              <div
                className={`relative bg-zinc-900 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                  isSelected || isHovered
                    ? 'border-blue-400 shadow-lg shadow-blue-500/30 scale-105 z-10'
                    : isLatest
                    ? 'border-blue-500 shadow-md shadow-blue-500/20'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
                onClick={() => onSelectTurn(isSelected ? null : turn.id)}
                style={{
                  borderLeftWidth: '5px',
                  borderLeftColor: isLatest ? '#3b82f6' : similarityColor
                }}
              >
                {/* Turn Number Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-bold font-mono ${isLatest ? 'text-blue-400' : 'text-zinc-300'}`}>
                    #{turn.id}
                  </div>
                  {!isLatest && (
                    <div 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                      style={{ 
                        color: similarityColor,
                        backgroundColor: `${similarityColor}20`
                      }}
                    >
                      {(similarity * 100).toFixed(0)}%
                    </div>
                  )}
                  {isLatest && (
                    <div className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/20">
                      LATEST
                    </div>
                  )}
                </div>

                {/* Arrow indicator for non-latest turns */}
                {!isLatest && (
                  <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: similarityColor }}>
                    <span className="text-white text-xs font-bold">→</span>
                  </div>
                )}

                {/* Content Preview */}
                <div className="text-xs text-zinc-400 leading-snug mb-2">
                  <div className="font-mono text-zinc-500 mb-0.5">Q:</div>
                  <div className="line-clamp-2 mb-2">{turn.user}</div>
                  
                  <div className="font-mono text-zinc-600 mb-0.5">A:</div>
                  <div className="line-clamp-2 text-zinc-500">{turn.assistant}</div>
                </div>

                {/* Word Count */}
                <div className="mt-2 pt-2 border-t border-zinc-800">
                  <div className="text-xs text-zinc-600 font-mono">
                    {turn.user.split(' ').length + turn.assistant.split(' ').length} words
                  </div>
                </div>
              </div>

              {/* Expanded Details Tooltip */}
              {(isSelected || isHovered) && (
                <div className="absolute left-0 top-full mt-3 w-96 bg-black border-2 border-zinc-700 rounded-lg p-4 shadow-2xl z-50">
                  <div className="text-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <span className="text-zinc-400 font-mono font-bold">Turn #{turn.id}</span>
                      {!isLatest && (
                        <span className="font-mono font-bold text-sm" style={{ color: similarityColor }}>
                          {(similarity * 100).toFixed(1)}% similar to #{latestTurnId}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-zinc-500 font-mono text-xs mb-1.5">USER QUERY:</div>
                      <div className="text-zinc-200 leading-relaxed">{turn.user}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 font-mono text-xs mb-1.5">ASSISTANT:</div>
                      <div className="text-zinc-300 leading-relaxed">{turn.assistant}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
            <span className="text-zinc-400 font-mono">High (≥70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
            <span className="text-zinc-400 font-mono">Med (≥50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-zinc-400 font-mono">Low (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-zinc-400 font-mono">Latest Query</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-zinc-600 flex items-center justify-center text-white text-xs">→</div>
            <span className="text-zinc-400 font-mono">Points to latest</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center">
        <p className="text-xs text-zinc-600 font-mono">
          Hover over boxes for full content · Arrow badges show relationship to latest turn
        </p>
      </div>
    </div>
  );
}
