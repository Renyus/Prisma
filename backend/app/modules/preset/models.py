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