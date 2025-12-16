# ⟡ Prisma

![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10+-yellow)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)

> **LLM 类酒馆角色扮演聊天软件** > An LLM-based Tavern RPG Chat Application.

---

## 🛠️ 技术栈 (Tech Stack)

### 🎨 前端 (Frontend)
-   **Framework**: [Next.js 14](https://nextjs.org/) + React 18
-   **UI/Animation**: Framer Motion, Lucide React
-   **Utilities**: Nanoid, Pako

### ⚙️ 后端 (Backend)
-   **Core**: [FastAPI](https://fastapi.tiangolo.com/) (High-performance web framework)
-   **Database**: SQLAlchemy (ORM), ChromaDB (Vector Database for RAG)
-   **Server**: Uvicorn
-   **Validation**: Pydantic

---

## 🚀 快速开始 (Quick Start)

### 1. 后端环境配置 (Backend Setup)

请确保安装了 Python 3.10+。在项目根目录下：

```bash
# 创建虚拟环境
python -m venv .venv

# 激活环境 (Windows)
.\.venv\Scripts\activate
# 激活环境 (macOS/Linux)
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
2. 前端环境配置 (Frontend Setup)
进入前端目录（假设为 frontend）并安装依赖：

Bash

cd frontend
npm install
3. 启动应用 (Run Application)
方案 A：使用一键脚本 (推荐)
如果你配置好了脚本，可以直接运行：

Windows: 双击 start.bat

macOS/Linux: 运行 ./start.sh

方案 B：手动启动 (开发模式)
你需要打开两个终端窗口分别运行：

Bash

# 终端 1 (后端)
uvicorn main:app --reload

# 终端 2 (前端)
cd frontend
npm run dev
📄 开源协议 (License)
本项目遵循 AGPL-3.0 开源协议。