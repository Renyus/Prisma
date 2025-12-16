// Tavern V2 Character Card Specification
// Based on: https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/extensions/character-card-parser/README.md

import { TavernLoreEntry } from "./lorebook";

export interface TavernCardV2Data {
    name: string;
    description: string;
    personality: string; // V2 uses personality, often mapped to persona
    scenario: string;
    first_mes: string;
    mes_example: string;
    
    // V2 New Fields
    creator_notes?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    alternate_greetings?: string[];
    character_book?: TavernCardV2CharacterBook; // Embedded Lorebook
    
    tags?: string[];
    
    // Extensions
    extensions?: Record<string, any>;
}

export interface TavernCardV2CharacterBook {
    name?: string;
    description?: string;
    scan_depth?: number;
    token_budget?: number;
    recursive_scanning?: boolean;
    extensions?: Record<string, any>;
    entries: TavernCardV2LoreEntry[];
}

export interface TavernCardV2LoreEntry {
    id?: number; // V2 often uses int ID
    keys: string[];
    content: string;
    secondary_keys?: string[];
    comment?: string;
    priority?: number;
    order?: number;
    position?: string; // before_char, after_char, etc.
    use_regex?: boolean;
    constant?: boolean;
    enabled?: boolean;
    // ... maps closely to TavernLoreEntry
}

// Internal Representation in our App
export interface CharacterCard {
  id: string; // UUID
  name: string;
  description?: string;
  persona?: string;
  scenario?: string;
  first_mes?: string;
  system_prompt?: string;
  creator_notes?: string;
  tags?: string[];
  
  // New V2 fields support
  alternate_greetings?: string[];
  user_alias?: string;
  
  // Meta
  created_at?: string;
  source_filename?: string;
}