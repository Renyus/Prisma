import { useMemo } from "react";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { useLorebookStore } from "@/store/useLorebookStore";
import { useChatSettingsStore } from "@/store/useChatSettingsStore";
import { useModelStatus } from "./useModelStatus";
import { useChatHistory } from "./useChatHistory";
import { Lorebook } from "@/types/lorebook";

export function useChatController() {
    // --- Stores ---
    const characters = useCharacterCardStore((s) => s.characters); // Renamed
    const currentCharacterId = useCharacterCardStore((s) => s.currentCharacterId); // Renamed
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
    const currentCharacter = useMemo(() => { // Renamed
        if (!currentCharacterId) return null;
        return characters.find((c) => c.id === currentCharacterId) ?? null;
    }, [characters, currentCharacterId]);

    const activeLorebook: Lorebook | null = useMemo(() => {
        if (!currentBookId) return null;
        return lorebooks.find((b) => b.id === currentBookId) ?? null;
    }, [lorebooks, currentBookId]);

    const title = useMemo(() => currentCharacter ? "Prisma" : "Prisma", [currentCharacter]);

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
        // chatHistory.sendMessage now handles message sending
        // Note: chatHistory needs to be updated to use new Session API
        if (!currentCharacterId) {
             console.warn("Cannot send message: no character selected.");
             return;
        }

        await chatHistory.sendMessage(
            text, 
            chatSettings, 
            activeLorebook, 
            userName, 
            currentCharacterId, // Pass characterId to create session if needed
            scrollToBottom
        );
    };

    const startNewChat = async () => {
         if (!currentCharacterId) return;
         await chatHistory.startNewChat(currentCharacterId); // Pass characterId
    };

    const reloadHistory = async (): Promise<void> => {
        // Reloading history now means fetching messages for the active session
        // This logic will be inside useChatHistory
        await chatHistory.loadHistory(); 
    };

    // --- Actions Exposed ---
    return {
        // Data from separated concerns
        ...modelStatus,  // activeModelInfo, availableModels, displayedModelName, etc.
        ...chatHistory,  // messages, isSending, lastUsedLore, triggeredEntries, tokenStats, activeSessionId
        
        // Core chat controller data
        title,
        userName,
        currentCharacter, // Renamed
        activeLorebook,
        
        // Core actions
        setUserName,
        handleSend,
        handleTypingFinished: chatHistory.handleTypingFinished,
        startNewChat,
        reloadHistory,
    };
}