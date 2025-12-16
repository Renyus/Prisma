import logging
import httpx
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings

# --- 强制配置日志格式，确保您能看到输出 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# ----------------------------------------

class VectorStore:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStore, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
            
        self.initialized = True
        self.client = None
        self.collection = None
        
        key, url = settings.RAG_CREDENTIALS
        self.api_key = key
        self.api_url = url.rstrip('/')
        if not self.api_url.endswith("/embeddings"):
             self.api_url += "/embeddings"
        
        if key:
            self._init_chroma()
        else:
            logger.warning("⚠️ 未配置 RAG API Key，向量数据库不可用。")

    def _init_chroma(self):
        try:
            logger.info(f"📂 初始化 ChromaDB: {settings.RAG_VECTOR_DB_PATH}")
            self.client = chromadb.PersistentClient(
                path=settings.RAG_VECTOR_DB_PATH,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            
            self.collection = self.client.get_or_create_collection(
                name="sakura_memories",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("✅ ChromaDB 就绪。")
            
        except Exception as e:
            logger.error(f"❌ ChromaDB 初始化失败: {e}")
            self.client = None

    def is_available(self) -> bool:
        return self.collection is not None

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        [Async] 显式调用 API 获取向量
        """
        if not texts:
            return []
            
        # [INFO] 强制显示
        preview = texts[0][:30] + "..." if len(texts[0]) > 30 else texts[0]
        logger.info(f"🔍 [Embedding请求] 文本数: {len(texts)} | 示例: '{preview}'")
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": texts,
            "model": settings.RAG_EMBEDDING_MODEL,
            "encoding_format": "float"
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url, 
                    headers=headers, 
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                sorted_data = sorted(data["data"], key=lambda x: x["index"])
                embeddings = [item["embedding"] for item in sorted_data]
                
                # [INFO] 强制显示
                logger.info(f"✅ [Embedding成功] 获取到 {len(embeddings)} 条向量")
                return embeddings
                
        except Exception as e:
            logger.error(f"❌ Embedding API 失败: {e}")
            raise e

    async def add_memory(self, memory_id: str, text: str, metadata: Dict[str, Any]):
        if not self.is_available():
            return

        try:
            embeddings = await self.get_embeddings([text])
            if not embeddings:
                return

            self.collection.add(
                embeddings=embeddings,
                documents=[text],
                metadatas=[metadata],
                ids=[memory_id]
            )
            logger.info(f"💾 [Vector写入] 已存储记忆 ID={memory_id}")
        except Exception as e:
            logger.error(f"❌ 写入向量库失败: {e}")

    async def delete_memory(self, memory_id: str):
        if not self.is_available():
            return
        try:
            self.collection.delete(ids=[memory_id])
            logger.info(f"🗑️ [Vector删除] 已删除记忆 ID={memory_id}")
        except Exception as e:
            logger.error(f"❌ 删除向量失败: {e}")

    async def search(self, query: str, user_id: str, limit: int = 5) -> List[str]:
        if not self.is_available():
            logger.warning("⚠️ 向量库未连接，跳过检索")
            return []

        try:
            # [INFO] 强制显示
            logger.info(f"🔎 [RAG检索] 用户: {user_id} | Query: '{query}'")
            
            query_embeddings = await self.get_embeddings([query])
            if not query_embeddings:
                return []

            results = self.collection.query(
                query_embeddings=query_embeddings,
                n_results=limit,
                where={"user_id": user_id} 
            )
            
            found_ids = results["ids"][0] if results and results["ids"] else []
            
            if found_ids:
                logger.info(f"🧠 [RAG命中] 找到 {len(found_ids)} 条相关向量")
            else:
                logger.info(f"🤷 [RAG落空] 未找到相关记忆")
                
            return found_ids
            
        except Exception as e:
            logger.error(f"❌ 向量检索出错: {e}")
            return []

    # 🔥 [新增] 检查是否存在相似记忆
    async def exist_similar(self, text: str, user_id: str, threshold: float = 0.25) -> bool:
        """
        检查库中是否已存在相似内容。
        :param threshold: 距离阈值 (Cosine Distance). 越小越相似. 0.25 大约对应 0.75 的相似度。
        :return: True 表示已存在(重复)，False 表示是新的
        """
        if not self.is_available(): return False
        try:
            query_embeddings = await self.get_embeddings([text])
            if not query_embeddings: return False

            # 检索最近的 1 条
            results = self.collection.query(
                query_embeddings=query_embeddings,
                n_results=1,
                where={"user_id": user_id}
            )

            # 检查距离
            if results and results['distances'] and results['distances'][0]:
                dist = results['distances'][0][0]
                # debug log
                # logger.info(f"🔍 [查重] '{text[:10]}...' 最小距离: {dist:.4f} (阈值: {threshold})")
                if dist < threshold:
                    return True # 距离很小，说明已存在相似记忆
            
            return False
        except Exception as e:
            logger.error(f"查重失败: {e}")
            return False

    # --- Lorebook 专用方法 ---

    async def upsert_lore(self, entry_id: str, text: str, lorebook_id: str, tags: List[str] = None):
        """插入或更新世界书条目"""
        if not self.is_available(): return
        if not text: return

        try:
            embeddings = await self.get_embeddings([text])
            if not embeddings: return

            metadata = {
                "type": "lore", 
                "lorebook_id": lorebook_id,
                "tags": ",".join(tags) if tags else ""
            }

            self.collection.add(
                embeddings=embeddings,
                documents=[text],
                metadatas=[metadata],
                ids=[entry_id]
            )
            logger.info(f"📘 [Vector] Upsert Lore ID={entry_id}")
        except Exception as e:
            logger.error(f"Lore upsert 失败: {e}")

    async def delete_lore(self, entry_id: str):
        """删除世界书条目"""
        if not self.is_available(): return
        try:
            self.collection.delete(ids=[entry_id])
            logger.info(f"🗑️ [Vector] Delete Lore ID={entry_id}")
        except Exception as e:
            logger.error(f"Lore delete 失败: {e}")

    async def search_lore(self, query: str, active_book_ids: List[str], limit: int = 5) -> List[str]:
        """
        在指定的 active_book_ids 范围内搜索相关条目
        """
        if not self.is_available() or not active_book_ids:
            return []
        
        try:
            query_embeddings = await self.get_embeddings([query])
            if not query_embeddings: return []

            # Chroma $in 查询
            where_filter = {
                "$and": [
                    {"type": "lore"},
                    {"lorebook_id": {"$in": active_book_ids}}
                ]
            }

            results = self.collection.query(
                query_embeddings=query_embeddings,
                n_results=limit,
                where=where_filter
            )
            
            found_ids = results["ids"][0] if results and results["ids"] else []
            if found_ids:
                logger.info(f"📘 [Lore检索] 命中 {len(found_ids)} 条 (Query: {query[:10]}...)")
            
            return found_ids

        except Exception as e:
            logger.error(f"Lore search 失败: {e}")
            return []

vector_store = VectorStore()