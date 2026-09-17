import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";

const FinalCTA: React.FC = () => {
  return (
    <section className="final-cta-section">
      <div className="section-container">
        <div className="final-cta-card">
          <div className="final-cta-icon">
            <Sparkles size={30} />
          </div>

          <h2>Start Exploring Your Documents</h2>

          <p>
            Upload your PDFs and use DocuMind AI to search, analyze,
            summarize, and chat with your documents.
          </p>

          <button className="final-cta-button">
            Open Workspace
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;