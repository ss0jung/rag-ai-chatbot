from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.agents.middleware import wrap_model_call, ModelRequest, ModelResponse
from dotenv import load_dotenv
import logging
import re
from typing import List
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    SourceDocument,
    MessageRole,
    ChatMessage,
)
from app.core.vector_store import VectorStore
from app.core.dependencies import get_vector_store


# 환경 변수 로드
load_dotenv()

# API Router 설정
router = APIRouter(tags=["chat"])

# 전역 벡터 임베딩 모델 설정
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 전역 로거 설정
logger = logging.getLogger(__name__)

basic_model = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.1,
    max_tokens=1000,
)
advanced_model = ChatOpenAI(
    model="gpt-5-mini",
    temperature=0.1,
)


def calculate_complexity_score(query: str) -> int:
    """질문의 복잡도 점수 계산"""
    score = 0

    complex_keywords = [
        "분석",
        "비교",
        "평가",
        "전략",
        "계획",
        "왜",
        "이유",
        "원인",
        "해결방안",
        "개선",
        "심층",
        "상세",
        "종합",
        "다각도",
        "검토",
        "추천",
        "제안",
        "방법",
        "어떻게",
    ]

    for keyword in complex_keywords:
        if keyword in query:
            score += 2

    return score


# LLM이 호출될 때마다 실행되는 미들웨어
@wrap_model_call
def dynamic_model_selection(
    request: ModelRequest,
    handler,
) -> ModelResponse:
    """
    요청에 따라 모델을 동적으로 선택하는 미들웨어
    """
    # 1. 메시지에서 쿼리 추출
    print(request.messages)
    query = ""

    if hasattr(request, "messages") and request.messages:
        for msg in request.messages:
            if isinstance(msg, HumanMessage):
                query += " " + str(msg.content)

    # 2. 복잡도 점수 계산
    score = calculate_complexity_score(query)

    # 3. 모델 선택
    if score >= 3:
        logger.info(f"고급 추론 모델 선택 (gpt-5o-mini) - 복잡도 점수: {score})")
        request.model = advanced_model
    else:
        logger.info(f"기본 모델 선택 (gpt-4o-mini) - 복잡도 점수: {score})")
        request.model = basic_model

    print(f"model : {request.model}")

    # 4. 변경된 request로 handler 호출
    response = handler(request)

    return response


def make_search_documents_tool(vector_store: VectorStore):
    """
    문서 검색 도구 생성
    """

    @tool
    def search_documents(
        query: str,
        collection_name: str,
        top_k: int,
    ):
        """
        ChromaDB에서 문서 검색

        Args:
            query : 검색 쿼리
            collection_name : ChromaDB 컬렉션 이름
            top_k : 상위 K개 문서 반환
        """
        try:
            collection = vector_store.get_namespace(collection_name)

            # retriever = collection.as_retriever(
            #     search_type="similarity", search_kwargs={"k": top_k}
            # )

            # docs = retriever.invoke(query)
            # # 문서 포맷팅 + 메타데이터 포함
            # formatted_docs = []
            # for i, doc in enumerate(docs, 1):
            #     formatted_docs.append(
            #         f"[문서{i}]\n"
            #         f"내용: {doc.page_content}\n"
            #         f"출처: {doc.metadata.get('filename','unknown')}\n"

            docs_with_scores = collection.similarity_search_with_relevance_scores(
                query=query, k=top_k
            )

            # 문서 포맷팅 + 메타데이터 포함
            formatted_docs = []
            for i, (doc, score) in enumerate(docs_with_scores, 1):
                formatted_docs.append(
                    f"[문서{i}]\n"
                    f"내용: {doc.page_content}\n"
                    f"출처: {doc.metadata.get('filename','unknown')}\n"
                    f"페이지: {doc.metadata.get('page', 'N/A')}\n"
                    f"유사도 점수: {score}\n"
                )

            result = "\n".join(formatted_docs)
            logger.info(f"문서 검색 완료: {len(docs_with_scores)}개")

            return result

        except Exception as e:
            logger.error(f"문서 검색 도구 실행 중 오류 발생: {e}")
            return f"문서 검색 중 오류가 발생했습니다: {str(e)}"

    return search_documents


