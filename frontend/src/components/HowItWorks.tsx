import React from "react";
import { Upload, FileSearch, Brain, MessageCircle } from "lucide-react";

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: Upload,
      number: "01",
      title: "Upload Documents",
      description: "Upload one or multiple PDF documents to your workspace."
    },
    {
      icon: FileSearch,
      number: "02",
      title: "Process & Index",
      description: "DocuMind extracts text, creates chunks, generates embeddings, and builds a vector index."
    },
    {
      icon: Brain,
      number: "03",
      title: "Retrieve Context",
      description: "FAISS performs semantic search to find the most relevant information from your documents."
    },
    {
      icon: MessageCircle,
      number: "04",
      title: "Ask & Get Answers",
      description: "The AI uses the retrieved context to generate grounded answers with source references."
    }
  ];

  return (
    <section className="how-it-works-section">
      <div className="section-container">
        <div className="section-heading">
          <span className="section-badge">HOW IT WORKS</span>
          <h2>From Documents to Answers</h2>
          <p>
            A simple RAG pipeline transforms your documents into an
            intelligent conversational knowledge base.
          </p>
        </div>

        <div className="how-it-works-grid">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div className="how-it-works-card" key={step.number}>
                <div className="how-it-works-number">
                  {step.number}
                </div>

                <div className="how-it-works-icon">
                  <Icon size={26} />
                </div>

                <h3>{step.title}</h3>

                <p>{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;