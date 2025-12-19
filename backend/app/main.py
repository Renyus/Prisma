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