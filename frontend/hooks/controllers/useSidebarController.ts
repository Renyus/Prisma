import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChatSettingsStore } from "@/store/useChatSettingsStore";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { useLorebookStore } from "@/store/useLorebookStore";
import { useToastStore } from "@/store/useToastStore";
import { ChatService } from "@/services/ChatService";
import { APP_CONFIG } from "@/config/constants";

export function useSidebarController({ onNewChat }: { onNewChat?: () => void }) {
    const router = useRouter();
    const pathname = usePathname();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const addToast = useToastStore((s) => s.addToast);

    const [isClearingCurrent, setIsClearingCurrent] = useState(false);
    const [isClearingAll, setIsClearingAll] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Stores
    const characterCards = useCharacterCardStore((s) => s.characterCards);
    const currentCardId = useCharacterCardStore((s) => s.currentCardId);
    const currentCard = characterCards.find((c) => c.id === currentCardId) || null;
    
    const lorebooks = useLorebookStore((s) => s.lorebooks);
    const currentBookId = useLorebookStore((s) => s.currentBookId);
    const currentBook = lorebooks.find((b) => b.id === currentBookId) || null;

    const {
        contextMessages, contextTokens, setPreset,
        memoryEnabled, memoryLimit, setMemoryEnabled, setMemoryLimit,
        temperature, setTemperature,
        topP, setTopP,
        frequencyPenalty, setFrequencyPenalty,
        maxTokens, setMaxTokens
    } = useChatSettingsStore();

    // Derived Logic
    const currentPreset: "light" | "normal" | "long" = (() => {
        if (contextMessages <= 50 && contextTokens <= 64000) return "light";
        if (contextMessages >= 500 || contextTokens >= 160000) return "long";
        return "normal";
    })();

    // Actions
    const handleClearHistory = async (mode: "session" | "card") => {
        if (mode === "session" && isClearingCurrent) return;
        if (mode === "card" && isClearingAll) return;
        if (!confirm(mode === "session" ? "确定清空当前对话？" : "⚠️ 高能警告：确定删除该角色的所有记忆？此操作不可恢复！")) return;
    
        try {
          if (mode === "session") setIsClearingCurrent(true);
          else setIsClearingAll(true);
    
          await ChatService.clearHistory({
              user_id: APP_CONFIG.DEFAULT_USER_ID,
              scope: mode,
              character_id: currentCardId || undefined
          });

          if (onNewChat) onNewChat();
          addToast(mode === "session" ? "已清空当前对话" : "已删除角色记忆", "success");
        } catch (err) {
          addToast("操作失败，请重试", "error");
        } finally {
          if (mode === "session") setIsClearingCurrent(false);
          else setIsClearingAll(false);
        }
    };

    const handleExportCurrentSession = async () => {
        try {
          setIsExporting(true);
          addToast("正在准备导出数据...", "info"); // Show starting toast
          
          const data = await ChatService.exportHistory({
              user_id: APP_CONFIG.DEFAULT_USER_ID,
              character_id: currentCard?.id,
              character_name: currentCard?.name
          });

          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `chat_${APP_CONFIG.DEFAULT_USER_ID}_${Date.now()}.json`;
          a.click();
          // addToast("已开始下载", "success"); // 用户要求只保留一个 Toast
        } catch (err) {
          addToast("导出失败", "error");
        } finally {
          setIsExporting(false);
        }
    };

    const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          setIsImporting(true);
          const formData = new FormData();
          formData.append("file", file);
          
          await ChatService.importHistory(APP_CONFIG.DEFAULT_USER_ID, formData);

          if (onNewChat) onNewChat();
          addToast("导入成功", "success");
        } catch (err) {
          addToast("导入失败", "error");
        } finally {
          setIsImporting(false);
          event.target.value = "";
        }
    };

    return {
        // State
        router, pathname, fileInputRef,
        isClearingCurrent, isClearingAll, isExporting, isImporting,
        currentCard, currentBook, currentPreset,
        
        // Settings State
        contextMessages, contextTokens,
        memoryEnabled, memoryLimit,
        temperature, topP, frequencyPenalty, maxTokens,

        // Actions
        setPreset, setMemoryEnabled, setMemoryLimit,
        setTemperature, setTopP, setFrequencyPenalty, setMaxTokens,
        handleClearHistory, handleExportCurrentSession, handleImportFileChange
    };
}
