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