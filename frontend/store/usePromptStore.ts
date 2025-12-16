import { create } from "zustand";
import { PromptService, PromptModule } from "@/services/PromptService";

interface PromptStore {
  modules: PromptModule[];
  isLoading: boolean;
  fetchModules: () => Promise<void>;
  updateModule: (id: string, data: Partial<PromptModule>) => Promise<void>;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  modules: [],
  isLoading: false,

  fetchModules: async () => {
    set({ isLoading: true });
    try {
      const data = await PromptService.getAll();
      set({ modules: data });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateModule: async (id, data) => {
    // 1. 先找到当前内存里的完整对象
    const currentModules = get().modules;
    const targetModule = currentModules.find((m) => m.id === id);

    if (!targetModule) return;

    // 2. 构造一个完整的对象（旧数据 + 新数据）
    // 🔥 关键修复：后端 Pydantic 需要全量字段，不能只传 Partial
    const fullPayload = { ...targetModule, ...data };

    // 3. 乐观更新前端状态 (让 UI 立刻变)
    set((state) => ({
      modules: state.modules.map((m) => (m.id === id ? { ...m, ...data } : m)),
    }));

    try {
      // 4. 发送完整对象给后端
      await PromptService.update(id, fullPayload);
      
      // 5. 保险起见，更新成功后再拉取一次最新数据
      // (为了防止排序变化等副作用)
      const refreshed = await PromptService.getAll();
      set({ modules: refreshed });
      
    } catch (error) {
      console.error("Update failed", error);
      // 如果失败，回滚状态（重新拉取）
      get().fetchModules();
    }
  },
}));