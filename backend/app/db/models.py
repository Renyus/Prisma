# backend/app/db/models.py
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

# === 1. 系统微调 ===
class SystemPromptModule(Base):
    __tablename__ = "system_prompt_modules"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    content = Column(Text, default="")
    position = Column(Integer, default=100)
    is_enabled = Column(Boolean, default=True)

# === 2. 角色卡 ===
class CharacterCard(Base):
    __tablename__ = "character_cards"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    description = Column(Text, default="")
    persona = Column(Text, default="")
    scenario = Column(Text, default="")
    first_mes = Column(Text, default="")
    system_prompt = Column(Text, default="")
    creator_notes = Column(Text, default="")
    tags = Column(JSON, default=list)
    alternate_greetings = Column(JSON, default=list) # [新增]
    user_alias = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    source_filename = Column(String, nullable=True)
    messages = relationship("ChatMessage", back_populates="character", cascade="all, delete-orphan")

# === 3. 聊天记录 ===
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, index=True, default="local-user")
    character_id = Column(String, ForeignKey("character_cards.id"), nullable=True)
    role = Column(String)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    character = relationship("CharacterCard", back_populates="messages")

# === 4. 记忆 (Memory) ===
class Memory(Base):
    __tablename__ = "memories"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, index=True)
    content = Column(Text)
    importance = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# === 5. 世界书 (Lorebook) ===
class Lorebook(Base):
    __tablename__ = "lorebooks"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, index=True)
    name = Column(String, default="New Lorebook")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True) # 对应前端 enabled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # [关键] 统一名为 LorebookEntry，关系名为 entries
    entries = relationship("LorebookEntry", back_populates="book", cascade="all, delete-orphan")

# === 6. 世界书条目 (LorebookEntry) ===
class LorebookEntry(Base):
    __tablename__ = "lorebook_entries"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    lorebook_id = Column(String, ForeignKey("lorebooks.id"), index=True)
    
    # 核心字段
    keys = Column(Text) # 存为逗号分隔字符串 "key1,key2"
    content = Column(Text, default="")
    comment = Column(Text, default="")
    enabled = Column(Boolean, default=True)
    
    # 高级参数
    priority = Column(Integer, default=10)
    order = Column(Integer, default=100)
    probability = Column(Integer, default=100)
    
    # 匹配规则
    use_regex = Column(Boolean, default=False)
    case_sensitive = Column(Boolean, default=False)
    match_whole_word = Column(Boolean, default=False)
    exclude = Column(Boolean, default=False)
    constant = Column(Boolean, default=False)
    contextual = Column(Boolean, default=True)
    authors_note = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 反向关联
    book = relationship("Lorebook", back_populates="entries")
