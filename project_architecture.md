# SakuraRPG 项目架构总结

本文档旨在总结当前 **SakuraRPG** 项目的技术栈、架构概览以及前后端模块的代码对应关系。

## 1. 技术栈概览

### 后端 (Backend)
- **核心框架:** Python, FastAPI
- **服务器:** Uvicorn
- **数据库 (ORM):** SQLAlchemy (使用 SQLite/PostgreSQL)
- **向量数据库:** ChromaDB (用于 Lorebook 和 记忆检索)
- **数据验证:** Pydantic
- **其他:** HTTPX (异步请求), python-dotenv (环境配置), python-multipart (文件上传)

### 前端 (Frontend)
- **核心框架:** TypeScript, Next.js 14 (App Router)
- **UI 库:** React 18, Tailwind CSS
- **状态管理:** Zustand
- **逻辑抽象**: React Custom Hooks (Controller 模式)
- **动画:** Framer Motion
- **图标:** Lucide React
- **Markdown 渲染:** React Markdown, Rehype Highlight, Remark GFM
- **工具:** NanoID (ID生成), Pako (压缩)

---

## 2. 模块代码映射 (Module Mapping)

以下按功能模块分类，列出涉及的关键文件路径。

### 核心聊天模块 (Chat Core)
负责处理用户输入、LLM 对话生成、上下文构建及消息历史记录。
**主要更新:**
- **动态上下文窗口**: 移除了硬编码的 4096 Token 限制，现在会从配置中动态获取最大模型上下文长度。
- **优化 Token 估算**: 改进了对中日韩等 CJK 字符的 Token 估算逻辑，采用更精确的 UTF-8 字节数启发式算法，减少上下文超限风险。
- **历史摘要重构**: 将系统生成的历史摘要从对话历史中分离，作为独立块注入到 System Prompt 顶部，符合 LLM 最佳实践。
- **前端解耦**: 核心聊天逻辑已抽离到 `useChatController`。

| 类型 | 文件路径 | 说明 |
| :--- | :--- | :--- |
| **Backend** | `backend/app/api/endpoints/chat.py` | 聊天 API 路由入口 |
| **Backend** | `backend/app/services/chat_service.py` | 聊天核心业务逻辑 (已更新以处理摘要和 Lorebook 加载) |
| **Backend** | `backend/app/services/payload_builder.py` | 构建发送给 LLM 的 Payload |
| **Backend** | `backend/app/crud/chat.py` | 聊天记录数据库操作 |
| **Backend** | `backend/app/schemas/chat.py` | 聊天相关数据模型定义 |
| **Frontend** | `frontend/app/page.tsx` | 主聊天页面入口 |
| **Frontend** | `frontend/components/ChatArea.tsx` | 聊天消息展示区域 (已重构，仅处理 UI 渲染) |
| **Frontend** | `frontend/components/ChatInputBar.tsx` | 输入框组件 |
| **Frontend** | `frontend/components/ChatMessage.tsx` | 单条消息气泡组件 |
| **Frontend** | `frontend/lib/api/chat.tsx` | 前端聊天 API 调用封装 |
| **Frontend** | `frontend/lib/chatUtils.ts` | **(新增)** 聊天相关工具函数 (如 `parseThinkingContent`) |
| **Frontend** | `frontend/store/useChatSettingsStore.ts` | 聊天设置状态管理 |
| **Frontend** | `frontend/hooks/controllers/useChatController.ts` | **(新增)** 聊天逻辑控制器 Hook |

### 角色系统 (Character System)
负责角色卡（Character Card）的导入、解析、存储和选择。
**主要更新:**
- **增强 V2 规范支持**: 后端 `CharacterCard` 模型和 Schema 新增 `alternate_greetings` 字段，支持更丰富的角色设定。
- **解耦导入逻辑**: 前端新增 `frontend/lib/characterImporter.ts` 纯逻辑文件，集中处理 V1/V2 角色卡的解析、清洗，并能自动提取内置世界书 (character_book)。
- **前端解耦**: 角色卡面板逻辑已抽离到 `useCharacterPanelController`。

