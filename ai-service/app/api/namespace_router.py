"""
네임스페이스 API router
"""

from fastapi import APIRouter, HTTPException, Depends, status
from loguru import logger
from app.models.namespace import (
    NamespaceCreateRequest,
    NamespaceResponse,
    NamespaceListResponse,
)
from app.core.vector_store import VectorStore

router = APIRouter(prefix="/namespaces", tags=["Namespaces"])


async def get_vector_store() -> VectorStore:
    """VectorStore 의존성 주입(main.py에서 설정)"""
    raise NotImplementedError("Dependency injection not configured.")


@router.post("", response_model=NamespaceResponse, status_code=status.HTTP_201_CREATED)
async def create_namespace(
    request: NamespaceCreateRequest,
    vector_store: VectorStore = Depends(get_vector_store),
):
    """네임스페이스 생성"""
    try:
        logger.info(f"네임스페이스 생성 요청 받음 - name: {request.name}")

        # LangChain Chroma로 네임스페이스 생성
        namespace_info = vector_store.create_namespace(request.name)
        return NamespaceResponse(
            name=namespace_info["name"], document_count=namespace_info["document_count"]
        )
    except ValueError as e:
        logger.warning(f"동일한 네임스페이스 존재: {request.name}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"네임스페이스 생성 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="네임스페이스 생성에 실패했습니다.",
        )


@router.get("", response_model=NamespaceListResponse)
async def list_namespaces(vector_store: VectorStore = Depends(get_vector_store)):
    """네임스페이스 목록 조회"""
    try:
        logger.info("네임스페이스 목록 조회 요청 받음")

        namespaces_data = vector_store.list_namespaces()
        namespaces = [
            NamespaceResponse(name=ns["name"], document_count=ns["document_count"])
            for ns in namespaces_data
        ]

        return NamespaceListResponse(namespaces=namespaces, total=len(namespaces))
    except Exception as e:
        logger.error(f"네임스페이스 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="네임스페이스 목록 조회에 실패했습니다.",
        )
