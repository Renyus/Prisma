export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface NormalizedPrompt {
  systemPrompt: string; // Role/system prompt (including world context)
  loreBlock: string; // Concatenated lore text to inject (may be empty)
  messages: ChatMessage[]; // History + current user message
  firstAssistantMessage?: string; // Optional first_mes for the opening turn
}
