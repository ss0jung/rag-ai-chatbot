"""
공통 의존성 주입 모듈
FASTAPI Depends에서 사용하는 모든 의존성을 중앙에서 관리
"""

from app.core.vector_store import VectorStore


async def get_vector_store() -> VectorStore:
    """
    VectorStore 의존성 주입
    이 함수는 main.py에서 app.dependency_overrides를 통해 실제 구현으로 오버라이드됩니다.
    """
    raise NotImplementedError("VectorStore dependency not configured in main.py")
