import io
import os
import time
import traceback
import uuid
from typing import List

import numpy as np
import faiss

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="DocuMind AI API")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://ai-document-chat-rag.vercel.app"
)

LLM_PROVIDER = os.getenv(
    "LLM_PROVIDER",
    "gemini"
).lower()

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    ""
)

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash"
)

GEMINI_FALLBACK_MODEL = os.getenv(
    "GEMINI_FALLBACK_MODEL",
    "gemini-3.5-flash-lite"
)

GEMINI_EMBEDDING_MODEL = os.getenv(
    "GEMINI_EMBEDDING_MODEL",
    "gemini-embedding-001"
)

EMBEDDING_DIMENSION = int(
    os.getenv(
        "EMBEDDING_DIMENSION",
        "768"
    )
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5:3b"
)

OLLAMA_HOST = os.getenv(
    "OLLAMA_HOST",
    "http://127.0.0.1:11434"
)

MAX_FILE_SIZE = 20 * 1024 * 1024

CHUNK_SIZE = 700
CHUNK_OVERLAP = 100
TOP_K = 4

EMBED_BATCH_SIZE = 32


ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "https://ai-document-chat-rag.vercel.app",
]

if FRONTEND_URL and FRONTEND_URL not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(FRONTEND_URL)


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


sessions = {}

_gemini_client = None
_ollama_client = None


def get_gemini_client():
    global _gemini_client

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server."
        )

    if _gemini_client is None:
        from google import genai

        _gemini_client = genai.Client(
            api_key=GEMINI_API_KEY
        )

    return _gemini_client


def get_ollama_client():
    global _ollama_client

    if _ollama_client is None:
        import ollama

        _ollama_client = ollama.Client(
            host=OLLAMA_HOST
        )

    return _ollama_client


def normalize_vectors(vectors):
    vectors = np.asarray(
        vectors,
        dtype="float32"
    )

    norms = np.linalg.norm(
        vectors,
        axis=1,
        keepdims=True
    )

    norms = np.maximum(
        norms,
        1e-12
    )

    vectors = vectors / norms

    return vectors.astype(
        "float32"
    )


def create_gemini_embeddings(
    texts,
    task_type="RETRIEVAL_DOCUMENT"
):
    if not texts:
        return np.empty(
            (0, EMBEDDING_DIMENSION),
            dtype="float32"
        )

    client = get_gemini_client()

    from google.genai import types

    all_vectors = []

    total = len(texts)

    for start in range(
        0,
        total,
        EMBED_BATCH_SIZE
    ):
        batch = texts[
            start:start + EMBED_BATCH_SIZE
        ]

        last_error = None

        for attempt in range(3):
            try:
                response = client.models.embed_content(
                    model=GEMINI_EMBEDDING_MODEL,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type,
                        output_dimensionality=EMBEDDING_DIMENSION
                    )
                )

                batch_vectors = [
                    embedding.values
                    for embedding in response.embeddings
                ]

                if len(batch_vectors) != len(batch):
                    raise RuntimeError(
                        "Gemini returned an unexpected number "
                        "of embeddings."
                    )

                all_vectors.extend(
                    batch_vectors
                )

                print(
                    f"Embedded {min(start + len(batch), total)}/{total} texts",
                    flush=True
                )

                break

            except Exception as exc:
                last_error = exc

                if attempt < 2:
                    time.sleep(
                        1.5 * (attempt + 1)
                    )
                else:
                    raise HTTPException(
                        status_code=503,
                        detail=(
                            "Gemini embedding API error: "
                            f"{str(last_error)}"
                        )
                    )

    vectors = normalize_vectors(
        all_vectors
    )

    return vectors


def create_query_embedding(
    query
):
    vectors = create_gemini_embeddings(
        [query],
        task_type="RETRIEVAL_QUERY"
    )

    return vectors


