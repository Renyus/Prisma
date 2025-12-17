# backend/app/core/config.py
import os
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

# 确保加载正确的 .env 文件
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)

class Settings:
    PROJECT_NAME: str = "SAKURARPG Backend"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sakura.db")

    # --- 全局基底 ---
    GLOBAL_LLM_KEY: str = os.getenv("GLOBAL_LLM_KEY", "")
    GLOBAL_LLM_URL: str = os.getenv("GLOBAL_LLM_URL", "https://api.siliconflow.cn/v1")

    # --- 辅助函数：获取最终的 Key/URL ---
    def _get_credential(self, specific_key: str, specific_url: str) -> tuple[str, str]:
        final_key = os.getenv(specific_key) or self.GLOBAL_LLM_KEY
        final_url = os.getenv(specific_url) or self.GLOBAL_LLM_URL
        return final_key, final_url

    # --- 1. Chat Module ---
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "deepseek-ai/DeepSeek-V3")
    
    # [新增] 模型参数注册表
    # 格式: { "模型ID": { "context_window": 总窗口, "max_output": 最大回复, "safety_buffer": 安全余量 } }
    MODEL_LIMITS: Dict[str, Dict[str, int]] = {
        # DeepSeek 系列 (硅基流动通常支持 64k)
        "deepseek-ai/DeepSeek-V3":      {"context_window": 64000, "max_output": 8192, "safety_buffer": 1000},
        "deepseek-ai/DeepSeek-R1":      {"context_window": 32000, "max_output": 4096, "safety_buffer": 500},
        
        # Qwen 系列
        "Pro/Qwen/Qwen2-7B-Instruct":   {"context_window": 32000, "max_output": 4096, "safety_buffer": 500},
        "Qwen/Qwen2.5-72B-Instruct":    {"context_window": 32768, "max_output": 8192, "safety_buffer": 800},
        
        # OpenAI & Compatible
        "gpt-4o":                       {"context_window": 128000, "max_output": 4096, "safety_buffer": 1000},
        "gpt-3.5-turbo":                {"context_window": 16385,  "max_output": 4096, "safety_buffer": 300},
        
        # Claude
        "claude-3-5-sonnet-20240620":   {"context_window": 200000, "max_output": 8192, "safety_buffer": 1000},
    }

    # [新增] 动态获取限制的方法 (chat_service 需要调用这个)
    def get_model_limit(self, model_name: str) -> Dict[str, int]:
        """
        根据模型名称获取限制参数。如果不匹配，返回 .env 中的默认配置。
        """
        # 1. 尝试完全匹配
        if model_name in self.MODEL_LIMITS:
            return self.MODEL_LIMITS[model_name]
        
        # 2. 尝试部分匹配 (例如 model_name 包含 "gpt-4")
        for key, limits in self.MODEL_LIMITS.items():
            if key in model_name:
                return limits

        # 3. 回退默认值 (.env 配置)
        default_ctx = int(os.getenv("MAX_MODEL_CONTEXT_LENGTH", "16384"))
        return {
            "context_window": default_ctx,
            "max_output": 4096, # 默认预留
            "safety_buffer": 500
        }

    @property
    def CHAT_CREDENTIALS(self):
        return self._get_credential("CHAT_API_KEY", "CHAT_API_URL")

    # --- 2. Utility Module (Summary & Memory) ---
    UTILITY_MODEL: str = os.getenv("UTILITY_MODEL", "Pro/Qwen/Qwen2-7B-Instruct")
    SUMMARY_HISTORY_THRESHOLD: int = int(os.getenv("SUMMARY_HISTORY_THRESHOLD", "0"))
    
    @property
    def UTILITY_CREDENTIALS(self):
        return self._get_credential("UTILITY_API_KEY", "UTILITY_API_URL")

    # --- 3. RAG Module ---
    RAG_EMBEDDING_MODEL: str = os.getenv("RAG_EMBEDDING_MODEL", "Pro/BAAI/bge-m3")
    RAG_VECTOR_DB_PATH: str = os.getenv("RAG_VECTOR_DB_PATH", "./chroma_db")
    
    @property
    def RAG_CREDENTIALS(self):
        key = os.getenv("RAG_API_KEY") or self.GLOBAL_LLM_KEY
        url = os.getenv("RAG_API_URL") or self.GLOBAL_LLM_URL
        return key, url

settings = Settings()
