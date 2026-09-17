import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react"

import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Files,
  Github,
  LogIn,
  Menu,
  MessageSquareText,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  X,
  Zap
} from "lucide-react"

const API =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api"

type Page = "home" | "workspace"

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

type SearchResult = {
  text: string
  source: string
  page: number
  score: number
}

function App() {
  const [page, setPage] = useState<Page>("home")

  const [sessionId, setSessionId] = useState("")

  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [chunks, setChunks] = useState(0)
  const [pages, setPages] = useState(0)

  const [messages, setMessages] = useState<Message[]>([])

  const [question, setQuestion] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([])

  const [uploading, setUploading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [thinking, setThinking] = useState(false)

  const [summary, setSummary] = useState("")
  const [showSummary, setShowSummary] = useState(false)

  const [mobileMenu, setMobileMenu] = useState(false)
  const [error, setError] = useState("")

  const [showLogin, setShowLogin] = useState(false)
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("documind_logged_in") === "true"
  )

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState("")

  const [activeSection, setActiveSection] = useState("hero")

  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initializeSession()
  }, [])

  useEffect(() => {
    if (page !== "home") {
      return
    }

    const ids = [
      "hero",
      "features",
      "workflow",
      "technology",
      "cta"
    ]

    const elements = ids
      .map(id => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))

    if (!elements.length) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible) {
          const id = (visible.target as HTMLElement).id
          setActiveSection(current =>
            current === id ? current : id
          )
        }
      },
      {
        root: null,
        rootMargin: "-18% 0px -55% 0px",
        threshold: [0, 0.15, 0.35, 0.6, 0.85]
      }
    )

    elements.forEach(element => observer.observe(element))

    return () => observer.disconnect()
  }, [page])

  useEffect(() => {
    let timer: number | undefined

    const onScroll = () => {
      document.documentElement.classList.add("is-user-scrolling")

      if (timer !== undefined) {
        window.clearTimeout(timer)
      }

      timer = window.setTimeout(() => {
        document.documentElement.classList.remove("is-user-scrolling")
      }, 120)
    }

    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (timer !== undefined) {
        window.clearTimeout(timer)
      }
      document.documentElement.classList.remove("is-user-scrolling")
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle(
      "workspace-mode",
      page === "workspace"
    )

    return () => {
      document.body.classList.remove("workspace-mode")
    }
  }, [page])

  async function initializeSession() {
    const existing =
      localStorage.getItem("documind_session")

    if (existing) {
      setSessionId(existing)
      await loadDocuments(existing)
      return
    }

    await createSession()
  }

  async function createSession() {
    try {
      const response = await fetch(
        `${API}/session`,
        {
          method: "POST"
        }
      )

      if (!response.ok) {
        throw new Error("Unable to create session.")
      }

      const data = await response.json()

      localStorage.setItem(
        "documind_session",
        data.session_id
      )

      setSessionId(data.session_id)

      return data.session_id
    } catch {
      setError(
        "Cannot connect to DocuMind backend. Start FastAPI on port 8000."
      )

      return ""
    }
  }

  async function loadDocuments(id: string) {
    try {
      const response = await fetch(
        `${API}/documents?session_id=${encodeURIComponent(id)}`
      )

      if (!response.ok) {
        return
      }

      const data = await response.json()

      setDocuments(data.documents || [])
      setChunks(data.chunks || 0)
      setPages(data.pages || 0)
    } catch {
      setError(
        "Could not connect to the backend."
      )
    }
  }

  async function ensureSession() {
    if (sessionId) {
      return sessionId
    }

    return await createSession()
  }

  function goHome() {
    setPage("home")
    setMobileMenu(false)

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 20)
  }

  function openWorkspace() {
    setPage("workspace")
    setMobileMenu(false)

    setTimeout(() => {
      inputRef.current?.focus()
    }, 150)
  }

  function scrollToSection(id: string) {
    setMobileMenu(false)

    if (page !== "home") {
      setPage("home")

      setTimeout(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          })
      }, 100)

      return
    }

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
  }

  function openUpload() {
    if (uploading) return
    fileInputRef.current?.click()
  }

  async function uploadFiles(
    files: FileList | null
  ) {
    if (!files) {
      return
    }

    const pdfs = Array.from(files).filter(
      file =>
        file.name
          .toLowerCase()
          .endsWith(".pdf")
    )

    if (!pdfs.length) {
      setError(
        "Please select one or more PDF files."
      )
      return
    }

    const activeSession =
      await ensureSession()

    if (!activeSession) {
      return
    }

    setError("")
    setUploading(true)

    try {
      const form = new FormData()

      form.append(
        "session_id",
        activeSession
      )

      pdfs.forEach(file => {
        form.append("files", file)
      })

      const response = await fetch(
        `${API}/documents/upload`,
        {
          method: "POST",
          body: form
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || "Upload failed."
        )
      }

      setDocuments(data.documents || [])
      setChunks(data.chunks || 0)
      setPages(data.pages || 0)

      setSearchResults([])
      setMessages([])

      setPage("workspace")

      if (data.errors?.length) {
        setError(
          data.errors
            .map(
              (item: {
                file: string
                error: string
              }) =>
                `${item.file}: ${item.error}`
            )
            .join(" ")
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "PDF analysis failed."
      )
    } finally {
      setUploading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  async function searchDocuments() {
    const query = searchQuery.trim()

    if (!query) {
      setError(
        "Enter something to search."
      )
      return
    }

    if (!documents.length) {
      setError(
        "Upload a PDF before searching."
      )
      return
    }

    if (!sessionId) {
      setError(
        "Session is not available."
      )
      return
    }

    setSearching(true)
    setError("")
    setSearchResults([])

    try {
      const response = await fetch(
        `${API}/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId,
            query,
            top_k: 8
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || "Search failed."
        )
      }

      setSearchResults(
        data.results || []
      )
    } catch (err) {
      console.error(
        "Search error:",
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : "Search failed."
      )
    } finally {
      setSearching(false)
    }
  }

  async function askQuestion(
    text = question
  ) {
    const value = text.trim()

    if (!value) {
      return
    }

    if (!sessionId) {
      setError(
        "Session is not available."
      )
      return
    }

    if (!documents.length) {
      setError(
        "Upload a PDF before asking questions."
      )
      return
    }

    if (thinking) {
      return
    }

    setQuestion("")
    setError("")
    setThinking(true)

    setMessages(prev => [
      ...prev,
      {
        role: "user",
        text: value
      }
    ])

    try {
      const response = await fetch(
        `${API}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId,
            question: value
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to generate answer."
        )
      }

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          sources:
            data.sources || []
        }
      ])
    } catch (err) {
      console.error(
        "Chat error:",
        err
      )

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text:
            err instanceof Error
              ? err.message
              : "Unable to connect to the backend."
        }
      ])
    } finally {
      setThinking(false)
    }
  }

  async function createSummary() {
    if (!sessionId || !documents.length) {
      setError(
        "Upload a PDF before generating a summary."
      )
      return
    }

    setShowSummary(true)
    setSummary("")

    try {
      const response = await fetch(
        `${API}/summary`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Summary generation failed."
        )
      }

      setSummary(
        data.summary || ""
      )
    } catch (err) {
      setSummary(
        err instanceof Error
          ? err.message
          : "Summary generation failed."
      )
    }
  }

  async function clearWorkspace() {
    if (!sessionId) {
      return
    }

    setError("")

    try {
      await fetch(
        `${API}/session/${sessionId}`,
        {
          method: "DELETE"
        }
      )

      const newSession =
        await createSession()

      if (!newSession) {
        return
      }

      setDocuments([])
      setChunks(0)
      setPages(0)
      setMessages([])
      setSearchResults([])
      setSearchQuery("")
      setQuestion("")
      setSummary("")
      setShowSummary(false)
    } catch {
      setError(
        "Unable to clear workspace."
      )
    }
  }

  function login() {
    setLoginError("")

    if (!email.trim()) {
      setLoginError(
        "Please enter your email."
      )
      return
    }

    if (password.length < 6) {
      setLoginError(
        "Password must contain at least 6 characters."
      )
      return
    }

    localStorage.setItem(
      "documind_logged_in",
      "true"
    )

    localStorage.setItem(
      "documind_user_email",
      email
    )

    setLoggedIn(true)
    setShowLogin(false)
    setLoginError("")
    setPassword("")
  }

  function logout() {
    localStorage.removeItem(
      "documind_logged_in"
    )

    localStorage.removeItem(
      "documind_user_email"
    )

    setLoggedIn(false)
  }

  function handleQuestionKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault()
      askQuestion()
    }
  }

  return (
    <div className="app-shell">

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <header className="navbar">

        <button
          className="brand"
          onClick={goHome}
        >
          <span className="brand-mark">
            <Sparkles size={19} />
          </span>

          <span>
            DocuMind
            <span className="brand-ai">
              {" "}AI
            </span>
          </span>
        </button>

        <nav
          className={`nav-links ${
            mobileMenu
              ? "open"
              : ""
          }`}
        >
          <button
            className={
              activeSection === "hero"
                ? "active"
                : ""
            }
            onClick={goHome}
          >
            Home
          </button>

          <button
            onClick={openWorkspace}
          >
            Workspace
          </button>

          <button
            className={
              activeSection ===
              "features"
                ? "active"
                : ""
            }
            onClick={() =>
              scrollToSection(
                "features"
              )
            }
          >
            Features
          </button>

          <button
            className={
              activeSection ===
              "workflow"
                ? "active"
                : ""
            }
            onClick={() =>
              scrollToSection(
                "workflow"
              )
            }
          >
            How it works
          </button>

          <button
            className={
              activeSection ===
              "technology"
                ? "active"
                : ""
            }
            onClick={() =>
              scrollToSection(
                "technology"
              )
            }
          >
            Technology
          </button>
        </nav>

        <div className="nav-actions">

          {loggedIn ? (
            <button
              className="login-user"
              onClick={logout}
              title="Logout"
            >
              <User size={16} />
              Logout
            </button>
          ) : (
            <button
              className="login-button"
              onClick={() =>
                setShowLogin(true)
              }
            >
              <LogIn size={16} />
              Login
            </button>
          )}

          <button
            className="nav-ghost"
            onClick={openWorkspace}
          >
            Open Workspace
            <ArrowRight size={16} />
          </button>

          <button
            className="mobile-toggle"
            onClick={() =>
              setMobileMenu(
                !mobileMenu
              )
            }
          >
            {mobileMenu ? (
              <X />
            ) : (
              <Menu />
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="toast-error">
          <span>{error}</span>

          <button
            onClick={() =>
              setError("")
            }
          >
            <X size={16} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={event => {
          uploadFiles(event.target.files)
          event.currentTarget.value = ""
        }}
      />

      {page === "home" ? (
        <main>

          {/* HERO */}

          <section
            id="hero"
            className="hero home-slide"
          >
            <div className="hero-copy">

              <div className="eyebrow">
                <span className="pulse-dot" />
                AI-POWERED DOCUMENT INTELLIGENCE
              </div>

              <h1>
                Chat with your
                <br />
                <span>
                  documents.
                </span>
              </h1>

              <p className="hero-text">
                Upload PDFs, search their
                content, ask natural-language
                questions, and receive grounded
                AI answers with source references.
              </p>

              <div className="hero-buttons">

                <button
                  className="primary-button"
                  onClick={openWorkspace}
                >
                  Start analyzing
                  <ArrowRight size={18} />
                </button>

                <button
                  className="secondary-button"
                  onClick={openUpload}
                >
                  <UploadCloud size={18} />
                  Upload PDF
                </button>


              </div>

              <div className="trust-row">
                <div>
                  <Check size={15} />
                  Grounded answers
                </div>

                <div>
                  <Check size={15} />
                  FAISS search
                </div>

                <div>
                  <Check size={15} />
                  Page references
                </div>
              </div>

            </div>

            <div className="hero-visual">

              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />

              <div className="three-d-core">

                <div className="core-glow" />

                <div className="document-3d">

                  <div className="document-top">
                    <Sparkles size={25} />
                    <span>AI</span>
                  </div>

                  <div className="document-lines">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>

                  <div className="document-badge">
                    <Check size={13} />
                    Indexed
                  </div>

                </div>

                <div className="float-node node-one">
                  <FileText size={16} />
                  PDF
                </div>

                <div className="float-node node-two">
                  <Search size={16} />
                  RAG
                </div>

                <div className="float-node node-three">
                  <Sparkles size={16} />
                  AI
                </div>

              </div>

              <div className="floating-card card-top">
                <span className="mini-icon">
                  <FileText size={16} />
                </span>

                <div>
                  <strong>
                    Research.pdf
                  </strong>
                  <small>
                    12 pages indexed
                  </small>
                </div>

                <Check size={16} />
              </div>

              <div className="chat-preview">

                <div className="preview-head">

                  <div className="preview-brand">
                    <span className="brand-mark small">
                      <Sparkles size={13} />
                    </span>

                    DocuMind AI
                  </div>

                  <span className="online">
                    <i />
                    Online
                  </span>

                </div>

                <div className="preview-content">

                  <div className="preview-message user-preview">
                    What are the key findings?
                  </div>

                  <div className="preview-message bot-preview">

                    <div className="bot-avatar">
                      <Bot size={15} />
                    </div>

                    <div>
                      <p>
                        The document highlights
                        important findings and
                        supporting evidence.
                      </p>

                      <div className="source-pill">
                        <FileText size={12} />
                        Research.pdf · p. 8
                      </div>
                    </div>

                  </div>

                </div>

                <div className="preview-input">
                  Ask anything about your documents
                  <Send size={15} />
                </div>

              </div>

              <div className="floating-card card-bottom">
                <span className="mini-icon purple">
                  <Zap size={16} />
                </span>

                <div>
                  <strong>
                    RAG retrieval
                  </strong>

                  <small>
                    Relevant chunks found
                  </small>
                </div>
              </div>

            </div>
          </section>

          {/* SLIDE 2 */}

          <section
            id="features"
            className="section home-slide"
          >
            <div className="section-heading">
              <div className="eyebrow">
                POWERFUL FEATURES
              </div>

              <h2>
                Everything you need
                for intelligent documents.
              </h2>

              <p>
                A professional AI workspace
                built around retrieval,
                context and useful answers.
              </p>
            </div>

            <div className="feature-grid">

              <Feature
                icon={<MessageSquareText />}
                title="Ask naturally"
                text="Ask questions in plain language and receive answers grounded in your uploaded documents."
                onClick={openWorkspace}
              />

              <Feature
                icon={<Search />}
                title="Semantic search"
                text="Search document meaning using embeddings and FAISS instead of simple keyword matching."
                onClick={openWorkspace}
              />

              <Feature
                icon={<Files />}
                title="Multiple PDFs"
                text="Upload several documents and search across them from one workspace."
                onClick={openWorkspace}
              />

              <Feature
                icon={<Zap />}
                title="Fast retrieval"
                text="Retrieve the most relevant document chunks for every query."
                onClick={openWorkspace}
              />

              <Feature
                icon={<Sparkles />}
                title="AI summaries"
                text="Generate structured summaries to understand long documents faster."
                onClick={openWorkspace}
              />

              <Feature
                icon={<ShieldCheck />}
                title="Source aware"
                text="See which document and page contributed information to the response."
                onClick={openWorkspace}
              />

            </div>
          </section>

          {/* SLIDE 3 */}

          <section
            id="workflow"
            className="section process-section home-slide"
          >
            <div className="section-heading">
              <div className="eyebrow">
                HOW IT WORKS
              </div>

              <h2>
                From PDF to intelligent answer.
              </h2>

              <p>
                A complete retrieval-augmented
                generation pipeline.
              </p>
            </div>

            <div className="workflow-visual">

              <WorkflowStep
                number="01"
                icon={<UploadCloud />}
                title="Upload"
                text="Upload one or more PDF documents."
              />

              <div className="workflow-line" />

              <WorkflowStep
                number="02"
                icon={<FileText />}
                title="Extract"
                text="Extract readable text page by page."
              />

              <div className="workflow-line" />

              <WorkflowStep
                number="03"
                icon={<Sparkles />}
                title="Embed"
                text="Convert document chunks into vectors."
              />

              <div className="workflow-line" />

              <WorkflowStep
                number="04"
                icon={<Search />}
                title="Retrieve"
                text="FAISS finds relevant context."
              />

              <div className="workflow-line" />

              <WorkflowStep
                number="05"
                icon={<Bot />}
                title="Answer"
                text="AI generates a grounded response."
              />

            </div>
          </section>

          {/* SLIDE 4 */}

          <section
            id="technology"
            className="section technology-section home-slide"
          >
            <div className="tech-panel">

              <div className="tech-copy">

                <div className="eyebrow">
                  RAG TECHNOLOGY
                </div>

                <h2>
                  Built like a real AI
                  document application.
                </h2>

                <p>
                  DocuMind combines document
                  extraction, semantic embeddings,
                  vector retrieval and LLM generation
                  into one workflow.
                </p>

                <button
                  className="primary-button"
                  onClick={openWorkspace}
                >
                  Try the workspace
                  <ArrowRight size={18} />
                </button>

              </div>

              <div className="tech-orb">

                <div className="tech-ring ring-one" />
                <div className="tech-ring ring-two" />
                <div className="tech-ring ring-three" />

                <div className="tech-center">
                  <Sparkles size={35} />
                  <span>RAG</span>
                </div>

                <div className="tech-label label-one">
                  PDF
                </div>

                <div className="tech-label label-two">
                  FAISS
                </div>

                <div className="tech-label label-three">
                  AI
                </div>

              </div>

            </div>
          </section>

          {/* SLIDE 5 */}

          <section
            id="cta"
            className="cta-section home-slide"
          >
            <div>

              <div className="eyebrow">
                READY WHEN YOU ARE
              </div>

              <h2>
                Turn your documents
                into an AI conversation.
              </h2>

              <p>
                Upload a PDF and start
                asking questions.
              </p>

            </div>

            <div className="cta-actions">

              <button
                className="primary-button"
                onClick={openWorkspace}
              >
                Open workspace
                <ArrowRight size={18} />
              </button>

              {!loggedIn && (
                <button
                  className="secondary-button"
                  onClick={() =>
                    setShowLogin(true)
                  }
                >
                  <LogIn size={18} />
                  Login
                </button>
              )}

            </div>
          </section>

        </main>
      ) : (

        /* WORKSPACE */

        <main className="workspace-page">

          <aside className="workspace-sidebar">

            <div className="workspace-brand">
              <span className="brand-mark small">
                <Sparkles size={14} />
              </span>

              <div>
                <span>
                  DOCUMIND
                </span>

                <small>
                  AI DOCUMENT WORKSPACE
                </small>
              </div>
            </div>

            <div className="sidebar-title">

              <div>
                <span className="eyebrow">
                  LIBRARY
                </span>

                <h3>
                  Your documents
                </h3>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={openUpload}
              >
                <Plus size={18} />
              </button>

            </div>

            <button
              type="button"
              className={`dropzone ${
                uploading
                  ? "uploading"
                  : ""
              }`}
              onClick={openUpload}
            >
              <div className="upload-icon">
                <UploadCloud size={25} />
              </div>

              <strong>
                {uploading
                  ? "Analyzing documents..."
                  : "Add PDF documents"}
              </strong>

              <span>
                PDF · Up to 20 MB per file
              </span>

              <div className="upload-status">
                {uploading
                  ? "Extracting → Embedding → Indexing"
                  : "Click to upload"}
              </div>
            </button>

            <div className="document-list">

              {documents.length ? (
                documents.map(doc => (
                  <div
                    className="document-item"
                    key={`${doc.name}-${doc.pages}-${doc.chunks}`}
                  >

                    <div className="doc-icon">
                      <FileText size={17} />
                    </div>

                    <div className="doc-meta">

                      <strong
                        title={doc.name}
                      >
                        {doc.name}
                      </strong>

                      <span>
                        {doc.pages} pages ·{" "}
                        {doc.chunks} chunks
                      </span>

                    </div>

                    <Check
                      size={16}
                      className="doc-check"
                    />

                  </div>
                ))
              ) : (
                <div className="empty-docs">
                  <Files size={26} />
                  <span>
                    No documents yet
                  </span>
                  <small>
                    Upload a PDF to begin
                  </small>
                </div>
              )}

            </div>

            <div className="sidebar-stats">

              <div>
                <strong>
                  {documents.length}
                </strong>
                <span>
                  Files
                </span>
              </div>

              <div>
                <strong>
                  {pages}
                </strong>
                <span>
                  Pages
                </span>
              </div>

              <div>
                <strong>
                  {chunks}
                </strong>
                <span>
                  Chunks
                </span>
              </div>

            </div>

            <div className="sidebar-bottom">

              <button
                className="summary-button"
                onClick={
                  createSummary
                }
                disabled={
                  !documents.length ||
                  uploading
                }
              >
                <Sparkles size={17} />
                Generate summary
              </button>

              <button
                className="clear-button"
                onClick={
                  clearWorkspace
                }
              >
                Clear workspace
              </button>

            </div>

          </aside>

          <section className="chat-area">

            <div className="workspace-hero">

              <div>

                <span className="eyebrow">
                  AI DOCUMENT ASSISTANT
                </span>

                <h1>
                  Ask your documents
                  anything.
                </h1>

                <p>
                  Search, retrieve and chat
                  with your uploaded documents.
                </p>

              </div>

              <div className="workspace-status">
                <i />
                RAG ONLINE
              </div>

            </div>

            <div className="workspace-3d-banner">

              <div className="workspace-3d-orb">
                <div />
                <div />
                <div />
                <Sparkles size={24} />
              </div>

              <div>
                <strong>
                  Retrieval engine ready
                </strong>

                <span>
                  Semantic embeddings · FAISS ·
                  grounded generation
                </span>
              </div>

              <div className="engine-pills">
                <span>PDF</span>
                <span>VECTOR</span>
                <span>RAG</span>
              </div>

            </div>

            <div className="search-board">

              <div className="search-title">
                <div>
                  <span className="eyebrow">
                    DOCUMENT SEARCH
                  </span>

                  <h2>
                    Search inside your documents
                  </h2>
                </div>

                <Search size={20} />
              </div>

              <div className="search-input-wrap">

                <Search size={20} />

                <input
                  value={searchQuery}
                  onChange={event =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  onKeyDown={event => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      searchDocuments()
                    }
                  }}
                  placeholder="Search for anything in your PDFs..."
                  disabled={
                    searching ||
                    !documents.length
                  }
                />

                <button
                  onClick={
                    searchDocuments
                  }
                  disabled={
                    searching ||
                    !searchQuery.trim() ||
                    !documents.length
                  }
                >
                  {searching
                    ? "Searching..."
                    : "Search"}
                </button>

              </div>

              {searchResults.length > 0 && (
                <div className="search-results">

                  <div className="results-heading">
                    <span>
                      Relevant passages
                    </span>

                    <span>
                      {searchResults.length} results
                    </span>
                  </div>

                  {searchResults.map(
                    (result, index) => (
                      <div
                        className="search-result"
                        key={`${result.source}-${result.page}-${index}`}
                      >

                        <div className="result-icon">
                          <FileText size={18} />
                        </div>

                        <div className="result-content">

                          <div className="result-meta">

                            <strong>
                              {result.source}
                            </strong>

                            <span>
                              Page {result.page}
                            </span>

                            <span>
                              {Math.round(
                                result.score *
                                  100
                              )}
                              % match
                            </span>

                          </div>

                          <p>
                            {result.text}
                          </p>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            <div className="chat-panel">

              <div className="chat-panel-head">

                <div>

                  <span className="eyebrow">
                    RAG CHAT
                  </span>

                  <h2>
                    Document conversation
                  </h2>

                </div>

                <div className="chat-live">
                  <i />
                  LIVE
                </div>

              </div>

              <div className="messages">

                {!messages.length && (
                  <div className="welcome-chat">

                    <div className="big-ai-icon">
                      <Sparkles size={27} />
                    </div>

                    <h2>
                      What would you like to know?
                    </h2>

                    <p>
                      Upload a document and
                      ask questions about its
                      actual content.
                    </p>

                    <div className="suggestions">

                      <button
                        onClick={() =>
                          askQuestion(
                            "Give me a concise summary of the document."
                          )
                        }
                        disabled={
                          !documents.length
                        }
                      >
                        Summarize this document
                        <ChevronRight size={16} />
                      </button>

                      <button
                        onClick={() =>
                          askQuestion(
                            "What are the most important points?"
                          )
                        }
                        disabled={
                          !documents.length
                        }
                      >
                        What are the key points?
                        <ChevronRight size={16} />
                      </button>

                      <button
                        onClick={() =>
                          askQuestion(
                            "What are the main conclusions?"
                          )
                        }
                        disabled={
                          !documents.length
                        }
                      >
                        Show the conclusions
                        <ChevronRight size={16} />
                      </button>

                    </div>

                  </div>
                )}

                {messages.map(
                  (message, index) => (
                    <div
                      className={`message-row ${message.role}`}
                      key={index}
                    >

                      {message.role ===
                        "assistant" && (
                        <div className="message-avatar">
                          <Bot size={16} />
                        </div>
                      )}

                      <div className="message-bubble">

                        <div className="message-text">
                          {message.text}
                        </div>

                        {message.sources
                          ?.length ? (
                          <div className="message-sources">

                            {message.sources.map(
                              source => (
                                <span
                                  key={source}
                                >
                                  <FileText
                                    size={12}
                                  />
                                  {source}
                                </span>
                              )
                            )}

                          </div>
                        ) : null}

                      </div>

                    </div>
                  )
                )}

                {thinking && (
                  <div className="message-row assistant">

                    <div className="message-avatar">
                      <Bot size={16} />
                    </div>

                    <div className="message-bubble typing">
                      <span />
                      <span />
                      <span />
                    </div>

                  </div>
                )}

              </div>

              <div className="composer-wrap">

                <div className="composer">

                  <button
                    className="attach-button"
                    onClick={
                      openUpload
                    }
                  >
                    <Paperclip size={19} />
                  </button>

                  <input
                    ref={inputRef}
                    value={question}
                    onChange={event =>
                      setQuestion(
                        event.target.value
                      )
                    }
                    onKeyDown={
                      handleQuestionKeyDown
                    }
                    placeholder={
                      documents.length
                        ? "Ask a question about your documents..."
                        : "Upload a PDF to start chatting..."
                    }
                    disabled={
                      !documents.length ||
                      thinking
                    }
                  />

                  <button
                    className="send-button"
                    onClick={() =>
                      askQuestion()
                    }
                    disabled={
                      !question.trim() ||
                      thinking ||
                      !documents.length
                    }
                  >
                    <Send size={18} />
                  </button>

                </div>

                <div className="composer-note">
                  Answers are generated from
                  retrieved document context.
                </div>

              </div>

            </div>

          </section>

        </main>
      )}

      {showSummary && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setShowSummary(false)
          }
        >
          <div
            className="summary-modal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <span className="eyebrow">
                  AI SUMMARY
                </span>

                <h2>
                  Document overview
                </h2>
              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setShowSummary(false)
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="summary-content">

              {summary ? (
                <MarkdownText
                  text={summary}
                />
              ) : (
                <div className="summary-loading">
                  <span />
                  <span />
                  <span />
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {showLogin && (
        <div
          className="login-backdrop"
          onClick={() =>
            setShowLogin(false)
          }
        >
          <div
            className="login-modal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <button
              className="login-close"
              onClick={() =>
                setShowLogin(false)
              }
            >
              <X size={18} />
            </button>

            <div className="login-icon">
              <Sparkles size={25} />
            </div>

            <div className="login-heading">
              <span className="eyebrow">
                DOCUMIND AI
              </span>

              <h2>
                Welcome back
              </h2>

              <p>
                Sign in to continue to
                your document workspace.
              </p>
            </div>

            <label>
              Email address

              <div className="login-input">
                <User size={17} />

                <input
                  type="email"
                  value={email}
                  onChange={event =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label>
              Password

              <div className="login-input">
                <ShieldCheck size={17} />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={event =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  onKeyDown={event => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      login()
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </label>

            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            <button
              className="login-submit"
              onClick={login}
            >
              Login
              <ArrowRight size={18} />
            </button>

            <p className="login-note">
              Frontend demo authentication.
              Connect Django/FastAPI authentication
              before using this for real accounts.
            </p>

          </div>
        </div>
      )}

      <footer className="footer">

        <button
          className="brand footer-brand"
          onClick={goHome}
        >
          <span className="brand-mark">
            <Sparkles size={16} />
          </span>

          <span>
            DocuMind AI
          </span>
        </button>

        <span>
          RAG-powered document intelligence
        </span>

        <a
          href="https://github.com/Mymudh/ai-document-chat-rag"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={16} />
          GitHub
        </a>

      </footer>

    </div>
  )
}

function Feature({
  icon,
  title,
  text,
  onClick
}: {
  icon: ReactNode
  title: string
  text: string
  onClick: () => void
}) {
  return (
    <button
      className="feature-card"
      onClick={onClick}
    >
      <div className="feature-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

      <span className="feature-arrow">
        <ArrowRight size={16} />
      </span>
    </button>
  )
}

function WorkflowStep({
  number,
  icon,
  title,
  text
}: {
  number: string
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <div className="workflow-step">

      <span className="step-number">
        {number}
      </span>

      <div className="workflow-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>
  )
}

function MarkdownText({
  text
}: {
  text: string
}) {
  return (
    <div className="markdown-text">
      {text
        .split("\n")
        .map((line, index) => {

          const clean =
            line.replace(
              /^#+\s*/,
              ""
            )

          if (
            line.startsWith("#")
          ) {
            return (
              <h3 key={index}>
                {clean}
              </h3>
            )
          }

          if (
            line
              .trim()
              .startsWith("-")
          ) {
            return (
              <p key={index}>
                •{" "}
                {line
                  .trim()
                  .slice(1)
                  .trim()}
              </p>
            )
          }

          return line.trim() ? (
            <p key={index}>
              {line}
            </p>
          ) : (
            <br key={index} />
          )
        })}
    </div>
  )
}

export default App
