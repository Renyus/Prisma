// frontend/store/useCharacterCardStore.ts
import { create } from "zustand";
import { nanoid } from "nanoid";
import { CharacterService, CharacterCard } from "@/services/CharacterService";

interface CharacterCardState {
  characterCards: CharacterCard[];
  currentCardId: string | null;
  isLoading: boolean;
  error: string | null;

  // actions
  fetchCards: () => Promise<void>;
  addCard: (partial?: Partial<CharacterCard>) => Promise<string>;
  addCardFromTavernJson: (data: any, filename?: string) => Promise<string>;
  updateCard: (id: string, patch: Partial<CharacterCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  setCurrentCard: (id: string | null) => void;
}

export const useCharacterCardStore = create<CharacterCardState>((set, get) => ({
  characterCards: [],
  currentCardId: null,
  isLoading: false,
  error: null,

  fetchCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const cards = await CharacterService.getAll();
      const currentId = get().currentCardId;
      
      set({ 
        characterCards: cards, 
        currentCardId: currentId || (cards.length > 0 ? cards[0].id : null) 
      });
    } catch (e: any) {
      console.error(e);
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  addCard: async (partial = {}) => {
    const id = nanoid();
    const newCard: CharacterCard = {
      id,
      name: partial.name || "新角色",
      description: partial.description ?? "",
      persona: partial.persona ?? "",
      scenario: partial.scenario ?? "",
      first_mes: partial.first_mes ?? "",
      system_prompt: partial.system_prompt ?? "",
      creator_notes: partial.creator_notes ?? "",
      tags: partial.tags ?? [],
      alternate_greetings: partial.alternate_greetings ?? [],
      user_alias: partial.user_alias ?? ""
    };

    const oldCards = get().characterCards;
    set({ characterCards: [newCard, ...oldCards], currentCardId: id });

    try {
      await CharacterService.create(newCard);
    } catch (e: any) {
      console.error(e);
      set({ characterCards: oldCards, error: "保存失败" });
    }
    return id;
  },

  addCardFromTavernJson: async (data: any, filename?: string) => {
    const id = nanoid();

    const tagsArray: string[] =
      Array.isArray(data.tags)
        ? data.tags
        : typeof data.tags === "string"
        ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

    const newCard: CharacterCard = {
      id,
      name: data.name || filename || "未命名角色",
      description: data.description || "",
      persona: data.persona || data.personality || "",
      scenario: data.scenario || "",
      first_mes: data.first_mes || data.firstMes || "",
      system_prompt: data.system_prompt || "",
      creator_notes: data.creator_notes || "",
      tags: tagsArray,
      alternate_greetings: data.alternate_greetings || [],
      user_alias: data.user_alias || ""
    };

    const oldCards = get().characterCards;
    set({ characterCards: [newCard, ...oldCards], currentCardId: id });

    try {
      await CharacterService.create(newCard);
    } catch (e: any) {
      console.error(e);
      set({ characterCards: oldCards, error: "导入失败" });
    }
    return id;
  },

  updateCard: async (id, patch) => {
    const oldCards = get().characterCards;
    const newCards = oldCards.map((c) =>
      c.id === id ? { ...c, ...patch } : c
    );
    set({ characterCards: newCards });

    try {
      await CharacterService.update(id, patch);
    } catch (e: any) {
      console.error(e);
      set({ characterCards: oldCards, error: "更新失败" });
    }
  },

  deleteCard: async (id) => {
    const oldCards = get().characterCards;
    const newCards = oldCards.filter((c) => c.id !== id);
    let currentId = get().currentCardId;

    if (currentId === id) {
      currentId = newCards[0]?.id ?? null;
    }

    set({ characterCards: newCards, currentCardId: currentId });

    try {
      await CharacterService.delete(id);
    } catch (e: any) {
      console.error(e);
      set({ characterCards: oldCards, error: "删除失败" });
    }
  },

  setCurrentCard: (id) => {
    set({ currentCardId: id });
  },
}));