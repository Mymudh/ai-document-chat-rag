import React from "react";
import { Play, Sparkles } from "lucide-react";

const VideoShowcase: React.FC = () => {
  return (
    <section className="video-showcase-section">
      <div className="section-container">
        <div className="section-heading">
          <span className="section-badge">SEE IT IN ACTION</span>
          <h2>Experience DocuMind AI</h2>
          <p>
            Upload your documents, ask questions, search for information,
            and explore answers with AI-powered document intelligence.
          </p>
        </div>

        <div className="video-showcase-card">
          <div className="video-showcase-content">
            <div className="video-showcase-icon">
              <Play size={32} />
            </div>

            <Sparkles size={22} />

            <h3>Intelligent Document Conversations</h3>

            <p>
              DocuMind AI combines document retrieval, semantic search,
              embeddings, and generative AI to make your documents easier
              to understand.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoShowcase;