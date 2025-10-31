from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    SourceDocument,
    MessageRole,
    ChatMessage,
)
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from dotenv import load_dotenv
import logging
import json


load_dotenv()
router = APIRouter(tags=["chat"])

# 전역 설정
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
logger = logging.getLogger(__name__)


def format_docs(docs):
    """검색된 문서를 문자열로 포맷팅"""
    return "\n\n".join(doc.page_content for doc in docs)


@router.post("/chat", response_model=ChatResponse)
async def search_documents(request: ChatRequest):
    """
    RAG 기반 채팅

    1. ChromaDB에서 유사 문서 검색
    2. 프롬프트에 컨텍스트 주입
    3. OpenAI 생성 모델로 답변 생성
    """

    try:
        logger.info(
            f"채팅 시작: collection = {request.collection_name}, query = {request.query}"
        )

        # 1. Chroma 벡터 스토어 연결
        vectorstore = Chroma(
            collection_name=request.collection_name,
            embedding_function=embeddings,
            persist_directory="./chroma_db",
        )

        # 2. 검색 실행
        retriever = vectorstore.as_retriever(
            search_type="similarity", search_kwargs={"k": request.top_k}
        )

        retrieved_docs = retriever.invoke(request.query)
        logger.info(f"문서 검색 완료: {len(retrieved_docs)}개 문서")

        # 3. 프롬프트 템플릿 구성
        if request.history:
            # 히스토리가 있는 경우
            history_text = "\n".join(
                [f"{msg.role.value}: {msg.content}" for msg in request.history]
            )

            prompt = ChatPromptTemplate.from_messages(
                [
                    (
                        "system",
                        """You are an intelligent assistant that answers based only on the provided reference documents.
Your goal is to provide accurate, clear, and concise answers to the user's question.

Rules:
1. Use ONLY the information from the provided documents.
2. If the answer is not found in the documents, say "해당 문서에서는 관련 정보를 찾을 수 없습니다."
3. When quoting or summarizing, paraphrase naturally in Korean.
4. Be factual and neutral — do not assume or fabricate information.
5. Include key insights or summaries when multiple sources overlap.

[이전 대화 내역]
{history}

[참고 문서]
{context}""",
                    ),
                    ("user", "{question}"),
                ]
            )

            rag_chain = (
                {
                    "history": lambda _: history_text, 
                    "context": lambda _: format_docs(retrieved_docs),
                    "question": RunnablePassthrough(),
                }
                | prompt
                | ChatOpenAI(model="gpt-4o-mini", temperature=request.temperature)
                | StrOutputParser()
            )

        else:
            # 히스토리가 없는 경우
            prompt = ChatPromptTemplate.from_messages(
                [
                    (
                        "system",
                        """You are an intelligent assistant that answers based only on the provided reference documents.
Your goal is to provide accurate, clear, and concise answers to the user's question.

Rules:
1. Use ONLY the information from the provided documents.
2. If the answer is not found in the documents, say "해당 문서에서는 관련 정보를 찾을 수 없습니다."
3. When quoting or summarizing, paraphrase naturally in Korean.
4. Be factual and neutral — do not assume or fabricate information.
5. Include key insights or summaries when multiple sources overlap.

[참고 문서]
{context}""",
                    ),
                    ("user", "{question}"),
                ]
            )

            rag_chain = (
                {
                    "context": lambda _: format_docs(retrieved_docs),
                    "question": RunnablePassthrough(),
                }
                | prompt
                | ChatOpenAI(model="gpt-4o-mini", temperature=request.temperature)
                | StrOutputParser()
            )

        # 6. 답변 생성
        answer = rag_chain.invoke(request.query)
        logger.info(f"RAG 답변 생성 완료: {len(answer)} 글자")

        # 7. 출처 문서 포맷팅
        sources = []
        for doc in retrieved_docs:
            sources.append(
                SourceDocument(
                    content=doc.page_content,
                    score=doc.metadata.get("score", 0.0),
                    metadata={k: v for k, v in doc.metadata.items() if k != "score"},
                )
            )

        return ChatResponse(query=request.query, answer=answer, sources=sources)

    except Exception as e:
        logger.error(f"채팅 처리 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"채팅 처리 중 오류가 발생했습니다: {str(e)}"
        )
