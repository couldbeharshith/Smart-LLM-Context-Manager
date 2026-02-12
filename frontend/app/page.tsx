'use client';

import { useRouter } from 'next/navigation';
import ChatSelector from '@/components/ChatSelector';

export default function Home() {
  const router = useRouter();

  const handleChatSelect = async (chatName: string, systemInstructions?: string) => {
    // For new chats, we need to pass system instructions to the backend
    // The backend will store it in chats.json
    // For existing chats, system instructions are loaded from backend
    
    // Navigate to chat page
    router.push(`/chat/${encodeURIComponent(chatName)}`);
  };

  return (
    <div className="h-screen flex flex-col bg-black font-[family-name:var(--font-inter)]">
      {/* Header */}
      <header className="relative bg-zinc-950 border-b border-zinc-800/50 px-8 py-5">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Context Manager
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5 font-mono text-xs">
              Semantic retrieval · Token usage optimization · 
            </p>
          </div>
        </div>
      </header>

      <ChatSelector onSelectChat={handleChatSelect} />
    </div>
  );
}
