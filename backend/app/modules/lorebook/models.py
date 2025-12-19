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