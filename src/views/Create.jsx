// src/views/Create.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Phase 3 — Card Editor Revamp
// Rich text editing (TipTap), drag-to-reorder (@dnd-kit), edit mode.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveDeck, updateDeck, fetchDeck, invalidateAllCache } from '../services/api';
import { PlusCircle, Save, Trash2, Edit3, Layers, GripVertical, Loader2, Copy } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CardEditor from '../components/CardEditor';

// ── Generate a unique key for each card so React + dnd-kit track identity ──
let _uid = 0;
function makeCard(front = '', back = '') {
  return { front, back, _key: `card_${Date.now()}_${++_uid}` };
}

// ═══════════════════════════════════════════════════════════════════════════
// SortableCard — drag handle left, card center, delete right
// Uses a plain div for dnd-kit ref (avoids framer-motion transform conflict)
// ═══════════════════════════════════════════════════════════════════════════
const SortableCard = memo(function SortableCard({ card, index, total, onUpdate, onRemove, isSelected, onCardSelect, selectedCount }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="group/row" data-card-row
      onClick={(e) => {
        if ((e.ctrlKey || e.metaKey || e.shiftKey) && !e.target.closest('.ProseMirror, input, textarea, [contenteditable]')) {
          e.preventDefault();
          onCardSelect?.(e, card);
        }
      }}
    >
      <div className={`flex items-stretch gap-2 ${isDragging ? 'opacity-50' : ''}`}>
        {/* ── Drag handle (left of card) ── */}
        <div className="flex flex-col items-center justify-center shrink-0 pt-1">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="relative cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors touch-none"
            style={{ color: 'var(--text-secondary)' }}
            {...attributes}
            {...listeners}
            title="Drag to reorder"
          >
            <GripVertical size={18} />
            {isDragging && isSelected && selectedCount > 1 && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
                style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
                {selectedCount}
              </span>
            )}
          </button>
          <span className="text-[10px] font-bold select-none mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {index + 1}
          </span>
        </div>

        {/* ── Card content ── */}
        <div className={`flex-1 min-w-0 glass-panel p-4 md:p-5 transition-all ${isDragging ? 'shadow-2xl' : ''}`}
          style={isSelected ? { background: 'var(--accent-dim)' } : undefined}>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <CardEditor
                content={card.front}
                onChange={(html) => onUpdate(card._key, 'front', html)}
                placeholder="Term or Question"
                label="Front"
                borderColor="blue"
              />
            </div>

            <div className="hidden lg:flex items-center px-1">
              <div className="w-px h-24" style={{ background: 'var(--border-color)' }} />
            </div>

            <div className="flex-1 min-w-0">
              <CardEditor
                content={card.back}
                onChange={(html) => onUpdate(card._key, 'back', html)}
                placeholder="Definition or Answer"
                label="Back"
                borderColor="green"
              />
            </div>
          </div>
        </div>

        {/* ── Delete button (right of card) ── */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onRemove(card._key)}
            disabled={total <= 1}
            className={`p-2 rounded-lg transition-all ${
              total <= 1
                ? 'cursor-not-allowed opacity-30'
                : 'md:opacity-0 md:group-hover/row:opacity-100'
            }`}
            style={{ color: total <= 1 ? 'var(--text-secondary)' : 'var(--error)' }}
            title={total <= 1 ? 'Need at least one card' : 'Delete card'}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Main Create / Edit view
// ═══════════════════════════════════════════════════════════════════════════
export default function Create() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editDeckId = searchParams.get('edit'); // null = create mode

  const [deckName, setDeckName] = useState('');
  const [cards, setCards] = useState([makeCard()]);
  const [status, setStatus] = useState('idle'); // idle | loading | saving | error
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(!editDeckId); // true when ready to render

  const nameInputRef = useRef(null);
  const bottomRef = useRef(null);
  const [selectedCardKeys, setSelectedCardKeys] = useState(new Set());
  const [lastClickedCardKey, setLastClickedCardKey] = useState(null);
  const clipboardRef = useRef([]);

  // ── Load existing deck for editing ────────────────────────────────────
  useEffect(() => {
    if (!editDeckId) return;
    let cancelled = false;
    setStatus('loading');
    setMessage('Loading deck…');

    (async () => {
      try {
        const deck = await fetchDeck(editDeckId);
        if (cancelled) return;
        if (!deck) throw new Error('Deck not found');

        setDeckName(deck.name || '');
        const loadedCards = (deck.cards || []).map((c) =>
          makeCard(c.front || '', c.back || '')
        );
        setCards(loadedCards.length > 0 ? loadedCards : [makeCard()]);
        setStatus('idle');
        setMessage('');
        setLoaded(true);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load deck for editing:', err);
        setStatus('error');
        setMessage('Failed to load deck. Please go back and try again.');
        setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [editDeckId]);

  // ── Focus deck name on mount (create mode only) ───────────────────────
  useEffect(() => {
    if (!editDeckId && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editDeckId]);

  // ── Card CRUD (identified by _key, not index) ────────────────────────
  const addCard = useCallback(() => {
    setCards((prev) => [...prev, makeCard()]);
    // Scroll to new card after a tick
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
  }, []);

  const removeCard = useCallback((key) => {
    setCards((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((c) => c._key !== key);
    });
  }, []);

  const updateCard = useCallback((key, field, value) => {
    setCards((prev) =>
      prev.map((c) => (c._key === key ? { ...c, [field]: value } : c))
    );
  }, []);

  // ── Multi-select handlers ─────────────────────────────────────────
  const handleCardSelect = useCallback((e, card) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedCardKeys((prev) => {
        const next = new Set(prev);
        if (next.has(card._key)) next.delete(card._key);
        else next.add(card._key);
        return next;
      });
      setLastClickedCardKey(card._key);
    } else if (e.shiftKey) {
      const anchor = lastClickedCardKey;
      if (!anchor) {
        setSelectedCardKeys(new Set([card._key]));
        setLastClickedCardKey(card._key);
        return;
      }
      const keys = cards.map((c) => c._key);
      const aIdx = keys.indexOf(anchor);
      const bIdx = keys.indexOf(card._key);
      if (aIdx !== -1 && bIdx !== -1) {
        const [lo, hi] = aIdx < bIdx ? [aIdx, bIdx] : [bIdx, aIdx];
        setSelectedCardKeys(new Set(keys.slice(lo, hi + 1)));
      }
    }
  }, [cards, lastClickedCardKey]);

  const handleBatchDeleteCards = useCallback(() => {
    if (selectedCardKeys.size === 0) return;
    setCards((prev) => {
      const remaining = prev.filter((c) => !selectedCardKeys.has(c._key));
      return remaining.length > 0 ? remaining : [makeCard()];
    });
    setSelectedCardKeys(new Set());
  }, [selectedCardKeys]);

  // ── Drag-and-drop reorder ─────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCards((prev) => {
      if (selectedCardKeys.size > 1 && selectedCardKeys.has(String(active.id))) {
        // Multi-drag: extract selected, remove from array, insert at target position
        const selected = prev.filter((c) => selectedCardKeys.has(c._key));
        const remaining = prev.filter((c) => !selectedCardKeys.has(c._key));
        const insertIdx = remaining.findIndex((c) => c._key === over.id);
        if (insertIdx === -1) return prev;
        remaining.splice(insertIdx, 0, ...selected);
        return remaining;
      }
      const oldIndex = prev.findIndex((c) => c._key === active.id);
      const newIndex = prev.findIndex((c) => c._key === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, [selectedCardKeys]);

  // ── Selection keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      const inEditor = e.target.closest('.ProseMirror, input, textarea, [contenteditable]');
      if (e.key === 'Escape' && selectedCardKeys.size > 0) {
        setSelectedCardKeys(new Set());
        setLastClickedCardKey(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCardKeys.size > 0 && !inEditor) {
        e.preventDefault();
        handleBatchDeleteCards();
      }
      // Ctrl+C — copy selected cards to internal clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCardKeys.size > 0 && !inEditor) {
        e.preventDefault();
        clipboardRef.current = cards.filter((c) => selectedCardKeys.has(c._key)).map((c) => ({ front: c.front, back: c.back }));
      }
      // Ctrl+V — paste below lowest selected card (or at end)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current.length > 0 && !inEditor) {
        e.preventDefault();
        const newCards = clipboardRef.current.map((c) => makeCard(c.front, c.back));
        setCards((prev) => {
          if (selectedCardKeys.size > 0) {
            const lastSelectedIdx = prev.reduce((max, c, i) => selectedCardKeys.has(c._key) ? i : max, -1);
            if (lastSelectedIdx !== -1) {
              const copy = [...prev];
              copy.splice(lastSelectedIdx + 1, 0, ...newCards);
              return copy;
            }
          }
          return [...prev, ...newCards];
        });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCardKeys, cards, handleBatchDeleteCards]);

  // ── Strip empty HTML — TipTap may produce <p></p> or similar ──────────
  function hasContent(html) {
    if (!html) return false;
    const stripped = html.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0 || /<img\s/i.test(html);
  }

  // ── Submit (create or update) ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!deckName.trim()) {
      setStatus('error');
      setMessage('Please enter a deck name.');
      return;
    }

    // Filter to valid cards (at least front OR back has content)
    const validCards = cards
      .filter((c) => hasContent(c.front) || hasContent(c.back))
      .map((c) => ({ front: c.front || '', back: c.back || '' }));

    if (validCards.length === 0) {
      setStatus('error');
      setMessage('Please add at least one card with content.');
      return;
    }

    setStatus('saving');
    setMessage(editDeckId ? 'Updating deck…' : 'Saving to library…');

    try {
      if (editDeckId) {
        // ── Update existing deck ──
        const result = await updateDeck(editDeckId, {
          deckName: deckName.trim(),
          cards: validCards,
        });
        if (result.status === 'success') {
          invalidateAllCache();
          navigate(`/study/${editDeckId}`);
        } else {
          throw new Error(result.message || 'Unknown error');
        }
      } else {
        // ── Create new deck ──
        const result = await saveDeck({
          deckName: deckName.trim(),
          cards: validCards,
        });
        if (result.status === 'success') {
          navigate(`/study/${result.deckId}`, {
            state: {
              deckData: { id: result.deckId, name: deckName.trim(), cards: validCards },
            },
          });
        } else {
          throw new Error(result.message || 'Unknown error');
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      setStatus('error');
      setMessage('Failed to save. Please try again.');
    }
  };

  // ── Loading state (matches Library.jsx spinner) ──────────────────────
  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mb-4"
          style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
        <p className="animate-pulse font-medium" style={{ color: 'var(--text-secondary)' }}>{message || 'Loading…'}</p>
      </div>
    );
  }

  const cardKeys = cards.map((c) => c._key);
  const validCount = cards.filter((c) => hasContent(c.front) || hasContent(c.back)).length;

  return (
    <div className="w-full max-w-4xl px-4 py-8 pb-32 select-none"
      onClick={(e) => {
        if (selectedCardKeys.size > 0 && !e.target.closest('[data-card-row], .ProseMirror, input, textarea, [contenteditable], button, a, [data-save-bar]')) {
          setSelectedCardKeys(new Set());
          setLastClickedCardKey(null);
        }
      }}
    >
      {/* ── Header / Deck Name ──────────────────────────────────────────── */}
      <div className="glass-panel p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <Edit3 size={24} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {editDeckId ? 'Edit Deck' : 'Create New Deck'}
          </h1>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-bold mb-2 uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}>
            Deck Title
          </label>
          <div className="relative">
            <Layers className="absolute left-4 top-1/2 -translate-y-1/2" size={20}
              style={{ color: 'var(--text-secondary)' }} />
            <input
              ref={nameInputRef}
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="e.g., Biology Chapter 1"
              className="w-full pl-12 pr-4 py-4 outline-none transition-all text-lg font-medium"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Card list (sortable) ────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cardKeys} strategy={verticalListSortingStrategy}>
            <div className="space-y-4 mb-8">
                {cards.map((card, index) => (
                  <SortableCard
                    key={card._key}
                    card={card}
                    index={index}
                    total={cards.length}
                    onUpdate={updateCard}
                    onRemove={removeCard}
                    isSelected={selectedCardKeys.has(card._key)}
                    selectedCount={selectedCardKeys.size}
                    onCardSelect={handleCardSelect}
                  />
                ))}
            </div>
          </SortableContext>
        </DndContext>

        <div ref={bottomRef} />

        {/* ── Add Card + Stats inline bar ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-8 mt-2">
          <button
            type="button"
            onClick={addCard}
            className="group flex items-center justify-center gap-2 transition-colors py-3 px-6 border-2 border-dashed flex-1 w-full sm:w-auto"
            style={{
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-color)',
              borderRadius: 'var(--radius)',
            }}
          >
            <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm">Add Card</span>
          </button>
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
            {validCount}/{cards.length} valid
          </span>
        </div>

        {/* ── Fixed Save Bar ───────────────────────────────────────────── */}
        <div data-save-bar className="fixed bottom-0 left-0 right-0 z-40"
          style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            {selectedCardKeys.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                  {selectedCardKeys.size} selected
                </span>
                <button type="button" onClick={handleBatchDeleteCards}
                  className="px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1"
                  style={{ color: 'var(--error)' }}>
                  <Trash2 size={13} /> Delete
                </button>
                <button type="button" onClick={() => {
                  clipboardRef.current = cards.filter((c) => selectedCardKeys.has(c._key)).map((c) => ({ front: c.front, back: c.back }));
                }}
                  className="px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}>
                  <Copy size={13} /> Copy
                </button>
                <button type="button" onClick={() => { setSelectedCardKeys(new Set()); setLastClickedCardKey(null); }}
                  className="px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                {validCount} card{validCount !== 1 ? 's' : ''} ready
              </span>
            )}

            {status === 'error' && (
              <span className="text-sm font-medium max-w-[200px] truncate" style={{ color: 'var(--error)' }}>
                {message}
              </span>
            )}

            <button
              type="submit"
              disabled={status === 'saving'}
              className="px-8 py-2.5 font-bold transition-all flex items-center gap-2 disabled:opacity-70 whitespace-nowrap"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg-primary)',
                borderRadius: 'var(--radius)',
              }}
            >
              {status === 'saving' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={18} />
                  {editDeckId ? 'Update Deck' : 'Save Deck'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
