from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class MessageExport(BaseModel):
    """
    单条消息在导出文件中的结构
    """
    # ChatMessage.id 是 uuid4().hex -> str
    id: Optional[str] = None
    role: str
    content: str
    created_at: Optional[datetime] = None
    meta: Dict[str, Any] = {}


class SessionMeta(BaseModel):
    """
    会话的一些配置元信息，比如模型、温度等
    （这里先保留扩展位，不强制使用）
    """
    character_id: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    extra: Dict[str, Any] = {}


class SessionExport(BaseModel):
    """
    会话层信息

    👉 关键：这里只存角色 / 世界书的 id + name，不导出设定正文
    """
    session_id: Optional[str] = None
    title: Optional[str] = None
    created_at: Optional[datetime] = None

    # 轻量信息：角色 & 世界书
    character_id: Optional[str] = None
    character_name: Optional[str] = None
    lorebook_id: Optional[str] = None
    lorebook_name: Optional[str] = None

    meta: SessionMeta = SessionMeta()


class CharacterCardExport(BaseModel):
    """
    如果以后你想导出完整角色卡，可以放这里。
    目前我们不填这个字段（保持为 None）。
    """
    id: Optional[str] = None
    name: Optional[str] = None
    raw_card: Optional[str] = None


class LorebookHitExport(BaseModel):
    """
    世界书触发记录（现在可以先不用写入）
    """
    keyword: str
    entry_id: Optional[str] = None
    content: str
    position: Optional[str] = None  # e.g. "beforeChar", "afterUser"


class ChatExportPayload(BaseModel):
    """
    整个导出文件的顶层结构
    """
    version: int = 1
    exported_at: datetime
    app: Dict[str, Any]
    session: SessionExport
    messages: List[MessageExport]
    character_card: Optional[CharacterCardExport] = None
    lorebook_hits: List[LorebookHitExport] = []


class ChatImportPayload(ChatExportPayload):
    """
    导入时沿用同一个结构，方便做版本兼容处理。
    未来如果升级 version，可以在这里做转换。
    """
    pass