| 类型 | 文件路径 | 说明 |
| :--- | :--- | :--- |
| **Backend** | `backend/app/api/endpoints/character.py` | 角色管理 API 路由 |
| **Backend** | `backend/app/crud/character.py` | 角色数据库操作 (已更新以支持 `alternate_greetings`) |
| **Backend** | `backend/app/schemas/character.py` | 角色数据模型 (已更新以支持 `alternate_greetings`) |
| **Frontend** | `frontend/app/character-setup/page.tsx` | 角色设置/选择页面 |
| **Frontend** | `frontend/components/CharacterCardPanel.tsx` | 角色卡片展示组件 (已重构，仅处理 UI 渲染) |
| **Frontend** | `frontend/components/character/Inputs.tsx` | 角色信息输入表单 |
| **Frontend** | `frontend/store/useCharacterCardStore.ts` | 角色状态管理 |
| **Frontend** | `frontend/lib/pngCard.ts` | 处理 PNG 角色卡元数据解析 (作为 `characterImporter` 的依赖) |
| **Frontend** | `frontend/lib/characterImporter.ts` | **(新增)** 角色卡导入逻辑解耦，处理 V1/V2 解析及内置世界书提取 |
| **Frontend** | `frontend/types/character-v2.ts` | **(新增)** Tavern V2 角色卡数据类型定义 |
| **Frontend** | `frontend/hooks/controllers/useCharacterPanelController.ts` | **(新增)** 角色卡面板逻辑控制器 Hook |

### 世界书/知识库 (Lorebook)
负责世界观设定的存储、管理以及基于向量的检索。
**主要更新:**
- **后端自动加载**: 聊天时，如果前端未提供 Lorebook 内容，后端会根据用户 ID 自动从数据库加载所有激活的 Lorebook 条目，减少网络负载。
- **混合检索 (RAG)**:
    - 结合关键词匹配和向量相似度检索。
    - Lorebook 条目现在会被同步到 ChromaDB 向量数据库，支持语义搜索。
    - 聊天服务会查询向量数据库，获取与当前对话最相关的 Lorebook 条目。
- **向量数据库同步**: Lorebook 条目的增删改操作会异步同步到 ChromaDB。
- **前端解耦**: 世界书面板逻辑已抽离到 `useLorebookPanelController`。

| 类型 | 文件路径 | 说明 |
| :--- | :--- | :--- |
| **Backend** | `backend/app/api/endpoints/lorebook.py` | 世界书 API 路由 (已更新为 async，并同步到向量数据库) |
| **Backend** | `backend/app/services/lorebook_service.py` | 世界书业务逻辑与检索 (已更新以支持混合检索) |
| **Backend** | `backend/app/core/vector_store.py` | ChromaDB 向量存储接口 (已新增 Lorebook 专用操作) |
| **Backend** | `backend/app/crud/lorebook.py` | 世界书数据库操作 (已新增获取活跃条目功能) |
| **Frontend** | `frontend/app/lorebook/page.tsx` | 世界书管理页面 |
| **Frontend** | `frontend/components/LorebookPanel.tsx` | 世界书侧边栏/面板组件 (已重构，仅处理 UI 渲染) |
| **Frontend** | `frontend/store/useLorebookStore.ts` | 世界书状态管理 |
| **Frontend** | `frontend/hooks/controllers/useLorebookPanelController.ts` | **(新增)** 世界书面板逻辑控制器 Hook |

### 提示词与模型设置 (Prompts & Model Settings)
负责管理系统提示词 (System Prompts) 以及 LLM 连接设置。
**主要更新:**
- `prompt_builder.py` 已更新，现在能接收动态的最大模型上下文长度，并支持将提取出的历史摘要注入到系统提示词中。
- **前端解耦**: 提示词面板逻辑已抽离到 `usePromptPanelController`。

| 类型 | 文件路径 | 说明 |
| :--- | :--- | :--- |
| **Backend** | `backend/app/api/endpoints/prompts.py` | 提示词管理 API |
| **Backend** | `backend/app/api/endpoints/models_api.py` | 模型相关 API |
| **Backend** | `backend/app/services/prompt_builder.py` | 动态构建最终提示词 (已更新以支持动态上下文和历史摘要) |
| **Frontend** | `frontend/app/prompts/page.tsx` | 提示词管理页面 |
| **Frontend** | `frontend/app/model-settings/page.tsx` | 模型连接设置页面 |
| **Frontend** | `frontend/app/settings/page.tsx` | 设置页面 (通常包含模型设置) |
| **Frontend** | `frontend/components/settings/PromptPanel.tsx` | 提示词编辑面板 (已重构，仅处理 UI 渲染) |
| **Frontend** | `frontend/store/usePromptStore.ts` | 提示词状态管理 |
| **Frontend** | `frontend/lib/api/prompts.ts` | 提示词 API 封装 |
| **Frontend** | `frontend/hooks/controllers/usePromptPanelController.ts` | **(新增)** 提示词面板逻辑控制器 Hook |

