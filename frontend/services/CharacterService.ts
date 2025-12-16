import { APP_CONFIG } from "@/config/constants";
import { request } from "@/lib/backendClient";
import type { CharacterCard } from "@/types/character";

export { type CharacterCard };

export const CharacterService = {
    async getAll(): Promise<CharacterCard[]> {
        return request<CharacterCard[]>("/cards/", { method: "GET" });
    },

    async create(card: CharacterCard): Promise<CharacterCard> {
        return request<CharacterCard>("/cards/", {
            method: "POST",
            body: JSON.stringify(card),
        });
    },

    async update(id: string, patch: Partial<CharacterCard>): Promise<CharacterCard> {
        return request<CharacterCard>(`/cards/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
        });
    },

    async delete(id: string): Promise<void> {
        return request<void>(`/cards/${id}`, { method: "DELETE" });
    }
};
