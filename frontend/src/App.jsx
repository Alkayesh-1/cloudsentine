import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ShieldCheck, Activity, Cloud, Database, AlertTriangle, FileSearch,
  Network, Siren, RefreshCw, Plus, CheckCircle2, Sun, Moon,
  LogIn, LogOut, UserRound, X
} from "lucide-react";
import "./CloudSentinel_theme_auth.css";

const API = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://localhost:8000");
const nav = [
  ["Overview", "overview"],
  ["Log Analyzer", "analyzer"],
  ["Threat Detections", "detections"],
  ["Incidents", "incidents"],
  ["Cloud Resources", "resources"]
];

function App() {
  const [page, setPage] = useState("overview");
  const [summary, setSummary] = useState({ events: 0, detections: 0, critical: 0, open_incidents: 0 });
  const [events, setEvents] = useState([]);
  const [detections, setDetections] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("cloudsentinel-theme") || "dark";
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("cloudsentinel-demo-user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => {
    localStorage.setItem("cloudsentinel-theme", theme);
  }, [theme]);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const [s, e, d, i] = await Promise.all([
        axios.get(`${API}/api/dashboard/summary`),
        axios.get(`${API}/api/events`),
        axios.get(`${API}/api/detections`),
        axios.get(`${API}/api/incidents`)
      ]);
      setSummary(s.data);
      setEvents(e.data);
      setDetections(d.data);
      setIncidents(i.data);
    } catch {
      setMessage("Backend not connected. Start the FastAPI server and refresh.");
    }
  }

  async function action(path, success) {
    setBusy(true);
    setMessage("");
    try {
      const result = await axios.post(`${API}${path}`);
      setMessage(result.data.message || success);
      await refresh();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Action failed. Check that the backend is running.");
    } finally {
      setBusy(false);
    }
  }

  function handleDemoLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const nameFromEmail = email.split("@")[0].replace(/[._-]/g, " ");
    const displayName = nameFromEmail
      ? nameFromEmail.replace(/\b\w/g, letter => letter.toUpperCase())
      : "Security Analyst";
    const demoUser = { name: displayName, email };
    setUser(demoUser);
    localStorage.setItem("cloudsentinel-demo-user", JSON.stringify(demoUser));
    setAuthOpen(false);
    setMessage("Demo account session started. Real authentication will be connected to the backend later.");
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("cloudsentinel-demo-user");
    setMessage("You have signed out of the demo session.");
  }

  const metricCards = [
    { label: "Security Events", value: summary.events, icon: Activity, tone: "blue" },
    { label: "Detections", value: summary.detections, icon: FileSearch, tone: "purple" },
    { label: "Critical Alerts", value: summary.critical, icon: AlertTriangle, tone: "red" },
    { label: "Open Incidents", value: summary.open_incidents, icon: Siren, tone: "amber" }
  ];

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={22} /></div>
          <div><b>CloudSentinel</b><small>SECURITY INTELLIGENCE</small></div>
        </div>

        <div className="workspace"><span className="live-dot" /> Demo Environment <span className="chevron">⌄</span></div>
        <div className="nav-label">WORKSPACE</div>

        {nav.map(([label, key]) => (
          <button key={key} className={`nav-item ${page === key ? "active" : ""}`} onClick={() => setPage(key)}>
            <span className="nav-icon">
              {key === "overview" ? <Activity size={17} /> :
                key === "analyzer" ? <FileSearch size={17} /> :
                  key === "detections" ? <AlertTriangle size={17} /> :
                    key === "incidents" ? <Siren size={17} /> : <Cloud size={17} />}
            </span>
            {label}
            {key === "incidents" && summary.open_incidents > 0 && <span className="nav-count">{summary.open_incidents}</span>}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="secure-card">
            <ShieldCheck size={18} /><b>Protected Demo</b>
            <p>Analysis and response actions run against synthetic data only.</p>
          </div>

          <div className="user-row">
            <div className="avatar">{user ? user.name.slice(0, 2).toUpperCase() : "CS"}</div>
            <div className="user-details">
              <b>{user ? user.name : "Security Analyst"}</b>
              <small>{user ? user.email : "Demo workspace"}</small>
            </div>
            {user
              ? <button className="user-action" title="Log out" onClick={logout}><LogOut size={16} /></button>
              : <button className="user-action" title="Log in" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}><LogIn size={16} /></button>}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><span className="crumb">Workspace / </span><b>{nav.find(n => n[1] === page)?.[0] || "Overview"}</b></div>
          <div className="top-actions">
            <span className="status"><i /> System Operational</span>
            <button
              className="icon-button theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="top-user-button" onClick={() => {
              if (user) logout();
              else { setAuthMode("login"); setAuthOpen(true); }
            }} title={user ? "Log out" : "Log in"}>
              {user ? <span className="avatar small">{user.name.slice(0, 2).toUpperCase()}</span> : <UserRound size={17} />}
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CLOUD SECURITY OPERATIONS</div>
              <h1>{page === "overview" ? "Security Overview" : nav.find(n => n[1] === page)?.[0]}</h1>
              <p>{page === "overview" ? "Monitor activity, detect anomalies, and manage security incidents." : "Review your secure environment and investigate suspicious activity."}</p>
            </div>
            <div className="heading-actions">
              <button className="button secondary" disabled={busy} onClick={() => action("/api/demo/generate", "Demo events generated")}><Plus size={16} /> Generate demo events</button>
              <button className="button primary" disabled={busy} onClick={() => action("/api/analyze", "Analysis complete")}><Activity size={16} /> Analyze events</button>
            </div>
          </div>

          {message && <div className="notice">{message}<button onClick={() => setMessage("")}>×</button></div>}

          {page === "overview" && <>
            <div className="metrics">
              {metricCards.map(m => (
                <div className="metric-card" key={m.label}>
                  <div className={`metric-icon ${m.tone}`}><m.icon size={19} /></div>
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value">{m.value.toLocaleString()}</div>
                  <div className="metric-foot"><span className="foot-dot" /> Current demo data</div>
                </div>
              ))}
            </div>
            <div className="section-grid">
              <section className="panel wide">
                <div className="panel-head">
                  <div><h2>Recent Security Events</h2><p>Latest activity recorded in the demo environment</p></div>
                  <button className="text-button" onClick={() => setPage("analyzer")}>View analyzer ↗</button>
                </div>
                <EventTable events={events.slice(0, 7)} />
              </section>
              <section className="panel">
                <div className="panel-head">
                  <div><h2>Detection Summary</h2><p>Risk distribution overview</p></div>
                  <span className="panel-tag">LIVE DATA</span>
                </div>
                <div className="risk-summary">
                  <div className="risk-number">{summary.detections}<small>detections</small></div>
                  <div className="risk-bars">
                    <div><span>Critical</span><b className="red">{summary.critical}</b></div>
                    <div className="bar"><i style={{ width: `${summary.detections ? summary.critical / summary.detections * 100 : 0}%` }} /></div>
                    <div><span>High / Medium / Low</span><b>{Math.max(0, summary.detections - summary.critical)}</b></div>
                    <div className="bar muted"><i style={{ width: `${summary.detections ? Math.max(0, summary.detections - summary.critical) / summary.detections * 100 : 0}%` }} /></div>
                  </div>
                </div>
                <div className="panel-note"><ShieldCheck size={16} /> Detection combines anomaly scoring and security rules.</div>
              </section>
            </div>
            <section className="panel">
              <div className="panel-head">
                <div><h2>Recent Incidents</h2><p>Incidents requiring investigation or containment</p></div>
                <button className="text-button" onClick={() => setPage("incidents")}>View incidents ↗</button>
              </div>
              <IncidentTable incidents={incidents.slice(0, 5)} onContain={id => action(`/api/incidents/${id}/simulate-containment`, "Incident simulated as contained")} />
            </section>
          </>}

          {page === "analyzer" && <section className="panel analyzer-panel">
            <div className="analyzer-hero">
              <div className="analyzer-icon"><FileSearch size={26} /></div>
              <h2>Security Log Analyzer</h2>
              <p>Generate a controlled dataset, then analyze event patterns with the demo ML model and detection rules.</p>
              <div className="analyzer-actions">
                <button className="button secondary" disabled={busy} onClick={() => action("/api/demo/generate", "Demo events generated")}><Plus size={16} /> Generate synthetic logs</button>
                <button className="button primary" disabled={busy} onClick={() => action("/api/analyze", "Analysis complete")}><Activity size={16} /> Run analysis</button>
              </div>
              <div className="safe-label"><ShieldCheck size={15} /> Safe demo: no real cloud resources are modified.</div>
            </div>
            <div className="panel-head"><div><h2>Event Preview</h2><p>{events.length} events available</p></div></div>
            <EventTable events={events} />
          </section>}

          {page === "detections" && <section className="panel">
            <div className="panel-head"><div><h2>Threat Detections</h2><p>Model and rule-based analysis results</p></div><span className="panel-tag">{detections.length} RECORDS</span></div>
            <DetectionTable detections={detections} />
          </section>}

          {page === "incidents" && <section className="panel">
            <div className="panel-head"><div><h2>Incident Response</h2><p>Manage and simulate containment for detected incidents</p></div></div>
            <IncidentTable incidents={incidents} onContain={id => action(`/api/incidents/${id}/simulate-containment`, "Incident simulated as contained")} />
          </section>}

          {page === "resources" && <section className="panel resource-placeholder">
            <div className="resource-symbol"><Cloud size={32} /></div>
            <h2>Simulated Cloud Resources</h2>
            <p>Resource inventory is planned for the next MVP increment. The current demo focuses on log analysis, detections, and incident response.</p>
            <div className="resource-list">
              <div><Cloud size={17} /> Demo Compute Instance <span className="pill green">Running</span></div>
              <div><Database size={17} /> Demo PostgreSQL <span className="pill green">Connected</span></div>
              <div><Network size={17} /> Demo Network <span className="pill blue">Simulated</span></div>
            </div>
          </section>}

          <footer>CloudSentinel <span>•</span> University Cloud Security Demo <span>•</span> Synthetic data only</footer>
        </div>
      </main>

      {authOpen && <div className="auth-overlay" onClick={() => setAuthOpen(false)}>
        <section className="auth-modal" onClick={event => event.stopPropagation()}>
          <button className="auth-close" onClick={() => setAuthOpen(false)} aria-label="Close login dialog"><X size={18} /></button>
          <div className="auth-logo"><ShieldCheck size={24} /></div>
          <div className="auth-kicker">CLOUDSENTINEL ACCOUNT</div>
          <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="auth-description">Sign in to your security workspace. This is currently a front-end demo session.</p>
          <form onSubmit={handleDemoLogin}>
            {authMode === "signup" && <label>Full name<input name="name" type="text" placeholder="Your name" autoComplete="name" /></label>}
            <label>Email address<input name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" placeholder="Enter password" autoComplete={authMode === "login" ? "current-password" : "new-password"} required minLength={6} /></label>
            <button className="button primary auth-submit" type="submit">{authMode === "login" ? "Log in to workspace" : "Create demo account"}</button>
          </form>
          <div className="auth-switch">
            {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Create account" : "Log in"}</button>
          </div>
          <div className="auth-demo-note"><ShieldCheck size={14} /> Demo only — credentials are not sent to a server.</div>
        </section>
      </div>}
    </div>
  );
}

