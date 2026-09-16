# DocuMind AI — Document Chat Assistant

A portfolio-ready RAG application with a polished React frontend and FastAPI backend.

## Stack

Frontend:
- React
- TypeScript
- Vite
- Lucide React
- Custom responsive CSS

Backend:
- FastAPI
- Python
- OpenAI API
- Sentence Transformers
- FAISS
- PyPDF
- NumPy

## Architecture

PDF → Text Extraction → Chunking → Embeddings → FAISS → Semantic Retrieval → OpenAI → Grounded Answer

## Project Structure

```text
ai-document-chat-pro/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
└── README.md
```

## 1. Backend setup

Open a terminal inside `backend`.

Windows:

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

Create `.env` from `.env.example` and put your new OpenAI API key inside:

```text
OPENAI_API_KEY=YOUR_NEW_OPENAI_API_KEY
```

Never commit `.env` to GitHub.

Start the API:

```powershell
python -m uvicorn main:app --reload --port 8000
```

Backend:
`http://localhost:8000`

Health check:
`http://localhost:8000/api/health`

## 2. Frontend setup

Open another terminal inside `frontend`.

```powershell
npm install
npm run dev
```

Frontend:
`http://localhost:5173`

## 3. Use the application

1. Open the frontend URL.
2. Click `Start analyzing` or `Upload PDF`.
3. Upload one or more PDFs.
4. Wait for indexing to finish.
5. Ask questions in the workspace.
6. Use `Generate summary` for a structured summary.
7. Use `Clear workspace` to start a new session.

## Important

This local version keeps the FAISS index in server memory. Restarting FastAPI clears the current in-memory sessions.

The OpenAI API can incur usage charges depending on the account and billing configuration.
