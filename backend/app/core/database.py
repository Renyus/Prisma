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