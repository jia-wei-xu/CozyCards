// src/views/Library.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Phase 4 — Library with table layout, folder support, drag-to-reorder,
// drag-into-folder, context menus, and SRS counts
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDecks, deleteDeck, updateDeck, getProgress, invalidateAllCache } from '../services/api';
import { withStableIds } from '../utils/cardId';
import {
  BookOpen, PlusCircle, Pencil, Trash2, FolderOpen, ChevronDown,
  MoreHorizontal, FolderPlus, Play, Layers, GripVertical, X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── localStorage persistence ─────────────────────────────────────────────
const FOLDERS_KEY = 'cozycards_custom_folders';
const ORDER_KEY = 'cozycards_deck_order';

function loadCustomFolders() {
  try { return JSON.parse(localStorage.getItem(FOLDERS_KEY)) || []; }
  catch { return []; }
}
function saveCustomFolders(f) { localStorage.setItem(FOLDERS_KEY, JSON.stringify(f)); }
function loadDeckOrder() {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY)) || {}; }
  catch { return {}; }
}
function saveDeckOrder(o) { localStorage.setItem(ORDER_KEY, JSON.stringify(o)); }

// ── SRS count helper ─────────────────────────────────────────────────────
function computeSRSCounts(cards, progressBlob) {
  const r = { newCount: 0, learningCount: 0, dueCount: 0 };
  if (!cards || !Array.isArray(cards)) return r;
  const withIds = withStableIds(cards);
  const m = progressBlob?.cards || {};
  const now = Date.now();
  for (const c of withIds) {
    const p = m[c._id];
    if (!p) r.newCount++;
    else if (p.state === 1 || p.state === 3) r.learningCount++;
    else if (p.state === 2 && p.due <= now) r.dueCount++;
  }
  return r;
}

// Grid column template — shared by header and rows
const COLS = 'grid-cols-[1.75rem_1fr_3rem_3.5rem_3rem_3rem_5rem]';

