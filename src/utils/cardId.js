// src/utils/cardId.js
// Generates a stable, deterministic ID for a card based on its content.
// This ensures SRS progress survives card reordering in Google Sheets.

/**
 * Simple string → 32-bit hash (djb2 variant).
 * Produces a hex string like "a3f2b1c0".
 * @param {string} str
 * @returns {string}
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0; // force 32-bit int
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Generate a stable ID for a card.
 *
 * Uses the card's `front` + `back` content to create a deterministic hash.
 * If two cards have identical front+back, a suffix is appended to disambiguate.
 *
 * @param {Array<{front: string, back: string}>} cards - full card list (for dedup)
 * @returns {Array<string>} parallel array of stable IDs
 */
export function generateCardIds(cards) {
  const seen = new Map(); // hash → count
  const ids = [];

  for (const card of cards) {
    const raw = `${card.front ?? ""}\x00${card.back ?? ""}`;
    const hash = djb2Hash(raw);
    const count = seen.get(hash) || 0;
    seen.set(hash, count + 1);

    // Append occurrence index only when there are duplicates
    ids.push(count === 0 ? `c_${hash}` : `c_${hash}_${count}`);
  }

  return ids;
}

/**
 * Attach stable `_id` fields to an array of cards.
 * Returns new card objects (doesn't mutate originals).
 *
 * @param {Array<{front: string, back: string}>} cards
 * @returns {Array<{front: string, back: string, _id: string}>}
 */
export function withStableIds(cards) {
  const ids = generateCardIds(cards);
  return cards.map((card, i) => ({ ...card, _id: ids[i] }));
}
