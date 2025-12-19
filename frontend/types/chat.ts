// Frontend Types V2 - Syncing with Backend Schemas

export enum MessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
  FUNCTION = "function",
}

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  AUDIO = "audio",
  THOUGHT = "thought",
}

export interface ContentBlock {
  type: MessageType;
  content: string;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GenerationMeta {
  model_name?: string;
  latency_ms?: number;
  finish_reason?: string;
  usage?: TokenUsage;
  triggered_lore_items?: string[];
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string; // The main display content
  blocks?: ContentBlock[]; // For complex rendering (e.g. thoughts)
  is_hidden: boolean;
  
  created_at: string;
  updated_at?: string;
  meta?: GenerationMeta;
}

export interface ChatSession {
  id: string;
  user_id: string;
  character_id: string;
  title?: string;
  
  active_preset_id?: string;
  user_persona_override?: string;
  
  created_at: string;
  updated_at: string;
  preview_message?: string;
}

// API Payloads
export interface ChatCompletionRequest {
  session_id: string;
  message: string;
  model_override?: string;
  temperature?: number;
}

export interface ChatCompletionResponse {
  message: ChatMessage;
  token_stats?: TokenUsage;
}
