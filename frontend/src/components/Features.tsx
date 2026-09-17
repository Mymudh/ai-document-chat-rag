import React from "react";
import {
  FileText,
  MessageSquare,
  Search,
  Brain,
  Layers,
  ShieldCheck
} from "lucide-react";

const Features: React.FC = () => {
  const features = [
    {
      icon: FileText,
      title: "Multi-PDF Support",
      description: "Upload and work with multiple PDF documents in one workspace."
    },
    {
      icon: MessageSquare,
      title: "AI Document Chat",
      description: "Ask natural-language questions and receive context-aware answers."
    },
    {
      icon: Search,
      title: "Semantic Search",
      description: "Find relevant information based on meaning rather than exact keywords."
    },
    {
      icon: Brain,
      title: "RAG Intelligence",
      description: "Retrieve relevant document context before generating AI responses."
    },
    {
      icon: Layers,
      title: "Source References",
      description: "Trace answers back to the relevant document pages and sources."
    },
    {
      icon: ShieldCheck,
      title: "Private Processing",
      description: "Process your documents locally with your own AI environment."
    }
  ];

  return (
    <section className="features-section">
      <div className="section-container">
        <div className="section-heading">
          <span className="section-badge">FEATURES</span>
          <h2>Everything You Need to Understand Documents</h2>
          <p>
            Powerful document intelligence features designed for faster
            research, analysis, and knowledge discovery.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <div className="feature-card" key={index}>
                <div className="feature-icon">
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

export default Features;