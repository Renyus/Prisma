import { request } from "@/lib/backendClient";

export interface ActiveModelInfo {
  name: string;
  vendor: string;
}

export const ModelService = {
    async listModels() {
        return request<{ models: { id: string; name: string }[] }>("/models", {
            method: "GET",
        });
    },

    async fetchActiveModelInfo() {
        return request<ActiveModelInfo>("/models/active", { method: "GET" });
    }
};
