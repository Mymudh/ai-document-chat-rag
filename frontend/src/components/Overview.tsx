import React from "react";
import { FileText, MessageSquare, Search, BarChart3 } from "lucide-react";

const Overview: React.FC = () => {
  const stats = [
    {
      icon: FileText,
      value: "Multi-PDF",
      label: "Document Support"
    },
    {
      icon: MessageSquare,
      value: "AI Chat",
      label: "Natural Language Q&A"
    },
    {
      icon: Search,
      value: "Semantic",
      label: "Context Retrieval"
    },
    {
      icon: BarChart3,
      value: "RAG",
      label: "AI Pipeline"
    }
  ];

  return (
    <section className="overview-section">
      <div className="section-container">
        <div className="section-heading">
          <span className="section-badge">OVERVIEW</span>
          <h2>Meet DocuMind AI</h2>
          <p>
            An intelligent document assistant that uses Retrieval-Augmented
            Generation to help you understand and interact with your PDFs.
          </p>
        </div>

        <div className="overview-grid">
          {stats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div className="overview-card" key={index}>
                <div className="overview-icon">
                  <Icon size={26} />
                </div>

                <h3>{stat.value}</h3>

                <p>{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Overview;