import { useState, useEffect, useMemo } from "react";
import { ModelService, type ActiveModelInfo } from "@/services/ModelService";
import { useChatSettingsStore } from "@/store/useChatSettingsStore";

export function useModelStatus() {
    // Settings store
    const { currentModel, setCurrentModel } = useChatSettingsStore();

    // Local State
    const [activeModelInfo, setActiveModelInfo] = useState<ActiveModelInfo | null>(null);
    const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);

    // Derived State
    const displayedModelName = useMemo(() => {
        if (currentModel) return currentModel;
        if (activeModelInfo?.name) return activeModelInfo.name;
        return "加载中..."; 
    }, [currentModel, activeModelInfo]);
      
    const displayedVendorName = (activeModelInfo?.vendor ?? "未知供应商");
    const isOnline = !!activeModelInfo;

    // Model polling logic
    useEffect(() => {
        // Load available models
        ModelService.listModels()
            .then(res => setAvailableModels(res.models))
            .catch(() => {});

        // Poll active model status
        let cancelled = false;
        const checkStatus = () => {
            ModelService.fetchActiveModelInfo()
                .then((info) => { if (!cancelled) setActiveModelInfo(info); })
                .catch(() => { if (!cancelled) setActiveModelInfo(null); });
        };
        
        checkStatus();
        const intervalId = setInterval(checkStatus, 30000);
        
        return () => { 
            cancelled = true; 
            clearInterval(intervalId); 
        };
    }, []);

    return {
        // State
        activeModelInfo,
        availableModels,
        displayedModelName,
        displayedVendorName,
        isOnline,
        currentModel,
        
        // Actions
        setCurrentModel,
    };
}
