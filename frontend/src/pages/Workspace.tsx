import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

type DocumentItem = {
  name: string;
  pages: number;
  chunks: number;
};

export default function Workspace() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sessionId, setSessionId] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    createSession();
  }, []);

  const createSession = async () => {
    try {
      const savedSession = localStorage.getItem("documind_session");

      if (savedSession) {
        setSessionId(savedSession);
        await loadDocuments(savedSession);
        return;
      }

      const response = await fetch(`${API_URL}/api/session`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to create session");
      }

      const data = await response.json();

      localStorage.setItem("documind_session", data.session_id);
      setSessionId(data.session_id);

      await loadDocuments(data.session_id);
    } catch {
      setError(
        "Cannot connect to DocuMind backend. Make sure FastAPI is running on port 8000."
      );
    }
  };

  const loadDocuments = async (id: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/documents?session_id=${id}`
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setDocuments(data.documents || []);
    } catch {
      setDocuments([]);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);

    event.target.value = "";
  };

  const uploadFile = async (file: File) => {
    setError("");
    setSuccess("");

    if (file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("PDF size must be less than 20 MB.");
      return;
    }

    if (!sessionId) {
      setError("Session is not ready. Please try again.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("session_id", sessionId);

      const response = await fetch(
        `${API_URL}/api/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setSuccess(`${file.name} uploaded successfully.`);

      await loadDocuments(sessionId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload the PDF."
      );
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="workspace-page">

      <div className="workspace-header">
        <div>
          <span className="workspace-eyebrow">
            DOCUMIND AI WORKSPACE
          </span>

          <h1>Document Workspace</h1>

          <p>
            Upload your PDF documents and prepare them for
            AI-powered question answering.
          </p>
        </div>

        <div className="workspace-status">
          <span className="workspace-status-dot" />
          Backend Connected
        </div>
      </div>

      {error && (
        <div className="workspace-alert workspace-alert-error">
          <span>{error}</span>

          <button onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="workspace-alert workspace-alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>

          <button onClick={() => setSuccess("")}>
            <X size={17} />
          </button>
        </div>
      )}

      <section className="workspace-upload-card">

        <div className="workspace-upload-icon">
          <Upload size={30} />
        </div>

        <h2>Upload a PDF document</h2>

        <p>
          Upload a PDF and DocuMind AI will extract its text,
          split it into chunks, generate embeddings, and index
          it for semantic search.
        </p>

        <button
          className="workspace-upload-button"
          onClick={openFilePicker}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 size={19} className="workspace-spinner" />
              Processing PDF...
            </>
          ) : (
            <>
              <Upload size={19} />
              Upload PDF
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          hidden
        />

        <span className="workspace-upload-hint">
          PDF only · Maximum 20 MB
        </span>

      </section>

      <section className="workspace-documents">

        <div className="workspace-section-header">
          <div>
            <span className="workspace-eyebrow">
              YOUR DOCUMENTS
            </span>

            <h2>Indexed Documents</h2>
          </div>

          <span className="workspace-count">
            {documents.length}{" "}
            {documents.length === 1 ? "document" : "documents"}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="workspace-empty">
            <FileText size={35} />

            <h3>No documents yet</h3>

            <p>
              Upload your first PDF to start using DocuMind AI.
            </p>
          </div>
        ) : (
          <div className="workspace-document-grid">

            {documents.map((document, index) => (
              <div
                className="workspace-document-card"
                key={`${document.name}-${index}`}
              >

                <div className="workspace-document-top">

                  <div className="workspace-document-icon">
                    <FileText size={23} />
                  </div>

                  <CheckCircle2
                    className="workspace-document-check"
                    size={20}
                  />

                </div>

                <h3>{document.name}</h3>

                <div className="workspace-document-stats">

                  <span>
                    {document.pages} pages
                  </span>

                  <span>
                    {document.chunks} chunks
                  </span>

                  <span>
                    Indexed
                  </span>

                </div>

              </div>
            ))}

          </div>
        )}

      </section>

    </div>
  );
}