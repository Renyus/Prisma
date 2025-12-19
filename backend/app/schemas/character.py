from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel, Field

# --- 1. 基础组件 ---

class RegexScript(BaseModel):
    """正则脚本：酒馆用来修改文本的规则"""
    scriptName: str
    findRegex: str
    replaceString: Optional[str] = ""
    # 允许额外字段 (extra="allow") 确保不丢数据
    class Config:
        extra = "allow"

class CharacterBookEntry(BaseModel):
    """内置世界书条目"""
    keys: List[str]
    content: str
    enabled: bool = True
    insertion_order: int = 100
    case_sensitive: Optional[bool] = None
    
    class Config:
        extra = "allow"

class CharacterBook(BaseModel):
    """世界书集合"""
    entries: List[CharacterBookEntry] = Field(default_factory=list)
    name: Optional[str] = None

# --- 2. 核心数据层 (Data) ---

class DataExtensions(BaseModel):
    """扩展字段：存放正则、深度提示词等"""
    talkativeness: Union[str, float] = "0.5"
    fav: bool = False
    depth_prompt: Optional[Dict[str, Any]] = None
    regex_scripts: List[RegexScript] = Field(default_factory=list)
    
    class Config:
        extra = "allow"

class CardData(BaseModel):
    """V3 数据的核心内容"""
    name: str
    description: str = ""
    personality: str = ""
    scenario: str = ""
    first_mes: str = ""
    mes_example: str = ""
    creator_notes: str = ""
    system_prompt: str = ""
    post_history_instructions: str = ""
    tags: List[str] = Field(default_factory=list)
    creator: str = ""
    character_version: str = ""
    alternate_greetings: List[str] = Field(default_factory=list)
    
    # 关键嵌套
    extensions: DataExtensions = Field(default_factory=DataExtensions)
    character_book: Optional[CharacterBook] = None

    class Config:
        extra = "allow"

# --- 3. 根模型 ---

class TavernCardV3(BaseModel):
    """对应的就是你的 .json 文件最外层"""
    spec: str = "chara_card_v3"
    spec_version: str = "3.0"
    data: CardData # 所有有效数据都在这里
    
    # 根目录的冗余字段 (V2兼容字段)
    name: Optional[str] = None
    description: Optional[str] = None
    
    class Config:
        extra = "allow"