### 记忆系统 (Memory System)
负责长短期记忆的处理（通常在聊天过程中自动调用）。
**主要更新:**
- 确认了记忆去重机制已通过 `vector_store.exist_similar` 功能启用。

| 类型 | 文件路径 | 说明 |
| :--- | :--- | :--- |
| **Backend** | `backend/app/api/endpoints/memory.py` | 记忆管理 API |
| **Backend** | `backend/app/services/memory_service.py` | 记忆处理逻辑 (已包含去重机制) |
| **Backend** | `backend/app/crud/memory.py` | 记忆数据库操作 |

### 基础设施 (Infrastructure/Core)
项目的核心配置和通用工具。
**主要更新:**
- **配置**: `backend/app/core/config.py` 新增 `MAX_MODEL_CONTEXT_LENGTH` 配置项，允许灵活配置模型上下文。
- **向量存储**: `backend/app/core/vector_store.py` 增强，新增了 Lorebook 专属的向量操作（存储、删除、搜索），使其能够支持 Lorebook 的混合检索。
- **前端通用**: 新增 `frontend/hooks/useMounted.ts` 用于处理 Hydration 错误。
- **前端解耦**: `Sidebar` 逻辑已抽离到 `useSidebarController`。

| 类型 | 文件路径 | 说明 |
| :--- | :--- | :--- |
| **Backend** | `backend/app/main.py` | FastAPI 应用入口 |
| **Backend** | `backend/app/core/config.py` | 后端配置加载 (已新增模型上下文长度配置) |
| **Backend** | `backend/app/core/llm.py` | LLM 调用接口封装 |
| **Backend** | `backend/app/db/models.py` | SQLAlchemy 数据库模型定义 (已更新 `CharacterCard` 增加 `alternate_greetings`) |
| **Backend** | `backend/app/db/session.py` | 数据库会话管理 |
| **Frontend** | `frontend/lib/backendClient.ts` | 通用 HTTP 客户端 (Axios/Fetch封装) |
| **Frontend** | `frontend/types/*.ts` | TypeScript 类型定义全集 (已新增 V2 角色卡相关类型) |
| **Frontend** | `frontend/hooks/useMounted.ts` | **(新增)** 客户端挂载状态 Hook (用于解决 Hydration 问题) |
| **Frontend** | `frontend/hooks/controllers/useSidebarController.ts` | **(新增)** 侧边栏逻辑控制器 Hook |
| **Frontend** | `frontend/components/Sidebar.tsx` | 侧边栏组件 (已重构，仅处理 UI 渲染) |

---

### 更新日志

**2025年12月16日**
- **核心聊天模块**
    - 移除了硬编码的 LLM 上下文限制，改为动态读取 `MAX_MODEL_CONTEXT_LENGTH` (默认 16384)。
    - 优化了 CJK 字符的 Token 估算逻辑，提高了准确性。
    - 重构了历史摘要的处理方式，将其作为独立块注入 System Prompt。
- **角色系统**
    - 增加了对 Tavern V2 角色卡中 `alternate_greetings` 字段的后端支持 (Schema, Model, CRUD)。
    - 新增 `frontend/lib/characterImporter.ts`，解耦前端角色卡导入逻辑，支持 V1/V2 解析及内置世界书提取。
- **世界书/知识库**
    - 实现了后端自动加载活跃 Lorebook 条目功能。
    - 引入了混合检索机制 (关键词 + 向量搜索)，并完善了 Lorebook 条目与 ChromaDB 的同步逻辑。
- **基础设施/核心**
    - `backend/app/core/config.py` 新增 `MAX_MODEL_CONTEXT_LENGTH` 配置。
    - `backend/app/core/vector_store.py` 增强了 Lorebook 相关的向量操作。

**2025年12月16日 (续)**
- **前端架构优化 (解耦)**
    - **UI 层与逻辑层分离**: 大量前端组件（`ChatArea`, `CharacterCardPanel`, `LorebookPanel`, `PromptPanel`, `Sidebar`）的业务逻辑已抽离到新的 `frontend/hooks/controllers` 目录下的 Custom Hooks 中。
    - **Hydration 错误修复**: 引入 `frontend/hooks/useMounted.ts` Hook 统一处理客户端组件的 Hydration Mismatch 问题。
    - **代码清理**: 移除了 5 个未被使用的前端组件文件 (`FloatingButton.tsx`, `LiquidGlassCard.tsx`, `PlaceholderPanel.tsx`, `SendButton.tsx`, `ToolResponse.tsx`)，减少了代码冗余。

---

*生成日期: 2025-12-16*