def create_chat_agent(
    collection_name: str, temperature: float, vector_store: VectorStore
):
    """
    채팅 에이전트 생성
    """
    search_documents = make_search_documents_tool(vector_store)

    # system_prompt 작성
    system_prompt = f"""You are a document search assistant that answers questions in Korean.

**Your Process:**
1. When you need information, use search_documents tool with collection_name="{collection_name}"
2. The tool returns documents with filename, page number, and content
3. Write your answer in natural Korean
4. Add citation numbers [1], [2], [3] after facts from documents
5. At the end, list all sources with their details

**Citation Format:**
- Place [1], [2] immediately after the relevant information
- Example: "2024년 매출은 15% 증가했습니다.[1]"

**Source List Format:**
After your answer, add a "출처" section:

출처:
[1] 파일명: 2024_annual_report.pdf, 페이지: 12
[2] 파일명: sales_data.pdf, 페이지: 5

**Complete Example:**

질문: 2024년 실적이 어땠나요?

2024년 매출은 전년 대비 15% 증가했습니다.[1] 주요 성장 동력은 해외 시장 확대였으며,[2] 아시아 지역에서 30% 성장을 기록했습니다.[2]

출처:
[1] 파일명: 2024_annual_report.pdf, 페이지: 12
[2] 파일명: sales_data.pdf, 페이지: 8

**Important:**
- If no documents found: "문서에서 관련 정보를 찾을 수 없습니다"
- Same source = same citation number throughout
- Always include the 출처 section at the end
"""
    agent = create_agent(
        model=basic_model,
        tools=[search_documents],
        middleware=[dynamic_model_selection],
        # response_format=ChatResponse,
        system_prompt=system_prompt,
    )

    return agent


import re
from typing import List


def parse_agent_response_to_chat_response(
    agent_response: str, query: str
) -> ChatResponse:
    """
    Agent 응답을 ChatResponse 형식으로 파싱

    Expected format:
    답변 텍스트[1][2]

    출처:
    [1] 파일명: xxx.pdf, 페이지: 12
    [2] 파일명: yyy.pdf, 페이지: 5
    """

    # 1. "출처:" 기준으로 분리
    if "출처:" in agent_response:
        parts = agent_response.split("출처:", 1)
        answer = parts[0].strip()
        sources_text = parts[1].strip()
    else:
        # 출처가 없으면 전체를 답변으로
        answer = agent_response.strip()
        sources_text = ""

    # 2. 출처 파싱
    sources = []
    if sources_text:
        # [1] 파일명: xxx.pdf, 페이지: 12 형식 파싱
        pattern = r"\[(\d+)\]\s*파일명:\s*([^,]+),\s*페이지:\s*(\d+)"
        matches = re.findall(pattern, sources_text)

        for citation_num, filename, page in matches:
            # 해당 citation이 answer에 실제로 있는지 확인
            if f"[{citation_num}]" in answer:
                sources.append(
                    SourceDocument(
                        id=int(citation_num),
                        source=filename.strip(),
                        page=int(page),
                        content="",  # 필요시 검색 결과에서 추출
                    )
                )

    return ChatResponse(query=query, answer=answer, sources=sources)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    request: ChatRequest,
    vector_store: VectorStore = Depends(get_vector_store),
):
    """
    에이전트 기반 채팅
    """

    try:
        logger.info(
            f"Agent 채팅 시작: collection = {request.collection_name}, query = {request.query}"
        )

        # 1. Agent 생성
        agent = create_chat_agent(
            collection_name=request.collection_name,
            temperature=request.temperature,
            vector_store=vector_store,
        )

        # 2. 대화 히스토리 구성
        messages = []
        if request.history:
            for msg in request.history:
                if msg.role == MessageRole.USER:
                    messages.append(HumanMessage(content=msg.content))
                elif msg.role == MessageRole.ASSISTANT:
                    messages.append(AIMessage(content=msg.content))

        # 현재 질문 추가
        messages.append(HumanMessage(content=request.query))

        # 3. Agent 실행
        result = agent.invoke({"messages": messages})

        # 4. 마지막 메시지 추출
        agent_response = result["messages"][-1].content

        # 5. ChatResponse 형식으로 파싱
        chat_response = parse_agent_response_to_chat_response(
            agent_response=agent_response, query=request.query
        )

        logger.info(f"응답 생성 완료: sources={len(chat_response.sources)}")

        return chat_response

    except Exception as e:
        logger.error(f"Agent 채팅 처리 중 오류 발생: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Agent 채팅 처리 중 오류가 발생했습니다: {str(e)}"
        )
