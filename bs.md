# Backend Codebase Summary

## File: backend/requirements.txt

```python
fastapi
uvicorn[standard]
sqlalchemy
pydantic
python-dotenv
httpx
chromadb
python-multipart
```

## File: backend/app/main.py

```python
from fastapi import FastAPI
from app.core.database import Base, engine

# 引入刚才写的三个路由文件
from app.api.endpoints import character, preset, lorebook, chat

# 1. 初始化数据库表
#这一步会检查 models 定义，如果数据库里没表，它会自动创建
Base.metadata.create_all(bind=engine)

# 2. 创建 APP 实例
app = FastAPI(title="SillyTavern Python Backend")

# 3. 注册路由
# prefix 意思是：访问这个模块的网址都要加上 /api/xxx
app.include_router(character.router, prefix="/api/character", tags=["Character"])
app.include_router(preset.router, prefix="/api/preset", tags=["Presets"])
app.include_router(lorebook.router, prefix="/api/lorebook", tags=["Lorebook"])
# 2. 新增注册 chat 路由
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
@app.get("/")
def root():
    return {"message": "System Operational. Welcome home, traveler."}
```

## File: backend/app/__init__.py

```python

```

## File: backend/app/api/__init__.py

```python

```

## File: backend/app/api/endpoints/character.py

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.character import service
from app.schemas.character import TavernCardV3

router = APIRouter()

@router.post("/upload", summary="上传角色卡")
def upload_character(card: TavernCardV3, db: Session = Depends(get_db)):
    # card 参数会自动把前端传来的 JSON 校验并转成对象
    # 我们把它转回 dict 传给 service
    return service.create_character(db, card.model_dump())

@router.get("/{char_id}", summary="获取角色卡")
def read_character(char_id: int, db: Session = Depends(get_db)):
    db_char = service.get_character(db, char_id)
    if db_char is None:
        raise HTTPException(status_code=404, detail="Character not found")
    # 注意：这里直接返回数据库对象，FastAPI 会自动把它转成 JSON
    return db_char
```

## File: backend/app/api/endpoints/chat.py

```python
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.prompt_engine import ContextAssembler

# 引入之前的搬运工，方便取数据
from app.modules.character import service as char_service
from app.modules.preset import service as preset_service
# 如果以后有世界书，也可以引入 lorebook_service

router = APIRouter()

# --- 定义请求体模型 ---
# 前端发请求时，必须带上这些信息
class ChatRequest(BaseModel):
    char_id: int
    preset_id: int
    # 聊天记录格式：[{"role": "user", "content": "你好"}, ...]
    messages: List[Dict[str, str]] = []
    user_name: str = "User"
    
    # 世界书ID (可选)
    lorebook_id: Optional[int] = None

