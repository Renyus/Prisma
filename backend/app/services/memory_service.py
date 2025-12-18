import logging
import json
import re
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.llm import call_llm
from app.crud import memory as memory_crud
from app.schemas.memory import MemoryCreate
from app.db.session import SessionLocal
from app.core.vector_store import vector_store

logger = logging.getLogger(__name__)

# [FIXED] 增加了强力隔离符和负面约束，防止模型提取示例内容
MEMORY_SYSTEM_PROMPT_TEMPLATE = """你是一个专业的"对话事实提取员"。
你的任务是阅读一段【当前对话】，从中提取出具有长期价值的关键事实。

【提取与合并规则】
1. **合并同类项**：关于同一主体的相关事实（技能、外貌、装备）必须合并成语义完整的长句。
2. **过滤无意义短语**：严禁提取"带上这个"、"好的"等无上下文短语。
3. **明确主体**：主体只能是"用户"或"{char_name}"。

【关键：指代消解规则】
- 用户说的"我" -> 用户
- 用户说的"你" -> {char_name}
- {char_name}说的"我" -> {char_name}
- {char_name}说的"你" -> 用户

# ================= 示例区域 (仅供参考，不要提取这里的内容) =================
【Few-Shot 示例 1】
输入:
User: 我喜欢吃辣的。
{char_name}: 给，这是你的川菜。
输出: {{"facts": [{{"subject": "用户", "content": "用户喜欢吃辣的食物"}}]}}

【Few-Shot 示例 2】
输入:
User: 你会用剑吗？
{char_name}: 我是剑术大师，这把剑是陨铁打造的。
输出: {{"facts": [{{"subject": "{char_name}", "content": "{char_name}是一名剑术大师，拥有一把陨铁打造的剑"}}]}}
# ================= 示例结束 =================

【严禁事项】
1. **绝对不要**提取上述"示例区域"中的任何信息！
2. **只分析**下方提供的【当前对话】。
3. 输出必须是纯 JSON。
"""

async def analyze_chat_for_memory(
    user_id: str, 
    user_content: str, 
    ai_content: str,
    character_name: str = "角色" 
):
    """
    后台任务：分析对话并提取记忆。
    """
    # 如果内容包含摘要标签，直接跳过，不作为长期记忆提取来源
    if "【历史摘要】" in user_content or "【历史摘要】" in ai_content:
        return
    
    # 长度过滤
    if len(user_content) < 3 and len(ai_content) < 5:
        return

    logger.info(f"[{user_id}] 开始 Memory Observer 分析 (角色: {character_name})...")
    
    system_prompt = MEMORY_SYSTEM_PROMPT_TEMPLATE.format(char_name=character_name)
    
    # [FIXED] 给用户输入加上明确的标签，与 Prompt 隔离
    user_input_formatted = (
        f"【当前待分析对话】\n"
        f"User: {user_content}\n"
        f"{character_name}: {ai_content}"
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input_formatted}
    ]

    try:
        # 调用 LLM 并提取 content 部分
        llm_result = await call_llm(
            model=settings.UTILITY_MODEL, 
            messages=messages,
            temperature=0.1
        )
        
        # 提取 content 部分（兼容新的字典格式）
        response_text = llm_result["content"] if isinstance(llm_result, dict) else llm_result
        
        # logger.info(f"🔍 [LLM原始思考] ...") # 调试完可以注释掉减少日志
        
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        
        # 增强：使用正则提取第一个有效的 JSON 对象或数组
        json_match = re.search(r'(\{.*\}|\[.*\])', clean_text, re.DOTALL)
        if json_match:
            clean_text = json_match.group(0)

        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError as e:
            logger.warning(f"[{user_id}] ⚠️ JSON解析失败: {e.msg} | Content: {clean_text[:100]}...")
            return
        
        extracted_facts_raw = data.get("facts", []) if isinstance(data, dict) else []
        if isinstance(data, list): extracted_facts_raw = data 
        
        facts = []
        for item in extracted_facts_raw:
            if isinstance(item, dict) and "content" in item:
                content = str(item["content"]).strip()
                if len(content) >= 5: 
                    facts.append(content)
            elif isinstance(item, str):
                if len(item.strip()) >= 5:
                    facts.append(item.strip())
        
        if not facts:
            # logger.info(...)
            return

        db = SessionLocal()
        try:
            for fact in facts:
                # 语义去重
                is_duplicate = await vector_store.exist_similar(fact, user_id, threshold=0.25)
                
                if is_duplicate:
                    logger.info(f"♻️ [去重] 跳过已存在的记忆: {fact}")
                    continue 

                await memory_crud.create_memory(db, MemoryCreate(
                    user_id=user_id,
                    content=fact,
                    importance=3 
                ))
                logger.info(f"[{user_id}] 🧠 记住了: {fact}")
        finally:
            db.close()

    except Exception as e:
        logger.error(f"❌ Memory Observer 运行崩溃: {e}")
