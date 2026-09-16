import io
import os
import uuid
from typing import Dict, List

import faiss
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is missing. Add it to backend/.env")

client = OpenAI(api_key=OPENAI_API_KEY)
embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

app = FastAPI(title="AI Document Chat API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: Dict[str, dict] = {}

CHUNK_SIZE = 900
CHUNK_OVERLAP = 140
TOP_K = 5
MAX_FILE_SIZE = 20 * 1024 * 1024


class ChatRequest(BaseModel):
    session_id: str
    question: str


class SummaryRequest(BaseModel):
    session_id: str


def split_text(text: str) -> List[str]:
    text = " ".join(text.split())
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks


def extract_pdf(contents: bytes) -> str:
    reader = PdfReader(io.BytesIO(contents))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)
    return "\n".join(pages).strip()


def get_session(session_id: str) -> dict:
    if session_id not in sessions:
        sessions[session_id] = {
            "index": None,
            "chunks": [],
            "documents": [],
            "history": [],
            "total_pages": 0,
        }
    return sessions[session_id]


def rebuild_index(session: dict):
    if not session["chunks"]:
        session["index"] = None
        return

    texts = [item["text"] for item in session["chunks"]]
    vectors = embedding_model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    vectors = np.asarray(vectors, dtype="float32")
    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)
    session["index"] = index


def search_chunks(session: dict, question: str):
    if session["index"] is None:
        return []

    query_vector = embedding_model.encode(
        [question],
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    query_vector = np.asarray(query_vector, dtype="float32")
    scores, indices = session["index"].search(query_vector, min(TOP_K, len(session["chunks"])))

    results = []
    for score, index in zip(scores[0], indices[0]):
        if index >= 0:
            item = dict(session["chunks"][int(index)])
            item["score"] = float(score)
            results.append(item)
    return results


def generate_answer(question: str, results: list) -> str:
    context = "\n\n".join(
        f"Source: {item['source']}\n{item['text']}" for item in results
    )

    prompt = f"""
You are an AI document assistant.

Answer the user's question using only the document context below.

Rules:
- Do not invent facts.
- Do not use outside knowledge.
- If the answer is not supported by the context, clearly say that you could not find the answer in the uploaded documents.
- Keep the response clear and useful.
- Use short paragraphs or bullets when helpful.

DOCUMENT CONTEXT:
{context}

USER QUESTION:
{question}

ANSWER:
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {"role": "system", "content": "You answer questions from provided documents."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content.strip()


def generate_summary(text: str) -> str:
    text = text[:30000]
    prompt = f"""
Summarize the uploaded documents using only the text provided.

Use this structure:

## Overview
## Key Points
## Important Details
## Conclusion

Do not invent information.

DOCUMENTS:
{text}
"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[
            {"role": "system", "content": "You create accurate document summaries."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content.strip()


@app.get("/api/health")
def health():
    return {"status": "online", "service": "AI Document Chat API"}


@app.post("/api/session")
def create_session():
    session_id = str(uuid.uuid4())
    get_session(session_id)
    return {"session_id": session_id}


@app.get("/api/documents")
def documents(session_id: str):
    session = get_session(session_id)
    return {
        "documents": session["documents"],
        "chunks": len(session["chunks"]),
        "pages": session["total_pages"],
    }


@app.post("/api/documents/upload")
async def upload_documents(
    session_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    session = get_session(session_id)
    uploaded = []
    errors = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            errors.append({"file": file.filename, "error": "Only PDF files are supported."})
            continue

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            errors.append({"file": file.filename, "error": "File exceeds the 20 MB limit."})
            continue

        try:
            text = extract_pdf(contents)
            if not text:
                raise ValueError("No readable text was found in this PDF.")

            chunks = split_text(text)
            for chunk in chunks:
                session["chunks"].append(
                    {
                        "text": chunk,
                        "source": file.filename,
                    }
                )

            reader = PdfReader(io.BytesIO(contents))
            page_count = len(reader.pages)
            session["total_pages"] += page_count
            session["documents"].append(
                {
                    "name": file.filename,
                    "pages": page_count,
                    "chunks": len(chunks),
                }
            )
            uploaded.append(
                {
                    "name": file.filename,
                    "pages": page_count,
                    "chunks": len(chunks),
                }
            )
        except Exception as exc:
            errors.append({"file": file.filename, "error": str(exc)})

    if uploaded:
        rebuild_index(session)

    return {
        "uploaded": uploaded,
        "errors": errors,
        "documents": session["documents"],
        "chunks": len(session["chunks"]),
        "pages": session["total_pages"],
    }


@app.post("/api/chat")
def chat(request: ChatRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")

    session = get_session(request.session_id)
    if session["index"] is None:
        raise HTTPException(status_code=400, detail="Upload and process a PDF first.")

    results = search_chunks(session, question)
    if not results:
        raise HTTPException(status_code=404, detail="No relevant document content was found.")

    answer = generate_answer(question, results)

    sources = []
    seen = set()
    for item in results:
        if item["source"] not in seen:
            sources.append(item["source"])
            seen.add(item["source"])

    session["history"].append(
        {"question": question, "answer": answer, "sources": sources}
    )

    return {
        "answer": answer,
        "sources": sources,
        "matches": [
            {
                "source": item["source"],
                "score": round(item["score"], 3),
            }
            for item in results
        ],
    }


@app.post("/api/summary")
def summary(request: SummaryRequest):
    session = get_session(request.session_id)
    if not session["chunks"]:
        raise HTTPException(status_code=400, detail="Upload a PDF first.")

    combined = "\n\n".join(
        f"{item['source']}\n{item['text']}" for item in session["chunks"]
    )
    return {"summary": generate_summary(combined)}


@app.delete("/api/session/{session_id}")
def clear_session(session_id: str):
    sessions.pop(session_id, None)
    return {"message": "Session cleared."}
