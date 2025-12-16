//
// =============================
//  通用类型定义（全局使用）
// =============================
//

// 支持的 Chat 角色
export type ChatRole = "system" | "user" | "assistant";

// 前后端统一的消息结构
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

//
// =============================
//  Tavern 角色卡类型
// =============================
//

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

//
// =============================
//  Tavern 世界书类型
// =============================
//

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

//
// =============================
//  PromptBuilder 输入与输出
// =============================
//

// BuildNormalizedPrompt 的输入参数
export interface BuildPromptParams {
  card: TavernCharacterCard;
  loreEntries: TavernLoreEntry[];
  history: ChatMessage[];       // 历史，不包括本轮输入
  userMessage: string;          // 本轮用户输入
  isFirstUserMessage: boolean;  // 是否首轮
}

// PromptBuilder 的输出结构
export interface NormalizedPrompt {
  systemPrompt: string;         // 拼好的 system prompt
  loreBlock: string;            // 触发世界书文本（调试用）
  messages: ChatMessage[];      // history + user
  firstAssistantMessage?: string; // only on first turn
}

//
// =============================
//  Agent→LLM 请求体（前端发来的）
// =============================
//

// 多模型支持的 Provider 类型
export type LLMProvider =
  | "openai"
  | "deepseek"
  | "groq"
  | "gemini"
  | "gemini_proxy"
  | "openai_compatible";

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

  // 可选自定义 API Key / Base URL（如果你走反代）
  apiKey?: string;
  baseUrl?: string;
}

//
// =============================
//  LLM Client 内部类型
// =============================
//

export interface LLMCallOptions {
  provider: LLMProvider;
  model: string;

  temperature?: number;
  maxTokens?: number;
  topP?: number;

  apiKey?: string;
  baseUrl?: string;
}

export interface LLMCallResult {
  rawText: string;
}

