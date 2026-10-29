"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { cloudinaryPoster } from "@/lib/media-url.mjs";

type VideoRecord = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  source_url: string | null;
  tags: string[];
  created_at: string;
};

type PublicConfig = { archiveEnabled: boolean; uploadsEnabled: boolean; uploadRelayEnabled: boolean; contactEmail: string | null };
type Panel = "submit" | null;

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export default function ArchiveApp() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [config, setConfig] = useState<PublicConfig>({ archiveEnabled: false, uploadsEnabled: false, uploadRelayEnabled: false, contactEmail: null });

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
          <button className="nav-link nav-submit" onClick={() => setPanel("submit")}>Contribute +</button>
        </nav>
      </header>

      <main id="top">
        <section className="section-wrap" id="archive" aria-labelledby="archive-title">
          <div className="section-heading">
            <div><div className="eyebrow">RECORD COMMONS</div><h1 id="archive-title">Video index</h1></div>
            <div className="feed-meta"><span className="feed-count">{videos.length.toLocaleString()}</span><span>{videos.length === 1 ? "record" : "records"} in the index</span></div>
          </div>
          <div className="feed-tools">
            <label className="sr-only" htmlFor="archive-search">Search the archive</label>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input id="archive-search" type="search" className="search-box" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the index…" />
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
        {config.contactEmail && <div>Report a concern: <a href={`mailto:${config.contactEmail}`}>contact the archive team</a></div>}
      </footer>

      {panel === "submit" && <SubmissionDialog config={config} onClose={() => setPanel(null)} onSubmitted={() => { setPanel(null); void refresh(); }} />}
    </div>
  );
}

function VideoCard({ video }: { video: VideoRecord }) {
  return (
    <article className="video-card">
      <div className="video-frame">
        <video controls preload="none" playsInline poster={cloudinaryPoster(video.media_url)} src={video.media_url} aria-label={`Video: ${video.title}`} />
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

      setProgress(16);
      const chunkSize = 6 * 1024 * 1024;
      const uploadId = crypto.randomUUID();
      let cloudResult: Record<string, unknown> | null = null;
      for (let start = 0; start < file.size; start += chunkSize) {
        const end = Math.min(start + chunkSize, file.size) - 1;
        const upload = new FormData();
        upload.append("file", file.slice(start, end + 1), file.name);
        upload.append("api_key", signature.apiKey);
        upload.append("timestamp", String(signature.timestamp));
        upload.append("public_id", signature.publicId);
        upload.append("upload_preset", signature.uploadPreset);
        upload.append("transformation", signature.transformation);
        upload.append("overwrite", "false");
        upload.append("signature", signature.signature);
        const cloudResponse = await fetch(signature.uploadUrl, {
          method: "POST",
          headers: { "X-Unique-Upload-Id": uploadId, "Content-Range": `bytes ${start}-${end}/${file.size}` },
          body: upload,
        });
        cloudResult = await cloudResponse.json();
        if (!cloudResponse.ok) throw new Error((cloudResult?.error as { message?: string } | undefined)?.message ?? "The video host rejected the upload.");
        setProgress(16 + Math.round(((end + 1) / file.size) * 64));
      }
      if (!cloudResult) throw new Error("The video upload did not complete.");
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
    {!config.uploadsEnabled ? <div className="notice warning">Submissions are paused until the database, video host, abuse protection, and required upload relay are configured.</div> : null}
    <p className="help-text privacy-note" style={{ fontSize: 11, margin: "-8px 0 17px" }}>{config.uploadRelayEnabled ? "We do not ask for your name or email. Cloudinary strips embedded global metadata, including GPS tags, during upload. This does not remove identifying details visible or audible in the video, or every stream-level field. Cloudinary receives the relay's IP address, while the relay operator and this site's host may still see your connection IP. This is not guaranteed anonymity." : "Submissions are paused until the upload relay is configured. When enabled, Cloudinary will strip embedded global metadata, including GPS tags, during upload. This cannot remove identifying details visible or audible in the video, and the site host and your network provider may still see that you visit this site. This is not guaranteed anonymity."}</p>
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
