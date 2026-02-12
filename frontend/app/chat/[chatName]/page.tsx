'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContextPanel from '@/components/ContextPanel';
import HistoryPanel from '@/components/HistoryPanel';
import ChatInput from '@/components/ChatInput';
import VisualizationModal from '@/components/VisualizationModal';
import { Chat, Message, ContextTurn } from '@/types';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  
  const chatName = decodeURIComponent(params.chatName as string);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [contextTurns, setContextTurns] = useState<ContextTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [useFullContext, setUseFullContext] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);

  useEffect(() => {
    initializeChat();
  }, [chatName]);

  const initializeChat = async () => {
    setIsLoading(true);
    try {
      // Backend will load system instructions from chats.json if chat exists
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_name: chatName
        }),
      });
      
      const data = await response.json();
      setChatInfo(data);
      
      await loadChatHistory(chatName);
      setContextTurns([]);
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatHistory = async (chatName: string) => {
    try {
      const response = await fetch(`/api/chat/${chatName}/history`);
      const data = await response.json();
      
      const formattedMessages: Message[] = data.history.map((turn: any) => ({
        id: turn.id,
        user: turn.user.text,
        assistant: turn.llm.text,
        timestamp: new Date().toISOString(),
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    setIsLoading(true);
    
    const tempId = Date.now();
    const tempMessage: Message = {
      id: tempId,
      user: message,
      assistant: '',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      const response = await fetch('/api/message/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_name: chatName,
          message: message,
          use_full_context: useFullContext,
        }),
      });
      
      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';
      let turnId = tempId;
      let contextData: any = null;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'metadata') {
              contextData = data;
              const formattedContext: ContextTurn[] = data.context_turns.map((turn: any) => ({
                id: turn.id,
                user: turn.user,
                assistant: turn.assistant,
                similarity: data.similarity_scores[turn.id] || 0.5,  // Use actual score from Pinecone
              }));
              
              formattedContext.push({
                id: tempId,
                user: message,
                assistant: '',
                similarity: 1.0,  // Current turn is 100% relevant
              });
              
              setContextTurns(formattedContext);
            } else if (data.type === 'chunk') {
              assistantResponse += data.text;
              setMessages(prev => prev.map(msg => 
                msg.id === tempId 
                  ? { ...msg, assistant: assistantResponse }
                  : msg
              ));
              
              setContextTurns(prev => prev.map(turn =>
                turn.id === tempId
                  ? { ...turn, assistant: assistantResponse }
                  : turn
              ));
            } else if (data.type === 'done') {
              turnId = data.turn_id;
              setMessages(prev => prev.map(msg => 
                msg.id === tempId 
                  ? { ...msg, id: turnId, assistant: assistantResponse }
                  : msg
              ));
              
              setContextTurns(prev => prev.map(turn =>
                turn.id === tempId
                  ? { ...turn, id: turnId }
                  : turn
              ));
              
              if (chatInfo) {
                setChatInfo({
                  ...chatInfo,
                  message_count: chatInfo.message_count + 1,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black font-[family-name:var(--font-inter)]">
      {/* Header */}
      <header className="relative bg-zinc-950 border-b border-zinc-800/50 px-8 py-5">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="w-8 h-8 rounded-lg bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center hover:bg-zinc-800/50 transition-colors"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Context Manager
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5 font-mono text-xs">
                Semantic retrieval · Token optimization
              </p>
            </div>
          </div>
          {chatInfo && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowVisualization(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Visualize
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-sm text-zinc-300 font-mono">{chatName}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-sm text-zinc-400 font-mono">{chatInfo.message_count}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Context Window */}
        <div className="w-1/2 border-r border-zinc-800/50 flex flex-col bg-zinc-950/50">
          <div className="relative bg-zinc-950 px-6 py-4 border-b border-zinc-800/50">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-transparent" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Active Context
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                  Retrieved semantic matches
                </p>
              </div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
          </div>
          <ContextPanel 
            contextTurns={contextTurns} 
            isLoading={isLoading}
          />
          <div className="p-5 bg-zinc-950 border-t border-zinc-800/50">
            <div className="mb-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="fullContext"
                checked={useFullContext}
                onChange={(e) => setUseFullContext(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-700 bg-black text-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0"
              />
              <label htmlFor="fullContext" className="text-xs text-zinc-400 cursor-pointer font-mono">
                Full history mode
              </label>
            </div>
            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Right Panel - Full History */}
        <div className="w-1/2 flex flex-col bg-black">
          <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Conversation
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">
              Complete chronological history
            </p>
          </div>
          <HistoryPanel messages={messages} />
        </div>
      </div>

      {/* Visualization Modal */}
      <VisualizationModal
        isOpen={showVisualization}
        onClose={() => setShowVisualization(false)}
        chatName={chatName}
      />
    </div>
  );
}
