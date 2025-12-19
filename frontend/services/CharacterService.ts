import { API_ROUTES } from "@/config/apiRoutes";
import { request } from "@/lib/backendClient";
// import type { CharacterCard } from "@/types/character"; // Old type
import type { Character, CharacterCreate, CharacterUpdate } from "@/types/character"; // New types

export const CharacterService = {
    async getAll(): Promise<Character[]> {
        return request<Character[]>(API_ROUTES.CHARACTER.LIST, { method: "GET" });
    },

    async getById(id: string): Promise<Character> {
        return request<Character>(API_ROUTES.CHARACTER.GET(id), { method: "GET" });
    },

    async create(character: CharacterCreate): Promise<Character> {
        return request<Character>(API_ROUTES.CHARACTER.CREATE, {
            method: "POST",
            body: JSON.stringify(character),
        });
    },

    async update(id: string, patch: CharacterUpdate): Promise<Character> {
        return request<Character>(API_ROUTES.CHARACTER.UPDATE(id), {
            method: "PATCH",
            body: JSON.stringify(patch),
        });
    },

    async delete(id: string): Promise<void> {
        return request<void>(API_ROUTES.CHARACTER.DELETE(id), { method: "DELETE" });
    }
};
