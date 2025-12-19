import re
from typing import List, Dict, Any, Optional
from app.schemas.character import TavernCardV3
from app.schemas.preset import SillyTavernPreset
from app.schemas.lorebook import LorebookV3

class ContextAssembler:
    def __init__(
        self, 
        card: TavernCardV3, 
        preset: SillyTavernPreset, 
        history: List[Dict[str, str]], 
        user_name: str = "User",
        lorebook: Optional[LorebookV3] = None
    ):
        self.card = card
        self.preset = preset
        self.history = history
        self.user_name = user_name
        self.lorebook = lorebook
        
        # 提取角色名 (优先用 data.name)
        self.char_name = card.data.name or card.name or "Assistant"

    def _replace_macros(self, text: str) -> str:
        """宏替换：把 {{char}} 变成角色名"""
        if not text:
            return ""
        # 简单替换，以后可以加更多
        text = text.replace("{{char}}", self.char_name)
        text = text.replace("{{user}}", self.user_name)
        return text
    def _get_prompt_content(self, identifier: str, preset_content: str) -> str:
        """根据 ID 决定是用预设里的词，还是去角色卡里找"""
        
        # 1. 角色描述
        if identifier == "charDescription":
            return self.card.data.description
            
        # 2. 角色性格
        elif identifier == "charPersonality":
            return self.card.data.personality
            
        # 3. 场景设定
        elif identifier == "scenario":
            return self.card.data.scenario
            
        # 4. 对话示例
        elif identifier == "dialogueExamples":
            return self.card.data.mes_example
            
        # 5. 世界书 (简化版：暂时只拼在一起)
        elif identifier in ["worldInfoBefore", "worldInfoAfter"]:
            # 这里以后可以接真正的世界书扫描逻辑
            return "" 
            
        # 6. 其他情况（Main, Jailbreak, NSFW 等）
        # 直接使用预设里写好的内容
        return preset_content
    def assemble(self) -> List[Dict[str, str]]:
        """主入口：生成最终的消息列表"""
        final_messages = []
        
        # --- A. 处理系统指令 (System Prompts) ---
        # 1. 获取排序列表 (默认取第一个顺序配置)
        if self.preset.prompt_order:
            order_list = self.preset.prompt_order[0].order
        else:
            # 如果没配置顺序，就按 prompts 列表原本的顺序
            order_list = [{"identifier": p.identifier, "enabled": p.enabled} for p in self.preset.prompts]

        # 2. 建立查询字典，方便按 ID 找内容
        prompt_map = {p.identifier: p for p in self.preset.prompts}

        # 3. 按顺序组装
        for item in order_list:
            # 如果禁用了就不拼
            if not item.enabled: # 注意：Pydantic 模型里访问属性用 . 而不是 ['']
                continue
                
            pid = item.identifier
            if pid not in prompt_map:
                continue
                
            p_def = prompt_map[pid]
            if not p_def.enabled:
                continue

            # 特殊处理：Chat History 不在这里拼，它是分界线
            if pid == "chatHistory":
                continue

            # 获取真实内容
            raw_content = self._get_prompt_content(pid, p_def.content)
            
            # 如果内容不为空，就处理宏并加入
            if raw_content and raw_content.strip():
                final_content = self._replace_macros(raw_content)
                final_messages.append({
                    "role": p_def.role, # 通常是 "system"
                    "content": final_content
                })

        # --- B. 处理聊天记录 (Chat History) ---
        # 把前端传来的历史记录加进去
        for msg in self.history:
            final_messages.append({
                "role": msg["role"],
                "content": self._replace_macros(msg["content"])
            })

        return final_messages