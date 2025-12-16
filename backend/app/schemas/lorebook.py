# backend/app/schemas/lorebook.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- LoreItem Schemas ---

class LoreItemBase(BaseModel):
    keys: List[str] 
    content: str
    comment: Optional[str] = ""
    enabled: Optional[bool] = True
    priority: Optional[int] = 10
    order: Optional[int] = 0
    probability: Optional[int] = 100
    
    use_regex: Optional[bool] = Field(False, alias="useRegex")
    case_sensitive: Optional[bool] = Field(False, alias="caseSensitive")
    match_whole_word: Optional[bool] = Field(False, alias="matchWholeWord")
    exclude: Optional[bool] = False
    constant: Optional[bool] = False
    contextual: Optional[bool] = False
    authors_note: Optional[bool] = Field(False, alias="authorsNote")

    model_config = ConfigDict(populate_by_name=True)

class LoreItemCreate(LoreItemBase):
    id: str
    lorebook_id: str

class LoreItemUpdate(BaseModel):
    keys: Optional[List[str]] = None
    content: Optional[str] = None
    comment: Optional[str] = None
    enabled: Optional[bool] = None
    priority: Optional[int] = None
    order: Optional[int] = None
    probability: Optional[int] = None
    
    use_regex: Optional[bool] = Field(None, alias="useRegex")
    case_sensitive: Optional[bool] = Field(None, alias="caseSensitive")
    match_whole_word: Optional[bool] = Field(None, alias="matchWholeWord")
    exclude: Optional[bool] = None
    constant: Optional[bool] = None
    contextual: Optional[bool] = None
    authors_note: Optional[bool] = Field(None, alias="authorsNote")
    
    model_config = ConfigDict(populate_by_name=True)

class LoreItemResponse(LoreItemBase):
    id: str
    lorebook_id: str
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Lorebook Schemas ---

class LorebookBase(BaseModel):
    name: str
    description: Optional[str] = ""
    is_active: Optional[bool] = Field(True, alias="enabled")
    
    model_config = ConfigDict(populate_by_name=True)

class LorebookCreate(LorebookBase):
    id: str
    user_id: str

class LorebookUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="enabled")
    
    model_config = ConfigDict(populate_by_name=True)

class LorebookResponse(LorebookBase):
    id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # [关键] 属性名改为 entries，匹配 models.py 中的 relationship
    entries: List[LoreItemResponse] = [] 

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)