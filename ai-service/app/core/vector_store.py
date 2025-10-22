"""
LangChain Chroma 벡터 스토어 래퍼 클래스
Collection 생성, 조회, 삭제 및 목록 조회 기능 제공
"""

import chromadb
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from loguru import logger
from typing import List, Dict, Any, Optional


class VectorStore:
    """LangChain Chroma 벡터 스토어 래퍼 클래스"""

    def __init__(self, client: chromadb.HttpClient, embedding_function: Embeddings):
        """
        초기화 및 ChromaDB 연결 설정

        Args:
            client: ChromaDB HttpClient 인스턴스
            embedding_function: LangChain Embeddings 인스턴스 (OpenAI, HuggingFace 등)
        """
        self.client = client
        self.embedding_function = embedding_function
        self._vector_stores: Dict[str, Chroma] = {}  # 캐시된 벡터 스토어
        logger.info("LangChain Chroma 벡터 스토어 초기화 완료")

    def create_namespace(self, name: str) -> Dict[str, Any]:
        """
        네임스페이스(Collection) 생성

        Args:
            name: 생성할 네임스페이스 이름

        Returns:
            Dict[str, Any]: 생성된 네임스페이스 정보 (name, document_count)
        """
        try:
            # 기존 네임스페이스 존재 여부 확인
            if self.exists_namespace(name):
                raise ValueError(f"Namespace '{name}' already exists.")

            # LangChain Chroma 벡터 스토어 생성
            vector_store = Chroma(
                collection_name=name,
                embedding_function=self.embedding_function,
                client=self.client,
            )

            # 캐시에 저장
            self._vector_stores[name] = vector_store

            logger.info(f"Namespace created with LangChain Chroma - name: {name}")

            return {"name": name, "document_count": 0}
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to create namespace: {e}")
            raise

    def get_namespace(self, name: str) -> Chroma:
        """
        네임스페이스(Collection)에 대한 LangChain Chroma 인스턴스 조회

        Args:
            name: 조회할 네임스페이스 이름

        Returns:
            Chroma: LangChain Chroma 벡터 스토어 인스턴스
        """
        try:
            # 캐시에 있으면 반환
            if name in self._vector_stores:
                return self._vector_stores[name]

            # 존재 여부 확인
            if not self.exists_namespace(name):
                raise ValueError(f"Namespace '{name}' does not exist.")

            # LangChain Chroma 인스턴스 생성
            vector_store = Chroma(
                collection_name=name,
                embedding_function=self.embedding_function,
                client=self.client,
            )

            # 캐시에 저장
            self._vector_stores[name] = vector_store

            return vector_store
        except Exception as e:
            logger.error(f"Failed to get namespace - name: {name}, error: {e}")
            raise

    def list_namespaces(self) -> List[Dict[str, Any]]:
        """
        전체 네임스페이스(Collection) 목록 조회

        Returns:
            List[Dict[str, Any]]: 네임스페이스 정보 리스트 (name, document_count)
        """
        try:
            collections = self.client.list_collections()

            namespaces = []
            for col in collections:
                # 각 컬렉션의 문서 수 조회
                try:
                    collection = self.client.get_collection(col.name)
                    doc_count = collection.count()
                except:
                    doc_count = 0

                namespaces.append({"name": col.name, "document_count": doc_count})

            return namespaces
        except Exception as e:
            logger.error(f"Failed to list namespaces: {e}")
            raise

    def delete_namespace(self, name: str) -> bool:
        """
        네임스페이스(Collection) 삭제

        Args:
            name: 삭제할 네임스페이스 이름

        Returns:
            bool: 삭제 성공 여부
        """
        try:
            self.client.delete_collection(name)

            # 캐시에서도 제거
            if name in self._vector_stores:
                del self._vector_stores[name]

            logger.info(f"Namespace deleted - name: {name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete namespace - name: {name}, error: {e}")
            raise

    def exists_namespace(self, name: str) -> bool:
        """
        네임스페이스(Collection) 존재 여부 확인

        Args:
            name: 확인할 네임스페이스 이름

        Returns:
            bool: 존재 여부
        """
        try:
            collections = self.client.list_collections()
            return any(col.name == name for col in collections)
        except Exception as e:
            logger.error(
                f"Failed to check namespace existence - name: {name}, error: {e}"
            )
            raise
