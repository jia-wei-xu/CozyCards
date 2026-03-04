// src/components/CardBrowser.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Phase 4 — Inline card browser (replaces BottomDrawer)
// Renders below the study area. Lazy-loads cards via IntersectionObserver.
// Includes a search input that filters by front/back text content.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, Layers, ChevronDown } from 'lucide-react';
import { renderLatexInHTML, hasLatex } from '../utils/renderLatex';
import { stripScripts, sanitizeImages, stripHTML } from '../utils/cardHelpers';

const BATCH_SIZE = 20;

// ── Single card preview ──────────────────────────────────────────────────
function BrowserCard({ card }) {
  const front = useMemo(() => {
    let h = stripScripts(card.front || '');
    if (hasLatex(h)) h = renderLatexInHTML(h);
    return sanitizeImages(h);
  }, [card.front]);

  const back = useMemo(() => {
    let h = stripScripts(card.back || '');
    if (hasLatex(h)) h = renderLatexInHTML(h);
    return sanitizeImages(h);
  }, [card.back]);

  return (
    <div className="p-4 rounded-xl overflow-hidden transition-colors"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
      <div
        className="anki-card anki-card-preview font-semibold mb-2 text-sm"
        style={{ color: 'var(--text-primary)' }}
        dangerouslySetInnerHTML={{ __html: front }}
      />
      <div
        className="anki-card anki-card-preview text-sm pt-2"
        style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}
        dangerouslySetInnerHTML={{ __html: back }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CardBrowser
// ═══════════════════════════════════════════════════════════════════════════
export default function CardBrowser({ cards }) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [expanded, setExpanded] = useState(false);
  const sentinelRef = useRef(null);

  // ── Filter by search query ─────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!query.trim()) return cards;
    const q = query.toLowerCase();
    return cards.filter((c) => {
      const frontText = stripHTML(c.front || '').toLowerCase();
      const backText = stripHTML(c.back || '').toLowerCase();
      return frontText.includes(q) || backText.includes(q);
    });
  }, [cards, query]);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [filtered]);

  const visibleCards = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const hasMore = visibleCount < filtered.length;

  // ── IntersectionObserver to load more cards on scroll ──────────────
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (!cards || cards.length === 0) return null;

  return (
    <div className="w-full mt-6">
      {/* ── Section divider + toggle ──────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border-color)' }} />
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between py-3 px-1 cursor-pointer"
      >
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Layers size={15} />
          <span className="text-sm font-medium">All Cards</span>
          <span className="text-xs">({cards.length})</span>
        </div>
        <ChevronDown
          size={15}
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>

      {/* ── Expandable body ───────────────────────────────────────────── */}
      {expanded && (
        <div className="glass-panel p-4 md:p-5">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards…"
              className="w-full pl-9 pr-4 py-2.5 outline-none transition-all text-sm"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
              }}
            />
            {query && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Card grid */}
          {visibleCards.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No matching cards found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleCards.map((card, idx) => (
                <BrowserCard key={card._id || idx} card={card} />
              ))}
            </div>
          )}

          {/* Sentinel for lazy loading */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
