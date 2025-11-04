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
            name: 생성할 네임스페이스 이름 (user_id + "__" + namespace_name)

        Returns:
            Dict[str, Any]: 생성된 네임스페이스 정보 (name, document_count)
        """
        try:
            # 기존 네임스페이스 존재 여부 확인 (메인서비스 쪽에서 미리 중복 검사하여 에러처리함)
            # if self.exists_namespace(name):
            #     raise ValueError(f"Namespace '{name}' already exists.")

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

    def add_documents(
        self,
        namespace: str,
        documents: List[Any],
    ) -> int:
        """
        네임스페이스에 문서 추가

        Args:
            namespace: 네임스페이스 이름
            documents: LangChain Document 리스트

        Returns:
            int: 추가된 문서 수

        Examples:
            store.add_documents("my_namespace", documents)
        """
        try:
            # 네임스페이스의 벡터 스토어 가져오기 (없으면 생성)
            vector_store = self.get_namespace(namespace)

            # 문서 추가 전 카운트
            collection = self.client.get_collection(namespace)
            before_count = collection.count()

            # 문서 추가
            vector_store.add_documents(documents)

            # 문서 추가 후 카운트
            after_count = collection.count()
            added_count = after_count - before_count

            logger.info(
                f"문서 추가 완료 - namespace: {namespace}, "
                f"추가된 문서 수: {added_count}, "
                f"총 문서 수: {after_count}"
            )

            return added_count

        except Exception as e:
            logger.error(f"문서 추가 실패 - namespace: {namespace}, error: {e}")
            raise

    def delete_documents(
        self,
        namespace: str,
        document_ids: Optional[List[str]] = None,
        filter_dict: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        네임스페이스 내에서 특정 문서들만 삭제

        컬렉션은 유지되고, 지정된 문서만 삭제됩니다.

        Args:
            namespace: 네임스페이스 이름
            document_ids: 삭제할 문서 ID 리스트 (ChromaDB의 내부 ID)
            filter_dict: 메타데이터 필터 (예: {"document_id": "doc_001"})

        Returns:
            int: 삭제된 문서 수

        Examples:
            # ID로 삭제
            store.delete_documents("my_namespace", document_ids=["id1", "id2"])

            # 메타데이터 필터로 삭제
            store.delete_documents(
                "my_namespace",
                filter_dict={"document_id": "doc_001"}
            )
        """
        try:
            if not document_ids and not filter_dict:
                raise ValueError("document_ids 또는 filter_dict 중 하나는 필수입니다.")

            # 컬렉션 가져오기
            collection = self.client.get_collection(namespace)

            # 삭제 전 문서 수
            before_count = collection.count()

            if document_ids:
                # ID 기반 삭제
                collection.delete(ids=document_ids)
                logger.info(
                    f"문서 삭제 완료 - namespace: {namespace}, "
                    f"IDs: {document_ids[:5]}..."
                    if len(document_ids) > 5
                    else f"IDs: {document_ids}"
                )
            elif filter_dict:
                # 메타데이터 필터 기반 삭제
                collection.delete(where=filter_dict)
                logger.info(
                    f"문서 삭제 완료 - namespace: {namespace}, "
                    f"Filter: {filter_dict}"
                )

            # 삭제 후 문서 수
            after_count = collection.count()
            deleted_count = before_count - after_count

            logger.info(
                f"문서 삭제 결과 - namespace: {namespace}, "
                f"삭제된 문서 수: {deleted_count}, "
                f"남은 문서 수: {after_count}"
            )

            return deleted_count

        except Exception as e:
            logger.error(f"문서 삭제 실패 - namespace: {namespace}, error: {e}")
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
