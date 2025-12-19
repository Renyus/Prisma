from typing import List, Optional, Union, Any
from pydantic import BaseModel, Field

class PromptDefinition(BaseModel):
    """单个 Prompt 块"""
    identifier: str = Field(..., description="唯一标识符，如 main, jailbreak")
    content: str = Field("", description="Prompt 内容")
    role: str = Field("system", description="system, user, assistant")
    enabled: bool = True
    injection_position: int = 0
    injection_depth: int = 0
    
    class Config:
        extra = "allow"

class SillyTavernPreset(BaseModel):
    """酒馆预设根模型"""
    # 核心生成参数
    temperature: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    top_p: float = 1.0
    top_k: int = 0
    
    # API 来源标识
    chat_completion_source: str = "openai"
    openai_model: Optional[str] = ""
    claude_model: Optional[str] = ""
    
    # Prompt 列表 (这是最重要的部分)
    prompts: List[PromptDefinition] = Field(default_factory=list)
    
    # 允许所有额外字段 (OpenRouter配置、UI设置等)
    class Config:
        extra = "allow"