// ── Folder droppable header ──────────────────────────────────────────────
function FolderHeader({ id, name, count, isCollapsed, onToggle, onDeleteFolder }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`group/fh flex items-center py-2 px-3 cursor-pointer transition-colors`}
      style={{
        borderTop: '1px solid var(--border-color)',
        background: isOver ? 'var(--accent-dim)' : undefined,
      }}
      onClick={onToggle}
    >
      <div className="w-[1.75rem] shrink-0" />
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <ChevronDown size={14} className={`shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          style={{ color: 'var(--text-secondary)' }} />
        <FolderOpen size={14} className="shrink-0" style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>({count})</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDeleteFolder(name); }}
        className="p-1 rounded text-transparent group-hover/fh:opacity-100 opacity-0 transition-all shrink-0"
        style={{ color: 'var(--error)' }}
        title="Remove folder"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ── Root drop zone (appears at bottom when folders exist) ────────────────
function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'folder:' });
  return (
    <div
      ref={setNodeRef}
      className={`text-center text-xs transition-all`}
      style={{
        borderTop: '1px solid var(--border-color)',
        padding: isOver ? '0.75rem 0' : '0.25rem 0',
        background: isOver ? 'var(--accent-dim)' : 'transparent',
        color: isOver ? 'var(--accent)' : 'transparent',
        fontWeight: isOver ? 500 : 400,
      }}
    >
      Drop here to move to root
    </div>
  );
}

// ── Sortable deck row ────────────────────────────────────────────────────
function SortableDeckRow({ deck, srs, cardCount, isRenaming, renamingState, setRenaming, submitRename, onContextMenu, onRowClick, isSelected, inFolder, selectedCount, isGhostDuringDrag }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: deck.id });
  const style = {
    transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto',
    ...(isGhostDuringDrag ? { height: 0, padding: 0, margin: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isSelected && !isDragging ? 'var(--accent-dim)' : undefined,
      }}
      data-deck-row
      className={`grid ${COLS} items-center ${isGhostDuringDrag ? '' : `py-2.5 ${inFolder ? 'pl-7 pr-2' : 'px-2'}`} group/row cursor-pointer transition-colors ${
        isDragging ? 'opacity-40' : ''
      }`}
      onClick={(e) => onRowClick(e, deck)}
      onContextMenu={(e) => onContextMenu(e, deck)}
    >
      {/* Drag handle */}
      <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          ref={setActivatorNodeRef}
          className="cursor-grab active:cursor-grabbing p-0.5 rounded transition-colors touch-none"
          style={{ color: 'var(--text-secondary)' }}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
          {isDragging && isSelected && selectedCount > 1 && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
              {selectedCount}
            </span>
          )}
        </button>
      </div>

      {/* Name */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="p-1.5 rounded-lg shrink-0"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          <Layers size={14} />
        </div>
        {isRenaming ? (
          <input
            autoFocus
            value={renamingState.name}
            onChange={(e) => setRenaming((r) => ({ ...r, name: e.target.value }))}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename();
              if (e.key === 'Escape') setRenaming(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold px-2 py-0.5 outline-none flex-1 min-w-0"
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius)',
            }}
          />
        ) : (
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{deck.name}</span>
        )}
      </div>

      {/* Counts */}
      <div className="text-center"><span className="text-xs font-bold" style={{ color: 'var(--color-new)' }}>{srs.newCount}</span></div>
      <div className="text-center"><span className="text-xs font-bold" style={{ color: 'var(--color-learning)' }}>{srs.learningCount}</span></div>
      <div className="text-center"><span className="text-xs font-bold" style={{ color: 'var(--color-due)' }}>{srs.dueCount}</span></div>
      <div className="text-center"><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cardCount}</span></div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <Link to={`/create?edit=${deck.id}`} className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }} title="Edit">
          <Pencil size={13} />
        </Link>
        <Link to={`/study/${deck.id}`} className="p-1 rounded transition-colors"
          style={{ color: 'var(--accent)' }} title="Study">
          <Play size={13} />
        </Link>
        <button onClick={(e) => onContextMenu(e, deck)} className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }} title="More">
          <MoreHorizontal size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Context menu ─────────────────────────────────────────────────────────
function DeckContextMenu({ position, deck, onClose, onRename, onDelete, onMove, allFolders }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const click = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  const style = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 240),
    left: Math.min(position.x, window.innerWidth - 200),
    zIndex: 100,
  };

  const currentFolder = deck.folder || '';
  const moveTargets = ['', ...allFolders].filter((f) => f !== currentFolder);

  return (
    <div ref={menuRef} style={{
      ...style,
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    }} className="w-48 py-1.5 text-sm">
      <button onClick={() => { onRename(deck); onClose(); }}
        className="w-full text-left px-4 py-2 flex items-center gap-2 transition-colors hover:opacity-80"
        style={{ color: 'var(--text-primary)' }}>
        <Pencil size={14} /> Rename
      </button>
      <Link to={`/create?edit=${deck.id}`} onClick={onClose}
        className="block w-full text-left px-4 py-2 flex items-center gap-2 transition-colors hover:opacity-80"
        style={{ color: 'var(--text-primary)' }}>
        <Pencil size={14} /> Edit Cards
      </Link>
      {moveTargets.length > 0 && (
        <div className="relative group/move">
          <button className="w-full text-left px-4 py-2 flex items-center gap-2 transition-colors hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}>
            <FolderOpen size={14} /> Move to…
          </button>
          <div className="hidden group-hover/move:block absolute left-full top-0 ml-1 w-40 py-1.5"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            }}>
            {moveTargets.map((f) => (
              <button key={f || '__root'} onClick={() => { onMove(deck, f); onClose(); }}
                className="w-full text-left px-4 py-2 text-xs truncate transition-colors hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}>
                {f || '(Root)'}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="my-1" style={{ borderTop: '1px solid var(--border-color)' }} />
      <button onClick={() => { onDelete(deck); onClose(); }}
        className="w-full text-left px-4 py-2 flex items-center gap-2 transition-colors hover:opacity-80"
        style={{ color: 'var(--error)' }}>
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Library component
// ═══════════════════════════════════════════════════════════════════════════
export default function Library() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [customFolders, setCustomFolders] = useState(() => loadCustomFolders());
  const [deckOrder, setDeckOrder] = useState(() => loadDeckOrder());
  const [selectedDeckIds, setSelectedDeckIds] = useState(new Set());
  const [lastClickedDeckId, setLastClickedDeckId] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);

  // ── Load decks + progress ──────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const data = await fetchDecks();
        const list = Array.isArray(data) ? data : (data.data || []);
        setDecks(list);

        const progressEntries = await Promise.allSettled(
          list.map(async (d) => {
            try {
              const res = await getProgress(d.id);
              return [d.id, res?.progress || null];
            } catch {
              try {
                const local = localStorage.getItem(`cozycards_progress_${d.id}`);
                if (local) return [d.id, JSON.parse(local)];
              } catch { /* ignore */ }
              return [d.id, null];
            }
          })
        );
        const map = {};
        progressEntries.forEach((r) => {
          if (r.status === 'fulfilled' && r.value) map[r.value[0]] = r.value[1];
        });
        setProgressMap(map);
      } catch (_err) {
        console.error('Failed to load decks', _err);
        setError('Could not load your library. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Derived data ───────────────────────────────────────────────────
  const allFolders = useMemo(() => {
    const set = new Set(customFolders);
    decks.forEach((d) => { if (d.folder) set.add(d.folder); });
    return [...set].sort();
  }, [decks, customFolders]);

  const grouped = useMemo(() => {
    const map = { '': [] };
    allFolders.forEach((f) => { map[f] = []; });
    decks.forEach((d) => {
      const f = d.folder || '';
      if (!map[f]) map[f] = [];
      map[f].push(d);
    });
    // Apply saved order within each group
    for (const [folder, folderDecks] of Object.entries(map)) {
      const orderList = deckOrder[folder] || [];
      if (orderList.length > 0) {
        folderDecks.sort((a, b) => {
          const ai = orderList.indexOf(a.id);
          const bi = orderList.indexOf(b.id);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
      }
    }
    return map;
  }, [decks, allFolders, deckOrder]);

  const sortedFolderKeys = useMemo(() => ['', ...allFolders], [allFolders]);

  // Flat deck IDs for single SortableContext (only non-collapsed decks)
  const flatDeckIds = useMemo(() => {
    const ids = [];
    for (const f of sortedFolderKeys) {
      if (f && collapsedFolders[f]) continue;
      (grouped[f] || []).forEach((d) => ids.push(d.id));
    }
    return ids;
  }, [grouped, sortedFolderKeys, collapsedFolders]);

  // ── Selection keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (selectedDeckIds.size === 0) return;
      if (e.key === 'Escape') { setSelectedDeckIds(new Set()); setLastClickedDeckId(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.closest('input, textarea')) {
        e.preventDefault();
        // batch delete handled via effect dependency
        const count = selectedDeckIds.size;
        if (!window.confirm(`Delete ${count} deck${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
        (async () => {
          for (const id of selectedDeckIds) {
            try { await deleteDeck(id); } catch (err) { console.error('Delete failed:', err); }
          }
          invalidateAllCache();
          setDecks((prev) => prev.filter((d) => !selectedDeckIds.has(d.id)));
          setSelectedDeckIds(new Set());
        })();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDeckIds]);

  // ── DnD ────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeDeck = decks.find((d) => d.id === activeId);
    if (!activeDeck) return;
    const activeFolder = activeDeck.folder || '';

    // Dropped on a folder header droppable
    if (overId.startsWith('folder:')) {
      const targetFolder = overId === 'folder:' ? '' : overId.slice('folder:'.length);
      const idsToMove = selectedDeckIds.has(activeId) && selectedDeckIds.size > 1
        ? [...selectedDeckIds] : [activeId];
      setDecks((prev) => prev.map((d) => idsToMove.includes(d.id) ? { ...d, folder: targetFolder } : d));
      for (const id of idsToMove) {
        try { await updateDeck(id, { folder: targetFolder }); } catch { /* ignore */ }
      }
      invalidateAllCache();
      setSelectedDeckIds(new Set());
      return;
    }

    // Dropped on another deck
    const overDeck = decks.find((d) => d.id === overId);
    if (!overDeck) return;
    const overFolder = overDeck.folder || '';

    if (activeFolder === overFolder) {
      // Same folder → reorder (multi-select aware)
      if (selectedDeckIds.has(activeId) && selectedDeckIds.size > 1) {
        const folderDecks = grouped[activeFolder] || [];
        const ids = folderDecks.map((d) => d.id);
        const selectedIds = ids.filter((id) => selectedDeckIds.has(id));
        const remaining = ids.filter((id) => !selectedDeckIds.has(id));
        const insertIdx = remaining.indexOf(overId);
        if (insertIdx !== -1) {
          remaining.splice(insertIdx, 0, ...selectedIds);
          setDeckOrder((prev) => {
            const next = { ...prev, [activeFolder]: remaining };
            saveDeckOrder(next);
            return next;
          });
        }
      } else {
        const folderDecks = grouped[activeFolder] || [];
        const ids = folderDecks.map((d) => d.id);
        const oldIdx = ids.indexOf(activeId);
        const newIdx = ids.indexOf(overId);
        if (oldIdx !== -1 && newIdx !== -1) {
          const newOrder = arrayMove(ids, oldIdx, newIdx);
          setDeckOrder((prev) => {
            const next = { ...prev, [activeFolder]: newOrder };
            saveDeckOrder(next);
            return next;
          });
        }
      }
    } else {
      // Different folder → move all selected (or just active) to the over-deck's folder
      const idsToMove = selectedDeckIds.has(activeId) && selectedDeckIds.size > 1
        ? [...selectedDeckIds] : [activeId];
      setDecks((prev) => prev.map((d) => idsToMove.includes(d.id) ? { ...d, folder: overFolder } : d));
      for (const id of idsToMove) {
        try { await updateDeck(id, { folder: overFolder }); } catch { /* ignore */ }
      }
      invalidateAllCache();
      setSelectedDeckIds(new Set());
    }
  }, [decks, grouped]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (deck) => {
    if (!window.confirm(`Delete "${deck.name}"? This cannot be undone.`)) return;
    try {
      await deleteDeck(deck.id);
      invalidateAllCache();
      setDecks((prev) => prev.filter((d) => d.id !== deck.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, []);

  const handleRename = useCallback((deck) => {
    setRenaming({ deckId: deck.id, name: deck.name });
  }, []);

  const submitRename = useCallback(async () => {
    if (!renaming || !renaming.name.trim()) return;
    try {
      await updateDeck(renaming.deckId, { deckName: renaming.name.trim() });
      invalidateAllCache();
      setDecks((prev) => prev.map((d) =>
        d.id === renaming.deckId ? { ...d, name: renaming.name.trim() } : d
      ));
      setRenaming(null);
    } catch (err) {
      console.error('Rename failed:', err);
    }
  }, [renaming]);

  const handleMove = useCallback(async (deck, folder) => {
    setDecks((prev) => prev.map((d) => d.id === deck.id ? { ...d, folder } : d));
    try { await updateDeck(deck.id, { folder }); invalidateAllCache(); }
    catch (err) { console.error('Move failed:', err); }
  }, []);

  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    if (allFolders.includes(name)) { setShowNewFolder(false); setNewFolderName(''); return; }
    const next = [...customFolders, name];
    setCustomFolders(next);
    saveCustomFolders(next);
    setShowNewFolder(false);
    setNewFolderName('');
  }, [newFolderName, customFolders, allFolders]);

  const deleteFolder = useCallback(async (folderName) => {
    // Move all decks in this folder to root
    const folderDecks = decks.filter((d) => d.folder === folderName);
    if (folderDecks.length > 0) {
      setDecks((prev) => prev.map((d) => d.folder === folderName ? { ...d, folder: '' } : d));
      for (const d of folderDecks) {
        try { await updateDeck(d.id, { folder: '' }); } catch { /* ignore */ }
      }
      invalidateAllCache();
    }
    const next = customFolders.filter((f) => f !== folderName);
    setCustomFolders(next);
    saveCustomFolders(next);
    // Clean up saved order for this folder
    setDeckOrder((prev) => {
      const { [folderName]: _, ...rest } = prev;
      saveDeckOrder(rest);
      return rest;
    });
  }, [customFolders, decks]);

  const toggleFolder = useCallback((folder) => {
    setCollapsedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  }, []);

  const handleContextMenu = useCallback((e, deck) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, deck });
  }, []);

  const handleRowClick = useCallback((e, deck) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedDeckIds((prev) => {
        const next = new Set(prev);
        if (next.has(deck.id)) next.delete(deck.id);
        else next.add(deck.id);
        return next;
      });
      setLastClickedDeckId(deck.id);
    } else if (e.shiftKey) {
      e.preventDefault();
      const anchor = lastClickedDeckId;
      if (!anchor) {
        setSelectedDeckIds(new Set([deck.id]));
        setLastClickedDeckId(deck.id);
        return;
      }
      const allIds = flatDeckIds;
      const aIdx = allIds.indexOf(anchor);
      const bIdx = allIds.indexOf(deck.id);
      if (aIdx !== -1 && bIdx !== -1) {
        const [lo, hi] = aIdx < bIdx ? [aIdx, bIdx] : [bIdx, aIdx];
        setSelectedDeckIds(new Set(allIds.slice(lo, hi + 1)));
      }
    } else {
      if (selectedDeckIds.size > 0) {
        setSelectedDeckIds(new Set());
      }
      navigate(`/study/${deck.id}`);
    }
  }, [flatDeckIds, lastClickedDeckId, navigate, selectedDeckIds]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedDeckIds.size === 0) return;
    const count = selectedDeckIds.size;
    if (!window.confirm(`Delete ${count} deck${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    for (const id of selectedDeckIds) {
      try { await deleteDeck(id); } catch (err) { console.error('Delete failed:', err); }
    }
    invalidateAllCache();
    setDecks((prev) => prev.filter((d) => !selectedDeckIds.has(d.id)));
    setSelectedDeckIds(new Set());
  }, [selectedDeckIds]);

  const handleBatchMove = useCallback(async (folder) => {
    const ids = [...selectedDeckIds];
    setDecks((prev) => prev.map((d) => ids.includes(d.id) ? { ...d, folder } : d));
    for (const id of ids) {
      try { await updateDeck(id, { folder }); } catch { /* ignore */ }
    }
    invalidateAllCache();
    setSelectedDeckIds(new Set());
  }, [selectedDeckIds]);

  // ── Loading / Error / Empty ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mb-4"
          style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
        <p className="animate-pulse font-medium" style={{ color: 'var(--text-secondary)' }}>Fetching your decks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto mt-10">
        <p className="mb-4 font-medium" style={{ color: 'var(--error)' }}>{error}</p>
        <button onClick={() => window.location.reload()}
          className="px-6 py-2 transition-colors font-medium"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}>
          Retry
        </button>
      </div>
    );
  }

  if (decks.length === 0 && allFolders.length === 0) {
    return (
      <div className="glass-panel p-12 text-center max-w-md mx-auto mt-10 flex flex-col items-center">
        <div className="mb-6 p-6 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
          <BookOpen size={48} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>It&apos;s quiet here...</h3>
        <p className="mb-8 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>You haven&apos;t created any flashcards yet. Start building your collection!</p>
        <Link to="/create" className="inline-flex items-center gap-2 px-8 py-3 font-medium transition-all"
          style={{ background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 'var(--radius)' }}>
          <PlusCircle size={20} /> Create First Deck
        </Link>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl px-4 pb-20 pt-8 select-none"
      onClick={(e) => {
        if (selectedDeckIds.size > 0 && !e.target.closest('[data-deck-row], [data-selection-toolbar], [data-context-menu], input, button, a')) {
          setSelectedDeckIds(new Set());
          setLastClickedDeckId(null);
        }
      }}
    >
      {/* Title */}
      <div className="text-center mb-8">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight"
          style={{ color: 'var(--text-primary)' }}>
          Your Library
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="font-medium"
          style={{ color: 'var(--text-secondary)' }}>
          {decks.length} deck{decks.length !== 1 ? 's' : ''}
        </motion.p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {showNewFolder ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                }}
                placeholder="Folder name"
                className="text-sm px-3 py-1 outline-none"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                }}
              />
              <button onClick={createFolder} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Create</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowNewFolder(true)}
              className="text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}>
              <FolderPlus size={14} /> New Folder
            </button>
          )}
        </div>
        <Link to="/create"
          className="text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}>
          <PlusCircle size={14} /> New Deck
        </Link>
      </div>

      {/* Deck list with DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveDragId(String(active.id))}
        onDragEnd={(e) => { setActiveDragId(null); handleDragEnd(e); }}
        onDragCancel={() => setActiveDragId(null)}
      >
        <SortableContext items={flatDeckIds} strategy={verticalListSortingStrategy}>
          <div className="glass-panel overflow-hidden">
            {/* Column header */}
            <div className={`grid ${COLS} items-center py-2.5 px-2 text-[0.65rem] font-bold uppercase tracking-wider`}
              style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <div />
              <div className="pl-2">Deck</div>
              <div className="text-center">New</div>
              <div className="text-center">Learn</div>
              <div className="text-center">Due</div>
              <div className="text-center">Total</div>
              <div />
            </div>

            {/* Rows grouped by folder */}
            {sortedFolderKeys.map((f) => {
              const folderDecks = grouped[f] || [];
              const isCollapsed = f ? collapsedFolders[f] : false;
              return (
                <div key={f || '__root__'}>
                  {f && (
                    <FolderHeader
                      id={`folder:${f}`}
                      name={f}
                      count={folderDecks.length}
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleFolder(f)}
                      onDeleteFolder={deleteFolder}
                    />
                  )}
                  {!isCollapsed && folderDecks.map((deck) => {
                    const cardCount = Array.isArray(deck.cards) ? deck.cards.length : 0;
                    const srs = computeSRSCounts(deck.cards, progressMap[deck.id]);
                    return (
                      <SortableDeckRow
                        key={deck.id}
                        deck={deck}
                        srs={srs}
                        cardCount={cardCount}
                        isRenaming={renaming?.deckId === deck.id}
                        renamingState={renaming}
                        setRenaming={setRenaming}
                        submitRename={submitRename}
                        onContextMenu={handleContextMenu}
                        onRowClick={handleRowClick}
                        isSelected={selectedDeckIds.has(deck.id)}
                        selectedCount={selectedDeckIds.size}
                        isGhostDuringDrag={activeDragId && activeDragId !== deck.id && selectedDeckIds.has(deck.id) && selectedDeckIds.has(activeDragId) && selectedDeckIds.size > 1}
                        inFolder={!!f}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Root drop zone at bottom (visible when dragging over it) */}
            {allFolders.length > 0 && <RootDropZone />}
          </div>
        </SortableContext>
      </DndContext>

      {/* Context Menu */}
      {contextMenu && (
        <DeckContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          deck={contextMenu.deck}
          allFolders={allFolders}
          onClose={() => setContextMenu(null)}
          onRename={handleRename}
          onDelete={handleDelete}
          onMove={handleMove}
        />
      )}

      {/* Selection toolbar */}
      {selectedDeckIds.size > 0 && (
        <div data-selection-toolbar className="fixed bottom-0 left-0 right-0 z-40"
          style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {selectedDeckIds.size} deck{selectedDeckIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              {/* Batch move dropdown */}
              {allFolders.length > 0 && (
                <div className="relative group/bmove">
                  <button className="px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1"
                    style={{ color: 'var(--text-secondary)' }}>
                    <FolderOpen size={13} /> Move to…
                  </button>
                  <div className="hidden group-hover/bmove:block absolute bottom-full mb-1 right-0 w-40 py-1.5"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius)',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                    }}>
                    <button onClick={() => handleBatchMove('')}
                      className="w-full text-left px-4 py-2 text-xs transition-colors hover:opacity-80"
                      style={{ color: 'var(--text-primary)' }}>
                      (Root)
                    </button>
                    {allFolders.map((f) => (
                      <button key={f} onClick={() => handleBatchMove(f)}
                        className="w-full text-left px-4 py-2 text-xs truncate transition-colors hover:opacity-80"
                        style={{ color: 'var(--text-primary)' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={handleBatchDelete}
                className="px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1"
                style={{ color: 'var(--error)' }}>
                <Trash2 size={13} /> Delete
              </button>
              <button onClick={() => { setSelectedDeckIds(new Set()); setLastClickedDeckId(null); }}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
