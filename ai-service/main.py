from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import chromadb
from loguru import logger
import sys
from dotenv import load_dotenv

# 로깅 설정
logger.remove()
logger.add(
    sys.stdout,
    level="INFO",
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
)

# 글로벌 변수 (나중에 의존성 주입으로 개선)
chroma_client = None

# ----------------------------------
# Lifespan settings
# ----------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 수명 주기 관리"""
    global chroma_client

    # Startup
    logger.info("AI Service Strarting up...")

    try:
        chroma_client = chromadb.HttpClient(host="localhost", port=8001)
        heartbeat = chroma_client.heartbeat()
        logger.info(f"ChromaDB Client connected (heartbeat: {heartbeat})")
    except Exception as e:
        logger.error(f"ChromaDB Client connection failed: {e}")
        chroma_client = None

    yield  # 애플리케이션이 실행

    # Shutdown
    logger.info("AI Service Shutting down...")


# ----------------------------------
# FastAPI 앱 생성 (Lifespan 포함)
# ----------------------------------
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
    return {"message": "RAG AI Service API", "docs": "/docs", "health": "/health"}


# ===== 테스트용 임시 엔드포인트 (나중에 삭제) =====


@app.get("/test/chroma")
async def test_chroma():
    """ChromaDB 연결 테스트"""
    if not chroma_client:
        return {"error": "ChromaDB not connected"}

    try:
        # 컬렉션 목록 조회
        collections = chroma_client.list_collections()
        return {
            "status": "ok",
            "collections": [col.name for col in collections],
            "count": len(collections),
        }
    except Exception as e:
        logger.error(f"ChromaDB test failed: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
