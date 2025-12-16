def to_openai_payload(norm: dict, model: str):
    """迁移并精简 llmPayload.ts 的 OpenAI payload 构造"""
    return {
        "model": model,
        "messages": [
            {"role": "system", "content": norm["systemPrompt"]},
            *norm["messages"]
        ],
    }
