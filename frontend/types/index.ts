export interface Chat {
  chat_name: string;
  namespace: string;
  message_count: number;
  history: any[];
  system_instructions?: string;
}

export interface Message {
  id: number;
  user: string;
  assistant: string;
  timestamp: string;
}

export interface ContextTurn {
  id: number;
  user: string;
  assistant: string;
  similarity: number;
}

export interface ChatMetadata {
  namespace: string;
  created_at: string;
  last_accessed: string;
  message_count: number;
}
