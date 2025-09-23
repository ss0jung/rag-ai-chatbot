import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import time
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

# Import logging configuration
from logging_config import app_logger, rag_logger, api_logger

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="AI Service API",
    description="AI-powered chatbot service with RAG capabilities",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # Log incoming request
    api_logger.info(
        f"Request: {request.method} {request.url.path} "
        f"from {request.client.host if request.client else 'unknown'}"
    )

    # Process request
    response = await call_next(request)

    # Log response
    process_time = time.time() - start_time
    api_logger.info(f"Response: {response.status_code} " f"in {process_time:.4f}s")

    return response


# Log application startup
app_logger.info("=" * 50)
app_logger.info("AI Service starting up...")
app_logger.info(f"Debug mode: {os.getenv('DEBUG', 'False')}")
app_logger.info(f"Log level: {os.getenv('LOG_LEVEL', 'INFO')}")


@app.get("/")
async def read_root():
    api_logger.info("Root endpoint accessed")
    return {"message": "Welcome to the AI Service!"}


@app.post("/api/rag/preprocess")
async def rag_preprocess(doc_path: str):
    """RAG Preprocess: load document, split, create embedding, save vectorstore"""

    rag_logger.info("RAG Preprocess started")

    # 1. load document
    docs = []
    try:
        # doc_path = "../storage/data/uploaded/SPRi AI Brief_9월호_산업동향_0909_F.pdf"
        if Path(doc_path).exists():
            loader = PyMuPDFLoader(doc_path)
            docs = loader.load()
            rag_logger.info(f"Successfully loaded document with {len(docs)} pages")
        else:
            rag_logger.warning(f"Document not found: {doc_path}")
    except Exception as e:
        rag_logger.error(f"Failed to load document: {str(e)}", exc_info=True)
        docs = []

    # 2. split document
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
    )
    split_texts = text_splitter.split_documents(docs)
    rag_logger.info(f"Document split into {len(split_texts)} chunks")

    # 3. crate embedding
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    # 4. create vectorstore and save
    # InMemory vectorstore
    vectorstore = FAISS.from_document(documents=split_texts, embedding=embeddings)
    # 실제 서비스에서는 아래 주석해제해서 벡터스토어를 저장
    # vectorstore_path = "../storage/vectorstore/faiss_index"
    # vectorstore.save_local(vectorstore_path)


@app.get("/api/rag/query")
async def rag_query(query: str):
    """RAG Query: load vectorstore, retrieve relevant docs, generate answer"""

    rag_logger.info("RAG Query started")
    rag_logger.info(f"Query: {query}")

    prompt_template = """
    You are an AI assistant who helps people find information.
    Use the following context to answer the last question.
    If you don't know the answer, say you don't know, and don't try to make it up.
    Please answer in Korean.

    Question: {question}
    Answer:
    """

    prompt = PromptTemplate.from_template(prompt_template)
    llm = ChatOpenAI(model="gpt-5-mini", temperature=0)
    output_parser = StrOutputParser()

    chain = prompt | llm | output_parser

    answer = chain.invoke({"question": query})

    rag_logger.info(f"Answer: {answer}")
    rag_logger.info("Generated answer")

    return {"answer": answer}
