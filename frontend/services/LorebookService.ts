import { APP_CONFIG } from "@/config/constants";
import type { Lorebook, LoreEntry } from "@/types/lorebook";

export const LorebookService = {
    async getAll(): Promise<Lorebook[]> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/lore/books?user_id=${APP_CONFIG.DEFAULT_USER_ID}&_t=${Date.now()}`);
        if (!res.ok) throw new Error("Failed to fetch lorebooks");
        return res.json();
    },

    async create(name: string): Promise<Lorebook> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/lore/books?user_id=${APP_CONFIG.DEFAULT_USER_ID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("Failed to create lorebook");
        return res.json();
    },

    async delete(id: string): Promise<void> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/lore/books/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to delete lorebook: ${err}`);
        }
    },

    async update(id: string, changes: Partial<Lorebook>): Promise<Lorebook> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/lore/books/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
        });
        if (!res.ok) throw new Error("Failed to update lorebook");
        return res.json();
    },

    async import(payload: any): Promise<{ id: string; name: string; count: number }> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/lore/import?user_id=${APP_CONFIG.DEFAULT_USER_ID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to import lorebook");
        return res.json();
    },

    async addEntry(bookId: string, entry: Partial<LoreEntry>): Promise<LoreEntry> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/lore/items?book_id=${bookId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
        });
        if (!res.ok) throw new Error("Failed to add entry");
        return res.json();
    },

    async updateEntry(id: string, changes: Partial<LoreEntry>): Promise<LoreEntry> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/lore/items/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to update entry: ${err}`);
        }
        return res.json();
    },

    async deleteEntry(id: string): Promise<void> {
        const res = await fetch(`${APP_CONFIG.API_BASE}/lore/items/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete entry");
    }
};
