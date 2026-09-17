import io
import uuid
import traceback
from typing import List

import faiss
import numpy as np
import ollama
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

app = FastAPI(title="DocuMind AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = "qwen2.5:3b"
OLLAMA_HOST = "http://127.0.0.1:11434"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
MAX_FILE_SIZE = 20 * 1024 * 1024
CHUNK_SIZE = 700
CHUNK_OVERLAP = 100
TOP_K = 4

ollama_client = ollama.Client(host=OLLAMA_HOST)
embedder = SentenceTransformer(EMBED_MODEL)

sessions = {}


def new_session():
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "documents": [],
        "chunks": [],
        "vectors": None,
        "history": [],
    }
    return session_id


def get_session(session_id: str):
    if not session_id:
        session_id = new_session()
    if session_id not in sessions:
        sessions[session_id] = {
            "documents": [],
            "chunks": [],
            "vectors": None,
            "history": [],
        }
    return session_id, sessions[session_id]


def split_text(text: str):
    text = " ".join(text.split())
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        piece = text[start:end].strip()

        if piece:
            chunks.append(piece)

        if end >= len(text):
            break

        start = max(end - CHUNK_OVERLAP, start + 1)

    return chunks


def rebuild_index(session):
    if not session["chunks"]:
        session["vectors"] = None
        return

    texts = [item["text"] for item in session["chunks"]]
    vectors = embedder.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    ).astype("float32")

    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)
    session["vectors"] = index


def search_chunks(session, query, top_k=TOP_K):
    if not session["chunks"] or session["vectors"] is None:
        return []

    query_vector = embedder.encode(
        [query],
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    ).astype("float32")

    count = min(top_k, len(session["chunks"]))
    scores, indices = session["vectors"].search(query_vector, count)

    results = []

    for score, index in zip(scores[0], indices[0]):
        if index < 0:
            continue

        item = session["chunks"][int(index)]

        results.append({
            "text": item["text"],
            "source": item["source"],
            "page": item["page"],
            "score": float(score),
        })

    return results


def ollama_answer(messages, num_predict=260):
    try:
        response = ollama_client.chat(
            model=MODEL,
            messages=messages,
            options={
                "temperature": 0.1,
                "num_ctx": 2048,
                "num_predict": num_predict,
            },
            keep_alive="10m",
        )
        return response["message"]["content"].strip()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama error: {str(exc)}. Make sure 'ollama run qwen2.5:3b' is running.",
        )


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
    return {"name": "DocuMind AI", "status": "online"}


@app.get("/api/health")
def health():
    ollama_status = "offline"

    try:
        ollama_client.list()
        ollama_status = "online"
    except Exception:
        pass

    return {
        "name": "DocuMind AI",
        "status": "online",
        "model": MODEL,
        "ollama": ollama_status,
    }


@app.post("/api/session")
def create_session():
    session_id = new_session()
    return {"session_id": session_id}


@app.get("/api/documents")
def documents(session_id: str):
    session_id, session = get_session(session_id)

    return {
        "session_id": session_id,
        "documents": [
            {
                "name": item["name"],
                "pages": item["pages"],
                "chunks": item["chunks"],
            }
            for item in session["documents"]
        ],
        "pages": sum(item["pages"] for item in session["documents"]),
        "chunks": len(session["chunks"]),
    }


