import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { nanoid } from "nanoid";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { useLorebookStore } from "@/store/useLorebookStore";
import { useChatSettingsStore } from "@/store/useChatSettingsStore";
import { ChatService } from "@/services/ChatService";
import { ModelService, type ActiveModelInfo } from "@/services/ModelService";
import { ChatMessageModel } from "@/components/ChatMessage";
import { Lorebook, LoreEntry } from "@/types/lorebook";
import { parseThinkingContent } from "@/lib/chatUtils";

export function useChatController() {
    // --- Stores ---
    const characterCards = useCharacterCardStore((s) => s.characterCards);
    const currentCardId = useCharacterCardStore((s) => s.currentCardId);
    const lorebooks = useLorebookStore((s) => s.lorebooks);
    const currentBookId = useLorebookStore((s) => s.currentBookId);
    
    // Settings
    const { 
        contextMessages, contextTokens, summaryHistoryLimit, 
        currentModel, setCurrentModel, 
        temperature, topP, frequencyPenalty, maxTokens,
        memoryEnabled, memoryLimit,
        userName, setUserName
    } = useChatSettingsStore();

    // --- Local State ---
    const [messages, setMessages] = useState<ChatMessageModel[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [lastUsedLore, setLastUsedLore] = useState<string | null>(null);
    const [activeModelInfo, setActiveModelInfo] = useState<ActiveModelInfo | null>(null);
    const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);

    const LOCAL_USER_ID = "local-user";

    // --- Derived State ---
    const currentCard = useMemo(() => {
        if (!currentCardId) return null;
        return characterCards.find((c) => c.id === currentCardId) ?? null;
    }, [characterCards, currentCardId]);

    const activeLorebook: Lorebook | null = useMemo(() => {
        if (!currentBookId) return null;
        return lorebooks.find((b) => b.id === currentBookId) ?? null;
    }, [lorebooks, currentBookId]);

    const title = useMemo(() => currentCard ? "Prisma" : "Prisma", [currentCard]);

    const displayedModelName = useMemo(() => {
        if (currentModel) return currentModel;
        if (activeModelInfo?.name) return activeModelInfo.name;
        return "加载中..."; 
    }, [currentModel, activeModelInfo]);
      
    const displayedVendorName = (activeModelInfo?.vendor ?? "未知供应商");
    const isOnline = !!activeModelInfo;

    // --- Logic ---

    // 1. 替换 {{user}} 逻辑
    const processMessageContent = useCallback((text: string) => {
        if (!text) return "";
        const globalName = userName?.trim();
        const cardAlias = (currentCard as any)?.user_alias?.trim();
        let finalUserName = globalName && globalName.length > 0 ? globalName : (cardAlias && cardAlias.length > 0 ? cardAlias : "");
        return text.replaceAll("{{user}}", finalUserName);
    }, [userName, currentCard]);

    // 2. 加载历史
    const loadHistory = useCallback(async () => {
        if (!currentCard) {
            setMessages([]);
            setLastUsedLore(null);
            return;
        }

        try {
            const data = await ChatService.getHistory({
                user_id: LOCAL_USER_ID,
                character_id: currentCard.id,
            });

            if (data.messages.length === 0 && currentCard.first_mes) {
                setMessages([{ 
                    id: "first-mes-placeholder",
                    role: "assistant",
                    content: processMessageContent(currentCard.first_mes),
                    isHistory: true,
                    isLoading: false,
                    isStreaming: false,
                }]);
            } else {
                setMessages(data.messages.map((msg) => {
                    const { cleanContent } = parseThinkingContent(msg.content);
                    return {
                        id: msg.id,
                        role: msg.role === "assistant" ? "assistant" : "user",
                        content: processMessageContent(cleanContent),
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
        }
    }, [currentCard, processMessageContent]);

    // 3. 发送消息
    const handleSend = async (text: string, scrollToBottom: () => void) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        const userMsg: ChatMessageModel = { id: nanoid(), role: "user", content: trimmed };
        const placeholderId = nanoid();
        const pendingReply: ChatMessageModel = { id: placeholderId, role: "assistant", content: "", isLoading: true };

        setMessages((prev) => [...prev, userMsg, pendingReply]);
        setIsSending(true);
        setLastUsedLore(null);

        try {
            const rawEntries: LoreEntry[] = activeLorebook?.entries ?? [];
            const mappedLore = activeLorebook?.enabled === false ? [] : rawEntries.map((e) => ({
                ...e,
                key: e.keys && e.keys.length > 0 ? e.keys[0] : "",
                keywords: e.keys || [],
            }));

            const data = await ChatService.send({
                user_id: LOCAL_USER_ID,
                message: trimmed,
                card: currentCard ?? {},
                lore: mappedLore,
                max_context_messages: contextMessages,
                max_context_tokens: contextTokens,
                model: currentModel, 
                summary_history_limit: summaryHistoryLimit,
                temperature, 
                top_p: topP, 
                frequency_penalty: frequencyPenalty, 
                max_tokens: maxTokens,
                memory_config: { enabled: memoryEnabled, limit: memoryLimit }
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

            setMessages((prev) => prev.map((msg) =>
                msg.id === placeholderId ? { ...msg, content: processMessageContent(cleanContent), isLoading: false, isStreaming: true } : msg
            ));
            scrollToBottom();

        } catch (error: any) {
            console.error("发送失败：", error);
            setMessages((prev) => prev.map((msg) =>
                msg.id === placeholderId ? { ...msg, content: `Error: ${error.message || "未知错误"}\n请检查后端连接 (Python) 是否正常。`, isLoading: false, isStreaming: false } : msg
            ));
        } finally {
            setIsSending(false);
        }
    };

    // 4. Typing Finish
    const handleTypingFinished = (messageId: string) => {
        setMessages((prev) => prev.map((msg) => msg.id === messageId ? { ...msg, isStreaming: false } : msg));
    };

    // 5. Init & Polling
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        ModelService.listModels().then(res => setAvailableModels(res.models)).catch(() => {});
        
        let cancelled = false;
        const checkStatus = () => {
            ModelService.fetchActiveModelInfo().then((info) => { if (!cancelled) setActiveModelInfo(info); })
            .catch(() => { if (!cancelled) setActiveModelInfo(null); });
        };
        checkStatus();
        const intervalId = setInterval(checkStatus, 30000);
        return () => { cancelled = true; clearInterval(intervalId); };
    }, []);

    // 6. Actions Exposed
    return {
        // Data
        messages, isSending, lastUsedLore, availableModels, activeModelInfo,
        title, displayedModelName, displayedVendorName, isOnline,
        userName, currentModel, currentCard,
        
        // Methods
        setUserName, setCurrentModel, handleSend, handleTypingFinished, 
        startNewChat: () => {
            setMessages([]);
            setLastUsedLore(null);
            loadHistory();
        },
        reloadHistory: loadHistory
    };
}
