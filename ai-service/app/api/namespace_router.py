"""
네임스페이스 API router
"""

from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PDFPlumberLoader
from dotenv import load_dotenv
from datetime import datetime, timezone
from loguru import logger
import logging
from pathlib import Path

from app.models.namespace import (
    NamespaceCreateRequest,
    NamespaceResponse,
    NamespaceListResponse,
)
from app.models.document import (
    DocumentUploadRequest,
    DocumentStatusResponse,
    DocumentStatus,
)
from app.core.vector_store import VectorStore
from app.core.dependencies import get_vector_store


# 환경 변수 로드
load_dotenv()

# API Router 설정
router = APIRouter(prefix="/namespaces", tags=["Namespaces"])

# 글로벌 상태 저장소
document_status = {}

# 전역 로거 설정
logger = logging.getLogger(__name__)


@router.get("", response_model=NamespaceListResponse)
async def list_namespaces(vector_store: VectorStore = Depends(get_vector_store)):
    """(개발자용) 네임스페이스 목록 조회"""
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


@router.delete("/{namespaceId}/documents/{document_id}")
async def delete_document(
    namespaceId: str,
    document_id: str,
    vector_store: VectorStore = Depends(get_vector_store),
):
    """
    특정 문서 삭제 (해당 document_id를 가진 모든 청크 삭제)

    Args:
        namespaceId: 네임스페이스(컬렉션) 이름
        document_id: 삭제할 문서 ID (메타데이터의 document_id)
    """
    try:
        logger.info(
            f"문서 삭제 요청 - namespace: {namespaceId}, " f"document_id: {document_id}"
        )

        # 네임스페이스 존재 여부 확인
        if not vector_store.exists_namespace(namespaceId):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"네임스페이스를 찾을 수 없습니다: {namespaceId}",
            )

        # VectorStore를 통해 문서 삭제 (HttpClient 사용)
        deleted_count = vector_store.delete_documents(
            namespace=namespaceId, filter_dict={"document_id": document_id}
        )

        if deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"문서를 찾을 수 없습니다: {document_id}",
            )

        logger.info(
            f"문서 삭제 완료 - namespace: {namespaceId}, "
            f"document_id: {document_id}, "
            f"삭제된 청크 수: {deleted_count}"
        )

        return {
            "message": "문서 삭제 완료",
            "document_id": document_id,
            "deleted_chunks": deleted_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"문서 삭제 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"문서 삭제에 실패했습니다: {str(e)}",
        )


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_namespace(
    name: str,
    vector_store: VectorStore = Depends(get_vector_store),
):
    """네임스페이스 삭제"""
    try:
        logger.info(f"네임스페이스 삭제 요청 받음 - name: {name}")

        # ChromaDB에서 네임스페이스(컬렉션) 삭제
        vector_store.delete_namespace(name)
        logger.info(f"네임스페이스 삭제 완료 - name: {name}")

        return None
    except ValueError as e:
        logger.warning(f"존재하지 않는 네임스페이스: {name}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"네임스페이스 삭제 실패 - name: {name}, error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="네임스페이스 삭제에 실패했습니다.",
        )


async def index_document_background(
    request: DocumentUploadRequest, vector_store: VectorStore
):
    """백그라운드에서 문서 전처리"""
    try:
        # 상태 : PENDING -> PROCESSING
        document_status[request.document_id] = {
            "status": DocumentStatus.PENDING,
            "chunks_count": 0,
        }

        logger.info(
            f"문서 처리 시작 - documentId : {request.document_id}, filePath: {request.file_path}"
        )

        # 파일 존재 확인
        file_path = Path(request.file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {request.file_path}")

        # 1. 문서 로드
        loader = PDFPlumberLoader(file_path=str(file_path))
        documents = loader.load()
        logger.info(f"문서 로드 완료 - {len(documents)}개 페이지")

        # 2. 텍스트 분할
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=50,
            separators=["\n\n", "\n", " ", "", ".", "!", "?"],
            length_function=len,
        )
        splited_documents = text_splitter.split_documents(documents)
        logger.info(f"문서 분할 완료 : {len(splited_documents)}개 청크")

        # 3. 메타 데이터 추가
        for doc in splited_documents:
            doc.metadata.update(
                {"document_id": request.document_id, "filename": request.filename}
            )
        logger.info(f"메타데이터 추가 완료")

        # 4. VectorStore를 통해 문서 추가
        added_count = vector_store.add_documents(
            namespace=request.collection_name, documents=splited_documents
        )

        logger.info(
            f"벡터 스토어 저장 완료 - "
            f"collection: {request.collection_name}, "
            f"추가된 청크: {added_count}개"
        )

        # 5. 상태 업데이트 : PROCESSED
        document_status[request.document_id] = {
            "status": DocumentStatus.PROCESSED,
            "chunks_count": len(splited_documents),
            "processed_at": datetime.now(timezone.utc),
            "error_message": None,
        }

        logging.info(f"문서 처리 완료: {request.document_id}")

    except FileNotFoundError as e:
        logging.error(f"문서 파일을 찾을 수 없습니다: {request.file_path}")
        document_status[request.document_id] = {
            "status": DocumentStatus.FAILED,
            "chunks_count": 0,
            "processed_at": None,
            "error_message": str(e),
        }
    except Exception as e:
        logging.error(f"문서 처리 중 오류 발생: {e}")
        document_status[request.document_id] = {
            "status": DocumentStatus.FAILED,
            "chunks_count": 0,
            "processed_at": None,
            "error_message": str(e),
        }


@router.post("/{namespaceId}/documents")
async def upload_document(
    namespaceId: str,
    request: DocumentUploadRequest,
    background_tasks: BackgroundTasks,
    vector_store: VectorStore = Depends(get_vector_store),
):
    """문서 업로드 및 백그라운드 처리 시작"""
    background_tasks.add_task(index_document_background, request, vector_store)
    logger.info(f"문서 업로드 요청 접수: {request.document_id}")

    return {
        "document_id": request.document_id,
        "status": "pending",
        "message": "문서 업로드가 시작되었습니다.",
    }


@router.get(
    "/{namespaceId}/documents/{document_id}/status",
    response_model=DocumentStatusResponse,
)
async def get_document_status(namespaceId: str, document_id: str):
    """
    문서 처리 상태 조회

    - PENDING: 처리 대기 중
    - PROCESSED: 처리 완료
    - FAILED: 처리 실패
    """
    if document_id not in document_status:
        raise HTTPException(status_code=404, detail="문서가 존재하지 않습니다.")

    status_data = document_status[document_id]

    return DocumentStatusResponse(
        document_id=document_id,
        status=status_data["status"],
        chunks_count=status_data["chunks_count"],
        processed_at=status_data.get("processed_at"),
        error_message=status_data.get("error_message"),
    )
