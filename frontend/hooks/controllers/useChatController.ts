import { useMemo } from "react";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { useLorebookStore } from "@/store/useLorebookStore";
import { useChatSettingsStore } from "@/store/useChatSettingsStore";
import { useModelStatus } from "./useModelStatus";
import { useChatHistory } from "./useChatHistory";
import { Lorebook } from "@/types/lorebook";

export function useChatController() {
    // --- Stores ---
    const characterCards = useCharacterCardStore((s) => s.characterCards);
    const currentCardId = useCharacterCardStore((s) => s.currentCardId);
    const lorebooks = useLorebookStore((s) => s.lorebooks);
    const currentBookId = useLorebookStore((s) => s.currentBookId);
    
    // Settings
    const { 
        contextMessages, contextTokens, summaryHistoryLimit, 
        temperature, topP, frequencyPenalty, maxTokens,
        memoryEnabled, memoryLimit,
        userName, setUserName
    } = useChatSettingsStore();

    // --- Separated Concerns ---
    // Model status management (extracted to useModelStatus)
    const modelStatus = useModelStatus();
    
    // Chat history management (extracted to useChatHistory)
    const chatHistory = useChatHistory();

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

    // --- Chat Settings for sendMessage ---
    const chatSettings = useMemo(() => ({
        contextMessages,
        contextTokens,
        currentModel: modelStatus.currentModel,
        summaryHistoryLimit,
        temperature,
        topP,
        frequencyPenalty,
        maxTokens,
        memoryEnabled,
        memoryLimit,
    }), [
        contextMessages, contextTokens, modelStatus.currentModel, summaryHistoryLimit,
        temperature, topP, frequencyPenalty, maxTokens, memoryEnabled, memoryLimit
    ]);

    // --- Main Actions ---
    const handleSend = async (text: string, scrollToBottom: () => void) => {
        await chatHistory.sendMessage(
            text, 
            chatSettings, 
            activeLorebook, 
            userName, 
            scrollToBottom
        );
    };

    const startNewChat = () => {
        chatHistory.startNewChat(userName);
    };

    const reloadHistory = async (): Promise<void> => {
        await chatHistory.loadHistory(userName);
    };

    // --- Actions Exposed ---
    return {
        // Data from separated concerns
        ...modelStatus,  // activeModelInfo, availableModels, displayedModelName, etc.
        ...chatHistory,  // messages, isSending, lastUsedLore, triggeredEntries, tokenStats
        
        // Core chat controller data
        title,
        userName,
        currentCard,
        activeLorebook,
        
        // Core actions
        setUserName,
        handleSend,
        handleTypingFinished: chatHistory.handleTypingFinished,
        startNewChat,
        reloadHistory,
    };
}
