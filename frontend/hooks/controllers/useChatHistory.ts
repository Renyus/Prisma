import { useState, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { ChatService } from "@/services/ChatService";
import { ChatMessageModel } from "@/components/ChatMessage"; // Still using UI model for display
import { parseThinkingContent } from "@/lib/chatUtils";
import { replacePlaceholders } from "@/lib/placeholderUtils";
import type { TokenStats, TriggeredLoreEntry } from "@/lib/types"; // These types might need to be sourced from V2 types or mapped
import { ChatMessage, MessageRole } from "@/types/chat"; // New V2 Types

export function useChatHistory() {
    // Stores
    const characters = useCharacterCardStore((s) => s.characters); // Renamed
    const currentCharacterId = useCharacterCardStore((s) => s.currentCharacterId); // Renamed

    // Local State
    const [messages, setMessages] = useState<ChatMessageModel[]>([]); // Display messages (with loading state etc)
    const [isSending, setIsSending] = useState(false);
    const [lastUsedLore, setLastUsedLore] = useState<string | null>(null);
    const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
    const [triggeredEntries, setTriggeredEntries] = useState<TriggeredLoreEntry[] | null>(null);
    
    // New Session State
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const LOCAL_USER_ID = "local-user";

    // Derived State
    const currentCharacter = useCallback(() => { // Renamed
        if (!currentCharacterId) return null;
        return characters.find((c) => c.id === currentCharacterId) ?? null;
    }, [characters, currentCharacterId]);

    // Message processing logic - 支持所有占位符类型
    const processMessageContent = useCallback((text: string, userName?: string) => {
        if (!text) return "";
        
        const character = currentCharacter();
        const charName = character?.name || "Character";
        const finalUserName = userName?.trim() || "User";
        
        return replacePlaceholders(text, finalUserName, charName);
    }, [currentCharacter]);

    // Ensure Active Session
    const ensureSession = useCallback(async (charId: string, userId: string): Promise<string> => {
        // Simple logic: check if we have a session for this char.
        // If not, create one.
        // In a real app, we might select from a list. Here we just grab the latest or create new.
        try {
            const sessions = await ChatService.getSessions();
            const existing = sessions.find(s => s.character_id === charId && s.user_id === userId);
            
            if (existing) {
                setActiveSessionId(existing.id);
                return existing.id;
            }
            
            // Create new
            const newSession = await ChatService.createSession(charId, "New Chat");
            setActiveSessionId(newSession.id);
            return newSession.id;
        } catch (e) {
            console.error("Failed to ensure session", e);
            throw e;
        }
    }, []);


    // Load chat history
    // Now loads from Session messages
    const loadHistory = useCallback(async (userName?: string): Promise<void> => {
        const character = currentCharacter();
        if (!character) {
            setMessages([]);
            setLastUsedLore(null);
            setTriggeredEntries(null);
            setTokenStats(null);
            setActiveSessionId(null);
            return;
        }

        try {
            // 1. Ensure we have a session ID
            let sessionId = activeSessionId;
            if (!sessionId) {
                sessionId = await ensureSession(character.id, LOCAL_USER_ID);
            }

            // 2. Fetch messages for this session
            const apiMessages = await ChatService.getMessages(sessionId);

            // 3. Map to UI model
            if (apiMessages.length === 0 && character.first_message) {
                setMessages([{ 
                    id: "first-mes-placeholder",
                    role: "assistant",
                    content: processMessageContent(character.first_message, userName),
                    isHistory: true,
                    isLoading: false,
                    isStreaming: false,
                }]);
            } else {
                setMessages(apiMessages.map((msg) => {
                    const { cleanContent } = parseThinkingContent(msg.content);
                    return {
                        id: msg.id,
                        role: msg.role as "user" | "assistant" | "system",
                        content: processMessageContent(cleanContent, userName),
                        isHistory: true,
                        isLoading: false,
                        isStreaming: false,
                    };
                }));
            }
        } catch (error) {
            console.error("加载聊天历史失败:", error);
            setMessages([]);
            // ... reset other stats
        }
    }, [currentCharacter, activeSessionId, ensureSession, processMessageContent]);

    // Send message
    const sendMessage = useCallback(async (
        text: string, 
        chatSettings: {
            // ... settings are currently handled by backend using character config override
            // but we can pass transient params to completion API if supported
        },
        activeLorebook: any,
        userName?: string,
        // New params
        characterId?: string,
        scrollToBottom?: () => void
    ) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return null;

        // 1. Ensure session
        let sessionId = activeSessionId;
        if (!sessionId) {
            if (!characterId) throw new Error("No character selected to start chat");
            sessionId = await ensureSession(characterId, LOCAL_USER_ID);
        }

        const userMsg: ChatMessageModel = { id: nanoid(), role: "user", content: trimmed };
        const placeholderId = nanoid();
        const pendingReply: ChatMessageModel = { id: placeholderId, role: "assistant", content: "", isLoading: true };

        setMessages((prev) => [...prev, userMsg, pendingReply]);
        setIsSending(true);
        // Reset stats
        setLastUsedLore(null);
        setTriggeredEntries(null);
        setTokenStats(null);

        try {
            // 2. Call Completion API
            // Note: The new completion API handles saving the user message AND generating the reply
            const completionRes = await ChatService.getCompletion(sessionId, trimmed);
            
            const replyMsg = completionRes.message;
            const replyRawText = replyMsg.content || "（AI 没有返回任何内容）";
            const { cleanContent } = parseThinkingContent(replyRawText);
            
            // 3. Update UI
            // TODO: Extract token stats and lore info from completionRes.token_stats / meta
            // For now, simple mapping
            if (completionRes.token_stats) {
                 // Map TokenUsage to TokenStats (partial mapping)
                 setTokenStats({
                     total: completionRes.token_stats.total_tokens,
                     user: completionRes.token_stats.prompt_tokens,
                     system: 0, // Not detailed in V2 yet
                     history: 0, 
                     budget_left: 0,
                     model_limits: {},
                     lore_budget: 0,
                     estimation_method: "backend",
                     smart_context_used: false,
                     smart_context_tokens: 0
                 });
            }

            setMessages((prev) => prev.map((msg) =>
                msg.id === placeholderId ? { 
                    ...msg, 
                    id: replyMsg.id, // Update with real ID
                    content: processMessageContent(cleanContent, userName), 
                    isLoading: false, 
                    isStreaming: true // Simulate streaming or handle real streaming later
                } : msg
            ));
            
            if (scrollToBottom) {
                scrollToBottom();
            }

            return completionRes;

        } catch (error: any) {
            console.error("发送失败：", error);
            setMessages((prev) => prev.map((msg) =>
                msg.id === placeholderId ? { ...msg, content: `Error: ${error.message || "未知错误"}`, isLoading: false, isStreaming: false } : msg
            ));
            return null;
        } finally {
            setIsSending(false);
        }
    }, [isSending, activeSessionId, ensureSession, processMessageContent]);

    // Handle typing finished
    const handleTypingFinished = useCallback((messageId: string) => {
        setMessages((prev) => prev.map((msg) => msg.id === messageId ? { ...msg, isStreaming: false } : msg));
    }, []);

    // Start new chat
    // For V2, this means creating a NEW session
    const startNewChat = useCallback(async (characterId: string) => {
        setMessages([]);
        setLastUsedLore(null);
        setTriggeredEntries(null);
        setTokenStats(null);
        
        try {
            // Create a new session explicitly
            const newSession = await ChatService.createSession(characterId, `Chat ${new Date().toLocaleString()}`);
            setActiveSessionId(newSession.id);
            // Don't need to load history, it's empty (except maybe first message)
            
            // Manually add first message if exists
            const character = characters.find(c => c.id === characterId);
            if (character?.first_message) {
                 setMessages([{ 
                    id: "first-mes-placeholder",
                    role: "assistant",
                    content: processMessageContent(character.first_message), // User name might be missing here
                    isHistory: true,
                    isLoading: false,
                    isStreaming: false,
                }]);
            }

        } catch (e) {
            console.error("Failed to start new chat", e);
        }
    }, [characters, processMessageContent]);

    // Auto-load history when active session changes or character changes
    // This is tricky: changing character should trigger a session lookup/creation
    useEffect(() => {
        // When currentCharacterId changes, we need to find the active session for it
        // Or wait for user interaction?
        // Let's stick to "Load latest session or create new" logic in loadHistory
        // But loadHistory needs to be triggered.
        loadHistory();
    }, [currentCharacterId, loadHistory]);

    return {
        // State
        messages,
        isSending,
        lastUsedLore,
        triggeredEntries,
        tokenStats,
        activeSessionId,
        
        // Actions
        loadHistory,
        sendMessage,
        handleTypingFinished,
        startNewChat,
        processMessageContent,
    };
}