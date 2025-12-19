# 夏瑾 Pro 比邻星 1.0.json 文件解析指南

这份文档旨在帮助开发者理解 `夏瑾 Pro 比邻星 1.0.json` 文件的结构，以便编写相应的解析器。该文件似乎是一个用于 LLM（大语言模型）前端应用（如 SillyTavern 或类似的酒馆类软件）的高级预设配置包，包含了模型设置、提示词（Prompt）策略、思维链（CoT）逻辑以及内容注入规则。

## 1. 根对象 (Root Object)

根对象包含了全局配置、模型选择参数和生成参数。

| 字段名 | 类型 | 描述 | 示例值 |
| :--- | :--- | :--- | :--- |
| `chat_completion_source` | String | 指定使用的对话补全源（API提供商）。 | `"deepseek"`, `"openai"` |
| `openai_model`, `claude_model`, `openrouter_model` | String | 针对不同源的具体模型标识符。 | `"deepseek/deepseek-chat-v3.1"` |
| `temperature` | Number | 生成温度，控制随机性。 | `1.01` |
| `frequency_penalty`, `presence_penalty` | Number | 惩罚参数，用于控制重复度。 | `0` |
| `top_p`, `top_k`, `top_a`, `min_p` | Number | 采样参数，控制生成的词汇选择范围。 | `1`, `0` |
| `openai_max_context` | Number | 允许的最大上下文窗口大小。 | `2000000` |
| `openai_max_tokens` | Number | 单次回复的最大 token 数。 | `8192` |
| `stream_openai` | Boolean | 是否开启流式传输（打字机效果）。 | `true` |
| `squash_system_messages` | Boolean | 是否将多个系统消息合并发送。 | `true` |
| `prompts` | Array | **核心数据**。包含所有定义的提示词块。详见下文。 | `[...]` |
| `prompt_order` | Array | **核心逻辑**。定义提示词的激活状态和排序。详见下文。 | `[...]` |

## 2. Prompts 数组 (`prompts`)

`prompts` 数组中的每个对象代表一个独立的提示词模块（Prompt Block）。解析器需要遍历此数组来获取所有可用的提示词内容。

### Prompt 对象结构

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `identifier` | String | **唯一标识符**。用于在 `prompt_order` 中引用该模块（如 `"main"`, `"jailbreak"`）。 |
| `name` | String | 人类可读的名称，通常用于UI显示（如 `"➡️扩写/转述输入"`）。 |
| `role` | String | 该消息在聊天历史中的角色，通常为 `"system"` (系统指令) 或 `"user"` (伪造用户指令)。 |
| `content` | String | 提示词的具体文本内容。**注意**：其中包含大量模板变量（如 `{{user}}`）和脚本指令（如 `{{setvar::...}}`）。 |
| `system_prompt` | Boolean | 标记是否作为系统提示词处理。 |
| `injection_position` | Number | 注入位置的类型（通常 `0` 表示相对深度或绝对位置，需结合具体应用逻辑）。 |
| `injection_depth` | Number | 注入深度。指该消息距离最新聊天记录的层级（例如 `4` 可能意味着插入到倒数第4条消息之前）。 |
| `forbid_overrides` | Boolean | 是否禁止后续设置覆盖此模块。 |
| `enabled` | Boolean | (默认) 是否启用。**注意**：实际启用状态通常由 `prompt_order` 决定。 |

### Content 字段中的特殊语法
解析器需要注意 `content` 字段中包含的特殊语法，这些通常需要在发送给 LLM 之前进行处理或替换：
*   **变量替换**: `{{user}}` (用户名), `{{char}}` (角色名), `{{lastusermessage}}` (上一条用户消息)。
*   **脚本命令**:
    *   `{{setvar::varName::value}}`: 设置变量。
    *   `{{getvar::varName}}`: 获取变量值。
    *   `{{trim}}`: 去除空白。
    *   `{{random::a,b,c}}`: 随机选择。
    *   `{{//...}}`: 注释，不发送给 LLM。

## 3. Prompt Order 数组 (`prompt_order`)

此数组定义了提示词的**实际执行顺序**和**激活状态**。可能有多个配置（针对不同的 `character_id`），通常使用第一个或匹配当前角色ID的配置。

### Order 配置结构

```json
{
    "character_id": 100000,
    "order": [
        {
            "identifier": "main",
            "enabled": true
        },
        {
            "identifier": "jailbreak",
            "enabled": true
        },
        ...
    ]
}
```

*   **解析逻辑**：
    1.  找到对应的 `character_id`（或默认使用第一个）。
    2.  遍历 `order` 数组。
    3.  对于每个项，读取 `identifier`。
    4.  在 `prompts` 数组中找到具有相同 `identifier` 的 Prompt 对象。
    5.  检查 `order` 项中的 `enabled` 字段。如果为 `true`，则将该 Prompt 对象加入到最终发送给 LLM 的上下文构建队列中。
    6.  **顺序很重要**：最终上下文的构建通常严格遵循 `order` 数组的顺序（或者结合 `injection_depth` 进行重排）。

## 4. 解析器开发建议

如果你要写一个解析器，建议流程如下：

1.  **加载 JSON**: 读取文件并解析 JSON 对象。
2.  **提取配置**: 读取根节点的模型参数（`temperature` 等），用于配置 API 请求。
3.  **构建上下文 (Context Builder)**:
    *   创建一个空的上下文列表。
    *   获取 `prompt_order` 中的有效列表。
    *   遍历列表，根据 `identifier` 从 `prompts` 中查找内容。
    *   如果 `enabled` 为 `true`，处理 `content` 文本：
        *   执行正则替换处理 `{{...}}` 语法（如果需要支持动态变量，则需要实现一个简单的模板引擎）。
        *   根据 `role` 构建消息对象 (e.g., `{"role": "system", "content": "..."}`).
    *   根据 `injection_depth` 将消息插入到聊天历史的适当位置。
4.  **处理特殊脚本**: 文件中包含复杂的 `{{setvar}}` 和逻辑控制（如 `<thinking>` 标签），这表明该预设依赖于前端的特定逻辑处理。如果只是静态解析，可以将这些标签视为纯文本；如果要完整复刻功能，需要实现对应的脚本解释逻辑。

## 5. 示例：提取启用的 System Prompts

```javascript
// 伪代码示例
const data = JSON.parse(fileContent);
const activeOrder = data.prompt_order[0].order; // 假设使用第一个配置
const allPrompts = data.prompts;

const contextMessages = activeOrder
  .filter(item => item.enabled)
  .map(item => {
    const promptObj = allPrompts.find(p => p.identifier === item.identifier);
    if (promptObj) {
        return {
            role: promptObj.role,
            content: promptObj.content, // 这里可能需要进行变量替换
            depth: promptObj.injection_depth
        };
    }
    return null;
  })
  .filter(msg => msg !== null);
```
