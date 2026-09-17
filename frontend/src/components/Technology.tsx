import React from "react";
import {
  Brain,
  Database,
  FileText,
  Search,
  Server,
  Sparkles
} from "lucide-react";

const Technology: React.FC = () => {
  const technologies = [
    {
      icon: Brain,
      title: "Large Language Models",
      description: "Qwen 2.5 3B provides natural-language understanding and grounded responses."
    },
    {
      icon: Sparkles,
      title: "RAG Pipeline",
      description: "Retrieval-Augmented Generation connects user questions with relevant document context."
    },
    {
      icon: Search,
      title: "Semantic Search",
      description: "Sentence Transformers convert text into embeddings for meaning-based retrieval."
    },
    {
      icon: Database,
      title: "FAISS Vector Search",
      description: "FAISS enables fast similarity search across document embeddings."
    },
    {
      icon: FileText,
      title: "PDF Processing",
      description: "PyPDF extracts text and page information from uploaded PDF documents."
    },
    {
      icon: Server,
      title: "FastAPI Backend",
      description: "FastAPI provides REST APIs for document processing, search, chat, and summaries."
    }
  ];

  return (
    <section className="technology-section">
      <div className="section-container">
        <div className="section-heading">
          <span className="section-badge">TECHNOLOGY</span>
          <h2>Built With Modern AI Technology</h2>
          <p>
            DocuMind AI combines modern generative AI, semantic search,
            vector databases, and document processing technologies.
          </p>
        </div>

        <div className="technology-grid">
          {technologies.map((technology, index) => {
            const Icon = technology.icon;

            return (
              <div className="technology-card" key={index}>
                <div className="technology-icon">
                  <Icon size={26} />
                </div>

                <h3>{technology.title}</h3>

                <p>{technology.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Technology;