目标,任务描述,涉及文件/模块,依据
A. 面板状态解耦,"将 Character, Lorebook, Prompt 三个面板的开关状态 (open/close) 从 frontend/app/page.tsx 的本地 useState 中移除。",frontend/app/page.tsx,架构优化
B. 新增 UI 状态 Store,"创建一个新的 Zustand Store (例如 useUIPanelStore)，集中管理所有侧边栏/浮动面板的开关状态 (isCharacterPanelOpen, isLorebookPanelOpen, isPromptPanelOpen)。",(新增 Store 文件),架构优化
C. 更新 Sidebar 逻辑,修改 Sidebar.tsx，使其直接调用 useUIPanelStore 中的开关函数，不再通过 Props 接收 onOpenXPanel 回调，完成逻辑与 UI 的彻底分离。,frontend/components/Sidebar.tsx,架构优化