from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import chromadb
from loguru import logger
import sys
import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from app.core.vector_store import VectorStore
from app.api import namespace_router, chat_router
from app.api.namespace_router import get_vector_store

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logger.remove()
logger.add(
    sys.stdout,
    level="INFO",
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
)

# 글로벌 변수
chroma_client = None
vector_store = None
embeddings = None


# Lifespan settings
@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 수명 주기 관리"""
    global chroma_client
    global vector_store
    global embeddings

    # Startup
    logger.info("AI Service 시작 중...")

    try:
        # OpenAI API 키 확인
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logger.warning("OPENAI_API_KEY not found in environment variables")

        # OpenAI Embeddings 초기화
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=openai_api_key,
        )
        logger.info("OpenAI Embeddings 초기화 완료")

        # ChromaDB 클라이언트 연결
        chroma_client = chromadb.HttpClient(host="localhost", port=8001)
        heartbeat = chroma_client.heartbeat()
        logger.info(f"ChromaDB Client connected (heartbeat: {heartbeat})")

        # VectorStore 초기화 (임베딩 함수 포함)
        vector_store = VectorStore(chroma_client, embeddings)

    except Exception as e:
        logger.error(f"Service initialization failed: {e}")
        chroma_client = None
        vector_store = None
        embeddings = None

    yield  # 애플리케이션이 실행

    # Shutdown
    logger.info("AI Service Shutting down...")


# FastAPI 앱 생성 (Lifespan 포함)
app = FastAPI(
    title="RAG AI Service",
    description="AI Service for RAG Chatbot",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 의존성 주입 오버라이드
def override_get_vector_store():
    """VectorStore 의존성 주입 오버라이드"""
    if vector_store is None:
        raise RuntimeError("VectorStore is not initialized.")
    return vector_store


app.dependency_overrides[get_vector_store] = override_get_vector_store

# 라우터 등록
app.include_router(namespace_router.router)
app.include_router(chat_router.router)


# ===== Health Check Endpoint =====
class HealthResponse(BaseModel):
    status: str
    version: str
    chroma_connected: bool


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """헬스 체크 엔드포인트"""
    chroma_ok = chroma_client is not None

    return HealthResponse(status="ok", version="1.0.0", chroma_connected=chroma_ok)


# ===== 루트 엔드포인트 =====
async def root():
    """루트 엔드포인트"""
    return {"message": "RAG AI Service API", "health": "/health"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