# --- 调试接口：只拼装，不发给 AI ---
@router.post("/debug/assemble", summary="[调试] 预览拼装后的 Prompt")
def debug_assemble_prompt(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    这个接口用于测试 ContextAssembler 是否工作正常。
    它会返回最终发给 LLM 的 messages 列表。
    """
    # 1. 取出角色卡
    char = char_service.get_character(db, payload.char_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    # 2. 取出预设
    preset = preset_service.get_preset(db, payload.preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    # 3. 初始化拼装引擎
    assembler = ContextAssembler(
        card=char,
        preset=preset,
        history=payload.messages,
        user_name=payload.user_name
        # lorebook=... 以后再加
    )

    # 4. 执行拼装
    try:
        final_messages = assembler.assemble()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assembly failed: {str(e)}")

    # 5. 返回结果
    return {
        "info": "Assembly Success",
        "total_messages": len(final_messages),
        "prompt": final_messages  # 这里就是最终产物！
    }
```

## File: backend/app/api/endpoints/lorebook.py

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.lorebook import service
from app.schemas.lorebook import LorebookV3

router = APIRouter()

@router.post("/", summary="上传世界书")
def create_lorebook(lb: LorebookV3, db: Session = Depends(get_db)):
    return service.create_lorebook(db, lb.model_dump())

@router.get("/{lb_id}", summary="获取世界书")
def read_lorebook(lb_id: int, db: Session = Depends(get_db)):
    db_lb = service.get_lorebook(db, lb_id)
    if db_lb is None:
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return db_lb
```

## File: backend/app/api/endpoints/preset.py

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.preset import service
from app.schemas.preset import SillyTavernPreset

router = APIRouter()

@router.post("/upload", summary="创建预设")
def create_preset(preset: SillyTavernPreset, db: Session = Depends(get_db)):
    return service.create_preset(db, preset.model_dump())

@router.get("/{preset_id}", summary="获取预设")
def read_preset(preset_id: int, db: Session = Depends(get_db)):
    db_preset = service.get_preset(db, preset_id)
    if db_preset is None:
        raise HTTPException(status_code=404, detail="Preset not found")
    return db_preset
```

## File: backend/app/api/endpoints/__init__.py

```python

```

## File: backend/app/core/database.py

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. 定义数据库地址
# 这里我们使用本地的 sqlite 文件，它会自动在项目根目录生成一个 test.db
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# 2. 创建引擎 (Engine)
# check_same_thread=False 是 SQLite 专门需要的配置
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. 创建会话工厂 (SessionLocal)
# 以后我们在代码里要操作数据库，就通过这个 SessionLocal 领号
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. 创建基类 (Base)
# 所有的数据库模型都要继承这个 Base，这样 SQLAlchemy 才知道它们是表
Base = declarative_base()

# 5. 依赖项 (Dependency)
# 这是一个工具函数，给 FastAPI 的接口用的。
# 它的作用是：请求来了就开门（打开数据库连接），请求处理完了就关门。
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## File: backend/app/core/prompt_engine.py

```python
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
```

## File: backend/app/core/__init__.py

```python

```

## File: backend/app/modules/__init__.py

```python

```

## File: backend/app/modules/character/models.py

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.core.database import Base

class CharacterModel(Base):
    # 表名
    __tablename__ = 'characters'

    # 主键 ID
    id = Column(Integer, primary_key=True, index=True)
    
    # 索引字段 (方便搜索)
    name = Column(String, index=True, comment="角色名称")
    creator = Column(String, index=True, nullable=True, comment="作者")
    
    # 核心数据 (存刚才那个复杂的 JSON)
    # 注意：在 SQLite 中 JSON 类型会自动变通存储，PostgreSQL 则有原生支持
    data = Column(JSON, nullable=False, comment="完整角色卡数据")
    
    # 头像路径 (之后做图片上传用)
    avatar_path = Column(String, nullable=True)

    # 时间戳
    create_date = Column(DateTime, default=datetime.now)
    update_date = Column(DateTime, default=datetime.now, onupdate=datetime.now)
```

## File: backend/app/modules/character/service.py

```python
from sqlalchemy.orm import Session
from app.modules.character.models import CharacterModel
from app.schemas.character import TavernCardV3

def create_character(db: Session, raw_json: dict):
    # 1. 用模具检查数据 (如果不合格会自动报错)
    card = TavernCardV3(**raw_json)
    
    # 2. 提取要写在索引卡上的信息 (名字、作者)
    # 注意：V3 标准里名字通常在 data.name
    char_name = card.data.name
    char_creator = card.data.creator
    
    # 3. 打包入库
    db_obj = CharacterModel(
        name=char_name,
        creator=char_creator,
        data=raw_json,  # 原样存入完整 JSON
        # avatar_path 暂时留空，以后做图片上传再填
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj) # 刷新一下，拿回数据库生成的 ID
    return db_obj

def get_character(db: Session, char_id: int):
    # 去仓库找 ID 对应的货
    return db.query(CharacterModel).filter(CharacterModel.id == char_id).first()
```

## File: backend/app/modules/character/__init__.py

```python

```

## File: backend/app/modules/lorebook/models.py

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.core.database import Base

class LorebookModel(Base):
    __tablename__ = 'lorebooks'

    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String, index=True)
    
    # 完整世界书 JSON (包含 entries)
    data = Column(JSON, nullable=False)
    
    create_date = Column(DateTime, default=datetime.now)
```

## File: backend/app/modules/lorebook/service.py

```python
from sqlalchemy.orm import Session
from app.modules.lorebook.models import LorebookModel
from app.schemas.lorebook import LorebookV3

def create_lorebook(db: Session, raw_json: dict):
    # 1. 检查
    lb = LorebookV3(**raw_json)
    
    # 2. 入库
    db_obj = LorebookModel(
        name=lb.name or "Untitled Lorebook",
        data=raw_json
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_lorebook(db: Session, lb_id: int):
    return db.query(LorebookModel).filter(LorebookModel.id == lb_id).first()
```

## File: backend/app/modules/lorebook/__init__.py

```python

```

## File: backend/app/modules/preset/models.py

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.core.database import Base

class PresetModel(Base):
    __tablename__ = 'presets'

    id = Column(Integer, primary_key=True, index=True)
    
    # 预设名称 (通常由 API 源 + 模型名组成)
    name = Column(String, index=True, nullable=True)
    
    # API 来源 (如 openai, claude, deepseek)
    # 方便前端筛选 "只显示 Deepseek 的预设"
    source = Column(String, index=True)
    
    # 完整配置 JSON
    data = Column(JSON, nullable=False)
    
    create_date = Column(DateTime, default=datetime.now)
```

## File: backend/app/modules/preset/service.py

```python
from sqlalchemy.orm import Session
from app.modules.preset.models import PresetModel
from app.schemas.preset import SillyTavernPreset

def create_preset(db: Session, raw_json: dict):
    # 1. 检查数据
    preset = SillyTavernPreset(**raw_json)
    
    # 2. 提取来源 (比如 "openai", "claude")
    source_type = preset.chat_completion_source
    
    # 3. 尝试给它起个名 (预设文件里通常没有标准 name 字段，我们拼凑一下)
    # 优先找 openrouter_model, 没有就找 openai_model...
    model_name = (
        preset.openrouter_model or 
        preset.openai_model or 
        preset.claude_model or 
        "Unknown Model"
    )
    display_name = f"{source_type} - {model_name}"

    # 4. 入库
    db_obj = PresetModel(
        name=display_name,
        source=source_type,
        data=raw_json
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_preset(db: Session, preset_id: int):
    return db.query(PresetModel).filter(PresetModel.id == preset_id).first()
```

## File: backend/app/modules/preset/__init__.py

```python

```

## File: backend/app/schemas/character.py

```python
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
```

## File: backend/app/schemas/lorebook.py

```python
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
```

## File: backend/app/schemas/preset.py

```python
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
```

## File: backend/app/schemas/__init__.py

```python

```

