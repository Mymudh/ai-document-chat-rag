import { useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  FileText,
  Files,
  Github,
  Menu,
  MessageSquareText,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  UploadCloud,
  X,
  Zap
} from "lucide-react"

const API = "http://localhost:8000/api"

type DocumentInfo = {
  name: string
  pages: number
  chunks: number
}

type Message = {
  role: "user" | "assistant"
  text: string
  sources?: string[]
}

function App() {
  const [page, setPage] = useState<"home" | "chat">("home")
  const [sessionId, setSessionId] = useState("")
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [chunks, setChunks] = useState(0)
  const [pages, setPages] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState("")
  const [uploading, setUploading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [summary, setSummary] = useState("")
  const [showSummary, setShowSummary] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const existing = localStorage.getItem("documind_session")
    if (existing) {
      setSessionId(existing)
      loadDocuments(existing)
      return
    }

    fetch(`${API}/session`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        localStorage.setItem("documind_session", data.session_id)
        setSessionId(data.session_id)
      })
      .catch(() => setError("Backend is not running. Start FastAPI on port 8000."))
  }, [])

  async function loadDocuments(id: string) {
    try {
      const response = await fetch(`${API}/documents?session_id=${encodeURIComponent(id)}`)
      if (!response.ok) return
      const data = await response.json()
      setDocuments(data.documents || [])
      setChunks(data.chunks || 0)
      setPages(data.pages || 0)
    } catch {
      setError("Could not connect to the backend.")
    }
  }

  function startChat() {
    setPage("chat")
    setMobileMenu(false)
    setTimeout(() => inputRef.current?.focus(), 150)
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !sessionId) return
    const pdfs = Array.from(files).filter(file => file.name.toLowerCase().endsWith(".pdf"))
    if (!pdfs.length) {
      setError("Please select PDF files.")
      return
    }

    setError("")
    setUploading(true)

    try {
      const form = new FormData()
      form.append("session_id", sessionId)
      pdfs.forEach(file => form.append("files", file))

      const response = await fetch(`${API}/documents/upload`, {
        method: "POST",
        body: form
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.")
      }

      setDocuments(data.documents || [])
      setChunks(data.chunks || 0)
      setPages(data.pages || 0)
      setPage("chat")

      if (data.errors?.length) {
        setError(data.errors.map((item: { file: string; error: string }) => `${item.file}: ${item.error}`).join(" "))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  async function askQuestion(text = question) {
    const value = text.trim()
    if (!value || !sessionId || thinking) return

    setQuestion("")
    setError("")
    setMessages(prev => [...prev, { role: "user", text: value }])
    setThinking(true)

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question: value })
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.detail || "Unable to answer.")

      setMessages(prev => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources }
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "Something went wrong."
        }
      ])
    } finally {
      setThinking(false)
    }
  }

  async function createSummary() {
    if (!sessionId || !documents.length) return
    setShowSummary(true)
    if (summary) return

    try {
      const response = await fetch(`${API}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "Summary failed.")
      setSummary(data.summary)
    } catch (err) {
      setSummary(err instanceof Error ? err.message : "Summary failed.")
    }
  }

  async function clearWorkspace() {
    if (!sessionId) return
    await fetch(`${API}/session/${sessionId}`, { method: "DELETE" }).catch(() => {})
    const response = await fetch(`${API}/session`, { method: "POST" })
    const data = await response.json()
    localStorage.setItem("documind_session", data.session_id)
    setSessionId(data.session_id)
    setDocuments([])
    setChunks(0)
    setPages(0)
    setMessages([])
    setSummary("")
    setShowSummary(false)
    setError("")
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="navbar">
        <button className="brand" onClick={() => setPage("home")}>
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span>DocuMind<span className="brand-ai"> AI</span></span>
        </button>

        <nav className={`nav-links ${mobileMenu ? "open" : ""}`}>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={startChat}>Workspace</button>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </nav>

        <div className="nav-actions">
          <button className="nav-ghost" onClick={startChat}>Open Workspace</button>
          <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {error && (
        <div className="toast-error">
          <span>{error}</span>
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}

      {page === "home" ? (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span className="pulse-dot" /> AI-powered document intelligence</div>
              <h1>Chat with your<br /><span>documents.</span></h1>
              <p className="hero-text">
                Upload your PDFs, ask natural-language questions, and get grounded answers with source-aware RAG.
              </p>

              <div className="hero-buttons">
                <button className="primary-button" onClick={startChat}>
                  Start analyzing <ArrowRight size={18} />
                </button>
                <label className="secondary-button">
                  <UploadCloud size={18} />
                  Upload PDF
                  <input type="file" accept=".pdf" multiple hidden onChange={e => uploadFiles(e.target.files)} />
                </label>
              </div>

              <div className="trust-row">
                <div className="trust-item"><Check size={15} /> Grounded answers</div>
                <div className="trust-item"><Check size={15} /> Multiple PDFs</div>
                <div className="trust-item"><Check size={15} /> Source references</div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="glow-orb" />
              <div className="floating-card card-top">
                <span className="mini-icon"><FileText size={16} /></span>
                <div><strong>Research.pdf</strong><small>12 pages indexed</small></div>
                <Check size={16} />
              </div>

              <div className="chat-preview">
                <div className="preview-head">
                  <div className="preview-brand"><span className="brand-mark small"><Sparkles size={13} /></span> DocuMind AI</div>
                  <span className="online"><i /> Online</span>
                </div>
                <div className="preview-content">
                  <div className="preview-message user-preview">What are the key findings?</div>
                  <div className="preview-message bot-preview">
                    <div className="bot-avatar"><Bot size={15} /></div>
                    <div>
                      <p>The document highlights three primary findings related to model performance, data quality, and deployment efficiency.</p>
                      <div className="source-pill"><FileText size={12} /> Research.pdf · p. 8</div>
                    </div>
                  </div>
                </div>
                <div className="preview-input">Ask anything about your documents <Send size={15} /></div>
              </div>

              <div className="floating-card card-bottom">
                <span className="mini-icon purple"><Zap size={16} /></span>
                <div><strong>RAG retrieval</strong><small>5 relevant chunks found</small></div>
              </div>
            </div>
          </section>

          <section className="stats-strip">
            <div><strong>PDF</strong><span>document support</span></div>
            <div><strong>RAG</strong><span>grounded retrieval</span></div>
            <div><strong>AI</strong><span>natural conversation</span></div>
            <div><strong>24/7</strong><span>instant analysis</span></div>
          </section>

          <section id="features" className="section">
            <div className="section-heading">
              <div className="eyebrow">POWERFUL WORKSPACE</div>
              <h2>Everything you need to understand your documents.</h2>
              <p>A clean AI workspace built around retrieval, context, and useful answers.</p>
            </div>

            <div className="feature-grid">
              <Feature icon={<MessageSquareText />} title="Ask naturally" text="Ask questions in plain language and receive concise answers based on your uploaded files." />
              <Feature icon={<Search />} title="Semantic search" text="Find relevant passages using vector embeddings instead of simple keyword matching." />
              <Feature icon={<Files />} title="Multiple documents" text="Bring several PDFs into one workspace and search across them together." />
              <Feature icon={<Zap />} title="Fast retrieval" text="FAISS-powered similarity search surfaces the most relevant context for each query." />
              <Feature icon={<Sparkles />} title="Smart summaries" text="Generate structured summaries to quickly understand long documents." />
              <Feature icon={<FileText />} title="Source-aware" text="See which uploaded documents contributed context to each answer." />
            </div>
          </section>

          <section id="how" className="section process-section">
            <div className="section-heading">
              <div className="eyebrow">HOW IT WORKS</div>
              <h2>From PDF to answer in three steps.</h2>
            </div>

            <div className="steps">
              <Step number="01" title="Upload" text="Drop one or more PDF documents into your workspace." />
              <Step number="02" title="Index" text="Text is extracted, chunked, embedded, and stored for semantic retrieval." />
              <Step number="03" title="Ask" text="Your question retrieves relevant context before the AI generates an answer." />
            </div>
          </section>

          <section className="cta-section">
            <div>
              <div className="eyebrow">READY WHEN YOU ARE</div>
              <h2>Turn your documents into an AI conversation.</h2>
              <p>Build faster understanding with a focused RAG workspace.</p>
            </div>
            <button className="primary-button" onClick={startChat}>Open workspace <ArrowRight size={18} /></button>
          </section>
        </main>
      ) : (
        <main className="workspace-page">
          <aside className="workspace-sidebar">
            <div className="sidebar-title">
              <div>
                <span className="eyebrow">WORKSPACE</span>
                <h3>Your documents</h3>
              </div>
              <label className="icon-button">
                <Plus size={18} />
                <input type="file" accept=".pdf" multiple hidden onChange={e => uploadFiles(e.target.files)} />
              </label>
            </div>

            <label className={`dropzone ${uploading ? "uploading" : ""}`}>
              <UploadCloud size={24} />
              <strong>{uploading ? "Indexing documents..." : "Add PDF documents"}</strong>
              <span>Up to 20 MB per file</span>
              <input type="file" accept=".pdf" multiple hidden onChange={e => uploadFiles(e.target.files)} />
            </label>

            <div className="document-list">
              {documents.length ? documents.map(doc => (
                <div className="document-item" key={`${doc.name}-${doc.pages}`}>
                  <div className="doc-icon"><FileText size={17} /></div>
                  <div className="doc-meta">
                    <strong title={doc.name}>{doc.name}</strong>
                    <span>{doc.pages} pages · {doc.chunks} chunks</span>
                  </div>
                  <Check size={16} className="doc-check" />
                </div>
              )) : (
                <div className="empty-docs">No documents yet.<br />Upload a PDF to begin.</div>
              )}
            </div>

            <div className="sidebar-stats">
              <div><strong>{documents.length}</strong><span>Files</span></div>
              <div><strong>{pages}</strong><span>Pages</span></div>
              <div><strong>{chunks}</strong><span>Chunks</span></div>
            </div>

            <div className="sidebar-bottom">
              <button className="summary-button" onClick={createSummary} disabled={!documents.length}>
                <Sparkles size={17} /> Generate summary
              </button>
              <button className="clear-button" onClick={clearWorkspace}>Clear workspace</button>
            </div>
          </aside>

          <section className="chat-area">
            <div className="chat-topbar">
              <div>
                <span className="eyebrow">AI DOCUMENT ASSISTANT</span>
                <h2>Ask your documents anything.</h2>
              </div>
              <div className="status-pill"><i /> RAG online</div>
            </div>

            <div className="messages">
              {!messages.length && (
                <div className="welcome-chat">
                  <div className="big-ai-icon"><Sparkles size={25} /></div>
                  <h2>What would you like to know?</h2>
                  <p>Upload documents on the left, then ask questions about their content.</p>
                  <div className="suggestions">
                    <button onClick={() => askQuestion("Give me a concise summary of the document.")}>Summarize this document <ChevronRight size={16} /></button>
                    <button onClick={() => askQuestion("What are the most important points?")}>What are the key points? <ChevronRight size={16} /></button>
                    <button onClick={() => askQuestion("What are the main conclusions?")}>Show the conclusions <ChevronRight size={16} /></button>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div className={`message-row ${message.role}`} key={index}>
                  {message.role === "assistant" && <div className="message-avatar"><Bot size={16} /></div>}
                  <div className="message-bubble">
                    <div className="message-text">{message.text}</div>
                    {message.sources?.length ? (
                      <div className="message-sources">
                        {message.sources.map(source => <span key={source}><FileText size={12} /> {source}</span>)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="message-row assistant">
                  <div className="message-avatar"><Bot size={16} /></div>
                  <div className="message-bubble typing"><span /><span /><span /></div>
                </div>
              )}
            </div>

            <div className="composer-wrap">
              <div className="composer">
                <label className="attach-button">
                  <Paperclip size={19} />
                  <input type="file" accept=".pdf" multiple hidden onChange={e => uploadFiles(e.target.files)} />
                </label>
                <input
                  ref={inputRef}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") askQuestion()
                  }}
                  placeholder={documents.length ? "Ask a question about your documents..." : "Upload a PDF to start chatting..."}
                  disabled={!documents.length || thinking}
                />
                <button className="send-button" onClick={() => askQuestion()} disabled={!question.trim() || thinking || !documents.length}>
                  <Send size={18} />
                </button>
              </div>
              <div className="composer-note">Answers are generated from retrieved document context.</div>
            </div>
          </section>
        </main>
      )}

      {showSummary && (
        <div className="modal-backdrop" onClick={() => setShowSummary(false)}>
          <div className="summary-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><span className="eyebrow">AI SUMMARY</span><h2>Document overview</h2></div>
              <button className="icon-button" onClick={() => setShowSummary(false)}><X size={18} /></button>
            </div>
            <div className="summary-content">
              {summary ? <MarkdownText text={summary} /> : <div className="summary-loading"><span /><span /><span /></div>}
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>DocuMind AI</span></div>
        <span>RAG-powered document intelligence</span>
        <a href="https://github.com/" target="_blank" rel="noreferrer"><Github size={16} /> GitHub</a>
      </footer>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <ArrowRight size={16} className="feature-arrow" />
    </div>
  )
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="step-card">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="markdown-text">
      {text.split("\n").map((line, index) => {
        const clean = line.replace(/^#+\s*/, "")
        if (line.startsWith("#")) return <h3 key={index}>{clean}</h3>
        if (line.trim().startsWith("-")) return <p key={index}>• {line.trim().slice(1).trim()}</p>
        return line.trim() ? <p key={index}>{line}</p> : <br key={index} />
      })}
    </div>
  )
}

export default App
