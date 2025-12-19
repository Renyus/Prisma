import { APP_CONFIG } from "@/config/constants";
import { API_ROUTES } from "@/config/apiRoutes";
import { request } from "@/lib/backendClient";
import type { Lorebook, LoreEntry } from "@/types/lorebook";

export const LorebookService = {
    async getAll(): Promise<Lorebook[]> {
        // Note: The original code passed `_t` for cache busting. 
        // Our updated 'request' defaults to cache: 'no-store', so explicit timestamp might not be needed.
        // But we keep user_id param.
        const query = new URLSearchParams();
        query.set("user_id", APP_CONFIG.DEFAULT_USER_ID);
        // query.set("_t", String(Date.now())); // backendClient handles cache: no-store

        return request<Lorebook[]>(`${API_ROUTES.LORE.BOOKS}?${query.toString()}`, { method: "GET" });
    },

    async create(name: string): Promise<Lorebook> {
        const query = new URLSearchParams();
        query.set("user_id", APP_CONFIG.DEFAULT_USER_ID);

        return request<Lorebook>(`${API_ROUTES.LORE.BOOKS}?${query.toString()}`, {
            method: "POST",
            body: JSON.stringify({ name }),
        });
    },

    async delete(id: string): Promise<void> {
        return request<void>(API_ROUTES.LORE.BOOK_DELETE(id), { method: "DELETE" });
    },

    async update(id: string, changes: Partial<Lorebook>): Promise<Lorebook> {
        return request<Lorebook>(API_ROUTES.LORE.BOOK_UPDATE(id), {
            method: "PUT",
            body: JSON.stringify(changes),
        });
    },

    async import(payload: any): Promise<{ id: string; name: string; count: number }> {
        const query = new URLSearchParams();
        query.set("user_id", APP_CONFIG.DEFAULT_USER_ID);

        return request<{ id: string; name: string; count: number }>(`${API_ROUTES.LORE.IMPORT}?${query.toString()}`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async addEntry(bookId: string, entry: Partial<LoreEntry>): Promise<LoreEntry> {
        const query = new URLSearchParams();
        query.set("book_id", bookId);

        return request<LoreEntry>(`${API_ROUTES.LORE.ITEMS}?${query.toString()}`, {
            method: "POST",
            body: JSON.stringify(entry),
        });
    },

    async updateEntry(id: string, changes: Partial<LoreEntry>): Promise<LoreEntry> {
        return request<LoreEntry>(API_ROUTES.LORE.ITEM_UPDATE(id), {
            method: "PUT",
            body: JSON.stringify(changes),
        });
    },

    async deleteEntry(id: string): Promise<void> {
        return request<void>(API_ROUTES.LORE.ITEM_DELETE(id), { method: "DELETE" });
    }
};