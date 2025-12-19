// Frontend Types V2 - Syncing with Backend Schemas

export interface PromptInjectionConfig {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  position: "absolute" | "relative" | "depth";
  depth: number;
  enabled: boolean;
  name?: string;
}

export interface AdvancedModelConfig {
  temperature?: number;
  min_p?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  max_tokens?: number;
  stop_sequences?: string[];
  model_id?: string;
  provider?: string;
}

export interface Character {
  id: string;
  name: string;
  description?: string;
  
  avatar_url?: string;
  background_url?: string;
  
  persona: string;
  scenario: string;
  first_message: string;
  
  system_prompt_override?: string;
  
  // Advanced Config
  prompt_config: PromptInjectionConfig[];
  model_config_override?: AdvancedModelConfig;
  
  creator?: string;
  tags: string[];
  version: string;
  
  created_at: string;
  updated_at: string;
}