function EventTable({ events }) {
  if (!events.length) return <div className="empty">No events yet. Generate demo events to begin.</div>;
  return <div className="table-wrap"><table><thead><tr><th>EVENT</th><th>ACTOR</th><th>SOURCE IP</th><th>FAILED LOGINS</th><th>REQUESTS / MIN</th><th>STATUS</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td><b>{e.event_type}</b><small>{e.note}</small></td><td>{e.actor}</td><td className="mono">{e.source_ip}</td><td>{e.failed_logins}</td><td>{e.requests_per_minute}</td><td><span className={`pill ${e.analyzed ? "blue" : "gray"}`}>{e.analyzed ? "Analyzed" : "Pending"}</span></td></tr>)}</tbody></table></div>;
}

function DetectionTable({ detections }) {
  if (!detections.length) return <div className="empty">No detections yet. Generate and analyze demo events.</div>;
  return <div className="table-wrap"><table><thead><tr><th>THREAT / EVENT</th><th>ACTOR</th><th>RISK</th><th>SEVERITY</th><th>METHOD</th><th>EXPLANATION</th></tr></thead><tbody>{detections.map(d => <tr key={d.id}><td><b>{d.event_type}</b><small>{new Date(d.timestamp).toLocaleString()}</small></td><td>{d.actor}<small>{d.source_ip}</small></td><td><b>{d.risk_score}/100</b></td><td><span className={`pill ${d.severity.toLowerCase()}`}>{d.severity}</span></td><td>{d.method}</td><td className="explanation">{d.explanation}</td></tr>)}</tbody></table></div>;
}

function IncidentTable({ incidents, onContain }) {
  if (!incidents.length) return <div className="empty">No incidents created. Analyze events to generate risk-based incidents.</div>;
  return <div className="table-wrap"><table><thead><tr><th>INCIDENT</th><th>ACTOR</th><th>RISK</th><th>STATUS</th><th>RESPONSE</th></tr></thead><tbody>{incidents.map(i => <tr key={i.id}><td><b>{i.title}</b><small>Incident #{i.id}</small></td><td>{i.actor}<small>{i.source_ip}</small></td><td><b>{i.risk_score}/100</b><small>{i.severity}</small></td><td><span className={`pill ${i.status.toLowerCase()}`}>{i.status}</span></td><td>{i.status === "Open" ? <button className="mini-button" onClick={() => onContain(i.id)}><CheckCircle2 size={14} /> Simulate containment</button> : <span className="response-done">Demo contained</span>}</td></tr>)}</tbody></table></div>;
}

export default App;
