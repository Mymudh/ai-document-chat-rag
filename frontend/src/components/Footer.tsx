import React from "react";
import { Github, Sparkles } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="footer-section">
      <div className="section-container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <Sparkles size={24} />
            </div>

            <div>
              <h3>DocuMind AI</h3>
              <p>
                Intelligent document conversations powered by RAG and
                Generative AI.
              </p>
            </div>
          </div>

          <a
            href="https://github.com/Mymudh/ai-document-chat-rag"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-github"
          >
            <Github size={22} />
            <span>View on GitHub</span>
          </a>
        </div>

        <div className="footer-bottom">
          <p>© 2026 DocuMind AI. Built with React, FastAPI and AI.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;