@app.post("/api/documents/upload")
async def upload_documents(
    session_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    session_id, session = get_session(session_id)

    if not files:
        raise HTTPException(status_code=400, detail="Please select at least one PDF.")

    uploaded = []

    for file in files:
        if not file.filename:
            continue

        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"{file.filename}: only PDF files are supported.",
            )

        data = await file.read()

        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"{file.filename}: maximum file size is 20 MB.",
            )

        try:
            reader = PdfReader(io.BytesIO(data))
            page_count = len(reader.pages)
            file_chunks = []

            for page_number, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                page_chunks = split_text(text)

                for chunk_number, chunk in enumerate(page_chunks, start=1):
                    file_chunks.append({
                        "text": chunk,
                        "source": file.filename,
                        "page": page_number,
                        "chunk": chunk_number,
                    })

            if not file_chunks:
                raise ValueError(
                    "No extractable text was found. This may be a scanned/image-only PDF."
                )

            session["documents"] = [
                item for item in session["documents"]
                if item["name"] != file.filename
            ]

            session["chunks"] = [
                item for item in session["chunks"]
                if item["source"] != file.filename
            ]

            session["documents"].append({
                "name": file.filename,
                "pages": page_count,
                "chunks": len(file_chunks),
            })

            session["chunks"].extend(file_chunks)

            uploaded.append({
                "name": file.filename,
                "pages": page_count,
                "chunks": len(file_chunks),
            })

        except HTTPException:
            raise
        except Exception as exc:
            traceback.print_exc()
            raise HTTPException(
                status_code=400,
                detail=f"Could not process {file.filename}: {str(exc)}",
            )

    if not uploaded:
        raise HTTPException(status_code=400, detail="No valid PDF was uploaded.")

    try:
        rebuild_index(session)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"PDF text was extracted, but FAISS indexing failed: {str(exc)}",
        )

    return {
        "session_id": session_id,
        "uploaded": uploaded,
        "documents": session["documents"],
        "pages": sum(item["pages"] for item in session["documents"]),
        "chunks": len(session["chunks"]),
        "message": "PDF indexed successfully.",
    }


@app.post("/api/search")
def search(request: SearchRequest):
    session_id, session = get_session(request.session_id)

    query = request.query.strip()

    if not query:
        raise HTTPException(status_code=400, detail="Search query is empty.")

    results = search_chunks(
        session,
        query,
        max(1, min(request.top_k, 8)),
    )

    return {
        "session_id": session_id,
        "query": query,
        "results": results,
    }


@app.post("/api/chat")
def chat(request: ChatRequest):
    session_id, session = get_session(request.session_id)

    question = request.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question is empty.")

    results = search_chunks(session, question, TOP_K)

    if not results:
        return {
            "session_id": session_id,
            "answer": "Please upload a PDF first. I can only answer questions using your uploaded documents.",
            "sources": [],
        }

    context_parts = []

    for i, item in enumerate(results, start=1):
        context_parts.append(
            f"[Source {i}] {item['source']} — page {item['page']}\n{item['text']}"
        )

    context = "\n\n".join(context_parts)

    history = session["history"][-4:]

    messages = [
        {
            "role": "system",
            "content": (
                "You are DocuMind AI, a document-grounded assistant. "
                "Answer only from the supplied document context. "
                "If the answer is not present, clearly say that it was not found "
                "in the uploaded documents. Do not invent facts. "
                "Keep answers concise and useful. "
                "Mention page numbers when relevant."
            ),
        }
    ]

    messages.extend(history)

    messages.append({
        "role": "user",
        "content": (
            f"DOCUMENT CONTEXT:\n{context}\n\n"
            f"QUESTION:\n{question}\n\n"
            "Answer directly using only the document context."
        ),
    })

    answer = ollama_answer(messages, 260)

    session["history"].append({
        "role": "user",
        "content": question,
    })
    session["history"].append({
        "role": "assistant",
        "content": answer,
    })

    return {
        "session_id": session_id,
        "answer": answer,
        "sources": [
            f"{item['source']} · p. {item['page']}"
            for item in results
        ],
        "matches": results,
    }


@app.post("/api/summary")
def summary(request: SummaryRequest):
    session_id, session = get_session(request.session_id)

    if not session["chunks"]:
        raise HTTPException(
            status_code=400,
            detail="Upload a PDF before generating a summary.",
        )

    selected = session["chunks"][:8]

    context = "\n\n".join(
        f"{item['source']} — page {item['page']}\n{item['text']}"
        for item in selected
    )

    messages = [
        {
            "role": "system",
            "content": (
                "Create a concise summary of the supplied document text. "
                "Use only the supplied text. Do not invent information."
            ),
        },
        {
            "role": "user",
            "content": f"DOCUMENT TEXT:\n{context}\n\nCreate a concise summary.",
        },
    ]

    answer = ollama_answer(messages, 320)

    return {
        "session_id": session_id,
        "summary": answer,
    }


@app.get("/api/model")
def model():
    return {
        "model": MODEL,
        "provider": "Ollama",
        "embedding_model": EMBED_MODEL,
        "vector_store": "FAISS",
    }


@app.delete("/api/session/{session_id}")
def delete_session(session_id: str):
    sessions.pop(session_id, None)
    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
