export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string; // ISO
}

export interface Adventure {
  id: string; // uuid
  title: string; // 显示在侧边栏的标题
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  characterCardId?: string | null;
  lorebookId?: string | null;
}