def gemini_answer(
    messages,
    num_predict=260
):
    from google.genai import types

    client = get_gemini_client()

    system_parts = []
    conversation_parts = []

    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", "")

        if role == "system":
            system_parts.append(content)

        elif role == "user":
            conversation_parts.append(
                f"USER:\n{content}"
            )

        elif role == "assistant":
            conversation_parts.append(
                f"ASSISTANT:\n{content}"
            )

    system_instruction = "\n\n".join(
        system_parts
    ).strip()

    prompt = "\n\n".join(
        conversation_parts
    ).strip()

    def generate(model_name):
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=num_predict
            )
        )

        answer = response.text

        if not answer:
            raise ValueError(
                "Gemini returned an empty response."
            )

        return answer.strip()

    def is_retryable_error(exc):
        error_code = getattr(
            exc,
            "code",
            None
        )

        error_text = str(exc).upper()

        return (
            error_code in {
                408,
                429,
                500,
                502,
                503,
                504
            }
            or "503" in error_text
            or "UNAVAILABLE" in error_text
            or "RESOURCE_EXHAUSTED" in error_text
            or "TIMEOUT" in error_text
            or "INTERNAL" in error_text
        )

    primary_error = None

    for attempt in range(3):
        try:
            print(
                f"Gemini primary attempt "
                f"{attempt + 1}/3: {GEMINI_MODEL}",
                flush=True
            )

            return generate(GEMINI_MODEL)

        except Exception as exc:
            primary_error = exc

            if not is_retryable_error(exc):
                traceback.print_exc()

                raise HTTPException(
                    status_code=503,
                    detail=(
                        f"Gemini API error: {str(exc)}"
                    )
                )

            if attempt < 2:
                delay = 2 ** attempt + 1

                print(
                    f"Gemini temporarily unavailable. "
                    f"Retrying in {delay}s...",
                    flush=True
                )

                time.sleep(delay)

    fallback_model = GEMINI_FALLBACK_MODEL

    print(
        f"Primary model failed. "
        f"Trying fallback model: {fallback_model}",
        flush=True
    )

    try:
        return generate(fallback_model)

    except Exception as fallback_error:
        traceback.print_exc()

        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini is temporarily unavailable. "
                f"Primary model error: {primary_error}. "
                f"Fallback model error: {fallback_error}"
            )
        )


def ollama_answer(
    messages,
    num_predict=260
):
    try:
        client = get_ollama_client()

        response = client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
            options={
                "temperature": 0.1,
                "num_ctx": 2048,
                "num_predict": num_predict
            },
            keep_alive="10m"
        )

        return response[
            "message"
        ][
            "content"
        ].strip()

    except Exception as exc:
        traceback.print_exc()

        raise HTTPException(
            status_code=503,
            detail=(
                f"Ollama error: {str(exc)}. "
                f"Make sure Ollama is running "
                f"and model '{OLLAMA_MODEL}' is available."
            )
        )


def llm_answer(
    messages,
    num_predict=260
):
    if LLM_PROVIDER == "gemini":
        return gemini_answer(
            messages,
            num_predict
        )

    return ollama_answer(
        messages,
        num_predict
    )


def new_session():
    session_id = str(
        uuid.uuid4()
    )

    sessions[session_id] = {
        "documents": [],
        "chunks": [],
        "vectors": None,
        "history": []
    }

    return session_id


def get_session(
    session_id: str
):
    if not session_id:
        session_id = new_session()

    if session_id not in sessions:
        sessions[session_id] = {
            "documents": [],
            "chunks": [],
            "vectors": None,
            "history": []
        }

    return (
        session_id,
        sessions[session_id]
    )


def split_text(
    text: str
):
    text = " ".join(
        text.split()
    )

    if not text:
        return []

    chunks = []

    start = 0

    while start < len(text):
        end = min(
            start + CHUNK_SIZE,
            len(text)
        )

        piece = text[
            start:end
        ].strip()

        if piece:
            chunks.append(
                piece
            )

        if end >= len(text):
            break

        start = max(
            end - CHUNK_OVERLAP,
            start + 1
        )

    return chunks


def rebuild_index(
    session
):
    if not session["chunks"]:
        session["vectors"] = None
        return

    texts = [
        item["text"]
        for item in session["chunks"]
    ]

    print(
        f"Creating Gemini embeddings for {len(texts)} chunks...",
        flush=True
    )

    start = time.time()

    vectors = create_gemini_embeddings(
        texts,
        task_type="RETRIEVAL_DOCUMENT"
    )

    if vectors.shape[1] != EMBEDDING_DIMENSION:
        raise RuntimeError(
            "Embedding dimension mismatch: "
            f"expected {EMBEDDING_DIMENSION}, "
            f"received {vectors.shape[1]}"
        )

    index = faiss.IndexFlatIP(
        vectors.shape[1]
    )

    index.add(
        vectors
    )

    session["vectors"] = index

    print(
        f"FAISS index ready: "
        f"{len(texts)} chunks | "
        f"{vectors.shape[1]} dimensions | "
        f"{time.time() - start:.1f}s",
        flush=True
    )


