// Supported LLM providers
export type LLMProvider =
  | "openai" // Official OpenAI
  | "deepseek" // DeepSeek Chat API (OpenAI-compatible schema)
  | "groq" // Groq ChatCompletion style
  | "gemini" // Google Gemini official
  | "gemini_proxy" // Gemini exposed via an OpenAI-compatible reverse proxy
  | "openai_compatible"; // Any other OpenAI Chat-compatible API
