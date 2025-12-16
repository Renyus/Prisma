import { useEffect } from "react";
import { usePromptStore } from "@/store/usePromptStore";
import type { PromptModule } from "@/services/PromptService";

export function usePromptPanelController() {
    const { modules, isLoading, fetchModules, updateModule } = usePromptStore();

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    const handleUpdate = async (id: string, data: Partial<PromptModule>) => {
        await updateModule(id, data);
    };

    return {
        modules,
        isLoading,
        handleUpdate
    };
}
