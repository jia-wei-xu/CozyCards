## Plan: CozyCards Full Overhaul

This plan restructures CozyCards from a prototype into a polished, Anki-like daily flashcard driver with Monkeytype-inspired customization. The work spans 6 phases — each builds on the prior one. The plan touches every file in the project.

**Key architectural decisions:**
- Google Sheets remains the "database" but gets new columns/actions for user settings and SRS state
- SM-2 algorithm stays but is upgraded with proper daily caps, learning/review queues, and server-persisted progress
- A command palette (Ctrl+Shift+P / Esc) controls all settings, Monkeytype-style
- All theming via CSS custom properties on `:root`, swappable via palette presets

---

### Phase 1: Google Sheets Schema + API Layer Expansion

The foundation — everything else depends on having proper CRUD and user state storage.

**Steps:**

1. **Update the Apps Script** (PROMPT.md has the current script) to support new actions in `doPost`:
   - `update_deck` — update a deck's name, cards, or folder by `deckId`
   - `delete_deck` — delete a row by `deckId`
   - `get_deck` — fetch a single deck by `deckId` (avoids fetching all)
   - `save_user_settings` — store user preferences JSON (theme, daily caps, etc.)
   - `get_user_settings` — retrieve preferences
   - `save_progress` — persist SRS card state (replaces localStorage)
   - `get_progress` — retrieve SRS state for a deck

2. **Add new Sheets columns**: Add a `Folder` column (col E) to the Flashcards Database sheet. Create a new `UserSettings` sheet with columns: `Key`, `Value` (stores JSON blobs for themes, caps, etc.). Create a `Progress` sheet with columns: `DeckID`, `ProgressJSON`, `LastUpdated`.

3. **Expand api.js** with new functions matching the above actions: `updateDeck()`, `deleteDeck()`, `fetchDeck(deckId)`, `saveUserSettings()`, `getUserSettings()`, `saveProgress(deckId, state)`, `getProgress(deckId)`.

4. **Add client-side caching** in api.js: use a simple in-memory cache (`Map`) with TTL for `fetchDecks()` and `fetchDeck()` to avoid re-fetching on every navigation. Invalidate on mutations.

**Verification:** Test each new Apps Script action with `curl` or a small test script. Verify round-trip: save settings → fetch settings; save progress → fetch progress; create deck in folder → fetch and confirm folder column.

---

### Phase 2: Spaced Repetition Algorithm Overhaul

Upgrade from the current simplified SM-2 to a proper Anki-like SRS with learning steps, daily caps, and queue management.

**Steps:**

1. **Rewrite useSpacedRepetition.js** with Anki's three queues:
   - **New queue**: Cards never seen before. Daily cap (default 20).
   - **Learning queue**: Cards in learning steps (e.g., 1min → 10min). No daily cap.
   - **Review queue**: Cards graduated to review. Daily cap (default 200).
   - Card states: `new`, `learning`, `review`, `relearning`.
   - Learning steps: Again → step 0 (1m), Hard → same step, Good → next step, Easy → graduate immediately.
   - Review intervals use SM-2: `interval * EF * (fuzz factor)`.
   - Track per-session counts: new, learning, due (displayed in UI).

2. **Add time label calculation** to each button: "Again: <1m", "Hard: <6m", "Good: <10m", "Easy: 4d" — computed from the current card's state and the algorithm's next-interval logic. Export these from the hook.

3. **Persist progress to Google Sheets** via `saveProgress()` (from Phase 1). Load on mount with `getProgress()`, fall back to localStorage for offline use. Debounce saves (e.g., save after each review but debounce 2s to batch).

4. **Generate stable card IDs**: Instead of index-based `card_${idx}`, hash the card's `front + back` content to create a stable ID that survives reordering. Use a simple `hashCode` string → number function.

**Verification:** Create a deck with 25 cards. Verify only 20 show as "new" (cap). Review all 20 — verify learning steps work (Again sends to 1m, Good advances through steps). Next day, verify graduated cards appear as "review". Check that progress persists (reload page, navigate away and back).

---

### Phase 3: Card Editor Revamp (Create.jsx)

Replace the plain textarea editor with a rich content editor.

**Steps:**