def search_chunks(
    session,
    query,
    top_k=TOP_K
):
    if (
        not session["chunks"]
        or session["vectors"] is None
    ):
        return []

    query_vector = create_query_embedding(
        query
    )

    count = min(
        max(1, top_k),
        len(session["chunks"])
    )

    scores, indices = session[
        "vectors"
    ].search(
        query_vector,
        count
    )

    results = []

    for score, index in zip(
        scores[0],
        indices[0]
    ):
        if index < 0:
            continue

        item = session[
            "chunks"
        ][
            int(index)
        ]

        results.append(
            {
                "text": item["text"],
                "source": item["source"],
                "page": item["page"],
                "score": float(score)
            }
        )

    return results


class ChatRequest(BaseModel):
    session_id: str
    question: str


class SearchRequest(BaseModel):
    session_id: str
    query: str
    top_k: int = TOP_K


class SummaryRequest(BaseModel):
    session_id: str


@app.get("/")
def root():
    return {
        "name": "DocuMind AI",
        "status": "online",
        "service": "FastAPI",
        "provider": LLM_PROVIDER
    }


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "service": "DocuMind AI"
    }


@app.get("/api/health")
def health():
    provider = LLM_PROVIDER

    if provider == "gemini":
        llm_status = (
            "configured"
            if GEMINI_API_KEY
            else "not_configured"
        )

        model_name = GEMINI_MODEL

    else:
        ollama_status = "offline"

        try:
            client = get_ollama_client()
            client.list()
            ollama_status = "online"

        except Exception:
            ollama_status = "offline"

        llm_status = ollama_status
        model_name = OLLAMA_MODEL

    return {
        "name": "DocuMind AI",
        "status": "online",
        "provider": provider,
        "model": model_name,
        "fallback_model": (
            GEMINI_FALLBACK_MODEL
            if provider == "gemini"
            else None
        ),
        "llm": llm_status,
        "embedding_model": GEMINI_EMBEDDING_MODEL,
        "embedding_dimension": EMBEDDING_DIMENSION,
        "vector_store": "FAISS"
    }


@app.get("/api/model")
def model():
    if LLM_PROVIDER == "gemini":
        provider = "Gemini"
        model_name = GEMINI_MODEL

    else:
        provider = "Ollama"
        model_name = OLLAMA_MODEL

    return {
        "model": model_name,
        "provider": provider,
        "embedding_model": GEMINI_EMBEDDING_MODEL,
        "embedding_dimension": EMBEDDING_DIMENSION,
        "vector_store": "FAISS"
    }


@app.post("/api/session")
def create_session():
    session_id = new_session()

    return {
        "session_id": session_id
    }


@app.get("/api/documents")
def documents(
    session_id: str
):
    session_id, session = get_session(
        session_id
    )

    return {
        "session_id": session_id,
        "documents": [
            {
                "name": item["name"],
                "pages": item["pages"],
                "chunks": item["chunks"]
            }
            for item in session[
                "documents"
            ]
        ],
        "pages": sum(
            item["pages"]
            for item in session[
                "documents"
            ]
        ),
        "chunks": len(
            session["chunks"]
        )
    }


@app.post(
    "/api/documents/upload"
)
async def upload_documents(
    session_id: str = Form(...),
    files: List[
        UploadFile
    ] = File(...)
):
    session_id, session = get_session(
        session_id
    )

    if not files:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one PDF."
        )

    uploaded = []

    for file in files:
        if not file.filename:
            continue

        filename = file.filename.strip()

        if not filename.lower().endswith(
            ".pdf"
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{filename}: "
                    "only PDF files are supported."
                )
            )

        data = await file.read()

        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"{filename}: "
                    "maximum file size is 20 MB."
                )
            )

        try:
            from pypdf import PdfReader

            start = time.time()

            reader = PdfReader(
                io.BytesIO(data)
            )

            page_count = len(
                reader.pages
            )

            file_chunks = []

            for page_number, page in enumerate(
                reader.pages,
                start=1
            ):
                text = page.extract_text() or ""

                page_chunks = split_text(
                    text
                )

                for chunk_number, chunk in enumerate(
                    page_chunks,
                    start=1
                ):
                    file_chunks.append(
                        {
                            "text": chunk,
                            "source": filename,
                            "page": page_number,
                            "chunk": chunk_number
                        }
                    )

            if not file_chunks:
                raise ValueError(
                    "No extractable text was found. "
                    "This may be a scanned or image-only PDF."
                )

            session["documents"] = [
                item
                for item in session[
                    "documents"
                ]
                if item["name"] != filename
            ]

            session["chunks"] = [
                item
                for item in session[
                    "chunks"
                ]
                if item["source"] != filename
            ]

            session["documents"].append(
                {
                    "name": filename,
                    "pages": page_count,
                    "chunks": len(file_chunks)
                }
            )

            session["chunks"].extend(
                file_chunks
            )

            uploaded.append(
                {
                    "name": filename,
                    "pages": page_count,
                    "chunks": len(file_chunks)
                }
            )

            print(
                f"PDF extracted: "
                f"{filename} | "
                f"{page_count} pages | "
                f"{len(file_chunks)} chunks | "
                f"{time.time() - start:.1f}s",
                flush=True
            )

        except HTTPException:
            raise

        except Exception as exc:
            traceback.print_exc()

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Could not process "
                    f"{filename}: {str(exc)}"
                )
            )

    if not uploaded:
        raise HTTPException(
            status_code=400,
            detail="No valid PDF was uploaded."
        )

    try:
        rebuild_index(
            session
        )

    except HTTPException:
        raise

    except Exception as exc:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=(
                "PDF text was extracted, "
                "but FAISS indexing failed: "
                f"{str(exc)}"
            )
        )

    return {
        "session_id": session_id,
        "uploaded": uploaded,
        "documents": session["documents"],
        "pages": sum(
            item["pages"]
            for item in session[
                "documents"
            ]
        ),
        "chunks": len(
            session["chunks"]
        ),
        "message": "PDF indexed successfully."
    }


