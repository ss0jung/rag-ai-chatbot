# models/chat.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    """채팅 메시지 모델"""

    role: MessageRole = Field(..., description="메시지 역할 (user, assistant, system)")
    content: str = Field(..., description="메시지 내용")


class ChatRequest(BaseModel):
    """채팅 요청 모델"""

    query: str = Field(..., description="사용자 질문", min_length=1)
    collection_name: str = Field(..., description="검색할 ChromaDB 컬렉션 이름")
    top_k: int = Field(5, description="검색할 상위 K개 문서 수", ge=1, le=20)
    temperature: float = Field(0.7, description="생성 모델의 온도 설정", ge=0.0, le=1.0)
    history: Optional[List[ChatMessage]] = Field(None, description="이전 대화 내역")


class SourceDocument(BaseModel):
    """출처 문서 모델"""

    content: str = Field(..., description="문서 내용")
    score: float = Field(..., description="유사도 점수")
    metadata: Dict[str, Any] = Field(..., description="문서 메타데이터")


class ChatResponse(BaseModel):
    """채팅 응답 모델"""

    query: str = Field(..., description="사용자 질문")
    answer: str = Field(..., description="생성된 답변")
    sources: List[SourceDocument] = Field(..., description="출처 문서 목록")