1. **Install TipTap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-underline`, `@tiptap/extension-text-style`, `@tiptap/extension-color`). TipTap is lightweight, extensible, and outputs HTML — matching Anki's HTML card format.

2. **Create `src/components/CardEditor.jsx`**: A reusable rich text editor component wrapping TipTap with a minimal toolbar: **Bold**, **Italic**, **Underline**, **Color**, **Image** (upload or URL), **Code**, **LaTeX** (inline formula input). Output is HTML string.

3. **Rewrite Create.jsx**:
   - Replace textareas with `<CardEditor />` for front and back.
   - Each card row becomes a mini-card preview that's resizable (CSS `resize: vertical` or a drag handle).
   - Fix the trash icon (currently broken — the `removeCard` function uses `splice` on a shallow copy; fix with `filter`).
   - Add drag-to-reorder cards (use `@dnd-kit/core` or simple manual implementation).
   - Floating action bar at bottom: card count, "Add Card" button (full width), "Save Deck" button.
   - Add "Edit Deck" mode: if navigating to `/create?edit=deckId`, load existing deck data for editing (uses `fetchDeck()` from Phase 1).

4. **Update api.js** `saveDeck` to include `css` field if cards have rich HTML (preserve styles from imported Anki decks when re-editing).

**Verification:** Create a deck with bold/italic/image cards. Save and re-open in study mode — verify HTML renders. Edit an existing deck — verify changes persist. Resize card editors — verify smooth interaction. Delete cards — verify trash icon works.

---

### Phase 4: Study View + Library Revamp

**Steps:**

1. **Rewrite Study.jsx**:
   - Remove progress bar entirely.
   - Add bottom status bar showing `New: X | Learning: Y | Due: Z` counts (from the SRS hook) — fixed at the bottom of the viewport, styled as a subtle frosted bar.
   - Rating buttons: muted colors (gray/neutral tones instead of bright red/yellow/green/blue). Each button shows a time label above it (e.g., `<1m` above Again). Button widths match the card width.
   - `<Flashcard />` should be larger: change height to `clamp(24rem, 65vh, 50rem)` and width to `min(95vw, 50rem)`, more rectangular.
   - Remove the "View All Cards" floating button. Instead, scroll below the study area to see the card browser (lazy-loaded).
   - Add a search input at the top of the card browser section.
   - Keyboard shortcuts remain: Space=flip, 1=Again, 2=Hard, 3=Good, 4=Easy.

2. **Create `src/components/CardBrowser.jsx`**: Replaces `BottomDrawer.jsx`. Renders as an inline section below the study area (not a modal/drawer). Lazy-loads cards (render first 20, load more on scroll via `IntersectionObserver`). Includes a search input that filters by front/back text content.

3. **Rewrite Library.jsx**:
   - Replace the card grid with a **table layout**: columns `Deck Name`, `New`, `Learning`, `Due`, `Total`.
   - Each row is a deck. Click to navigate to `/study/:deckId`.
   - Add **folder support**: Folders are collapsible groups. A deck's folder is stored in the `Folder` column (from Phase 1). Default folder: "" (root).
   - Right-click context menu (or `...` button) on each deck: Rename, Move to folder, Delete, Edit (goes to `/create?edit=deckId`).
   - Folder management: Create folder, rename folder, delete folder (moves contents to root).
   - `New`/`Learning`/`Due` counts computed client-side from the SRS progress data.

4. **Delete dead code**: Remove Upload.jsx, ImportQuizlet.jsx, ankiImporter.js — all replaced by the Home view + backend.

5. **Update Flashcard.jsx**:
   - Remove "Question" / "Answer" labels — let the content speak for itself.
   - Make the card more rectangular (wider than tall by default).
   - Extract `stripScripts`, `sanitizeImages`, `buildScopedCSS` into a shared `src/utils/cardHelpers.js` to eliminate duplication with BottomDrawer.

**Verification:** Study a deck — verify no progress bar, see New/Learning/Due counts, buttons have time labels, card is larger. Scroll down to see card browser, search works. Library shows table with folder grouping. Right-click rename/delete works. SRS counts in library match actual state.

**Additional Phase 4 items (user feedback):**
- **Polish Create view layout**: The Add Card button and Save/Update floating bar feel loosely tied in and awkward — tighten spacing, improve visual hierarchy so the flow feels cohesive.
- **Full-width navbar**: Make the navigation bar span the entire viewport width (or optimize its layout) during the UI revamp.

---

### Phase 5: Command Palette + Theming (Monkeytype-style)

**Steps:**

1. **Create `src/components/CommandPalette.jsx`**: A modal overlay triggered by `Escape` or `Ctrl+Shift+P`. Contains a search input that filters commands. Categories:
   - **Theme**: Switch color palette (preset list: "Rosé Pine", "Catppuccin Mocha", "Nord", "Dracula", "Cozy Light", "Cozy Dark", etc.)
   - **Background**: Choose background image (built-in presets + custom URL)
   - **Study Settings**: New cards/day (default 20), Max reviews/day (default 200), Learning steps (default "1m 10m")
   - **Funbox**: Toggle confetti on Easy, toggle sound effects, toggle animations
   - **Account**: (future) Link to settings export/import

2. **Define theme system in index.css**: All colors as CSS custom properties on `:root`:
   - `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-glass`
   - `--text-primary`, `--text-secondary`, `--text-accent`
   - `--border-color`, `--shadow-color`
   - `--btn-again`, `--btn-hard`, `--btn-good`, `--btn-easy`
   - `--color-new`, `--color-learning`, `--color-due`
   Replace all hardcoded Tailwind colors in components with these variables using Tailwind's `var()` support or inline styles.

3. **Create `src/services/theme.js`**: Theme presets as JS objects mapping variable names to hex colors. `applyTheme(preset)` sets CSS variables on `document.documentElement`. `loadTheme()` reads from localStorage (fast) and syncs from Sheets (background).

4. **Persist settings** via `saveUserSettings()` / `getUserSettings()` from Phase 1. On app load (main.jsx or Layout), fetch settings and apply theme + preferences before first paint. Use localStorage as fast cache, Sheets as source of truth.

5. **Update Layout.jsx**:
   - Background image reads from theme settings (not hardcoded).
   - Navbar spans full width with horizontal padding (no floating glass card — instead a full-width frosted bar).
   - Register the `Escape` / `Ctrl+Shift+P` global keyboard listener for command palette.

6. **Add global keyboard listener** in Layout: `useEffect` with `keydown` handler that opens command palette on Escape (when not in an input) or Ctrl+Shift+P.

**Verification:** Press Escape — command palette opens. Search "theme" — see palette options. Select "Catppuccin Mocha" — entire UI changes colors instantly. Change background to a custom URL — background updates. Set new cards/day to 5 — study view only shows 5 new cards. Settings persist across page reloads.

---

### Phase 6: Optimization + Polish

**Steps:**

1. **Route-level code splitting**: Use `React.lazy()` + `Suspense` for each view in App.jsx — Study, Create, Library are heavy views that shouldn't all load upfront. This cuts the initial JS bundle significantly.

2. **Individual deck pages**: Change routing so `/study/:deckId` loads its data via `fetchDeck(deckId)` (from Phase 1) instead of fetching all decks. This is already partially prepared by Phase 1's `get_deck` action.

3. **Library optimization**: Cache the deck list + progress data. Use `stale-while-revalidate` pattern — show cached data immediately, fetch fresh data in background, update if changed.

4. **Reduce bundle**: Remove unused deps from package.json: `express`, `cors`, `multer`, `sql.js`, `jszip` (all dead code or server-only). This should save ~200KB+ from the bundle.

5. **Image optimization in cards**: For large base64 images from APKG imports, consider compressing on the backend (resize to max 800px width before base64 encoding). Add `loading="lazy"` to all card images.

6. **Fix remaining bugs**:
   - Flashcard.jsx: Fix `buildScopedCSS` to handle `@media`/`@keyframes` blocks properly.
   - renderLatex.js: Add support for `$...$` and `$$...$$` standard delimiters.
   - Layout.jsx: Fix nav active state to use `startsWith` instead of exact match.
   - index.html: Replace default Vite favicon with a custom CozyCards icon.

7. **Performance profiling**: Run Lighthouse, fix any accessibility/performance issues. Target: 90+ performance score.

**Verification:** `npx vite build` — chunk sizes should be smaller. Lighthouse audit should show improved scores. Navigate between pages — no full re-fetches. Large decks (100+ cards) render without lag.

---

### Decisions

- **TipTap over Slate.js/Draft.js**: TipTap is smaller, better maintained, outputs clean HTML (matches Anki cards), and has first-class React support.
- **CSS custom properties over Tailwind theme config**: Allows runtime theme switching without rebuilding CSS. Tailwind classes reference `var()` values.
- **Command palette over settings page**: Monkeytype's UX is specifically what the user asked for. Faster to use, feels modern.
- **Google Sheets for SRS progress over localStorage**: User requested Sheets storage. localStorage stays as a fast offline cache.
- **SM-2 algorithm over FSRS**: SM-2 is simpler, well-understood, and matches Anki's original algorithm. FSRS is newer but adds complexity without clear benefit for this use case.
- **IntersectionObserver for card browser over BottomDrawer**: Avoids lag with large decks, feels more natural than a modal drawer.
- **Stable card IDs via content hash**: Prevents progress loss when card order changes in Google Sheets.