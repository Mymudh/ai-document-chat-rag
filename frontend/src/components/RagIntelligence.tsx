import React from "react";
import { Brain, Database, Search, Sparkles } from "lucide-react";

const RagIntelligence: React.FC = () => {
  const features = [
    {
      icon: Search,
      title: "Retrieve",
      description: "Find the most relevant document sections using semantic search."
    },
    {
      icon: Database,
      title: "Augment",
      description: "Provide retrieved document context to the language model."
    },
    {
      icon: Brain,
      title: "Generate",
      description: "Generate grounded answers based on the retrieved information."
    },
    {
      icon: Sparkles,
      title: "Understand",
      description: "Turn complex documents into clear and useful answers."
    }
  ];

  return (
    <section className="rag-intelligence-section">
      <div className="section-container">
        <div className="section-heading">
          <span className="section-badge">RAG INTELLIGENCE</span>
          <h2>Intelligent Document Understanding</h2>
          <p>
            DocuMind AI combines retrieval and generation to provide
            context-aware answers from your documents.
          </p>
        </div>

        <div className="rag-intelligence-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <div className="rag-intelligence-card" key={index}>
                <div className="rag-intelligence-icon">
                  <Icon size={26} />
                </div>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RagIntelligence;