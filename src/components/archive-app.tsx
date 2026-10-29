"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type VideoRecord = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  source_url: string | null;
  tags: string[];
  created_at: string;
};

type PendingRecord = VideoRecord & { status: string; public_id: string };
type PublicConfig = { archiveEnabled: boolean; uploadsEnabled: boolean; contactEmail: string | null };
type Panel = "submit" | "admin" | null;

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export default function ArchiveApp({ initialPanel = null }: { initialPanel?: Panel }) {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [config, setConfig] = useState<PublicConfig>({ archiveEnabled: false, uploadsEnabled: false, contactEmail: null });

  const fetchVideos = useCallback(async () => {
    const response = await fetch("/api/videos", { cache: "no-store" });
    if (!response.ok) throw new Error("The archive could not be reached.");
    return await response.json() as VideoRecord[];
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/config").then((response) => response.json()).then(async (data: PublicConfig) => {
      if (!active) return;
      setConfig(data);
      if (!data.archiveEnabled) { setLoading(false); return; }
      try { setVideos(await fetchVideos()); }
      catch (error) { setLoadError(error instanceof Error ? error.message : "The archive could not be reached."); }
      finally { setLoading(false); }
    }).catch(() => { if (active) { setLoadError("The archive could not be reached."); setLoading(false); } });
    return () => { active = false; };
  }, [fetchVideos]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setVideos(await fetchVideos());
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "The archive could not be reached.");
    } finally {
      setLoading(false);
    }
  }, [fetchVideos]);

  const visibleVideos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return videos;
    return videos.filter((video) =>
      [video.title, video.description, ...video.tags].join(" ").toLowerCase().includes(normalized),
    );
  }, [query, videos]);

  return (
    <div className="site-shell">
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="Record Commons home">
          <span className="wordmark-mark" aria-hidden="true" /> RECORD COMMONS
        </a>
        <nav className="nav-items" aria-label="Main navigation">
          <a className="nav-link" href="#archive">The archive</a>
          <button className="nav-link nav-submit" onClick={() => setPanel("submit")}>Contribute +</button>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-kicker"><span className="live-dot" /> A community-built record</div>
          <h1 id="hero-title">When a video disappears, <em>the record shouldn’t.</em></h1>
          <p className="hero-copy">A public index of videos people say are difficult to access. Every contribution is reviewed before it appears here.</p>
          <div className="hero-bottom">
            <p className="hero-note">We preserve links and context, not certainty. A listing is a community submission, not proof that a platform or government removed it.</p>
            <button className="hero-cta" onClick={() => setPanel("submit")}>Add a video <span aria-hidden="true">↗</span></button>
          </div>
        </section>

        <section className="section-wrap" id="archive" aria-labelledby="archive-title">
          <div className="section-heading">
            <div><div className="eyebrow">01 / The public index</div><h2 id="archive-title">Recently reviewed</h2></div>
            <div className="feed-meta">{videos.length.toLocaleString()} {videos.length === 1 ? "record" : "records"}</div>
          </div>
          <div className="feed-tools">
            <label className="sr-only" htmlFor="archive-search">Search the archive</label>
            <input id="archive-search" className="search-box" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, notes, topics…" />
            <span className="sort-label">Newest first&nbsp; ↓</span>
          </div>
          <div className="video-grid" style={{ marginTop: 18 }}>
            {loading && <div className="empty-state"><h3>Opening the archive…</h3><p>Loading reviewed submissions.</p></div>}
            {!loading && loadError && <div className="empty-state"><h3>Archive temporarily unavailable</h3><p>{loadError} Try again in a moment.</p><button className="secondary-button" onClick={() => void refresh()} style={{ marginTop: 14 }}>Retry</button></div>}
            {!loading && !loadError && visibleVideos.map((video) => <VideoCard key={video.id} video={video} />)}
            {!loading && !loadError && !config.archiveEnabled && (
              <div className="empty-state"><h3>The archive is being set up.</h3><p>Approved video records will appear here when the owner connects the archive database.</p></div>
            )}
            {!loading && !loadError && config.archiveEnabled && visibleVideos.length === 0 && (
              <div className="empty-state"><h3>{query ? "No matching records" : "The archive starts with a contribution."}</h3><p>{query ? "Try a different search term." : "No videos have been approved yet. Submissions stay private from this index until they are reviewed."}</p></div>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span><span className="footer-mark">Record Commons</span> · A community index, not a source of legal advice.</span>
        <div>{config.contactEmail ? <>Report a concern: <a href={`mailto:${config.contactEmail}`}>contact the archive team</a></> : "Contact details are not configured."}</div>
      </footer>

      {panel === "submit" && <SubmissionDialog config={config} onClose={() => setPanel(null)} onSubmitted={() => { setPanel(null); void refresh(); }} />}
      {panel === "admin" && <AdminDialog onClose={() => setPanel(null)} onChanged={() => void refresh()} />}
    </div>
  );
}

function VideoCard({ video }: { video: VideoRecord }) {
  return (
    <article className="video-card">
      <div className="video-frame">
        <video controls preload="none" playsInline src={video.media_url} aria-label={`Video: ${video.title}`} />
        <span className="video-tag">Reviewed entry</span>
      </div>
      <div className="card-body">
        <div className="card-topline"><span>RECORD / {video.id.slice(0, 6).toUpperCase()}</span><time dateTime={video.created_at}>{dateLabel(video.created_at)}</time></div>
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        <div className="card-footer">{video.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        {video.source_url && <a className="help-text" href={video.source_url} target="_blank" rel="noreferrer">View original source ↗</a>}
      </div>
    </article>
  );
}

function SubmissionDialog({ config, onClose, onSubmitted }: { config: PublicConfig; onClose: () => void; onSubmitted: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (selected && selected.size > 100 * 1024 * 1024) {
      setFile(null);
      setMessage("This uploader accepts files up to 100 MB. The host may impose a lower limit.");
      setError(true);
      return;
    }
    setMessage("");
    setError(false);
    setFile(selected);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
    const tags = String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
    const trap = String(form.get("website") ?? "");
    setBusy(true); setProgress(4); setMessage(""); setError(false);
    try {
      const signResponse = await fetch("/api/upload/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ website: trap }) });
      const signature = await signResponse.json();
      if (!signResponse.ok) throw new Error(signature.error ?? "Upload setup failed.");

      const upload = new FormData();
      upload.append("file", file);
      upload.append("api_key", signature.apiKey);
      upload.append("timestamp", String(signature.timestamp));
      upload.append("public_id", signature.publicId);
      upload.append("upload_preset", signature.uploadPreset);
      upload.append("overwrite", "false");
      upload.append("signature", signature.signature);
      setProgress(16);
      const cloudResponse = await fetch(signature.uploadUrl, { method: "POST", body: upload });
      const cloudResult = await cloudResponse.json();
      if (!cloudResponse.ok) throw new Error(cloudResult.error?.message ?? "The video host rejected the upload.");
      setProgress(83);

      const submitResponse = await fetch("/api/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        title, description, sourceUrl, tags, mediaUrl: cloudResult.secure_url, publicId: cloudResult.public_id, bytes: cloudResult.bytes, format: cloudResult.format, proof: signature.proof, rightsConfirmed: true, website: trap,
      }) });
      const result = await submitResponse.json();
      if (!submitResponse.ok) throw new Error(result.error ?? "The submission could not be saved.");
      setProgress(100);
      setMessage("Your video is in the review queue. It will not appear in the public index unless approved.");
      window.setTimeout(onSubmitted, 1300);
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <Dialog onClose={onClose} eyebrow="02 / Contribute" title="Add to the record">
    {!config.uploadsEnabled ? <div className="notice warning">Submissions are not configured yet. The archive owner must finish the database, video-hosting, and abuse-protection setup before uploads can be accepted.</div> : null}
    <p className="help-text" style={{ fontSize: 11, margin: "-8px 0 17px" }}>Your submission is anonymous and held for review. The video is uploaded to an external host before review; anyone who obtains its direct URL may be able to view it, so do not upload sensitive or private material.</p>
    <form className="form-stack" onSubmit={submit}>
      <label><span className="field-label">Video file *</span><span className="file-field"><input type="file" accept="video/mp4,video/webm,video/quicktime" required disabled={busy || !config.uploadsEnabled} onChange={chooseFile} /><span className="help-text">MP4, WebM, or MOV · up to 100 MB in this uploader</span></span></label>
      <label><span className="field-label">Title *</span><input className="field" name="title" maxLength={120} required placeholder="A short, descriptive title" disabled={busy || !config.uploadsEnabled} /></label>
      <label><span className="field-label">What should people know? *</span><textarea className="textarea" name="description" maxLength={1200} required placeholder="Add context, date, or what makes the video difficult to access." disabled={busy || !config.uploadsEnabled} /></label>
      <label><span className="field-label">Original public link</span><input className="field" name="sourceUrl" type="url" maxLength={500} placeholder="https://…" disabled={busy || !config.uploadsEnabled} /></label>
      <label><span className="field-label">Topics</span><input className="field" name="tags" maxLength={160} placeholder="election, public record, region (comma-separated)" disabled={busy || !config.uploadsEnabled} /></label>
      <label className="checkbox-row"><input type="checkbox" required disabled={busy || !config.uploadsEnabled} /><span>I have the right to submit this video, and I understand the archive may reject or remove it after review.</span></label>
      <label className="sr-only" aria-hidden="true">Leave blank<input tabIndex={-1} autoComplete="off" name="website" /></label>
      {busy && <div className="progress-track" aria-label={`Upload ${progress}% complete`}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>}
      {message && <div className={`notice${error ? " error" : ""}`} role="status">{message}</div>}
      <button className="primary-button" type="submit" disabled={busy || !config.uploadsEnabled || !file}>{busy ? "UPLOADING & SENDING FOR REVIEW…" : "SUBMIT FOR REVIEW ↗"}</button>
    </form>
  </Dialog>;
}

function AdminDialog({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<PendingRecord[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      setLoggedIn(true); setError(false); setPassword(""); await loadPending();
    } catch (caught) { setError(true); setMessage(caught instanceof Error ? caught.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  async function loadPending() {
    const response = await fetch("/api/admin/submissions", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load submissions.");
    setItems(result as PendingRecord[]);
  }

  async function review(id: string, status: "approved" | "rejected") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update the submission.");
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage(`Submission ${status}.`); setError(false); onChanged();
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Could not update the submission."); setError(true); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/submissions", { method: "DELETE" });
    setLoggedIn(false);
    setItems([]);
  }

  return <Dialog onClose={onClose} eyebrow="Moderator access" title="Review desk">
    {!loggedIn ? <form className="form-stack" onSubmit={login}>
      <p className="help-text" style={{ fontSize: 11, margin: "-8px 0 8px" }}>This area is for the archive owner. Contributor submissions do not require an account.</p>
      <label><span className="field-label">Moderator password</span><input className="field" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      {message && <div className={`notice${error ? " error" : ""}`} role="alert">{message}</div>}
      <button className="primary-button" disabled={busy}>{busy ? "CHECKING…" : "OPEN REVIEW DESK"}</button>
    </form> : <div className="form-stack">
      <p className="help-text" style={{ fontSize: 11, margin: "-8px 0 8px" }}>New submissions stay out of the public archive until you approve them.</p>
      <button className="secondary-button" onClick={() => void logout()} style={{ justifySelf: "end" }}>Lock review desk</button>
      {message && <div className={`notice${error ? " error" : ""}`} role="status">{message}</div>}
      {items.length === 0 ? <div className="empty-state"><h3>Nothing waiting</h3><p>There are no pending submissions to review.</p></div> : <div className="review-list">{items.map((item) => <article className="review-item" key={item.id}>
        <div className="card-topline"><span>PENDING · {item.id.slice(0, 8)}</span><time>{dateLabel(item.created_at)}</time></div>
        <h3>{item.title}</h3><p className="help-text">{item.description}</p>
        <video controls preload="metadata" playsInline src={item.media_url} style={{ width: "100%", maxHeight: 250, background: "#15231b" }} aria-label={`Review video: ${item.title}`} />
        {item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer" className="help-text">Open source ↗</a>}
        <div className="review-actions"><button className="secondary-button approve" disabled={busy} onClick={() => void review(item.id, "approved")}>Approve</button><button className="secondary-button reject" disabled={busy} onClick={() => void review(item.id, "rejected")}>Reject</button></div>
      </article>)}</div>}
    </div>}
  </Dialog>;
}

function Dialog({ children, onClose, eyebrow, title }: { children: React.ReactNode; onClose: () => void; eyebrow: string; title: string }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog-head"><div><div className="eyebrow">{eyebrow}</div><h2 id="dialog-title">{title}</h2></div><button className="close-button" onClick={onClose} aria-label="Close dialog">×</button></div>
      {children}
    </section>
  </div>;
}
