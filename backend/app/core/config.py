# backend/app/core/config.py
import os
import sys
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# 确保加载正确的 .env 文件
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)

def get_env_int(key: str, default: int) -> int:
    """
    安全地获取环境变量并转换为整数
    如果转换失败或值为空，返回默认值
    """
    try:
        value = os.getenv(key, "").strip()
        if not value:
            return default
        return int(value)
    except (ValueError, TypeError):
        print(f"Warning: Invalid integer value for {key}, using default {default}")
        return default

def get_env_path(key: str, default_path: str) -> str:
    """
    安全地获取环境变量路径
    如果环境变量为空或无效，返回默认路径
    """
    try:
        value = os.getenv(key, "").strip()
        if not value:
            return default_path
        
        # 确保路径是绝对路径
        path = Path(value)
        if not path.is_absolute():
            path = BASE_DIR / path
            path = path.resolve()
        
        return str(path)
    except (ValueError, TypeError, OSError):
        print(f"Warning: Invalid path value for {key}, using default {default_path}")
        return default_path

def get_env_url(key: str, default_url: str) -> str:
    """
    安全地获取环境变量URL
    确保URL格式正确，处理末尾斜杠问题
    """
    try:
        value = os.getenv(key, "").strip()
        if not value:
            return default_url
        
        # 确保URL格式正确
        if not value.startswith(('http://', 'https://')):
            value = 'https://' + value
        
        # 移除末尾的多余斜杠，避免请求拼接时出现 //
        value = value.rstrip('/')
        
        return value
    except (ValueError, TypeError):
        print(f"Warning: Invalid URL value for {key}, using default {default_url}")
        return default_url

def get_base_data_path():
    """
    获取数据文件的基础路径
    - 开发环境：使用项目根目录
    - 打包环境：使用用户AppData目录
    """
    # 如果是 PyInstaller 打包后的环境
    if hasattr(sys, '_MEIPASS'):
        # 数据库等持久化文件建议放在用户目录下
        path = Path(os.getenv('LOCALAPPDATA', './')) / "PrismaApp"
    else:
        # 开发环境直接用项目根目录
        path = BASE_DIR
    path.mkdir(parents=True, exist_ok=True)
    return path

def load_model_configs() -> Dict[str, Dict[str, int]]:
    """
    从 models.json 文件加载模型配置
    返回格式: { "模型ID": { "context_window": 总窗口, "max_output": 最大回复, "safety_buffer": 安全余量 } }
    """
    models_json_path = BASE_DIR / "models.json"
    
    # 如果 models.json 文件不存在，返回空字典
    if not models_json_path.exists():
        print(f"Warning: models.json not found at {models_json_path}")
        return {}
    
    try:
        with open(models_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        model_configs = data.get("model_configs", {})
        converted_configs = {}
        
        for model_name, config in model_configs.items():
            # 统一按百分比计算安全余量
            context_window = config.get("context_window", 16384)
            max_output = config.get("max_output", 4096)
            safety_buffer_percent = config.get("safety_buffer_percent", 10)
            
            # 计算安全缓冲区（统一按百分比计算，减少维护成本）
            safety_buffer = max(
                int(context_window * safety_buffer_percent / 100),
                500  # 最小安全缓冲区
            )
            
            converted_configs[model_name] = {
                "context_window": context_window,
                "max_output": max_output,
                "safety_buffer": safety_buffer
            }
        
        return converted_configs
        
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"Error loading models.json: {e}")
        return {}

def infer_model_context_from_name(model_name: str) -> Optional[int]:
    """
    根据模型名称关键词自动推断上下文窗口大小
    支持常见的模型命名模式，如包含 "128k", "32k", "8k" 等
    """
    # 常见的上下文窗口大小映射
    context_patterns = {
        r'128k|128K': 131072,
        r'64k|64K': 65536,
        r'32k|32K': 32768,
        r'16k|16K': 16384,
        r'8k|8K': 8192,
        r'4k|4K': 4096,
        r'2k|2K': 2048,
        r'1k|1K': 1024,
    }
    
    # 查找匹配的上下文窗口大小
    for pattern, context_size in context_patterns.items():
        if re.search(pattern, model_name, re.IGNORECASE):
            return context_size
    
    # 尝试从数字中提取上下文大小 (如 "gpt-4-1106-preview" 可能暗示 128k)
    # 查找类似 "32k", "128k" 等模式
    context_match = re.search(r'(\d+)[kK]', model_name)
    if context_match:
        size_k = int(context_match.group(1))
        return size_k * 1024
    
    return None

