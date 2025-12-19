import { APP_CONFIG } from "@/config/constants";
import { API_ROUTES } from "@/config/apiRoutes";
import { request } from "@/lib/backendClient";
import { useChatSettingsStore } from "@/store/useChatSettingsStore"; // Still used for userName
import type { MessageRole } from "@/lib/types"; // Re-export from new chat types
import type {
    ChatSession,
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatMessage,
    ChatMessageCreate,
    ChatCompletionRequest,
    ChatCompletionResponse,
} from "@/types/chat"; // New chat types

export const ChatService = {
    // --- Session Management ---
    async createSession(characterId: string, title?: string): Promise<ChatSession> {
        const payload: ChatSessionCreate = {
            user_id: APP_CONFIG.DEFAULT_USER_ID, // Assuming a default user for now
            character_id: characterId,
            title: title,
        };
        return request<ChatSession>(API_ROUTES.CHAT.SESSIONS, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async getSessions(): Promise<ChatSession[]> {
        return request<ChatSession[]>(API_ROUTES.CHAT.SESSIONS, { method: "GET" });
    },

    async getSession(sessionId: string): Promise<ChatSession> {
        return request<ChatSession>(API_ROUTES.CHAT.GET_SESSION(sessionId), { method: "GET" });
    },

    async updateSession(sessionId: string, patch: ChatSessionUpdate): Promise<ChatSession> {
        return request<ChatSession>(API_ROUTES.CHAT.UPDATE_SESSION(sessionId), {
            method: "PATCH",
            body: JSON.stringify(patch),
        });
    },

    async deleteSession(sessionId: string): Promise<void> {
        return request<void>(API_ROUTES.CHAT.DELETE_SESSION(sessionId), { method: "DELETE" });
    },

    // --- Message Management ---
    async getMessages(sessionId: string): Promise<ChatMessage[]> {
        return request<ChatMessage[]>(API_ROUTES.CHAT.MESSAGES(sessionId), { method: "GET" });
    },

    async addMessage(session_id: string, role: MessageRole, content: string): Promise<ChatMessage> {
        const payload: ChatMessageCreate = {
            session_id,
            role,
            content,
        };
        return request<ChatMessage>(API_ROUTES.CHAT.ADD_MESSAGE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    // --- Chat Completion ---
    async getCompletion(sessionId: string, message: string): Promise<ChatCompletionResponse> {
        const payload: ChatCompletionRequest = {
            session_id: sessionId,
            message: message,
            // Additional overrides like model, temperature can be added here from UI
        };
        return request<ChatCompletionResponse>(API_ROUTES.CHAT.COMPLETION, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    // --- Export/Import (Placeholders - These need to be re-evaluated based on new backend services) ---
    async exportSession(sessionId: string): Promise<any> {
        // TODO: Implement based on new backend export service
        return request<any>(API_ROUTES.CHAT.EXPORT_SESSION(sessionId), { method: "GET" });
    },

    async importSession(sessionId: string, formData: FormData): Promise<void> {
        // TODO: Implement based on new backend import service
        // This will likely involve custom fetch logic again due to FormData
        throw new Error("Import not yet implemented for new schema");
    }
};
