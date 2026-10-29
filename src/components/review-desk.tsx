"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { cloudinaryPoster } from "@/lib/media-url.mjs";

type PendingRecord = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  source_url: string | null;
  tags: string[];
  status: string;
  public_id: string;
  created_at: string;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ReviewDesk() {
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<PendingRecord[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadPending() {
    setLoadingQueue(true);
    try {
      const response = await fetch("/api/admin/submissions", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load submissions.");
      setItems(result as PendingRecord[]);
    } finally {
      setLoadingQueue(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(result.error ?? "Could not check moderator session.");
        if (!result.authenticated) return;
        setLoggedIn(true);
        await loadPending();
      })
      .catch((error: unknown) => {
        if (active) {
          setIsError(true);
          setMessage(error instanceof Error ? error.message : "Could not check moderator session.");
        }
      })
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      setLoggedIn(true);
      setPassword("");
      await loadPending();
      setMessage("");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, status: "approved" | "rejected") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update the submission.");
      setItems((current) => current.filter((item) => item.id !== id));
      setIsError(false);
      setMessage(`Submission ${status}. The uploaded video remains in storage.`);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not update the submission.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/submissions", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not lock the review desk.");
      setLoggedIn(false);
      setItems([]);
      setMessage("Review desk locked.");
      setIsError(false);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not lock the review desk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-page">
      <header className="review-header">
        <Link className="wordmark" href="/" aria-label="Record Commons public index">
          <span className="wordmark-mark" aria-hidden="true" /> RECORD COMMONS
        </Link>
        <div className="review-header-actions">
          {loggedIn && <span className="review-session"><span className="session-dot" /> Moderator session</span>}
          {loggedIn && <button className="secondary-button" type="button" onClick={() => void logout()} disabled={busy}>Lock review desk</button>}
          <Link className="review-back-link" href="/">Back to index <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <main className="review-workspace">
        {!loggedIn ? (
          <section className="review-login" aria-labelledby="review-title">
            <div className="eyebrow">PRIVATE MODERATOR AREA</div>
            <h1 id="review-title">Review desk</h1>
            {checkingSession ? <p className="help-text">Checking your session…</p> : <>
              <p className="help-text">Sign in to review community submissions. Contributors do not need an account.</p>
              <form className="review-login-form" onSubmit={login}>
                <label htmlFor="moderator-password" className="field-label">Moderator password</label>
                <input id="moderator-password" className="field" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                {message && <div className={`notice${isError ? " error" : ""}`} role={isError ? "alert" : "status"}>{message}</div>}
                <button className="primary-button" type="submit" disabled={busy}>{busy ? "CHECKING…" : "OPEN REVIEW DESK"}</button>
              </form>
            </>}
          </section>
        ) : (
          <>
            <div className="review-page-heading">
              <div>
                <div className="eyebrow">MODERATION <span>·</span> PRIVATE QUEUE</div>
                <h1 id="review-title">Review desk</h1>
                <p>Check context and media before deciding what appears in the public index.</p>
              </div>
              <div className="review-total"><strong>{items.length}</strong><span>waiting for review</span></div>
            </div>

            {message && <div className={`notice review-message${isError ? " error" : ""}`} role={isError ? "alert" : "status"}>{message}</div>}

            <div className="review-layout">
              <aside className="review-rail" aria-label="Queue information">
                <div className="review-rail-label">CURRENT QUEUE</div>
                <div className="review-rail-count">{String(items.length).padStart(2, "0")}</div>
                <p>Pending submissions</p>
                <div className="review-rail-rule" />
                <div className="review-rail-label">REVIEW REMINDER</div>
                <p className="review-reminder">Approving a record lists it publicly. Rejecting it removes it from this queue; it does not delete the uploaded video.</p>
                <button className="secondary-button review-refresh" type="button" onClick={() => void loadPending()} disabled={busy}>Refresh queue</button>
              </aside>

              <section className="review-content" aria-label="Pending submissions">
                {loadingQueue ? (
                  <div className="review-empty"><h2>Loading queue</h2><p>Fetching submissions for review.</p></div>
                ) : items.length === 0 ? (
                  <div className="review-empty"><span className="review-empty-mark" aria-hidden="true">✓</span><h2>Queue is clear</h2><p>There are no submissions waiting for review.</p></div>
                ) : items.map((item, index) => (
                  <article className="review-card" key={item.id}>
                    <div className="review-card-topline">
                      <span><span className="pending-dot" /> SUBMISSION {String(index + 1).padStart(2, "0")}</span>
                      <time dateTime={item.created_at}>{dateLabel(item.created_at)}</time>
                    </div>
                    <div className="review-card-body">
                      <div className="review-media">
                        <video controls preload="none" playsInline poster={cloudinaryPoster(item.media_url)} src={item.media_url} aria-label={`Review video: ${item.title}`} />
                      </div>
                      <div className="review-details">
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        {item.tags.length > 0 && <div className="review-tags">{item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>}
                        {item.source_url && <a className="review-source" href={item.source_url} target="_blank" rel="noreferrer">Open submitted source <span aria-hidden="true">↗</span></a>}
                        <div className="review-actions">
                          <button className="secondary-button approve" type="button" disabled={busy} onClick={() => void review(item.id, "approved")}>Approve record</button>
                          <button className="secondary-button reject" type="button" disabled={busy} onClick={() => void review(item.id, "rejected")}>Reject submission</button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
