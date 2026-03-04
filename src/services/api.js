// src/services/api.js

const API_URL =
  "https://script.google.com/macros/s/AKfycbx1KJlD35OhrUHUIdwtrTvulqaHn74FSxX9uS__4pKSocPopzTei7PSSwgBBHiQAAT_/exec";

// ---------------------------------------------------------------------------
// Cache layer — in-memory Map with TTL + stale-while-revalidate
// ---------------------------------------------------------------------------
const _cache = new Map();
const CACHE_TTL = 60_000;       // 60 s — data considered fresh
const STALE_TTL = 5 * 60_000;   // 5 min — data usable while revalidating

function _getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.ts;
  if (age < CACHE_TTL) return { data: entry.data, stale: false };
  if (age < STALE_TTL) return { data: entry.data, stale: true };
  _cache.delete(key);
  return null;
}

function _setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

/** Invalidate every cache key that starts with `prefix`. */
function _invalidate(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

/** Clear the entire cache (useful after bulk operations). */
export function invalidateAllCache() {
  _cache.clear();
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/** GET with optional query-string params. */
async function _get(params = {}) {
  const url = new URL(API_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.status === "success") return json.data;
  throw new Error(json.message || "API GET failed");
}

/**
 * POST a JSON payload.  Apps Script requires NO Content-Type header
 * (to avoid CORS preflight).
 */
async function _post(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.status === "success") return json;
  throw new Error(json.message || "API POST failed");
}

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------

/**
 * Fetch every deck (lightweight — no progress data).
 * Uses stale-while-revalidate: returns cached data immediately, then
 * refreshes in the background if stale.
 * @returns {Promise<Array>} list of deck objects
 */
export async function fetchDecks() {
  const hit = _getCached("decks:all");
  if (hit && !hit.stale) return hit.data;

  // If stale, return cached data but kick off a background refresh
  if (hit?.stale) {
    _get().then((data) => _setCache("decks:all", data)).catch(() => {});
    return hit.data;
  }

  const data = await _get(); // no action → getAllDecks
  _setCache("decks:all", data);
  return data;
}

/**
 * Fetch a single deck by ID. Falls back to fetchDecks() scan if the
 * server doesn't support get_deck yet (graceful migration).
 * @param {string} deckId
 * @returns {Promise<Object>} deck object
 */
export async function fetchDeck(deckId) {
  const hit = _getCached(`deck:${deckId}`);
  if (hit && !hit.stale) return hit.data;

  if (hit?.stale) {
    // Background revalidation
    _get({ action: "get_deck", deckId })
      .then((data) => { if (data) _setCache(`deck:${deckId}`, data); })
      .catch(() => {});
    return hit.data;
  }

  try {
    const data = await _get({ action: "get_deck", deckId });
    if (data) {
      _setCache(`deck:${deckId}`, data);
      return data;
    }
  } catch {
    // Fallback: filter from full list (old script without get_deck)
  }

  const all = await fetchDecks();
  const deck = all.find((d) => d.id === deckId) || null;
  if (deck) _setCache(`deck:${deckId}`, deck);
  return deck;
}

/**
 * Create a new deck (backward-compatible — same shape as before).
 * @param {Object} deckData — { deckName, cards, folder? }
 * @returns {Promise<Object>} { status, deckId }
 */
export async function saveDeck(deckData) {
  const result = await _post({
    action: "create_deck",
    deckName: deckData.deckName,
    cards: deckData.cards || [],
    folder: deckData.folder || "",
  });
  _invalidate("decks:");
  return result;
}

/**
 * Update an existing deck.
 * @param {string} deckId
 * @param {Object} updates — any of { deckName, cards, folder }
 * @returns {Promise<Object>}
 */
export async function updateDeck(deckId, updates) {
  const result = await _post({
    action: "update_deck",
    deckId,
    ...updates,
  });
  _invalidate("deck");  // invalidates "deck:*" and "decks:*"
  return result;
}

/**
 * Delete a deck (also removes associated SRS progress server-side).
 * @param {string} deckId
 * @returns {Promise<Object>}
 */
export async function deleteDeck(deckId) {
  const result = await _post({ action: "delete_deck", deckId });
  _invalidate("deck");
  _invalidate("progress:");
  return result;
}

// ---------------------------------------------------------------------------
// User settings (theme, daily caps, background, etc.)
// ---------------------------------------------------------------------------

/**
 * Retrieve all user settings as a plain object.
 * @returns {Promise<Object>} e.g. { theme: "catppuccin", daily_new_cap: 20, … }
 */
export async function getUserSettings() {
  const hit = _getCached("settings");
  if (hit && !hit.stale) return hit.data;

  if (hit?.stale) {
    _get({ action: "get_user_settings" })
      .then((data) => _setCache("settings", data))
      .catch(() => {});
    return hit.data;
  }

  try {
    const data = await _get({ action: "get_user_settings" });
    _setCache("settings", data);
    return data;
  } catch {
    return {};
  }
}

/**
 * Persist user settings. Merges with existing keys on the server.
 * @param {Object} settings — key/value pairs to save
 * @returns {Promise<Object>}
 */
export async function saveUserSettings(settings) {
  const result = await _post({ action: "save_user_settings", settings });
  _invalidate("settings");
  return result;
}

// ---------------------------------------------------------------------------
// SRS progress
// ---------------------------------------------------------------------------

/**
 * Get SRS progress for one deck, or all decks if deckId is omitted.
 * @param {string} [deckId]
 * @returns {Promise<Object|Array|null>}
 */
export async function getProgress(deckId) {
  const cacheKey = deckId ? `progress:${deckId}` : "progress:all";
  const hit = _getCached(cacheKey);
  if (hit && !hit.stale) return hit.data;

  if (hit?.stale) {
    const params = { action: "get_progress" };
    if (deckId) params.deckId = deckId;
    _get(params)
      .then((data) => _setCache(cacheKey, data))
      .catch(() => {});
    return hit.data;
  }

  try {
    const params = { action: "get_progress" };
    if (deckId) params.deckId = deckId;
    const data = await _get(params);
    _setCache(cacheKey, data);
    return data;
  } catch {
    return deckId ? null : [];
  }
}

/**
 * Save SRS progress for a deck.
 * @param {string} deckId
 * @param {Object} progress — the full progress state blob
 * @returns {Promise<Object>}
 */
export async function saveProgress(deckId, progress) {
  const result = await _post({ action: "save_progress", deckId, progress });
  _invalidate("progress:");
  return result;
}
