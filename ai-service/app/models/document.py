# models/document.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum
from datetime import datetime


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class DocumentUploadRequest(BaseModel):
    """문서 업로드 요청 모델"""

    document_id: str = Field(..., description="문서 고유 ID")
    collection_name: str = Field(..., description="ChromaDB 컬렉션 이름")
    file_path: str = Field(..., description="파일 시스템 경로")
    filename: str = Field(..., description="원본 파일 이름")


class DocumentStatusResponse(BaseModel):
    document_id: str = Field(..., description="문서 고유 ID")
    status: DocumentStatus = Field(..., description="문서 처리 상태")
    chunks_count: int = Field(..., description="문서 청크 수")
    processed_at: Optional[datetime] = Field(None, description="처리 완료 시간")
    error_message: Optional[str] = Field(None, description="오류 메시지")
