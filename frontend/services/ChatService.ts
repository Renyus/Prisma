import { APP_CONFIG } from "@/config/constants";
import type { ChatRole } from "@/lib/types";

export interface MemoryConfig {
  enabled: boolean;
  limit?: number;
}

export interface ChatPayload {
  user_id: string;
  message: string;
  card?: any;
  lore?: any[];
  model?: string;
  max_context_messages?: number;
  max_context_tokens?: number;
  summary_history_limit?: number;
  
  // Generation Params
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
  
  // Memory Params
  memory_config?: MemoryConfig;
}

export interface ChatHistoryMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at?: string;
}

export interface ChatHistoryRequest {
  user_id: string;
  character_id?: string;
}

export interface ChatHistoryResponse {
  messages: ChatHistoryMessage[];
}

export interface ChatResponse {
    reply: string;
    systemPreview?: string;
    usedLore?: any;
    loreBlock?: any;
}

export const ChatService = {
    async send(payload: ChatPayload): Promise<ChatResponse> {
        const url = `${APP_CONFIG.API_BASE}/chat`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            let errorDetail = `Chat API Request Failed (HTTP ${res.status})`;
            try {
                const errorData = await res.json();
                if (errorData.detail) errorDetail = errorData.detail;
            } catch {}
            throw new Error(errorDetail);
        }

        return res.json();
    },

    async getHistory(params: ChatHistoryRequest): Promise<ChatHistoryResponse> {
        const query = new URLSearchParams();
        query.set("user_id", params.user_id);
        if (params.character_id) {
            query.set("character_id", params.character_id);
        }

        const url = `${APP_CONFIG.API_BASE}/chat/messages?${query.toString()}`;
        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
            let errorDetail = `Chat history API Request Failed (HTTP ${res.status})`;
            try {
                const errorData = await res.json();
                if (errorData.detail) errorDetail = errorData.detail;
            } catch {}
            throw new Error(errorDetail);
        }

        return res.json();
    },

    async clearHistory(params: { user_id: string; scope: "session" | "card"; character_id?: string }): Promise<void> {
        const query = new URLSearchParams();
        query.set("user_id", params.user_id);
        query.set("scope", params.scope);
        if (params.character_id) query.set("character_id", params.character_id);
        
        const url = `${APP_CONFIG.API_BASE}/chat/history?${query.toString()}`;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to clear history");
    },

    async exportHistory(params: { user_id: string; character_id?: string; character_name?: string }): Promise<any> {
        const query = new URLSearchParams();
        query.set("user_id", params.user_id);
        if (params.character_id) {
            query.set("character_id", params.character_id);
            query.set("character_name", params.character_name || "");
        }
        const res = await fetch(`${APP_CONFIG.API_BASE}/chat/export?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to export history");
        return res.json();
    },

    async importHistory(userId: string, formData: FormData): Promise<void> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/chat/import?user_id=${encodeURIComponent(userId)}`, {
            method: "POST", 
            body: formData 
        });
        if (!res.ok) throw new Error("Failed to import history");
    }
};
