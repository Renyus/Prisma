// Tavern character card (Tavern / SillyTavern compatible)
export interface TavernCharacterCard {
  id: string; // Local unique id for storage/selecting
  name: string;

  description?: string;
  persona?: string;
  scenario?: string;
  first_mes?: string;
  system_prompt?: string;
  creator_notes?: string;
  tags?: string[];

  // Preserve the raw Tavern JSON to avoid losing vendor fields
  rawJson?: any;
  sourceFileName?: string;
}

export type LorePosition = "before_char" | "after_char" | "before_user" | "after_user" | "memory";

// Tavern lore entry (Lorebook) structure
export interface TavernLoreEntry {
  id: string;
  content: string;
  keywords?: string[];
  key?: string;
  comment?: string;
  enabled: boolean;
  useRegex?: boolean;
  caseSensitive?: boolean;
  matchWholeWord?: boolean;
  exclude?: boolean;
  position?: LorePosition;
  priority?: number;
  order?: number;
  constant?: boolean;
  contextual?: boolean;
  authorsNote?: boolean;
  probability?: number;
  weight?: number;
  cooldown?: number;
}
