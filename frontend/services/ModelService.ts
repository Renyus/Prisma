import { API_ROUTES } from "@/config/apiRoutes";
import { request } from "@/lib/backendClient";

export interface ActiveModelInfo {
  name: string;
  vendor: string;
}

export const ModelService = {
    async listModels() {
        return request<{ models: { id: string; name: string }[] }>(API_ROUTES.MODELS.LIST, {
            method: "GET",
        });
    },

    async fetchActiveModelInfo() {
        return request<ActiveModelInfo>(API_ROUTES.MODELS.ACTIVE, { method: "GET" });
    }
};