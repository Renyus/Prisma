import { useState, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { ChatService } from "@/services/ChatService";
import { ChatMessageModel } from "@/components/ChatMessage";
import { parseThinkingContent } from "@/lib/chatUtils";
import type { TokenStats, TriggeredLoreEntry } from "@/lib/types";

export function useChatHistory() {
    // Stores
    const characterCards = useCharacterCardStore((s) => s.characterCards);
    const currentCardId = useCharacterCardStore((s) => s.currentCardId);

    // Local State
    const [messages, setMessages] = useState<ChatMessageModel[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [lastUsedLore, setLastUsedLore] = useState<string | null>(null);
    const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
    const [triggeredEntries, setTriggeredEntries] = useState<TriggeredLoreEntry[] | null>(null);

    const LOCAL_USER_ID = "local-user";

    // Derived State
    const currentCard = useCallback(() => {
        if (!currentCardId) return null;
        return characterCards.find((c) => c.id === currentCardId) ?? null;
    }, [characterCards, currentCardId]);

    // Message processing logic
    const processMessageContent = useCallback((text: string, userName?: string) => {
        if (!text) return "";
        const globalName = userName?.trim();
        const cardAlias = (currentCard() as any)?.user_alias?.trim();
        let finalUserName = globalName && globalName.length > 0 ? globalName : (cardAlias && cardAlias.length > 0 ? cardAlias : "");
        return text.replaceAll("{{user}}", finalUserName);
    }, [currentCard]);

    // Load chat history
    const loadHistory = useCallback(async (userName?: string): Promise<void> => {
        const card = currentCard();
        if (!card) {
            setMessages([]);
            setLastUsedLore(null);
            setTriggeredEntries(null);
            setTokenStats(null);
            return;
        }

        try {
            const data = await ChatService.getHistory({
                user_id: LOCAL_USER_ID,
                character_id: card.id,
            });

            if (data.messages.length === 0 && card.first_mes) {
                setMessages([{ 
                    id: "first-mes-placeholder",
                    role: "assistant",
                    content: processMessageContent(card.first_mes, userName),
                    isHistory: true,
                    isLoading: false,
                    isStreaming: false,
                }]);
            } else {
                setMessages(data.messages.map((msg) => {
                    const { cleanContent } = parseThinkingContent(msg.content);
                    return {
                        id: msg.id,
                        role: msg.role === "assistant" ? "assistant" : msg.role === "system" ? "system" : "user",
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
            setLastUsedLore(null);
            setTriggeredEntries(null);
            setTokenStats(null);
        }
    }, [currentCard, processMessageContent]);

    // Send message
    const sendMessage = useCallback(async (
        text: string, 
        chatSettings: {
            contextMessages: number;
            contextTokens: number;
            currentModel?: string;
            summaryHistoryLimit: number;
            temperature: number;
            topP: number;
            frequencyPenalty: number;
            maxTokens: number;
            memoryEnabled: boolean;
            memoryLimit: number;
        },
        activeLorebook: any,
        userName?: string,
        scrollToBottom?: () => void
    ) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        const userMsg: ChatMessageModel = { id: nanoid(), role: "user", content: trimmed };
        const placeholderId = nanoid();
        const pendingReply: ChatMessageModel = { id: placeholderId, role: "assistant", content: "", isLoading: true };

        setMessages((prev) => [...prev, userMsg, pendingReply]);
        setIsSending(true);
        setLastUsedLore(null);
        setTriggeredEntries(null);
        setTokenStats(null);

        try {
            const card = currentCard();
            if (!card) throw new Error("没有选中的角色卡片");

            const rawEntries: any[] = activeLorebook?.entries ?? [];
            const mappedLore = activeLorebook?.enabled === false ? [] : rawEntries.map((e) => ({
                ...e,
                key: e.keys && e.keys.length > 0 ? e.keys[0] : "",
                keywords: e.keys || [],
            }));

            const data = await ChatService.send({
                user_id: LOCAL_USER_ID,
                message: trimmed,
                card: card,
                lore: mappedLore,
                max_context_messages: chatSettings.contextMessages,
                max_context_tokens: chatSettings.contextTokens,
                model: chatSettings.currentModel, 
                summary_history_limit: chatSettings.summaryHistoryLimit,
                temperature: chatSettings.temperature, 
                top_p: chatSettings.topP, 
                frequency_penalty: chatSettings.frequencyPenalty, 
                max_tokens: chatSettings.maxTokens,
                memory_config: { enabled: chatSettings.memoryEnabled, limit: chatSettings.memoryLimit }
            });

            const replyRawText: string = typeof data?.reply === "string" && data.reply.trim().length > 0 ? data.reply : "（AI 没有返回任何内容）";
            const { cleanContent } = parseThinkingContent(replyRawText);
            
            // Format Lore Preview
            const loreRaw = data?.usedLore ?? data?.loreBlock;
            let lorePreview: string | null = null;
            if (loreRaw) {
                if (typeof loreRaw === "string") lorePreview = loreRaw.trim() || null;
                else if (typeof loreRaw === "object" && !Array.isArray(loreRaw)) {
                    const labelMap: Record<string, string> = { beforeChar: "角色前", afterChar: "角色后", beforeUser: "用户前", afterUser: "用户后" };
                    const parts: string[] = [];
                    for (const [k, v] of Object.entries(loreRaw)) {
                        if (!v) continue;
                        const t = String(v).trim();
                        if (t) parts.push(`【${labelMap[k] ?? k}】\n${t}`);
                    }
                    lorePreview = parts.length ? parts.join("\n\n") : null;
                }
            }
            setLastUsedLore(lorePreview);

            // Save triggered lore entries
            if (data.triggered_entries) {
                setTriggeredEntries(data.triggered_entries);
            }

            // Save token stats
            if (data.tokenStats) {
                setTokenStats(data.tokenStats);
            }

            setMessages((prev) => prev.map((msg) =>
                msg.id === placeholderId ? { ...msg, content: processMessageContent(cleanContent, userName), isLoading: false, isStreaming: true } : msg
            ));
            
            if (scrollToBottom) {
                scrollToBottom();
            }

        } catch (error: any) {
            console.error("发送失败：", error);
            setMessages((prev) => prev.map((msg) =>
                msg.id === placeholderId ? { ...msg, content: `Error: ${error.message || "未知错误"}\n请检查后端连接 (Python) 是否正常。`, isLoading: false, isStreaming: false } : msg
            ));
        } finally {
            setIsSending(false);
        }
    }, [isSending, currentCard, processMessageContent]);

    // Handle typing finished
    const handleTypingFinished = useCallback((messageId: string) => {
        setMessages((prev) => prev.map((msg) => msg.id === messageId ? { ...msg, isStreaming: false } : msg));
    }, []);

    // Start new chat
    const startNewChat = useCallback((userName?: string) => {
        setMessages([]);
        setLastUsedLore(null);
        setTriggeredEntries(null);
        setTokenStats(null);
        loadHistory(userName);
    }, [loadHistory]);

    // Auto-load history when card changes
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return {
        // State
        messages,
        isSending,
        lastUsedLore,
        triggeredEntries,
        tokenStats,
        
        // Actions
        loadHistory,
        sendMessage,
        handleTypingFinished,
        startNewChat,
        processMessageContent,
    };
}
