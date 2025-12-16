// frontend/store/useChatSettingsStore.ts
import { create } from "zustand";
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/persistence";

const STORAGE_KEY = "chat_settings_v1";
const DEFAULT_SUMMARY_HISTORY_LIMIT = 20;

type SettingsSnapshot = {
  contextMessages: number;
  contextTokens: number;
  summaryHistoryLimit: number;
  
  // Model Params
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  maxTokens: number;
  
  // Model Selection
  currentModel?: string;

  // RAG 记忆相关
  memoryEnabled: boolean;
  memoryLimit: number;

  // 🔥 [新增] 用户名 (用于持久化保存)
  userName: string;
};

function loadSettings(): SettingsSnapshot | null {
  return loadFromLocalStorage<SettingsSnapshot>(
    STORAGE_KEY,
    (value): value is SettingsSnapshot =>
      typeof value === "object" &&
      value !== null &&
      typeof (value as any).contextMessages === "number"
  );
}

function persistSettings(settings: SettingsSnapshot) {
  saveToLocalStorage(STORAGE_KEY, settings);
}

const saved = loadSettings();
const INITIAL_SETTINGS: SettingsSnapshot = {
  contextMessages: 16, 
  contextTokens: 2400, 
  summaryHistoryLimit: DEFAULT_SUMMARY_HISTORY_LIMIT,
  temperature: 1.0,
  topP: 1.0,
  frequencyPenalty: 0.0,
  maxTokens: 2048,
  
  memoryEnabled: true,
  memoryLimit: 5,

  // 🔥 [新增] 默认用户名为空
  userName: "",

  ...saved, // Merge saved settings (if any)
};

interface ChatSettingsState {
  
  contextMessages: number;
  contextTokens: number;
  summaryHistoryLimit: number;
  
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  maxTokens: number;

  // RAG State
  memoryEnabled: boolean;
  memoryLimit: number;
  
  // 🔥 [新增] User Name State
  userName: string;
  setUserName: (name: string) => void;

  setContextMessages: (value: number) => void;
  setContextTokens: (value: number) => void;
  setSummaryHistoryLimit: (value: number) => void;
  
  setTemperature: (value: number) => void;
  setTopP: (value: number) => void;
  setFrequencyPenalty: (value: number) => void;
  setMaxTokens: (value: number) => void;
  
  setCurrentModel: (model: string) => void;

  setPreset: (preset: "light" | "normal" | "long") => void;

  // RAG Actions
  setMemoryEnabled: (enabled: boolean) => void;
  setMemoryLimit: (limit: number) => void;
}

export const useChatSettingsStore = create<ChatSettingsState>((set, get) => ({
  // 初始化状态
  contextMessages: INITIAL_SETTINGS.contextMessages,
  contextTokens: INITIAL_SETTINGS.contextTokens,
  summaryHistoryLimit: INITIAL_SETTINGS.summaryHistoryLimit,
  
  temperature: INITIAL_SETTINGS.temperature,
  topP: INITIAL_SETTINGS.topP,
  frequencyPenalty: INITIAL_SETTINGS.frequencyPenalty,
  maxTokens: INITIAL_SETTINGS.maxTokens,

  memoryEnabled: INITIAL_SETTINGS.memoryEnabled,
  memoryLimit: INITIAL_SETTINGS.memoryLimit,

  // 🔥 [新增] 初始化 userName
  userName: INITIAL_SETTINGS.userName || "",

  // 🔥 [新增] 设置 userName 的 Action
  setUserName: (name) => {
    set({ userName: name });
    // 保存到 LocalStorage
    persistSettings({ ...get(), userName: name });
  },

  setContextMessages: (value) => {
    const next = Math.max(0, Math.min(50, Math.round(value)));
    set({ contextMessages: next });
    persistSettings({ ...get(), contextMessages: next });
  },

  setContextTokens: (value) => {
    const next = Math.max(400, Math.min(6000, Math.round(value)));
    set({ contextTokens: next });
    persistSettings({ ...get(), contextTokens: next });
  },

  setSummaryHistoryLimit: (value) => {
    const next = Math.max(5, Math.min(80, Math.round(value)));
    set({ summaryHistoryLimit: next });
    persistSettings({ ...get(), summaryHistoryLimit: next });
  },

  setTemperature: (value) => {
    const next = Math.max(0, Math.min(2.0, value));
    set({ temperature: next });
    persistSettings({ ...get(), temperature: next });
  },

  setTopP: (value) => {
    const next = Math.max(0, Math.min(1.0, value));
    set({ topP: next });
    persistSettings({ ...get(), topP: next });
  },

  setFrequencyPenalty: (value) => {
    const next = Math.max(-2.0, Math.min(2.0, value));
    set({ frequencyPenalty: next });
    persistSettings({ ...get(), frequencyPenalty: next });
  },

  setMaxTokens: (value) => {
    const next = Math.max(100, Math.min(8192, Math.round(value)));
    set({ maxTokens: next });
    persistSettings({ ...get(), maxTokens: next });
  },

  setCurrentModel: (model) => {
    set({ currentModel: model });
    persistSettings({ ...get(), currentModel: model });
  },

  setPreset: (preset) => {
    if (preset === "light") {
      set({ contextMessages: 6, contextTokens: 1200 });
    } else if (preset === "normal") {
      set({ contextMessages: 16, contextTokens: 2400 });
    } else {
      set({ contextMessages: 40, contextTokens: 4000 });
    }
    persistSettings(get());
  },

  setMemoryEnabled: (enabled) => {
    set({ memoryEnabled: enabled });
    persistSettings({ ...get(), memoryEnabled: enabled });
  },

  setMemoryLimit: (limit) => {
    const next = Math.max(1, Math.min(20, Math.round(limit)));
    set({ memoryLimit: next });
    persistSettings({ ...get(), memoryLimit: next });
  },
}));