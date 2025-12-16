// frontend/store/useLorebookStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lorebook, LoreEntry } from "@/types/lorebook";
import { LorebookService } from "@/services/LorebookService";

interface LorebookStore {
  lorebooks: Lorebook[];
  currentBookId: string | null;
  
  loadFromStorage: () => Promise<void>;
  setCurrentBook: (id: string | null) => void;
  
  importLorebook: (json: any, fileName: string) => Promise<string | null>;
  
  addEntry: (entry: Partial<LoreEntry>) => Promise<string | null>;
  updateEntry: (id: string, changes: Partial<LoreEntry>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  
  createLorebook: (name: string) => Promise<string>;
  deleteLorebook: (id: string) => Promise<void>;
  renameLorebook: (id: string, name: string) => Promise<void>;
  updateLorebook: (id: string, changes: Partial<Lorebook>) => Promise<void>;
}

export const useLorebookStore = create<LorebookStore>()(
  persist(
    (set, get) => ({
      lorebooks: [],
      currentBookId: null,

      loadFromStorage: async () => {
        try {
          const books = await LorebookService.getAll();
          set({ lorebooks: books });
          const current = get().currentBookId;
          
          if (books.length > 0) {
               if (!current || !books.find((b) => b.id === current)) {
                   set({ currentBookId: books[0].id });
               }
          } else {
              set({ currentBookId: null });
          }
        } catch (e) {
          console.error("Failed to load lorebooks", e);
        }
      },

      setCurrentBook: (id) => set({ currentBookId: id }),

      importLorebook: async (json, fileName) => {
        try {
          const entries = json.entries || json.data || [];
          const name = json.name || fileName.replace(".json", "");
          
          if (!entries || entries.length === 0) {
            console.warn("Empty lorebook");
            return null;
          }

          const payload = {
            name: name,
            description: json.description || "",
            entries: Object.values(entries)
          };

          const result = await LorebookService.import(payload);
          await get().loadFromStorage();
          return result.id;

        } catch (error) {
          console.error("Batch import failed:", error);
          return null;
        }
      },

      createLorebook: async (name) => {
        const book = await LorebookService.create(name);
        await get().loadFromStorage();
        return book.id;
      },

      deleteLorebook: async (id) => {
        if (!id) return; 

        try {
            await LorebookService.delete(id);

            const currentId = get().currentBookId;
            set((s) => ({ 
                lorebooks: s.lorebooks.filter((b) => b.id !== id),
                currentBookId: currentId === id ? null : currentId 
            }));

            await get().loadFromStorage();
            
        } catch (error) {
            console.error("Network error deleting lorebook:", error);
        }
      },

      renameLorebook: async (id, name) => {
        await LorebookService.update(id, { name });
        await get().loadFromStorage();
      },

      updateLorebook: async (id, changes) => {
        set(s => ({
            lorebooks: s.lorebooks.map(b => b.id === id ? { ...b, ...changes } : b)
        }));
        await LorebookService.update(id, changes);
      },

      addEntry: async (entry) => {
        const bookId = get().currentBookId;
        if (!bookId) return null;
        
        try {
            const newItem = await LorebookService.addEntry(bookId, entry);
            set(s => ({
                lorebooks: s.lorebooks.map(b => 
                    b.id === bookId 
                    ? { ...b, entries: [...(b.entries || []), newItem] } 
                    : b
                )
            }));
            return newItem.id;
        } catch (e) {
            console.error(e);
            return null;
        }
      },

      updateEntry: async (id, changes) => {
        const bookId = get().currentBookId;
        set(s => ({
            lorebooks: s.lorebooks.map(b => 
                b.id === bookId
                ? { ...b, entries: b.entries.map(e => e.id === id ? { ...e, ...changes } : e) }
                : b
            )
        }));

        await LorebookService.updateEntry(id, changes);
      },

      removeEntry: async (id) => {
        const bookId = get().currentBookId;
        set(s => ({
            lorebooks: s.lorebooks.map(b => 
                b.id === bookId
                ? { ...b, entries: b.entries.filter(e => e.id !== id) }
                : b
            )
        }));
        await LorebookService.deleteEntry(id);
      },

    }),
    {
      name: "lorebook-storage-v2",
      partialize: (state) => ({ currentBookId: state.currentBookId }),
    }
  )
);