@app.post("/api/search")
def search(
    request: SearchRequest
):
    session_id, session = get_session(
        request.session_id
    )

    query = request.query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Search query is empty."
        )

    top_k = max(
        1,
        min(
            request.top_k,
            8
        )
    )

    results = search_chunks(
        session,
        query,
        top_k
    )

    return {
        "session_id": session_id,
        "query": query,
        "results": results
    }


@app.post("/api/chat")
def chat(
    request: ChatRequest
):
    session_id, session = get_session(
        request.session_id
    )

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question is empty."
        )

    results = search_chunks(
        session,
        question,
        TOP_K
    )

    if not results:
        return {
            "session_id": session_id,
            "answer": (
                "Please upload a PDF first. "
                "I can only answer questions "
                "using your uploaded documents."
            ),
            "sources": [],
            "matches": []
        }

    context_parts = []

    for i, item in enumerate(
        results,
        start=1
    ):
        context_parts.append(
            f"[Source {i}] "
            f"{item['source']} — "
            f"page {item['page']}\n"
            f"{item['text']}"
        )

    context = "\n\n".join(
        context_parts
    )

    history = session[
        "history"
    ][-4:]

    messages = [
        {
            "role": "system",
            "content": (
                "You are DocuMind AI, "
                "a document-grounded assistant. "
                "Answer only from the supplied "
                "document context. "
                "If the answer is not present, "
                "clearly say that it was not found "
                "in the uploaded documents. "
                "Do not invent facts. "
                "Keep answers concise and useful. "
                "Mention page numbers when relevant."
            )
        }
    ]

    messages.extend(
        history
    )

    messages.append(
        {
            "role": "user",
            "content": (
                f"DOCUMENT CONTEXT:\n"
                f"{context}\n\n"
                f"QUESTION:\n"
                f"{question}\n\n"
                "Answer directly using only "
                "the document context."
            )
        }
    )

    answer = llm_answer(
        messages,
        260
    )

    session[
        "history"
    ].append(
        {
            "role": "user",
            "content": question
        }
    )

    session[
        "history"
    ].append(
        {
            "role": "assistant",
            "content": answer
        }
    )

    return {
        "session_id": session_id,
        "answer": answer,
        "sources": [
            f"{item['source']} · p. {item['page']}"
            for item in results
        ],
        "matches": results
    }


@app.post("/api/summary")
def summary(
    request: SummaryRequest
):
    session_id, session = get_session(
        request.session_id
    )

    if not session["chunks"]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Upload a PDF before "
                "generating a summary."
            )
        )

    selected = session[
        "chunks"
    ][:8]

    context = "\n\n".join(
        (
            f"{item['source']} — "
            f"page {item['page']}\n"
            f"{item['text']}"
        )
        for item in selected
    )

    messages = [
        {
            "role": "system",
            "content": (
                "Create a concise summary "
                "of the supplied document text. "
                "Use only the supplied text. "
                "Do not invent information."
            )
        },
        {
            "role": "user",
            "content": (
                f"DOCUMENT TEXT:\n"
                f"{context}\n\n"
                "Create a concise summary."
            )
        }
    ]

    answer = llm_answer(
        messages,
        320
    )

    return {
        "session_id": session_id,
        "summary": answer
    }


@app.delete(
    "/api/session/{session_id}"
)
def delete_session(
    session_id: str
):
    sessions.pop(
        session_id,
        None
    )

    return {
        "success": True
    }


if __name__ == "__main__":
    import uvicorn

    port = int(
        os.getenv(
            "PORT",
            "8000"
        )
    )

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )
