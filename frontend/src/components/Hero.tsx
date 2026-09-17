import {
  ArrowRight,
  Upload,
  Sparkles,
  FileText,
  Search,
  CheckCircle2
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import DocumentScene from "../three/DocumentScene";

type HeroProps = {
  onWorkspace?: () => void;
};

export default function Hero({ onWorkspace }: HeroProps) {
  return (
    <section className="hero-section">

      <div className="hero-grid" />

      <div className="hero-glow hero-glow-left" />
      <div className="hero-glow hero-glow-right" />

      <div className="hero-container">

        <div className="hero-content">

          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <Sparkles size={14} />
            AI-POWERED DOCUMENT INTELLIGENCE
          </div>

          <h1>
            Chat with your
            <span> documents.</span>
          </h1>

          <p>
            Upload PDFs, search their content, ask natural-language
            questions, and receive grounded AI answers with source
            references.
          </p>

          <div className="hero-actions">

            <button
              className="hero-primary-button"
              onClick={onWorkspace}
            >
              Start analyzing
              <ArrowRight size={18} />
            </button>

            <button
              className="hero-secondary-button"
              onClick={onWorkspace}
            >
              <Upload size={18} />
              Upload PDF
            </button>

          </div>

          <div className="hero-trust">

            <strong>
              <CheckCircle2 size={14} />
              Grounded answers
            </strong>

            <i />

            <strong>
              <Search size={14} />
              FAISS search
            </strong>

            <i />

            <strong>
              <FileText size={14} />
              Page references
            </strong>

          </div>

        </div>

        <div className="hero-visual">

          <div className="hero-visual-frame">

            <div className="hero-status-card">
              <span className="status-dot" />

              <div>
                <strong>DocuMind AI</strong>
                <small>Local AI • Ready</small>
              </div>
            </div>

            <div className="hero-tech-card hero-tech-pdf">
              <span>PDF</span>
              <small>DOCUMENT</small>
            </div>

            <div className="hero-tech-card hero-tech-rag">
              <span>RAG</span>
              <small>RETRIEVAL</small>
            </div>

            <div className="hero-tech-card hero-tech-ai">
              <span>AI</span>
              <small>QWEN + OLLAMA</small>
            </div>

            <Canvas
              camera={{
                position: [0, 0, 8],
                fov: 42
              }}
              dpr={[1, 2]}
              gl={{
                antialias: true,
                alpha: true
              }}
            >
              <DocumentScene />
            </Canvas>

          </div>

          <div className="hero-scroll">
            <span className="hero-scroll-line" />
            SCROLL TO EXPLORE
            <span className="hero-scroll-line" />
          </div>

        </div>

      </div>

    </section>
  );
}