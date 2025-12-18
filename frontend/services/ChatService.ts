import { APP_CONFIG } from "@/config/constants";
import { useChatSettingsStore } from "@/store/useChatSettingsStore";
import type { ChatRole, TokenStats, TriggeredLoreEntry } from "@/lib/types";

export interface MemoryConfig {
  enabled: boolean;
  limit?: number;
}

export interface ChatPayload {
  user_id: string;
  message: string;
  userName?: string; // 👈 新增这个可选字段
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
    triggered_entries?: TriggeredLoreEntry[];  // 新增触发的世界书条目
    triggeredLoreItems?: any[];  // 新增触发的世界书条目原始数据
    tokenStats?: TokenStats;  // 新增 token 统计信息
}

export const ChatService = {
    // 全局错误处理函数
    async handleApiError(res: Response, operation: string): Promise<never> {
        let errorDetail = `${operation} Failed (HTTP ${res.status})`;
        
        try {
            const errorData = await res.json();
            if (errorData.detail) errorDetail = errorData.detail;
        } catch {
            // 如果无法解析JSON，使用默认错误信息
        }

        // 根据状态码提供友好的错误提示
        switch (res.status) {
            case 401:
            case 403:
                throw new Error("API Key无效或已过期，请检查您的API配置");
            case 429:
                throw new Error("请求太频繁，请稍后再试");
            case 500:
                throw new Error("对话太长啦，建议点击'新对话'清空上下文");
            default:
                throw new Error(errorDetail);
        }
    },

    async send(payload: ChatPayload): Promise<ChatResponse> {
        // 👇 核心修改：从 Store 获取用户名
        const storeName = useChatSettingsStore.getState().userName;
        const finalPayload = {
            ...payload,
            userName: storeName || "User" // 优先用 Store 的名字，没有就用 User
        };

        const url = `${APP_CONFIG.API_BASE}/chat`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalPayload), // 👈 发送带有名字的 payload
        });

        if (!res.ok) {
            this.handleApiError(res, "Chat API Request");
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
            this.handleApiError(res, "Chat history API Request");
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
        if (!res.ok) {
            this.handleApiError(res, "Clear history");
        }
    },

    async exportHistory(params: { user_id: string; character_id?: string; character_name?: string }): Promise<any> {
        const query = new URLSearchParams();
        query.set("user_id", params.user_id);
        if (params.character_id) {
            query.set("character_id", params.character_id);
            query.set("character_name", params.character_name || "");
        }
        const res = await fetch(`${APP_CONFIG.API_BASE}/chat/export?${query.toString()}`);
        if (!res.ok) {
            this.handleApiError(res, "Export history");
        }
        return res.json();
    },

    async importHistory(userId: string, formData: FormData): Promise<void> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/chat/import?user_id=${encodeURIComponent(userId)}`, {
            method: "POST", 
            body: formData 
        });
        if (!res.ok) {
            this.handleApiError(res, "Import history");
        }
    }
};
