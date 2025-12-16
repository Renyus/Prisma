import { APP_CONFIG } from "@/config/constants";

export interface PromptModule {
  id: string;
  name: string;
  content: string;
  is_enabled: boolean;
  position: number;
}

export const PromptService = {
    async getAll(): Promise<PromptModule[]> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/prompts`);
        if (!res.ok) throw new Error("Failed to fetch prompts");
        return res.json();
    },

    async update(id: string, data: Partial<PromptModule>): Promise<PromptModule> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/prompts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update prompt");
        return res.json();
    }
};
