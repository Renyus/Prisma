# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import chat, memory, lorebook, models_api
from app.api.endpoints import prompt_debug
from app.api.endpoints import prompts
from app.api.endpoints import character
from app.db.session import SessionLocal
from app.db.init_db import init_db
from app.db.models import Base
from app.db.session import engine
from app.core.config import settings
import logging

logger = logging.getLogger("uvicorn")

def create_app():
    app = FastAPI(title="SAKURARPG Backend")
    
    @app.on_event("startup")
    async def startup_event():
        logger.info(f"[Startup Config Check] CHAT_MODEL: '{settings.CHAT_MODEL}'")
        db = SessionLocal()
        init_db(db)
        db.close()

    # 🔥 [修复] 允许所有来源，解决 CORS 问题
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 创建数据库表
    Base.metadata.create_all(bind=engine)

    # 注册路由
    app.include_router(chat.router, prefix="/api")
    app.include_router(memory.router, prefix="/api")
    # 注意：lorebook 内部通常定义了 prefix="/lore"，这里就不加 prefix 或者根据你的 lorebook.py 调整
    # 假设 lorebook.py 里写了 @router.get("/books")，这里建议统一前缀
    app.include_router(lorebook.router, prefix="/api/lore", tags=["Lorebook"]) 
    app.include_router(models_api.router, prefix="/api")
    app.include_router(character.router, prefix="/api/cards", tags=["Character Cards"])
    app.include_router(prompt_debug.router)
    app.include_router(prompts.router, prefix="/api/prompts", tags=["System Prompts"])
    
    return app

app = create_app()