class Settings:
    PROJECT_NAME: str = "SAKURARPG Backend"
    
    # [重构] 使用安全的环境变量获取函数
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{get_base_data_path()}/sakura.db")
    
    # 确保数据库URL格式正确
    @property
    def DATABASE_URL_SAFE(self) -> str:
        """确保数据库URL格式正确"""
        url = self.DATABASE_URL
        
        # 如果是相对路径的SQLite URL，转换为绝对路径
        if url.startswith("sqlite:///./"):
            # 提取相对路径部分
            relative_path = url.replace("sqlite:///", "")
            # 转换为绝对路径
            abs_db_path = BASE_DIR / relative_path
            abs_db_path = abs_db_path.resolve()
            # 转换为正斜杠并确保格式正确
            db_path_str = str(abs_db_path).replace('\\', '/')
            return f"sqlite:///{db_path_str}"
        elif not url.startswith("sqlite://"):
            # 如果不是SQLite URL，假设是文件路径，转换为SQLite URL
            path = Path(url)
            if not path.is_absolute():
                path = BASE_DIR / path
                path = path.resolve()
            # 转换为正斜杠并确保格式正确
            db_path_str = str(path).replace('\\', '/')
            return f"sqlite:///{db_path_str}"
        else:
            # 已经是SQLite URL，确保路径使用正斜杠
            return url.replace('\\', '/')

    # --- 全局基底 ---
    GLOBAL_LLM_KEY: str = os.getenv("GLOBAL_LLM_KEY", "")
    GLOBAL_LLM_URL: str = get_env_url("GLOBAL_LLM_URL", "https://api.siliconflow.cn/v1")

    # --- 辅助函数：获取最终的 Key/URL ---
    def _get_credential(self, specific_key: str, specific_url: str) -> tuple[str, str]:
        final_key = os.getenv(specific_key) or self.GLOBAL_LLM_KEY
        final_url = get_env_url(specific_url, self.GLOBAL_LLM_URL)
        return final_key, final_url

    # --- 1. Chat Module ---
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "deepseek-ai/DeepSeek-V3")
    
    # [外部化] 模型参数注册表 - 从 models.json 加载
    # 格式: { "模型ID": { "context_window": 总窗口, "max_output": 最大回复, "safety_buffer": 安全余量 } }
    MODEL_LIMITS: Dict[str, Dict[str, int]] = load_model_configs()

    # [重构] 智能获取限制的方法 - 支持关键词推断
    def get_model_limit(self, model_name: str) -> Dict[str, int]:
        """
        根据模型名称获取限制参数。支持：
        1. 完全匹配 models.json 中的配置
        2. 部分匹配 (例如 model_name 包含 "gpt-4")
        3. 关键词推断 (例如包含 "128k" 自动推断窗口大小)
        4. 回退默认值 (.env 配置)
        """
        # 1. 尝试完全匹配
        if model_name in self.MODEL_LIMITS:
            return self.MODEL_LIMITS[model_name]
        
        # 2. 尝试部分匹配 (例如 model_name 包含 "gpt-4")
        for key, limits in self.MODEL_LIMITS.items():
            if key in model_name:
                return limits

        # 3. 关键词推断 - 根据模型名称自动推断窗口大小
        inferred_context = infer_model_context_from_name(model_name)
        if inferred_context:
            # 统一按 10% 计算安全余量
            safety_buffer_percent = 10
            safety_buffer = max(
                int(inferred_context * safety_buffer_percent / 100),
                500  # 最小安全缓冲区
            )
            
            return {
                "context_window": inferred_context,
                "max_output": 4096,  # 默认最大输出
                "safety_buffer": safety_buffer
            }

        # 4. 回退默认值 (.env 配置) - 使用安全的环境变量获取
        default_ctx = get_env_int("MAX_MODEL_CONTEXT_LENGTH", 16384)
        return {
            "context_window": default_ctx,
            "max_output": 4096, # 默认预留
            "safety_buffer": 500
        }

    # [新增] 重新加载模型配置的方法
    def reload_model_configs(self) -> None:
        """
        重新从 models.json 加载模型配置
        """
        self.MODEL_LIMITS = load_model_configs()

    @property
    def CHAT_CREDENTIALS(self):
        return self._get_credential("CHAT_API_KEY", "CHAT_API_URL")

    # --- 2. Utility Module (Summary & Memory) ---
    UTILITY_MODEL: str = os.getenv("UTILITY_MODEL", "Pro/Qwen/Qwen2-7B-Instruct")
    SUMMARY_HISTORY_THRESHOLD: int = get_env_int("SUMMARY_HISTORY_THRESHOLD", 0)
    
    @property
    def UTILITY_CREDENTIALS(self):
        return self._get_credential("UTILITY_API_KEY", "UTILITY_API_URL")

    # --- 3. RAG Module ---
    RAG_EMBEDDING_MODEL: str = os.getenv("RAG_EMBEDDING_MODEL", "Pro/BAAI/bge-m3")
    RAG_VECTOR_DB_PATH: str = get_env_path("RAG_VECTOR_DB_PATH", str(get_base_data_path() / "chroma_db"))
    
    @property
    def RAG_CREDENTIALS(self):
        key = os.getenv("RAG_API_KEY") or self.GLOBAL_LLM_KEY
        url = get_env_url("RAG_API_URL", self.GLOBAL_LLM_URL)
        return key, url

settings = Settings()
