from typing import List, Optional, Any
from pydantic import BaseModel, Field
import uuid

class LorebookEntry(BaseModel):
    """
    代表 Lorebook 中的单个词条 (Entry)
    """
    # 唯一标识符，如果没有提供则自动生成
    uid: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # 触发关键词，通常是一个字符串列表
    # 注意：有些旧格式可能只有 'key' 字段，这里我们兼容 'keys'
    keys: List[str] = Field(default_factory=list, description="触发该词条的关键词列表")
    
    # 核心内容
    content: str = Field(..., description="被触发时插入到 Prompt 中的内容")
    
    # 词条名称（仅作为标识，不影响逻辑）
    name: Optional[str] = Field(None, description="词条的名称")
    
    # 是否启用
    enabled: bool = Field(True, description="该词条是否启用")
    
    # 触发逻辑设置
    case_sensitive: bool = Field(False, description="关键词是否区分大小写")
    
    # 插入位置设置
    insertion_order: int = Field(100, description="插入顺序/优先级，数值越高通常越靠后")
    
    # 扩展字段：有些格式包含 constant, position 等
    constant: bool = Field(False, description="是否常驻（总是插入）")
    position: str = Field("before_char", description="插入位置: before_char, after_char 等")
    
    # 辅助/可选字段 (根据你的 JSON 实际情况增减)
    secondary_keys: List[str] = Field(default_factory=list, description="次要关键词")
    comment: Optional[str] = None
    
    class Config:
        # 允许通过字段名赋值 (Schema.content) 也可以通过别名赋值 (json['content'])
        populate_by_name = True
        # 如果 JSON 里有多余字段，忽略它们而不是报错
        extra = "ignore" 

class Lorebook(BaseModel):
    """
    代表整个 Lorebook 文件 (World Info)
    """
    # 书名
    name: str = Field(..., description="世界书名称")
    
    # 描述
    description: Optional[str] = None
    
    # 版本号 (可选)
    scan_depth: Optional[int] = Field(None, description="扫描深度")
    
    # 条目列表
    # 注意：前端 JSON 的字段名可能是 'entries' 也可能是 dict 形式
    # 这里假设是一个列表
    entries: List[LorebookEntry] = Field(default_factory=list, description="所有的词条列表")

    # 扩展字段：有些格式会在顶层放 settings
    extensions: dict = Field(default_factory=dict, description="其他扩展数据")

    class Config:
        populate_by_name = True
        extra = "ignore"