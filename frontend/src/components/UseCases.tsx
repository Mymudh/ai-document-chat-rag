import React from "react";
import { FileText, Search, MessageSquare, BarChart3 } from "lucide-react";

const UseCases: React.FC = () => {
  const useCases = [
    {
      icon: FileText,
      title: "Document Analysis",
      description: "Upload PDF documents and quickly understand their important information."
    },
    {
      icon: Search,
      title: "Semantic Search",
      description: "Find relevant information using natural-language questions instead of exact keywords."
    },
    {
      icon: MessageSquare,
      title: "AI Document Chat",
      description: "Ask questions about your documents and receive context-aware answers."
    },
    {
      icon: BarChart3,
      title: "Document Insights",
      description: "Analyze document content, summaries, pages, and retrieved sources."
    }
  ];

  return (
    <section className="use-cases-section">
      <div className="section-container">
        <div className="section-heading">
          <span className="section-badge">USE CASES</span>
          <h2>Powerful AI for Your Documents</h2>
          <p>
            DocuMind AI helps you search, understand, analyze, and interact with
            your documents using modern RAG technology.
          </p>
        </div>

        <div className="use-cases-grid">
          {useCases.map((item, index) => {
            const Icon = item.icon;

            return (
              <div className="use-case-card" key={index}>
                <div className="use-case-icon">
                  <Icon size={26} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UseCases;