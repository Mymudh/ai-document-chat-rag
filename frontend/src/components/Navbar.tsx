import { ArrowRight, LogIn, Sparkles } from "lucide-react";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">

        <div className="navbar-brand">
          <div className="navbar-logo">
            <Sparkles size={20} />
          </div>

          <span>
            DocuMind <strong>AI</strong>
          </span>
        </div>

        <nav className="navbar-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#technology">Technology</a>
        </nav>

        <div className="navbar-actions">

          <button className="navbar-login">
            <LogIn size={17} />
            Login
          </button>

          <button className="navbar-workspace">
            Open Workspace
            <ArrowRight size={17} />
          </button>

        </div>

      </div>
    </header>
  );
}