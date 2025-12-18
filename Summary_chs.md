# 项目架构总结

本文档提供了项目架构的高级概览，将功能模块与其对应的前端和后端实现进行了映射。

## 1. 角色管理 (Character Management)
*负责角色的创建、编辑和存储。*

*   **前端 (Frontend):**
    *   **页面:** `frontend/app/character-setup/page.tsx`
    *   **组件:** `frontend/components/CharacterCardPanel.tsx`, `frontend/components/character/*`
    *   **服务:** `frontend/services/CharacterService.ts`
    *   **状态库:** `frontend/store/useCharacterCardStore.ts`
*   **后端 (Backend):**
    *   **API 端点:** `backend/app/api/endpoints/character.py`
    *   **CRUD (增删改查):** `backend/app/crud/character.py`
    *   **数据库模型:** `CharacterCard` (位于 `backend/app/db/models.py`)
    *   **Schema:** `backend/app/schemas/character.py`

## 2. 聊天界面 (Chat Interface)
*核心聊天功能，包括消息历史记录、输入处理和 LLM (大语言模型) 交互。*

*   **前端 (Frontend):**
    *   **页面:** `frontend/app/page.tsx` (主入口)
    *   **组件:** `frontend/components/ChatArea.tsx`, `frontend/components/ChatInputBar.tsx`, `frontend/components/ChatMessage.tsx`
    *   **服务:** `frontend/services/ChatService.ts`
    *   **状态库:** `frontend/store/useChatSettingsStore.ts`
*   **后端 (Backend):**
    *   **API 端点:** `backend/app/api/endpoints/chat.py`
    *   **业务逻辑:** `backend/app/services/chat_service.py` (LLM 处理编排)
    *   **CRUD (增删改查):** `backend/app/crud/chat.py`
    *   **数据库模型:** `ChatMessage` (位于 `backend/app/db/models.py`)

## 3. 世界书 (Lorebook / World Info)
*管理世界设定信息，并利用基于向量的检索进行上下文增强。*

*   **前端 (Frontend):**
    *   **页面:** `frontend/app/lorebook/page.tsx`
    *   **组件:** `frontend/components/LorebookPanel.tsx`
    *   **服务:** `frontend/services/LorebookService.ts`
    *   **状态库:** `frontend/store/useLorebookStore.ts`
*   **后端 (Backend):**
    *   **API 端点:** `backend/app/api/endpoints/lorebook.py`
    *   **向量存储:** `backend/app/core/vector_store.py`
    *   **CRUD (增删改查):** `backend/app/crud/lorebook.py`
    *   **数据库模型:** `Lorebook`, `LorebookEntry` (位于 `backend/app/db/models.py`)

## 4. 记忆系统 (Memory System)
*利用向量存储和自动分析进行长期记忆管理。*

*   **前端 (Frontend):**
    *   *直接集成在聊天界面中 (没有专门面向用户的页面)。*
*   **后端 (Backend):**
    *   **API 端点:** `backend/app/api/endpoints/memory.py`
    *   **服务:** `backend/app/services/memory_service.py` (分析聊天内容以生成记忆)
    *   **向量存储:** `backend/app/core/vector_store.py`
    *   **CRUD (增删改查):** `backend/app/crud/memory.py`
    *   **数据库模型:** `Memory` (位于 `backend/app/db/models.py`)

## 5. 模型设置 (Model Settings)
*LLM 模型的配置 (供应商、API 密钥、当前激活模型)。*

*   **前端 (Frontend):**
    *   **页面:** `frontend/app/model-settings/page.tsx`
    *   **服务:** `frontend/services/ModelService.ts`
*   **后端 (Backend):**
    *   **API 端点:** `backend/app/api/endpoints/models_api.py`
    *   **配置:** `backend/app/core/llm.py`, `backend/app/core/config.py`

## 6. 提示词与系统配置 (Prompts & System Configuration)
*管理系统提示词 (System Prompts) 和高级生成设置。*

*   **前端 (Frontend):**
    *   **页面:** `frontend/app/prompts/page.tsx`
    *   **组件:** `frontend/components/settings/PromptPanel.tsx`
    *   **服务:** `frontend/services/PromptService.ts`
*   **后端 (Backend):**
    *   **API 端点:** `backend/app/api/endpoints/prompts.py`
    *   **数据库模型:** `SystemPromptModule` (位于 `backend/app/db/models.py`)

## 7. 通用应用设置 (General Application Settings)
*全局应用配置。*

*   **前端 (Frontend):**
    *   **页面:** `frontend/app/settings/page.tsx`
    *   **组件:** `frontend/components/sidebar/SidebarSettings.tsx`

---

*由 Gemini Agent 生成于 2025-12-18.*
