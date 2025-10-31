"""
네임스페이스 API router
"""

from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
from datetime import datetime, timezone
from loguru import logger
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
import logging


# 환경 변수 로드
load_dotenv()

# API Router 설정
router = APIRouter(prefix="/namespaces", tags=["Namespaces"])

# 글로벌 상태 저장소
document_status = {}

# 전역 임베딩 설정
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 전역 로거 설정
logger = logging.getLogger(__name__)


async def get_vector_store() -> VectorStore:
    """VectorStore 의존성 주입(main.py에서 설정)"""
    raise NotImplementedError("Dependency injection not configured.")


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


async def process_document_background(request: DocumentUploadRequest):
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

        # 1. 문서 로드
        loader = PDFPlumberLoader(request.file_path)
        documents = loader.load()
        logger.info(f"문서 로드 완료 - {len(documents)}개 페이지")

        # 2. 텍스트 분할
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=50
        )
        split_documents = text_splitter.split_documents(documents)
        logger.info(f"문서 분할 완료 : {len(split_documents)}개 청크")

        # 3. 메타 데이터 추가
        for doc in split_documents:
            doc.metadata.update(
                {"document_id": request.document_id, "filename": request.filename}
            )
        logger.info(f"메타데이터 추가 완료")

        # 4. 벡터 스토어에 저장
        vectorstore = Chroma.from_documents(
            documents=split_documents,
            embedding=embeddings,
            collection_name=request.collection_name,
            persist_directory="./chroma_db",  # 영구 저장 경로
        )

        # 5. 상태 업데이트 : PROCESSED
        document_status[request.document_id] = {
            "status": DocumentStatus.PROCESSED,
            "chunks_count": len(split_documents),
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
    namespaceId: str, request: DocumentUploadRequest, background_tasks: BackgroundTasks
):
    """문서 업로드 및 백그라운드 처리 시작"""
    background_tasks.add_task(process_document_background, request)
    logger.info(f"문서 업로드 요청 접수: {request.document_id}  ")

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
