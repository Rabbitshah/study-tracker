import { useState, useEffect, useRef, useCallback } from 'react';
import { greVocabData } from '../utils/greVocabData';
import api from '../services/api';

export default function WordList() {
  const [q, setQ] = useState('');
  const [gFilter, setGFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState('Group 1');
  const [showBackTop, setShowBackTop] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);

  const [learnedSet, setLearnedSet] = useState(() => {
    try {
      const stored = localStorage.getItem('gre_learned');
      return new Set(JSON.parse(stored || '[]'));
    } catch {
      return new Set();
    }
  });

  const searchInputRef = useRef(null);
  const cardRefs = useRef({});

  const GROUPS = Object.keys(greVocabData);
  const TOTAL_WORDS = Object.values(greVocabData).reduce((sum, arr) => sum + arr.length, 0);

  // On mount, sync localStorage with database
  useEffect(() => {
    const localWords = (() => {
      try {
        const stored = localStorage.getItem('gre_learned');
        return JSON.parse(stored || '[]');
      } catch {
        return [];
      }
    })();

    api.post('/progress/vocab/sync', { words: localWords })
      .then(res => {
        const backendWords = res.data;
        setLearnedSet(new Set(backendWords));
        localStorage.setItem('gre_learned', JSON.stringify(backendWords));
      })
      .catch(err => {
        console.error('Failed to sync vocab cards with backend:', err);
      });
  }, []);

  const toggleLearned = async (id) => {
    const parts = id.split('|');
    if (parts.length !== 2) return;
    const [group_name, word] = parts;

    // Optimistically update UI state
    const next = new Set(learnedSet);
    const wasLearned = next.has(id);
    if (wasLearned) next.delete(id);
    else next.add(id);

    setLearnedSet(next);
    localStorage.setItem('gre_learned', JSON.stringify([...next]));

    try {
      await api.post('/progress/vocab/toggle', { group_name, word });
    } catch (err) {
      console.error('Failed to toggle learned word:', err);
      // Revert on error
      const revert = new Set(learnedSet);
      if (wasLearned) revert.add(id);
      else revert.delete(id);
      setLearnedSet(revert);
      localStorage.setItem('gre_learned', JSON.stringify([...revert]));
    }
  };

  const resetLearned = async () => {
    if (!window.confirm('Reset all learned marks?')) return;

    const prev = new Set(learnedSet);

    // Optimistically clear
    setLearnedSet(new Set());
    localStorage.setItem('gre_learned', JSON.stringify([]));

    try {
      await api.post('/progress/vocab/reset');
    } catch (err) {
      console.error('Failed to reset learned words:', err);
      // Revert on error
      setLearnedSet(prev);
      localStorage.setItem('gre_learned', JSON.stringify([...prev]));
    }
  };

  // Build flat ordered list of card IDs from currently filtered data
  const buildFlatCardIds = useCallback((filteredData) => {
    const ids = [];
    Object.entries(filteredData).forEach(([gName, words]) => {
      words.forEach(([word]) => ids.push(`${gName}|${word}`));
    });
    return ids;
  }, []);

  // Scroll expanded card fully into view after render and focus it
  useEffect(() => {
    if (!expandedCardId) return;
    const el = cardRefs.current[expandedCardId];
    if (!el) return;
    // Wait one frame so the DOM has expanded before measuring
    const frame = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [expandedCardId]);

  // Filter words — computed here so keyboard handler can use it
  let displayedWordsCount = 0;
  const filteredGroupsData = {};
  GROUPS.forEach((g) => {
    if (gFilter && gFilter !== g) return;
    const words = greVocabData[g].filter(([word, pos, meaning, syns]) => {
      const matchQ =
        !q ||
        word.toLowerCase().includes(q.toLowerCase()) ||
        meaning.toLowerCase().includes(q.toLowerCase()) ||
        syns.toLowerCase().includes(q.toLowerCase());
      const matchP = !posFilter || pos.toLowerCase().startsWith(posFilter.toLowerCase());
      const matchL = !onlyLearned || learnedSet.has(`${g}|${word}`);
      return matchQ && matchP && matchL;
    });
    if (words.length > 0) {
      filteredGroupsData[g] = words;
      displayedWordsCount += words.length;
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 400);
      let currentActive = null;
      const blocks = document.querySelectorAll('.vocab-group-block');
      for (const block of blocks) {
        const rect = block.getBoundingClientRect();
        if (rect.top <= 120) currentActive = block.dataset.group;
      }
      if (currentActive) setActiveGroup(currentActive);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (q !== '' || document.activeElement === searchInputRef.current) {
          e.preventDefault();
          setQ('');
          searchInputRef.current?.blur();
        }
        if (expandedCardId) setExpandedCardId(null);
      }

      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'SELECT') return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }

      // L — mark learned AND advance to next card
      if (e.key === 'l' || e.key === 'L') {
        if (expandedCardId) {
          e.preventDefault();
          const wasLearned = learnedSet.has(expandedCardId);
          toggleLearned(expandedCardId);

          // Only advance if it is now marked learned (meaning it wasn't learned before)
          if (!wasLearned) {
            const flatIds = buildFlatCardIds(filteredGroupsData);
            const currentIdx = flatIds.indexOf(expandedCardId);
            if (currentIdx !== -1 && currentIdx + 1 < flatIds.length) {
              const nextId = flatIds[currentIdx + 1];
              setExpandedCardId(nextId);
            } else {
              setExpandedCardId(null);
            }
          }
        }
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const cards = [...document.querySelectorAll('.vocab-card-el')];
        if (cards.length === 0) return;
        const idx = cards.indexOf(document.activeElement);
        let nextIdx = idx === -1 ? 0 : (e.key === 'ArrowDown' ? idx + 1 : idx - 1);
        if (nextIdx >= 0 && nextIdx < cards.length) {
          e.preventDefault();
          cards[nextIdx].focus();
          cards[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [q, expandedCardId, learnedSet, filteredGroupsData, buildFlatCardIds]);

  const handleGroupLinkClick = (gName) => {
    setGFilter('');
    setQ('');
    setPosFilter('');
    setSidebarOpen(false);
    setTimeout(() => {
      const block = document.getElementById(`vg-${gName.replace(/\s+/g, '-')}`);
      if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const learnedPct = Math.round((learnedSet.size / TOTAL_WORDS) * 100);

  return (
    <div className="vocab-page-container fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ─── SUB-SIDEBAR ──────────────────────────────────────── */}
      <nav className={`vocab-nav-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="vocab-sidebar-header">
          <div className="vocab-sidebar-logo">GRE Groups</div>
          <div className="vocab-sidebar-sub">32 sections · 960 words</div>
        </div>
        <div className="vocab-sidebar-nav">
          <div className="vocab-sidebar-label">Jump to Section</div>
          {GROUPS.map((g) => (
            <button
              key={g}
              className={`vocab-group-link ${activeGroup === g ? 'active' : ''}`}
              onClick={() => handleGroupLinkClick(g)}
            >
              <span>{g}</span>
              <span className="vocab-badge">{greVocabData[g].length}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Toggle */}
      <button className="vocab-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰ Groups'}
      </button>

      {/* ─── MAIN CONTENT ─────────────────────────────────────── */}
      <div className="vocab-main-content">

        {/* Header */}
        <div className="vocab-top-bar">
          <div className="vocab-header-glow" />
          <h1>GRE Vocabulary</h1>
          <p>GregMat 32-Group · 960 words · Click any card to expand · Press <kbd>L</kbd> to mark &amp; advance</p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', marginBottom: 16 }}>
            <div className="vocab-search-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="vocab-search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                ref={searchInputRef}
                id="search"
                placeholder="Search word, meaning, or synonym…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoComplete="off"
                className="vocab-input"
              />
              {q && (
                <button className="vocab-search-clear" onClick={() => setQ('')}>✕</button>
              )}
            </div>

            <div className="vocab-filters-row">
              <select value={gFilter} onChange={(e) => setGFilter(e.target.value)} className="vocab-select">
                <option value="">All 32 groups</option>
                {GROUPS.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>

              <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)} className="vocab-select">
                <option value="">All parts of speech</option>
                <option value="n">Noun</option>
                <option value="v">Verb</option>
                <option value="adj">Adjective</option>
                <option value="adv">Adverb</option>
              </select>

              <button
                className={`vocab-btn ${onlyLearned ? 'active' : ''}`}
                onClick={() => setOnlyLearned(!onlyLearned)}
              >
                {onlyLearned ? '✓ Learned Only' : 'Show: All'}
              </button>

              <button className="vocab-btn danger" onClick={resetLearned}>Reset</button>
              <span className="vocab-stat-pill">{displayedWordsCount} words</span>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="vocab-progress-wrap">
          <div className="vocab-progress-left">
            <span className="vocab-progress-label">Progress</span>
            <span className="vocab-progress-pct">{learnedPct}%</span>
          </div>
          <div className="vocab-progress-bar-outer">
            <div className="vocab-progress-bar-inner" style={{ width: `${learnedPct}%` }}>
              <div className="vocab-progress-glow" />
            </div>
          </div>
          <span className="vocab-progress-count">{learnedSet.size} / {TOTAL_WORDS}</span>
        </div>

        {/* Keyboard Hints */}
        <div className="vocab-kbd-hints">
          {[
            ['/', 'Focus search'],
            ['Esc', 'Clear / Close'],
            ['L', 'Mark & advance'],
            ['↑↓', 'Navigate'],
          ].map(([key, label]) => (
            <span key={key} className="vocab-kbd-hint">
              <kbd>{key}</kbd>{label}
            </span>
          ))}
        </div>

        {/* Words List */}
        <div className="vocab-list-output">
          {Object.keys(filteredGroupsData).length === 0 ? (
            <div className="vocab-empty">
              <div className="vocab-empty-icon">📚</div>
              <p>No words match your filters.</p>
            </div>
          ) : (
            Object.entries(filteredGroupsData).map(([gName, words]) => (
              <div
                key={gName}
                id={`vg-${gName.replace(/\s+/g, '-')}`}
                className="vocab-group-block"
                data-group={gName}
              >
                <div className="vocab-group-heading">
                  <div className="vocab-group-heading-left">
                    <span className="vocab-group-number-badge">
                      {gName.replace('Group ', '')}
                    </span>
                    <h2>{gName}</h2>
                  </div>
                  <span className="vocab-group-count">{words.length} words</span>
                </div>

                <div className="vocab-word-grid">
                  {words.map(([word, pos, meaning, syns, ants, ctx], wordIdx) => {
                    const cardId = `${gName}|${word}`;
                    const isLearned = learnedSet.has(cardId);
                    const isOpen = expandedCardId === cardId;
                    // Global word number within the group in original data
                    const globalWordNum = greVocabData[gName].findIndex(([w]) => w === word) + 1;

                    return (
                      <div
                        key={word}
                        ref={(el) => (cardRefs.current[cardId] = el)}
                        tabIndex={0}
                        className={`vocab-card-el ${isOpen ? 'open' : ''} ${isLearned ? 'learned' : ''}`}
                        onClick={() => setExpandedCardId(isOpen ? null : cardId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedCardId(isOpen ? null : cardId);
                          }
                        }}
                      >
                        {/* Word number badge */}
                        <span className="vocab-word-number">{globalWordNum}</span>

                        {isLearned && <span className="vocab-learned-check">✓</span>}

                        <div className="vocab-card-head">
                          <span className="vocab-word-name">{word}</span>
                          <span className="vocab-word-pos">{pos}</span>
                        </div>
                        <div className="vocab-word-meaning">{meaning}</div>

                        {isOpen && (
                          <div className="vocab-card-detail">
                            {syns && syns.trim() && (
                              <div className="vocab-detail-row">
                                <div className="vocab-detail-label">
                                  <span className="vocab-detail-dot syn-dot" />Synonyms
                                </div>
                                <div className="vocab-tags">
                                  {syns.split(',').map((s) => (
                                    <span key={s} className="vocab-tag syn">{s.trim()}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ants && ants.trim() && (
                              <div className="vocab-detail-row">
                                <div className="vocab-detail-label">
                                  <span className="vocab-detail-dot ant-dot" />Antonyms
                                </div>
                                <div className="vocab-tags">
                                  {ants.split(',').map((a) => (
                                    <span key={a} className="vocab-tag ant">{a.trim()}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ctx && (
                              <div className="vocab-detail-row">
                                <div className="vocab-detail-label">
                                  <span className="vocab-detail-dot ctx-dot" />GRE Context
                                </div>
                                <div className="vocab-ctx-note">{ctx}</div>
                              </div>
                            )}

                            <div className="vocab-card-footer">
                              <span className="vocab-footer-kbd-hint">
                                Press <kbd>L</kbd> to mark &amp; advance
                              </span>
                              <button
                                className={`vocab-learn-btn ${isLearned ? 'learned' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Mark learned and advance
                                  toggleLearned(cardId);
                                  if (!isLearned) {
                                    const flatIds = buildFlatCardIds(filteredGroupsData);
                                    const currentIdx = flatIds.indexOf(cardId);
                                    if (currentIdx !== -1 && currentIdx + 1 < flatIds.length) {
                                      const nextId = flatIds[currentIdx + 1];
                                      setExpandedCardId(nextId);
                                    } else {
                                      setExpandedCardId(null);
                                    }
                                  }
                                }}
                              >
                                {isLearned ? '✓ Learned' : 'Mark Learned →'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Back to Top */}
      {showBackTop && (
        <button
          className="vocab-back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
        >
          ↑
        </button>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .vocab-page-container * { box-sizing: border-box; }

        /* ── SIDEBAR ──────────────────────────────── */
        .vocab-nav-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 200px;
          background: var(--surface-container-lowest);
          border-right: 1px solid var(--border);
          overflow-y: auto; z-index: 50;
          display: flex; flex-direction: column;
          transition: transform .25s cubic-bezier(.4,0,.2,1);
          scrollbar-width: thin; scrollbar-color: var(--border-muted) transparent;
        }
        .vocab-nav-sidebar::-webkit-scrollbar { width: 3px; }
        .vocab-nav-sidebar::-webkit-scrollbar-thumb { background: var(--border-muted); border-radius: 3px; }

        .vocab-sidebar-header {
          padding: 22px 16px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          background: rgba(76,215,246,0.04);
        }
        .vocab-sidebar-logo {
          font-family: var(--font-display);
          font-size: 1.1rem; color: var(--primary); letter-spacing: -0.01em;
          font-weight: 700;
        }
        .vocab-sidebar-sub {
          font-size: 10px; color: var(--on-surface-variant); margin-top: 4px;
          font-family: var(--font-mono); letter-spacing: .04em;
        }
        .vocab-sidebar-nav { padding: 8px 6px; flex: 1; }
        .vocab-sidebar-label {
          font-size: 9px; font-weight: 600; letter-spacing: .12em;
          text-transform: uppercase; color: var(--muted);
          padding: 8px 10px 6px; margin-bottom: 2px;
        }
        .vocab-group-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 5px 10px; border-radius: 7px; font-size: 12px;
          color: var(--on-surface-variant); background: none; border: none;
          text-align: left; width: 100%;
          transition: background .12s, color .12s;
          cursor: pointer; font-family: var(--font-body);
        }
        .vocab-group-link:hover { background: var(--surface-variant); color: var(--on-surface); }
        .vocab-group-link.active {
          background: rgba(76,215,246,0.08);
          color: var(--primary);
        }
        .vocab-group-link.active .vocab-badge { background: rgba(76,215,246,0.18); color: var(--primary); }
        .vocab-badge {
          font-size: 10px; font-family: var(--font-mono);
          color: var(--muted); background: rgba(255,255,255,0.04);
          padding: 1px 5px; border-radius: 8px;
        }

        .vocab-sidebar-toggle {
          position: fixed; top: 14px; left: 14px; z-index: 60;
          background: rgba(19,19,26,0.9); backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          color: var(--on-surface-variant); padding: 6px 12px; border-radius: 8px;
          cursor: pointer; font-size: 13px; font-family: var(--font-body);
          display: flex; align-items: center; gap: 6px;
          transition: all .15s;
        }
        .vocab-sidebar-toggle:hover { border-color: var(--primary); color: var(--on-surface); }

        /* ── MAIN CONTENT ──────────────────────────── */
        .vocab-main-content {
          flex: 1; margin-left: 0;
          padding: 56px 24px 100px;
          max-width: 1040px; position: relative;
          transition: margin-left .25s;
        }

        /* ── HEADER ────────────────────────────────── */
        .vocab-top-bar { position: relative; margin-bottom: 24px; }
        .vocab-header-glow {
          position: absolute; top: -60px; left: -40px;
          width: 400px; height: 200px;
          background: radial-gradient(ellipse at center, rgba(76,215,246,0.08) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .vocab-top-bar h1 {
          font-family: var(--font-display);
          font-size: 2.2rem; color: var(--on-surface);
          margin-bottom: 4px; position: relative; z-index: 1;
          background: linear-gradient(135deg, var(--on-surface) 0%, var(--on-surface-variant) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .vocab-top-bar p {
          font-size: 13px; color: var(--on-surface-variant); margin-bottom: 16px;
          position: relative; z-index: 1; font-family: var(--font-body);
        }
        .vocab-top-bar p kbd {
          font-family: var(--font-mono); font-size: 11px;
          background: rgba(76,215,246,0.12); border: 1px solid rgba(76,215,246,0.25);
          border-radius: 4px; padding: 1px 5px; color: var(--primary);
        }

        /* ── SEARCH ─────────────────────────────────── */
        .vocab-search-wrap {
          position: relative; flex: 1; min-width: 240px;
        }
        .vocab-search-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%); color: var(--muted); pointer-events: none;
        }
        .vocab-input {
          width: 100%; padding: 11px 36px 11px 40px;
          background: var(--surface-container-low);
          border: 1px solid var(--border);
          border-radius: 12px; color: var(--on-surface);
          font-size: 14px; font-family: var(--font-body);
          transition: border-color .2s, box-shadow .2s; outline: none;
        }
        .vocab-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(76,215,246,0.15);
        }
        .vocab-input::placeholder { color: var(--muted); }
        .vocab-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--muted); cursor: pointer;
          font-size: 12px; padding: 4px; border-radius: 4px;
          transition: color .15s;
        }
        .vocab-search-clear:hover { color: var(--on-surface-variant); }

        /* ── FILTERS ────────────────────────────────── */
        .vocab-filters-row {
          display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
        }
        .vocab-select, .vocab-btn {
          padding: 9px 14px;
          background: var(--surface-container-low);
          border: 1px solid var(--border);
          border-radius: 10px; color: var(--on-surface-variant);
          font-size: 12.5px; font-family: var(--font-body);
          cursor: pointer;
          transition: border-color .15s, background .15s, color .15s;
          outline: none;
        }
        .vocab-select:focus,
        .vocab-btn:hover {
          border-color: var(--primary); color: var(--on-surface);
          background: var(--surface-container);
        }
        .vocab-btn.active {
          background: rgba(76,215,246,0.12);
          border-color: var(--primary);
          color: var(--primary);
        }
        .vocab-btn.danger:hover {
          border-color: var(--error);
          color: var(--error);
          background: rgba(255,180,171,0.08);
        }
        .vocab-stat-pill {
          font-size: 11px; font-family: var(--font-mono);
          color: var(--muted);
          background: var(--surface-container-low);
          border: 1px solid var(--border);
          border-radius: 20px; padding: 5px 12px; white-space: nowrap;
        }

        /* ── PROGRESS ───────────────────────────────── */
        .vocab-progress-wrap {
          background: var(--surface-card);
          border: 1px solid var(--border);
          border-radius: 16px; padding: 16px 20px;
          margin-bottom: 20px;
          display: flex; align-items: center; gap: 16px;
          backdrop-filter: blur(4px);
        }
        .vocab-progress-left {
          display: flex; flex-direction: column; gap: 1px; min-width: 72px;
        }
        .vocab-progress-label {
          font-size: 10px; color: var(--muted);
          font-family: var(--font-mono);
          text-transform: uppercase; letter-spacing: .08em;
        }
        .vocab-progress-pct {
          font-size: 20px; font-weight: 600; color: var(--primary);
          font-family: var(--font-body); line-height: 1;
        }
        .vocab-progress-bar-outer {
          flex: 1; height: 8px;
          background: var(--surface-variant);
          border-radius: 99px; overflow: hidden;
        }
        .vocab-progress-bar-inner {
          height: 100%; position: relative;
          background: linear-gradient(90deg, var(--primary-container), var(--primary));
          border-radius: 99px;
          transition: width .5s cubic-bezier(.4,0,.2,1);
        }
        .vocab-progress-glow {
          position: absolute; right: 0; top: -4px;
          width: 12px; height: 16px;
          background: var(--primary);
          filter: blur(6px); border-radius: 50%;
        }
        .vocab-progress-count {
          font-size: 12px; font-family: var(--font-mono);
          color: var(--muted); white-space: nowrap;
        }

        /* ── KBD HINTS ──────────────────────────────── */
        .vocab-kbd-hints {
          display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px;
        }
        .vocab-kbd-hint {
          font-size: 11px; color: var(--muted);
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-body);
        }
        .vocab-kbd-hint kbd {
          font-family: var(--font-mono); font-size: 10px;
          background: var(--surface-container-low);
          border: 1px solid var(--border);
          border-bottom-width: 2px;
          border-radius: 5px; padding: 2px 6px; color: var(--on-surface-variant);
        }

        /* ── GROUP BLOCK ────────────────────────────── */
        .vocab-group-block {
          margin-bottom: 48px; scroll-margin-top: 80px;
        }
        .vocab-group-heading {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 14px; margin-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        .vocab-group-heading-left {
          display: flex; align-items: center; gap: 12px;
        }
        .vocab-group-number-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; padding: 0 8px;
          background: rgba(76,215,246,0.12);
          border: 1px solid rgba(76,215,246,0.25);
          border-radius: 8px;
          font-size: 13px; font-weight: 600;
          font-family: var(--font-mono);
          color: var(--primary);
        }
        .vocab-group-heading h2 {
          font-family: var(--font-display);
          font-size: 1.3rem; color: var(--on-surface);
        }
        .vocab-group-count {
          font-size: 11px; font-family: var(--font-mono);
          color: var(--muted);
          background: var(--surface-container-low);
          border: 1px solid var(--border);
          padding: 3px 10px; border-radius: 20px;
        }

        /* ── WORD GRID ──────────────────────────────── */
        .vocab-word-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
          gap: 10px;
        }

        /* ── CARD ───────────────────────────────────── */
        .vocab-card-el {
          background: var(--surface-container-low);
          border: 1px solid var(--border);
          border-radius: 14px; padding: 14px 16px;
          cursor: pointer; position: relative; outline: none;
          transition: border-color .2s, background .2s, box-shadow .2s, transform .15s;
        }
        .vocab-card-el:hover {
          border-color: var(--border-muted);
          background: var(--surface-container);
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        .vocab-card-el:focus {
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(76, 215, 246, 0.15);
        }
        .vocab-card-el.open {
          border-color: var(--primary) !important;
          background: rgba(76, 215, 246, 0.05) !important;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.4),
            0 0 0 1px rgba(76, 215, 246, 0.25),
            inset 0 1px 0 rgba(255,255,255,0.06);
          transform: none;
        }
        .vocab-card-el.learned {
          border-color: rgba(16, 185, 129, 0.25);
        }
        .vocab-card-el.learned.open {
          border-color: var(--success) !important;
          background: rgba(16, 185, 129, 0.05) !important;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.4),
            0 0 0 1px rgba(16, 185, 129, 0.25),
            inset 0 1px 0 rgba(255,255,255,0.04) !important;
        }

        /* Word number badge */
        .vocab-word-number {
          position: absolute; top: 10px; left: 12px;
          font-size: 9px; font-family: var(--font-mono);
          color: rgba(188, 201, 205, 0.4); font-weight: 500;
          line-height: 1;
        }

        /* Learned check */
        .vocab-learned-check {
          position: absolute; top: 10px; right: 12px;
          font-size: 11px; color: var(--success); font-weight: 700;
        }

        .vocab-card-head {
          display: flex; align-items: baseline; gap: 8px;
          margin-bottom: 5px; margin-top: 4px; padding-left: 20px;
        }
        .vocab-word-name {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 1.1rem; color: var(--on-surface); line-height: 1.1;
        }
        .vocab-card-el.open .vocab-word-name { color: var(--on-surface); }
        .vocab-word-pos {
          font-size: 9px; font-family: var(--font-mono);
          color: var(--muted); text-transform: uppercase; letter-spacing: .07em;
          background: var(--surface-variant);
          padding: 2px 6px; border-radius: 4px;
        }
        .vocab-word-meaning {
          font-size: 12.5px; color: var(--on-surface-variant); line-height: 1.55;
          padding-left: 20px;
          font-family: var(--font-body);
        }

        /* ── CARD DETAIL ────────────────────────────── */
        .vocab-card-detail {
          margin-top: 14px;
          border-top: 1px solid var(--border);
          padding-top: 14px;
          animation: detailFade .2s ease;
        }
        @keyframes detailFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .vocab-detail-row { margin-bottom: 12px; }
        .vocab-detail-label {
          font-size: 9px; font-family: var(--font-mono);
          letter-spacing: .1em; text-transform: uppercase;
          color: var(--muted); margin-bottom: 7px;
          display: flex; align-items: center; gap: 6px;
        }
        .vocab-detail-dot {
          width: 6px; height: 6px; border-radius: 50%; display: inline-block;
        }
        .syn-dot { background: var(--success); box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
        .ant-dot { background: var(--error); box-shadow: 0 0 6px rgba(255, 180, 171, 0.4); }
        .ctx-dot { background: var(--secondary); box-shadow: 0 0 6px rgba(208, 188, 255, 0.4); }

        .vocab-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .vocab-tag {
          font-size: 11.5px; padding: 3px 10px; border-radius: 20px;
          font-family: var(--font-mono);
          transition: transform .1s;
        }
        .vocab-tag:hover { transform: scale(1.04); }
        .vocab-tag.syn {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .vocab-tag.ant {
          background: rgba(255, 180, 171, 0.1);
          color: var(--error);
          border: 1px solid rgba(255, 180, 171, 0.2);
        }
        .vocab-ctx-note {
          font-size: 12.5px; color: var(--on-surface-variant);
          font-style: italic; line-height: 1.6;
          background: rgba(208, 188, 255, 0.05);
          border-left: 2px solid var(--secondary);
          padding: 10px 14px; border-radius: 0 8px 8px 0;
          font-family: var(--font-body);
        }

        /* ── CARD FOOTER ────────────────────────────── */
        .vocab-card-footer {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 14px; padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .vocab-footer-kbd-hint {
          font-size: 10px; color: var(--muted); font-family: var(--font-body);
        }
        .vocab-footer-kbd-hint kbd {
          font-family: var(--font-mono); font-size: 9px;
          background: var(--surface-container-low);
          border: 1px solid var(--border);
          border-radius: 4px; padding: 1px 4px; color: var(--on-surface-variant);
        }
        .vocab-learn-btn {
          font-size: 11px; font-family: var(--font-mono);
          padding: 5px 12px; border-radius: 8px; cursor: pointer;
          border: 1px solid var(--border);
          background: var(--surface-container-low);
          color: var(--on-surface-variant);
          transition: all .15s;
          display: flex; align-items: center; gap: 4px;
        }
        .vocab-learn-btn:hover {
          border-color: var(--success);
          color: var(--success);
          background: rgba(16, 185, 129, 0.1);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
        }
        .vocab-learn-btn.learned {
          border-color: var(--success);
          color: var(--success);
          background: rgba(16, 185, 129, 0.1);
        }

        /* ── EMPTY ──────────────────────────────────── */
        .vocab-empty {
          text-align: center; padding: 80px 20px; color: var(--muted);
        }
        .vocab-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: .6; }
        .vocab-empty p { font-size: 14px; font-family: var(--font-body); }

        /* ── BACK TOP ───────────────────────────────── */
        .vocab-back-top {
          position: fixed; bottom: 32px; right: 32px; z-index: 60;
          width: 42px; height: 42px; border-radius: 50%;
          background: rgba(19,19,26,0.9); backdrop-filter: blur(8px);
          border: 1px solid var(--primary);
          color: var(--primary); font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all .2s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .vocab-back-top:hover {
          background: rgba(76,215,246,0.15);
          border-color: var(--primary);
          box-shadow: 0 0 20px rgba(76,215,246,0.3);
          transform: translateY(-2px);
        }

        /* ── RESPONSIVE ─────────────────────────────── */
        @media (max-width: 767px) {
          .vocab-nav-sidebar { transform: translateX(-100%); width: 240px; }
          .vocab-nav-sidebar.open { transform: translateX(0); }
          .vocab-main-content { margin-left: 0; padding: 60px 14px 80px; }
          .vocab-word-grid { grid-template-columns: 1fr; }
          .vocab-top-bar h1 { font-size: 1.7rem; }
        }
        @media (min-width: 768px) {
          .vocab-sidebar-toggle { display: none; }
          .vocab-nav-sidebar { left: 240px; }
          .vocab-main-content { margin-left: 440px; }
        }
      `}</style>
    </div>
  );
}
