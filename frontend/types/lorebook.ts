// src/types/lorebook.ts

export type LorePosition =
  | "before_char"
  | "after_char"
  | "before_user"
  | "after_user";

export type LoreEntry = {
  id: string;

  // —— 关键词 / 匹配基础（前端用 keys，后端用 key/keywords）——
  keys: string[];           // 前端编辑用
  content: string;          // 世界观正文
  comment?: string;         // 备注（UI-only）

  // —— 启用状态 ——
  enabled: boolean;

  // —— 排序 / 权重（后端会用 priority/order，其它目前仅 UI 保留）——
  priority?: number;        // 优先级（越大越靠前）
  order?: number;           // 手动排序（同 priority 内）
  probability?: number;     // Tavern 源字段，当前后端未使用
  weight?: number;          // Tavern 源字段，后端未使用
  cooldown?: number;        // Tavern 源字段，后端未使用

  // —— 触发控制（后端 keyword_match 会用这些）——
  useRegex?: boolean;
  caseSensitive?: boolean;
  matchWholeWord?: boolean;
  exclude?: boolean;
  constant?: boolean;

  // —— 位置（用于 before/after char/user 分块）——
  position?: LorePosition;

  // —— 其他 Tavern/UI 字段，后端目前不会用 —— 
  contextual?: boolean;
  authorsNote?: boolean;

  // 兼容未来后端扩展预留空间：不要在这里放复杂业务逻辑
};

export type Lorebook = {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;        // 整本世界书是否启用（前端 UI 决定要不要传给后端）

  entries: LoreEntry[];

  // 元数据（你的 UI 已经在用）
  createdAt?: string;
  updatedAt?: string;
};
