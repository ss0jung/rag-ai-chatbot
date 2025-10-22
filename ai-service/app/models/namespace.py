from pydantic import BaseModel, Field


class NamespaceCreateRequest(BaseModel):
    """네임스페이스 생성 요청 모델"""

    name: str = Field(
        ..., min_length=1, max_length=100, description="네임스페이스 이름"
    )


class NamespaceResponse(BaseModel):
    """네임스페이스 응답"""

    name: str
    document_count: int = 0


class NamespaceListResponse(BaseModel):
    """네임스페이스 목록 응답"""

    namespaces: list[NamespaceResponse]
    total: int
