'use client';

import { useState, useEffect, useRef } from 'react';
import ChatSelector from '@/components/ChatSelector';
import ContextPanel from '@/components/ContextPanel';
import HistoryPanel from '@/components/HistoryPanel';
import ChatInput from '@/components/ChatInput';
import { Chat, Message, ContextTurn } from '@/types';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contextTurns, setContextTurns] = useState<ContextTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [useFullContext, setUseFullContext] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadChatHistory = async (chatName: string) => {
    try {
      const response = await fetch(`http://localhost:8000/chat/${chatName}/history`);
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

  const handleChatSelect = async (chatName: string, systemInstructions?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_name: chatName,
          system_instructions: systemInstructions 
        }),
      });
      
      const data = await response.json();
      setSelectedChat(chatName);
      setChatInfo(data);
      
      await loadChatHistory(chatName);
      setContextTurns([]);
    } catch (error) {
      console.error('Error selecting chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedChat) return;
    
    setIsLoading(true);
    
    // Add user message immediately
    const tempId = Date.now();
    const tempMessage: Message = {
      id: tempId,
      user: message,
      assistant: '',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      const response = await fetch('http://localhost:8000/message/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_name: selectedChat,
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
              // Update context turns - show retrieved context
              const formattedContext: ContextTurn[] = data.context_turns.map((turn: any) => ({
                id: turn.id,
                user: turn.user,
                assistant: turn.assistant,
                similarity: data.relevant_turn_ids.includes(turn.id) ? 0.8 : 0.5,
              }));
              
              // Add current message being sent (with empty assistant response initially)
              formattedContext.push({
                id: tempId,
                user: message,
                assistant: '',
                similarity: 1.0,
              });
              
              setContextTurns(formattedContext);
            } else if (data.type === 'chunk') {
              assistantResponse += data.text;
              // Update message in real-time
              setMessages(prev => prev.map(msg => 
                msg.id === tempId 
                  ? { ...msg, assistant: assistantResponse }
                  : msg
              ));
              
              // Update context with streaming response
              setContextTurns(prev => prev.map(turn =>
                turn.id === tempId
                  ? { ...turn, assistant: assistantResponse }
                  : turn
              ));
            } else if (data.type === 'done') {
              turnId = data.turn_id;
              // Update with final turn ID
              setMessages(prev => prev.map(msg => 
                msg.id === tempId 
                  ? { ...msg, id: turnId, assistant: assistantResponse }
                  : msg
              ));
              
              // Update context with final turn ID
              setContextTurns(prev => prev.map(turn =>
                turn.id === tempId
                  ? { ...turn, id: turnId }
                  : turn
              ));
              
              // Update chat info
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
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              LLM Context Management System
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Intelligent Context Retrieval with Semantic Search
            </p>
          </div>
          {chatInfo && (
            <div className="flex items-center gap-4 text-sm">
              <div className="bg-zinc-800 px-4 py-2 rounded border border-zinc-700">
                <span className="text-zinc-400">Chat:</span>
                <span className="text-white font-medium ml-2">{selectedChat}</span>
              </div>
              <div className="bg-zinc-800 px-4 py-2 rounded border border-zinc-700">
                <span className="text-zinc-400">Messages:</span>
                <span className="text-white font-medium ml-2">{chatInfo.message_count}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {!selectedChat ? (
        <ChatSelector onSelectChat={handleChatSelect} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Context Window */}
          <div className="w-1/2 border-r border-zinc-800 flex flex-col bg-zinc-950">
            <div className="bg-zinc-900 px-6 py-3 border-b border-zinc-800">
              <h2 className="text-base font-medium text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Active Context Window
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Semantically relevant turns sent to the model
              </p>
            </div>
            <ContextPanel 
              contextTurns={contextTurns} 
              isLoading={isLoading}
            />
            <div className="p-4 bg-zinc-900 border-t border-zinc-800">
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fullContext"
                  checked={useFullContext}
                  onChange={(e) => setUseFullContext(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-black text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="fullContext" className="text-sm text-zinc-400 cursor-pointer">
                  Use full conversation history (skip similarity search)
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
            <div className="bg-zinc-900 px-6 py-3 border-b border-zinc-800">
              <h2 className="text-base font-medium text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-zinc-500 rounded-full"></span>
                Complete Conversation History
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                All messages in chronological order
              </p>
            </div>
            <HistoryPanel messages={messages} />
          </div>
        </div>
      )}
    </div>
  );
}
