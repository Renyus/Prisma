import type { ChatMessage } from "@/types/prompt";
import type { LLMProvider } from "@/types/llm";
import type { TavernCharacterCard, TavernLoreEntry } from "@/types/tavern";

export interface AgentRequestBody {
  provider: LLMProvider;
  model: string;
  card: TavernCharacterCard;
  loreEntries: TavernLoreEntry[];
  history: ChatMessage[];
  userMessage: string;
  isFirstUserMessage: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  apiKey?: string;
  baseUrl?: string;
}
