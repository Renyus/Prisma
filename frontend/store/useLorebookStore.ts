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
          
          // 立即更新本地状态，不需要等待向量存储同步完成
          const newBook = {
            id: result.id,
            name: name,
            description: json.description || "",
            enabled: true,
            entries: Object.values(entries).map((entry: any, index) => ({
              id: entry.id || `temp-${Date.now()}-${index}`,
              keys: Array.isArray(entry.keys) ? entry.keys : [],
              content: entry.content || "",
              comment: entry.comment || "",
              enabled: entry.enabled !== false,
              priority: entry.priority || 10,
              order: entry.order || 100,
              probability: entry.probability || 100,
              useRegex: entry.useRegex || entry.use_regex || false,
              caseSensitive: entry.caseSensitive || entry.case_sensitive || false,
              matchWholeWord: entry.matchWholeWord || entry.match_whole_word || false,
              exclude: entry.exclude || false,
              constant: entry.constant || false,
              authorsNote: entry.authorsNote || entry.authors_note || false,
              position: entry.position || "before_char"
            }))
          };
          
          set(s => ({
            lorebooks: [...s.lorebooks, newBook],
            currentBookId: result.id
          }));
          
          // 在后台加载最新的数据
          setTimeout(async () => {
            try {
              await get().loadFromStorage();
            } catch (e) {
              console.error("后台更新失败:", e);
            }
          }, 1000);
          
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
