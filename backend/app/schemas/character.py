# backend/app/schemas/character.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# 基础字段
class CharacterCardBase(BaseModel):
    name: str
    description: Optional[str] = ""
    persona: Optional[str] = ""
    scenario: Optional[str] = ""
    first_mes: Optional[str] = ""
    system_prompt: Optional[str] = ""
    creator_notes: Optional[str] = ""
    tags: List[str] = [] 
    
    # [新增] V2 字段
    alternate_greetings: List[str] = []

    # [新增] 对应 models.py 中的 user_alias
    user_alias: Optional[str] = "" 

    model_config = ConfigDict(populate_by_name=True)

# 创建时需要的字段
class CharacterCardCreate(CharacterCardBase):
    id: str 

# 更新时需要的字段
class CharacterCardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    persona: Optional[str] = None
    scenario: Optional[str] = None
    first_mes: Optional[str] = None
    system_prompt: Optional[str] = None
    creator_notes: Optional[str] = None
    tags: Optional[List[str]] = None
    alternate_greetings: Optional[List[str]] = None
    user_alias: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

# 返回给前端的字段
class CharacterCardResponse(CharacterCardBase):
    id: str
    created_at: Optional[datetime] = None
    
    # 注意：models.py 里 CharacterCard 没有 updated_at，这里如果加上会报错
    # 如果你需要 updated_at，必须先去 models.py 给 CharacterCard 加上该字段
    
    model_config = ConfigDict(from_attributes=True)