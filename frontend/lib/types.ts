// Placeholder for generic utility types, can be expanded as needed.
// Specific domain types are now in frontend/types/character.ts, frontend/types/chat.ts, etc.
// LLM interaction types are defined by the backend API contracts.

// Example: Generic ID type
export type EntityID = string;

// Re-export common enums or types from new chat types
export { MessageRole, MessageType } from "@/types/chat";

// For now, retaining Tavern-specific types if they are still used in old components
// and not yet refactored to new schema.
// NOTE: These will eventually need to be updated or removed if the new backend
// does not support them directly, or if they are transformed into new Character/Lorebook types.

export interface TavernCharacterCard {
  name: string;
  description?: string;
  persona?: string;
  scenario?: string;
  first_mes?: string;       // 首轮回复
  system_prompt?: string;   // ST 用
  tags?: string[];
  rawJson?: any;            // 兼容未来格式
}

export type LorePosition =
  | "before_char"
  | "after_char"
  | "before_user"
  | "after_user"
  | "memory";

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