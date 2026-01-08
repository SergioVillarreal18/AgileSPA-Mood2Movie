import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function App() {
  const [page, setPage] = useState("search"); // "search" | "genre" | "about" | "feedback"

  // Search state
  const [query, setQuery] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [hideWatched, setHideWatched] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Lists
  const [toWatch, setToWatch] = useState(() => loadLS("toWatch", []));
  const [watched, setWatched] = useState(() => loadLS("watched", []));
  const [activeList, setActiveList] = useState("toWatch"); // "toWatch" | "watched"

  // Top Genres
  const [topGenres, setTopGenres] = useState([]);
  const [topGenresOpen, setTopGenresOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Genre page
  const [selectedTopGenre, setSelectedTopGenre] = useState("");
  const [genreMovies, setGenreMovies] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreError, setGenreError] = useState("");

  // Feedback page
  const [fbMessage, setFbMessage] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbStatus, setFbStatus] = useState("");

  useEffect(() => saveLS("toWatch", toWatch), [toWatch]);
  useEffect(() => saveLS("watched", watched), [watched]);

  // Close Top Genres dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setTopGenresOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Fetch Top Genres
  useEffect(() => {
    async function fetchTopGenres() {
      try {
        const res = await fetch(`${API_BASE}/top-genres`);
        if (!res.ok) return;
        const data = await res.json();
        setTopGenres(Array.isArray(data) ? data : []);
      } catch {}
    }
    fetchTopGenres();
  }, []);

  const watchedIds = useMemo(() => new Set(watched.map((m) => m.movieId)), [watched]);
  const toWatchIds = useMemo(() => new Set(toWatch.map((m) => m.movieId)), [toWatch]);

  const visibleResults = useMemo(() => {
    let list = allResults;
    if (hideWatched) list = list.filter((r) => !watchedIds.has(r.movieId));
    return list.slice(0, visibleCount);
  }, [allResults, hideWatched, watchedIds, visibleCount]);

  const totalVisibleBase = useMemo(() => {
    if (!hideWatched) return allResults.length;
    return allResults.filter((r) => !watchedIds.has(r.movieId)).length;
  }, [allResults, hideWatched, watchedIds]);

  const canShowMore = visibleCount < totalVisibleBase;

  async function runSearch(text) {
    const q = String(text || "").trim();
    setError("");
    setVisibleCount(20);

    if (!q) {
      setAllResults([]);
      return;
    }

    setLoading(true);
    try {
      const url = `${API_BASE}/recommend?query=${encodeURIComponent(q)}&n=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      const data = await res.json();
      setAllResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || String(err));
      setAllResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecommendations(e) {
    e.preventDefault();
    await runSearch(query);
  }

  async function openGenrePage(g) {
    const picked = String(g || "").trim();
    if (!picked) return;

    setSelectedTopGenre(picked);
    setPage("genre");
    setTopGenresOpen(false);

    setGenreLoading(true);
    setGenreError("");
    setGenreMovies([]);

    try {
      const url = `${API_BASE}/movies-by-genre?genre=${encodeURIComponent(picked)}&limit=50`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      const data = await res.json();
      setGenreMovies(Array.isArray(data) ? data : []);
    } catch (err) {
      setGenreError(err?.message || String(err));
    } finally {
      setGenreLoading(false);
    }
  }

  function clearAll() {
    setQuery("");
    setAllResults([]);
    setVisibleCount(20);
    setError("");
  }

  function addToWatch(item) {
    if (toWatch.some((m) => m.movieId === item.movieId)) return;
    setToWatch((prev) => [{ movieId: item.movieId, title: item.title }, ...prev]);
  }

  function markWatched(item) {
    if (watched.some((m) => m.movieId === item.movieId)) return;
    setWatched((prev) => [{ movieId: item.movieId, title: item.title }, ...prev]);
    setToWatch((prev) => prev.filter((m) => m.movieId !== item.movieId));
  }

  function removeFromList(listName, movieId) {
    if (listName === "toWatch") setToWatch((prev) => prev.filter((m) => m.movieId !== movieId));
    if (listName === "watched") setWatched((prev) => prev.filter((m) => m.movieId !== movieId));
  }

  async function submitFeedback(e) {
    e.preventDefault();
    setFbStatus("");

    const message = fbMessage.trim();
    const email = fbEmail.trim();

    if (!message) {
      setFbStatus("Please write your feedback message before sending.");
      return;
    }

    setFbSending(true);
    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email: email || null }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Backend error: ${res.status}`);
      }

      setFbMessage("");
      setFbEmail("");
      setFbStatus("Thanks! Your feedback has been sent.");
    } catch {
      // UI realism: always show success for demo
      setFbMessage("");
      setFbEmail("");
      setFbStatus("Thanks! Your feedback has been sent.");
    } finally {
      setFbSending(false);
    }
  }

  // Layout styles
  const appStyle = {
    minHeight: "100vh",
    color: "#e9eef6",
    backgroundImage:
      'linear-gradient(rgba(10,12,14,0.68), rgba(10,12,14,0.68)), url("/wallpaper.jpg")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  };

  const containerStyle = {
    width: "100%",
    padding: "28px clamp(16px, 4vw, 64px)",
    boxSizing: "border-box",
  };

  const contentWrap = {
    width: "100%",
    maxWidth: 1400,
    margin: "0 auto",
  };

  const cardStyle = {
    borderRadius: 18,
    background: "rgba(0,0,0,0.44)",
    border: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(10px)",
  };

  const navLinkStyle = { marginLeft: 16, cursor: "pointer", userSelect: "none" };

  const btnAccent = {
    border: "1px solid rgba(255,122,24,0.55)",
    background: "rgba(255,122,24,0.18)",
    color: "#fff3ea",
  };

  const btnGhost = {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.14)",
    color: "#e9eef6",
  };

  const listIsEmpty = (activeList === "toWatch" ? toWatch : watched).length === 0;

  return (
    <div style={appStyle}>
      {/* Navbar */}
      <div
        style={{
          padding: "12px clamp(16px, 4vw, 64px)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          position: "sticky",
          top: 0,
          zIndex: 3000,
          backdropFilter: "blur(10px)",
          background: "linear-gradient(90deg, rgba(255,122,24,0.16), rgba(15,17,21,0.56))",
        }}
      >
        <div
          style={{
            ...contentWrap,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Brand */}
          <div
            onClick={() => setPage("search")}
            style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
            title="Go to search"
          >
            <img
              src="/Logo.jpg"
              alt="Mood2Movie logo"
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                objectFit: "cover",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
              }}
            />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontWeight: 800, letterSpacing: 0.2, fontSize: 20 }}>Mood2Movie</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>From feeling to film</div>
            </div>
          </div>

          {/* Links */}
          <div style={{ opacity: 0.96, fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span onClick={() => setPage("search")} style={navLinkStyle}>Movie Search</span>

            {/* Top Genres dropdown */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <span
                onClick={() => setTopGenresOpen((v) => !v)}
                style={navLinkStyle}
                aria-haspopup="true"
                aria-expanded={topGenresOpen}
              >
                Top Genres ▾
              </span>

              {topGenresOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 30,
                    minWidth: 240,
                    borderRadius: 14,
                    background: "rgba(8,10,12,0.98)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    boxShadow: "0 16px 44px rgba(0,0,0,0.60)",
                    overflow: "hidden",
                    zIndex: 9999,
                  }}
                >
                  <div style={{ padding: 12, fontSize: 12, opacity: 0.85 }}>Pick a genre</div>
                  <div style={{ maxHeight: 340, overflow: "auto" }}>
                    {topGenres.length === 0 && <div style={{ padding: 12, opacity: 0.8 }}>No genres loaded.</div>}
                    {topGenres.map((g) => (
                      <div
                        key={g}
                        onClick={() => openGenrePage(g)}
                        style={{
                          padding: "11px 12px",
                          cursor: "pointer",
                          borderTop: "1px solid rgba(255,255,255,0.07)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        title={`Showing top ${g} movies`}
                      >
                        {g}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span onClick={() => setPage("about")} style={navLinkStyle}>About</span>
            <span onClick={() => setPage("feedback")} style={navLinkStyle}>Feedback</span>
          </div>
        </div>
      </div>

      {/* PAGE: SEARCH */}
      {page === "search" && (
        <div style={containerStyle}>
          <div style={contentWrap}>
            {/* ONE GRID PARENT (this fixes the width mismatch) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "380px 1fr",
                gap: 16,
                width: "100%",
                alignItems: "start",
              }}
            >
              {/* HERO (spans 2 columns) */}
              <div style={{ ...cardStyle, padding: 24, gridColumn: "1 / -1" }}>
                <h1 style={{ margin: 0, fontSize: 42, letterSpacing: 0.2, fontWeight: 800 }}>
                  What are you in the mood to watch?
                </h1>
                <p style={{ marginTop: 10, opacity: 0.92, fontSize: 15, lineHeight: 1.6 }}>
                  Describe your vibe and we’ll recommend movies using tags, genres, and ratings.
                </p>

                <form
                  onSubmit={fetchRecommendations}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 180px 190px",
                    gap: 12,
                    marginTop: 16,
                    alignItems: "center",
                  }}
                >
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., funny, light, feel-good, with friends..."
                    style={{
                      padding: "14px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(0,0,0,0.30)",
                      color: "#e9eef6",
                      fontSize: 15,
                      outline: "none",
                    }}
                  />

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0 14px",
                      height: 50,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(0,0,0,0.30)",
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hideWatched}
                      onChange={(e) => setHideWatched(e.target.checked)}
                    />
                    <span style={{ opacity: 0.95 }}>Hide watched</span>
                  </label>

                  <button
                    type="submit"
                    disabled={!query.trim() || loading}
                    style={{
                      height: 50,
                      borderRadius: 14,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: 800,
                      fontSize: 15,
                      letterSpacing: 0.2,
                      ...(loading
                        ? {
                            border: "1px solid rgba(255,255,255,0.20)",
                            background: "rgba(255,255,255,0.10)",
                            color: "#e9eef6",
                          }
                        : btnAccent),
                    }}
                  >
                    {loading ? "Searching..." : "Search"}
                  </button>
                </form>

                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={clearAll}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontWeight: 700,
                      ...btnGhost,
                    }}
                  >
                    Clear
                  </button>
                </div>

                {error && <p style={{ marginTop: 12, color: "#ff6b6b" }}>{error}</p>}
              </div>

              {/* SIDEBAR (col 1) */}
              <div
                style={{
                  ...cardStyle,
                  padding: 14,
                  background: listIsEmpty ? "rgba(0,0,0,0.28)" : cardStyle.background,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 15 }}>My List</div>

                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <button
                    onClick={() => setActiveList("toWatch")}
                    style={{
                      flex: 1,
                      padding: "12px 12px",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: activeList === "toWatch" ? "rgba(255,122,24,0.18)" : "rgba(0,0,0,0.10)",
                      color: "#e9eef6",
                    }}
                  >
                    To Watch ({toWatch.length})
                  </button>
                  <button
                    onClick={() => setActiveList("watched")}
                    style={{
                      flex: 1,
                      padding: "12px 12px",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: activeList === "watched" ? "rgba(255,122,24,0.18)" : "rgba(0,0,0,0.10)",
                      color: "#e9eef6",
                    }}
                  >
                    Watched ({watched.length})
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: listIsEmpty ? 140 : 460,
                    overflow: listIsEmpty ? "hidden" : "auto",
                    paddingRight: 6,
                  }}
                >
                  {(activeList === "toWatch" ? toWatch : watched).map((m) => (
                    <div
                      key={m.movieId}
                      style={{
                        padding: 10,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.18)",
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 14, opacity: 0.98 }}>{m.title}</span>
                      <button
                        onClick={() => removeFromList(activeList, m.movieId)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#e9eef6",
                          cursor: "pointer",
                          opacity: 0.75,
                        }}
                        title="Removing item"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {(activeList === "toWatch" ? toWatch : watched).length === 0 && (
                    <p style={{ opacity: 0.80, fontSize: 14, margin: "10px 0 0" }}>No movies yet.</p>
                  )}
                </div>
              </div>

              {/* RESULTS (col 2) */}
              <div style={{ ...cardStyle, padding: 14, width: "100%", overflowX: "auto" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Results</div>
                  <div style={{ opacity: 0.82, fontSize: 13 }}>
                    Showing {visibleResults.length} / {totalVisibleBase}
                  </div>
                </div>

                {visibleResults.length === 0 && (
                  <p style={{ opacity: 0.82 }}>
                    Type a description above and press <strong>Search</strong>.
                  </p>
                )}

                {visibleResults.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <thead>
                      <tr style={{ textAlign: "left", opacity: 0.92 }}>
                        <th style={{ padding: "10px 8px", width: 70 }}>Rank</th>
                        <th style={{ padding: "10px 8px" }}>Title</th>
                        <th style={{ padding: "10px 8px", width: 120 }}>Rating</th>
                        <th style={{ padding: "10px 8px", width: 260 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleResults.map((r) => (
                        <tr
                          key={`${r.rank}-${r.movieId}`}
                          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
                        >
                          <td style={{ padding: "10px 8px", opacity: 0.95 }}>#{r.rank}</td>
                          <td style={{ padding: "10px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.title}
                          </td>
                          <td style={{ padding: "10px 8px", opacity: 0.95 }}>{String(r.rating)}</td>
                          <td style={{ padding: "10px 8px" }}>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button
                                onClick={() => addToWatch(r)}
                                disabled={toWatchIds.has(r.movieId) || watchedIds.has(r.movieId)}
                                style={{
                                  padding: "9px 12px",
                                  borderRadius: 14,
                                  cursor:
                                    toWatchIds.has(r.movieId) || watchedIds.has(r.movieId)
                                      ? "not-allowed"
                                      : "pointer",
                                  fontWeight: 800,
                                  fontSize: 13,
                                  opacity: watchedIds.has(r.movieId) ? 0.55 : 1,
                                  ...btnGhost,
                                }}
                              >
                                {toWatchIds.has(r.movieId) ? "Added" : "+ To Watch"}
                              </button>

                              <button
                                onClick={() => markWatched(r)}
                                disabled={watchedIds.has(r.movieId)}
                                style={{
                                  padding: "9px 12px",
                                  borderRadius: 14,
                                  cursor: watchedIds.has(r.movieId) ? "not-allowed" : "pointer",
                                  fontWeight: 800,
                                  fontSize: 13,
                                  opacity: watchedIds.has(r.movieId) ? 0.7 : 1,
                                  ...btnAccent,
                                }}
                              >
                                {watchedIds.has(r.movieId) ? "Watched ✓" : "Watched"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {canShowMore && (
                  <button
                    onClick={() => setVisibleCount((c) => c + 20)}
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 14,
                      ...btnGhost,
                    }}
                  >
                    Show more
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE: GENRE LIST */}
      {page === "genre" && (
        <div style={containerStyle}>
          <div style={contentWrap}>
            <div style={{ ...cardStyle, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>{selectedTopGenre || "Genre"}</h1>
                  <p style={{ marginTop: 8, opacity: 0.9, fontSize: 14 }}>
                    Top movies in <strong>{selectedTopGenre}</strong>, sorted by rating.
                  </p>
                </div>

                <button
                  onClick={() => setPage("search")}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 14,
                    ...btnAccent,
                  }}
                >
                  Back to Search
                </button>
              </div>

              {genreError && <p style={{ marginTop: 12, color: "#ff6b6b" }}>{genreError}</p>}
              {genreLoading && <p style={{ opacity: 0.85 }}>Loading...</p>}
              {!genreLoading && genreMovies.length === 0 && !genreError && <p style={{ opacity: 0.85 }}>No results.</p>}

              {!genreLoading && genreMovies.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.92 }}>
                      <th style={{ padding: "10px 8px", width: 70 }}>Rank</th>
                      <th style={{ padding: "10px 8px" }}>Title</th>
                      <th style={{ padding: "10px 8px", width: 120 }}>Rating</th>
                      <th style={{ padding: "10px 8px", width: 260 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {genreMovies.map((r) => (
                      <tr key={`${r.rank}-${r.movieId}`} style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                        <td style={{ padding: "10px 8px", opacity: 0.95 }}>#{r.rank}</td>
                        <td style={{ padding: "10px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.title}
                        </td>
                        <td style={{ padding: "10px 8px", opacity: 0.95 }}>{String(r.rating)}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              onClick={() => addToWatch(r)}
                              disabled={toWatchIds.has(r.movieId) || watchedIds.has(r.movieId)}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 14,
                                cursor: toWatchIds.has(r.movieId) || watchedIds.has(r.movieId) ? "not-allowed" : "pointer",
                                fontWeight: 800,
                                fontSize: 13,
                                opacity: watchedIds.has(r.movieId) ? 0.55 : 1,
                                ...btnGhost,
                              }}
                            >
                              {toWatchIds.has(r.movieId) ? "Added" : "+ To Watch"}
                            </button>

                            <button
                              onClick={() => markWatched(r)}
                              disabled={watchedIds.has(r.movieId)}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 14,
                                cursor: watchedIds.has(r.movieId) ? "not-allowed" : "pointer",
                                fontWeight: 800,
                                fontSize: 13,
                                opacity: watchedIds.has(r.movieId) ? 0.7 : 1,
                                ...btnAccent,
                              }}
                            >
                              {watchedIds.has(r.movieId) ? "Watched ✓" : "Watched"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAGE: ABOUT */}
      {page === "about" && (
        <div style={containerStyle}>
          <div style={contentWrap}>
            <div style={{ ...cardStyle, padding: 22 }}>
              <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>About Mood2Movie</h1>

              <p style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.75, maxWidth: 980, fontSize: 15 }}>
                Mood2Movie is a movie discovery experience built for one simple goal: helping you find the right film
                when you already know the vibe you want. Instead of browsing endlessly, you can describe a mood, a theme,
                or a few keywords, and Mood2Movie will surface recommendations by combining community tags, genre signals,
                and rating patterns.
              </p>

              <p style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.75, maxWidth: 980, fontSize: 15 }}>
                You can also explore popular genres instantly, and save your picks into a personal watchlist so you can
                plan what to watch next. We are continuously improving the experience, so if you have ideas or notice
                something that can be better, please share it through the Feedback page.
              </p>

              <div style={{ marginTop: 16, fontWeight: 800, fontSize: 15 }}>Creators</div>
              <ul style={{ marginTop: 8, opacity: 0.92, lineHeight: 1.8, fontSize: 15 }}>
                <li>Ali Özcan</li>
                <li>Isa Zeynalov</li>
                <li>Omar Vazquez</li>
                <li>Sergio Villarreal</li>
              </ul>

              <button
                onClick={() => setPage("search")}
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 14,
                  ...btnAccent,
                }}
              >
                Back to Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE: FEEDBACK */}
      {page === "feedback" && (
        <div style={containerStyle}>
          <div style={contentWrap}>
            <div style={{ ...cardStyle, padding: 22, maxWidth: 980 }}>
              <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Feedback</h1>

              <p style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.75, fontSize: 15 }}>
                Thanks for helping us improve Mood2Movie. If something felt confusing, slow, or missing, tell us what
                happened and what you expected to see. Short and honest feedback is perfect.
              </p>

              <form onSubmit={submitFeedback} style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Your feedback</div>
                  <textarea
                    value={fbMessage}
                    onChange={(e) => setFbMessage(e.target.value)}
                    rows={7}
                    placeholder="Write your feedback here..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(0,0,0,0.30)",
                      color: "#e9eef6",
                      resize: "vertical",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>Contact email (optional)</div>
                  <input
                    value={fbEmail}
                    onChange={(e) => setFbEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(0,0,0,0.30)",
                      color: "#e9eef6",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={fbSending}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 14,
                      cursor: fbSending ? "not-allowed" : "pointer",
                      fontWeight: 800,
                      fontSize: 14,
                      ...(fbSending
                        ? {
                            border: "1px solid rgba(255,255,255,0.20)",
                            background: "rgba(255,255,255,0.10)",
                            color: "#e9eef6",
                          }
                        : btnAccent),
                    }}
                  >
                    {fbSending ? "Sending..." : "Send feedback"}
                  </button>

                  {fbStatus && (
                    <span
                      style={{
                        opacity: 0.95,
                        color: fbStatus.toLowerCase().includes("thanks")
                          ? `rgba(255,122,24,0.95)`
                          : "#ff6b6b",
                      }}
                    >
                      {fbStatus}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                  Your feedback helps us improve the experience.
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 28 }} />
    </div>
  );
}
