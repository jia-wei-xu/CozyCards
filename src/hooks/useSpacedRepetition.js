// src/hooks/useSpacedRepetition.js
// ═══════════════════════════════════════════════════════════════════════════
// Anki-like Spaced Repetition with three queues: New → Learning → Review
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getProgress, saveProgress, getUserSettings } from "../services/api";
import { loadSettings as loadLocalSettings } from "../services/theme";
import { withStableIds } from "../utils/cardId";

// ── Rating constants ─────────────────────────────────────────────────────
export const RATING = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

// ── Default settings (can be overridden via user settings) ───────────────
const DEFAULTS = {
  dailyNewCap: 20,
  dailyReviewCap: 200,
  learningSteps: [1, 10],       // minutes
  relearningSteps: [10],        // minutes
  graduatingInterval: 1,        // days — after last learning step
  easyInterval: 4,              // days — Easy pressed during learning
  startingEase: 2.5,
  easyBonus: 1.3,
  hardMultiplier: 1.2,
  intervalModifier: 1.0,
  newCardOrder: "sequential",   // "sequential" | "random"
  maxInterval: 36500,           // ~100 years
  lapseNewInterval: 0.0,        // multiplier applied to interval on lapse (0 = reset)
  learnAheadMinutes: 20,        // Anki shows learning cards up to 20m early if queue is empty
};

// ── Card states ──────────────────────────────────────────────────────────
const STATE = { NEW: 0, LEARNING: 1, REVIEW: 2, RELEARNING: 3 };

// ── Fuzz factor to avoid clustering ──────────────────────────────────────
function fuzz(interval) {
  if (interval < 3) return interval;
  const fuzzRange = Math.max(1, Math.round(interval * 0.05));
  return interval + Math.floor(Math.random() * (fuzzRange * 2 + 1)) - fuzzRange;
}

// ── Parse a learning-steps string into an array of minutes ───────────────
// Accepts: "1 10", "1m 10m", "30s 1m 10m", "1h", mixed forms.
// Plain numbers (no suffix) are treated as minutes (Anki convention).
function parseLearningSteps(str) {
  if (!str) return [];
  return String(str)
    .trim()
    .split(/\s+/)
    .map((token) => {
      const match = token.match(/^([\d.]+)\s*(s|m|h|d)?$/i);
      if (!match) return NaN;
      const num = parseFloat(match[1]);
      const unit = (match[2] || 'm').toLowerCase();
      if (unit === 's') return num / 60;
      if (unit === 'm') return num;
      if (unit === 'h') return num * 60;
      if (unit === 'd') return num * 1440;
      return num;
    })
    .filter((n) => !isNaN(n) && n > 0);
}

// ── Time helpers ─────────────────────────────────────────────────────────
function now() { return Date.now(); }
function minutes(m) { return m * 60_000; }
function days(d) { return d * 86_400_000; }
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── Format a ms duration into a human-readable label ─────────────────────
export function formatDuration(ms) {
  if (ms <= 0) return "<1m";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `<1m`;
  const totalMin = Math.round(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const totalHr = Math.round(totalMin / 60);
  if (totalHr < 24) return `${totalHr}h`;
  const totalDays = Math.round(totalHr / 24);
  if (totalDays < 30) return `${totalDays}d`;
  const totalMo = Math.round(totalDays / 30);
  if (totalMo < 12) return `${totalMo}mo`;
  const totalYr = +(totalDays / 365).toFixed(1);
  return `${totalYr}y`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core SRS engine  (pure functions — no React, testable in isolation)
// ═══════════════════════════════════════════════════════════════════════════

/** Create default card progress for a new (unseen) card. */
function newCardProgress() {
  return {
    state: STATE.NEW,
    step: 0,
    ease: 0,          // set to startingEase on first graduation
    interval: 0,      // days (used only in REVIEW state)
    due: 0,           // timestamp ms
    lapses: 0,
    reps: 0,
  };
}

/**
 * Given current card progress + a rating, return the NEXT progress object
 * and the delay (in ms) until the card is due again.
 */
export function computeNext(card, rating, cfg = DEFAULTS) {
  const c = { ...card };
  const t = now();

  switch (c.state) {
    // ── NEW / LEARNING ───────────────────────────────────────────────
    case STATE.NEW:
    case STATE.LEARNING: {
      const steps = cfg.learningSteps;
      if (rating === RATING.AGAIN) {
        c.step = 0;
        c.state = STATE.LEARNING;
        c.due = t + minutes(steps[0] ?? 1);
      } else if (rating === RATING.HARD) {
        // Anki Hard logic:
        //   Step 0 with ≥2 steps → average of steps[0] and steps[1]
        //   Step 0 with 1 step  → 1.5× that step (capped at step + 1 day)
        //   Any other step       → repeat current step
        c.state = STATE.LEARNING;
        let hardDelay;
        if (c.step === 0) {
          if (steps.length >= 2) {
            hardDelay = (steps[0] + steps[1]) / 2;
          } else {
            hardDelay = (steps[0] ?? 1) * 1.5;
          }
        } else {
          hardDelay = steps[c.step] ?? steps[steps.length - 1] ?? 1;
        }
        c.due = t + minutes(hardDelay);
      } else if (rating === RATING.GOOD) {
        const nextStep = c.step + 1;
        if (nextStep >= steps.length) {
          // Graduate!
          c.state = STATE.REVIEW;
          c.ease = cfg.startingEase;
          c.interval = cfg.graduatingInterval;
          c.due = t + days(cfg.graduatingInterval);
        } else {
          c.step = nextStep;
          c.state = STATE.LEARNING;
          c.due = t + minutes(steps[nextStep]);
        }
      } else if (rating === RATING.EASY) {
        // Instant graduation with easy interval
        c.state = STATE.REVIEW;
        c.ease = cfg.startingEase;
        c.interval = cfg.easyInterval;
        c.due = t + days(cfg.easyInterval);
      }
      break;
    }

    // ── REVIEW ───────────────────────────────────────────────────────
    case STATE.REVIEW: {
      c.reps += 1;
      if (rating === RATING.AGAIN) {
        // Lapse
        c.lapses += 1;
        c.state = STATE.RELEARNING;
        c.step = 0;
        const reSteps = cfg.relearningSteps;
        c.due = t + minutes(reSteps[0] ?? 10);
        // Apply lapse penalty to interval
        if (cfg.lapseNewInterval > 0) {
          c.interval = Math.max(1, Math.round(c.interval * cfg.lapseNewInterval));
        } else {
          c.interval = 1;
        }
        c.ease = Math.max(1.3, c.ease - 0.2);
      } else if (rating === RATING.HARD) {
        c.ease = Math.max(1.3, c.ease - 0.15);
        const raw = c.interval * cfg.hardMultiplier * cfg.intervalModifier;
        c.interval = Math.min(cfg.maxInterval, Math.max(c.interval + 1, fuzz(Math.round(raw))));
        c.due = t + days(c.interval);
      } else if (rating === RATING.GOOD) {
        const raw = c.interval * c.ease * cfg.intervalModifier;
        c.interval = Math.min(cfg.maxInterval, Math.max(c.interval + 1, fuzz(Math.round(raw))));
        c.due = t + days(c.interval);
      } else if (rating === RATING.EASY) {
        c.ease += 0.15;
        const raw = c.interval * c.ease * cfg.easyBonus * cfg.intervalModifier;
        c.interval = Math.min(cfg.maxInterval, Math.max(c.interval + 1, fuzz(Math.round(raw))));
        c.due = t + days(c.interval);
      }
      break;
    }

    // ── RELEARNING ───────────────────────────────────────────────────
    case STATE.RELEARNING: {
      const reSteps = cfg.relearningSteps;
      if (rating === RATING.AGAIN) {
        c.step = 0;
        c.due = t + minutes(reSteps[0] ?? 10);
      } else if (rating === RATING.HARD) {
        // Same Anki Hard logic as learning:
        //   Step 0 with ≥2 steps → avg of steps[0] and steps[1]
        //   Step 0 with 1 step  → 1.5× that step
        //   Any other step       → repeat current step
        let hardDelay;
        if (c.step === 0) {
          if (reSteps.length >= 2) {
            hardDelay = (reSteps[0] + reSteps[1]) / 2;
          } else {
            hardDelay = (reSteps[0] ?? 10) * 1.5;
          }
        } else {
          hardDelay = reSteps[c.step] ?? reSteps[reSteps.length - 1] ?? 10;
        }
        c.due = t + minutes(hardDelay);
      } else if (rating === RATING.GOOD) {
        const nextStep = c.step + 1;
        if (nextStep >= reSteps.length) {
          c.state = STATE.REVIEW;
          c.due = t + days(c.interval);
        } else {
          c.step = nextStep;
          c.due = t + minutes(reSteps[nextStep]);
        }
      } else if (rating === RATING.EASY) {
        c.state = STATE.REVIEW;
        c.interval = Math.max(c.interval, cfg.easyInterval);
        c.due = t + days(c.interval);
      }
      break;
    }
    default:
      break;
  }

  return c;
}

/**
 * Compute what pressing each rating button would give, returning {label, delayMs}
 * for each of the 4 buttons. Used to show "<1m" / "10m" / "1d" / "4d" labels.
 */
export function computeButtonLabels(cardProgress, cfg = DEFAULTS) {
  const labels = {};
  for (const [name, value] of Object.entries(RATING)) {
    const next = computeNext(cardProgress, value, cfg);
    const delayMs = next.due - now();
    labels[name] = { label: formatDuration(delayMs), delayMs };
  }
  return labels; // { AGAIN: {label, delayMs}, HARD: …, GOOD: …, EASY: … }
}

// ═══════════════════════════════════════════════════════════════════════════
// React hook
// ═══════════════════════════════════════════════════════════════════════════

export default function useSpacedRepetition(deckId, allCards) {
  // ── Settings (merged with defaults) ──────────────────────────────────
  const [cfg, setCfg] = useState(DEFAULTS);

  // ── Per-card progress map: { cardId: progressObj } ───────────────────
  const [cardMap, setCardMap] = useState({});

  // ── Daily counters (reset on new day) ────────────────────────────────
  const [dailyCounts, setDailyCounts] = useState({
    date: todayStart(),
    newDone: 0,
    reviewDone: 0,
  });

  // ── Queue of cards for this session ──────────────────────────────────
  const [queue, setQueue] = useState([]);

  // ── Loading / saving state ───────────────────────────────────────────
  const [loaded, setLoaded] = useState(false);

  // Debounce timer ref for saving
  const saveTimer = useRef(null);

  // Cards with stable IDs (memoized)
  const cardsWithIds = useMemo(() => withStableIds(allCards), [allCards]);

  // ── Load settings + progress on mount ────────────────────────────────
  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;

    async function load() {
      // Load user settings (for caps, steps, etc.)
      try {
        const settings = await getUserSettings();
        if (!cancelled && settings) {
          setCfg((prev) => ({
            ...prev,
            dailyNewCap: settings.daily_new_cap ?? prev.dailyNewCap,
            dailyReviewCap: settings.daily_review_cap ?? prev.dailyReviewCap,
            // Parse learning steps if stored as string "1 10"
            ...(settings.learning_steps
              ? {
                  learningSteps: parseLearningSteps(settings.learning_steps),
                }
              : {}),
          }));
        }
      } catch {
        /* use defaults */
      }

      // Override with command palette localStorage settings (these are the
      // settings the user actually changes via the UI)
      try {
        const local = loadLocalSettings();
        if (!cancelled && local?.study) {
          setCfg((prev) => {
            const merged = { ...prev };
            if (local.study.newPerDay != null) merged.dailyNewCap = Number(local.study.newPerDay);
            if (local.study.maxReviews != null) merged.dailyReviewCap = Number(local.study.maxReviews);
            if (local.study.learningSteps) {
              // Parse "1 10" or "1m 10m" → [1, 10]
              const steps = parseLearningSteps(local.study.learningSteps);
              if (steps.length > 0) merged.learningSteps = steps;
            }
            return merged;
          });
        }
      } catch {
        /* ignore localStorage errors */
      }

      // Load SRS progress from Sheets (or localStorage fallback)
      let progressData = null;
      try {
        const res = await getProgress(deckId);
        if (res && res.progress) progressData = res.progress;
      } catch {
        /* network error */
      }

      // Fallback: localStorage
      if (!progressData) {
        try {
          const local = localStorage.getItem(`cozycards_progress_${deckId}`);
          if (local) {
            const parsed = JSON.parse(local);
            // Convert old format (direct card map) to new format
            if (parsed && !parsed.cards) {
              progressData = { cards: parsed, daily: null };
            } else {
              progressData = parsed;
            }
          }
        } catch {
          /* corrupt data */
        }
      }

      if (!cancelled) {
        const cards = progressData?.cards || {};
        setCardMap(cards);

        // Restore daily counts if same day
        const savedDaily = progressData?.daily;
        if (savedDaily && savedDaily.date === todayStart()) {
          setDailyCounts(savedDaily);
        } else {
          setDailyCounts({ date: todayStart(), newDone: 0, reviewDone: 0 });
        }

        setLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [deckId]); // intentionally NOT including allCards — we only load once

  // ── Build session queue whenever cardMap, cards, or cfg change ───────
  // Also re-run periodically to surface learning cards once they're due.
  const queueTimerRef = useRef(null);

  useEffect(() => {
    if (!loaded || cardsWithIds.length === 0) return;

    function buildQueue() {
      const t = now();
      const today = todayStart();

      // Reset daily counts if day rolled over
      let daily = dailyCounts;
      if (daily.date !== today) {
        daily = { date: today, newDone: 0, reviewDone: 0 };
        setDailyCounts(daily);
      }

      const newCards = [];
      const learningDue = [];      // learning cards that are due NOW
      const learningWaiting = [];   // learning cards not yet due (but due within learn-ahead)
      const learningFar = [];       // learning cards due beyond learn-ahead
      const reviewCards = [];

      const learnAheadMs = minutes(cfg.learnAheadMinutes ?? 20);

      for (const card of cardsWithIds) {
        const prog = cardMap[card._id];
        if (!prog) {
          newCards.push(card);
        } else if (prog.state === STATE.LEARNING || prog.state === STATE.RELEARNING) {
          if (prog.due <= t) {
            learningDue.push(card);
          } else if (prog.due <= t + learnAheadMs) {
            learningWaiting.push(card);
          } else {
            learningFar.push(card);
          }
        } else if (prog.state === STATE.REVIEW && prog.due <= t) {
          reviewCards.push(card);
        }
      }

      // Sort learning-due by due time (soonest first)
      learningDue.sort((a, b) => (cardMap[a._id]?.due || 0) - (cardMap[b._id]?.due || 0));

      // Apply daily caps
      const newCapped = newCards.slice(0, Math.max(0, cfg.dailyNewCap - daily.newDone));
      const reviewCapped = reviewCards.slice(0, Math.max(0, cfg.dailyReviewCap - daily.reviewDone));

      // Anki learn-ahead: if there are no other cards to show but learning cards
      // are due within the learn-ahead window, show the soonest one early.
      let learnAhead = [];
      if (learningDue.length === 0 && newCapped.length === 0 && reviewCapped.length === 0
          && learningWaiting.length > 0) {
        // Sort by due time (soonest first) and show the soonest
        learningWaiting.sort((a, b) => (cardMap[a._id]?.due || 0) - (cardMap[b._id]?.due || 0));
        learnAhead = [learningWaiting[0]];
      }

      // Interleave: due learning first, then learn-ahead, then new, then review
      const sessionQueue = [...learningDue, ...learnAhead, ...newCapped, ...reviewCapped];
      setQueue(sessionQueue);

      // Schedule a timer so we re-build the queue when the next learning card becomes due
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
      const allWaiting = [...learningWaiting, ...learningFar];
      if (allWaiting.length > 0) {
        const soonest = Math.min(...allWaiting.map(c => cardMap[c._id]?.due || Infinity));
        const delay = Math.max(1000, soonest - now()); // at least 1s to avoid tight loops
        queueTimerRef.current = setTimeout(buildQueue, delay);
      }
    }

    buildQueue();

    return () => {
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    };
  }, [loaded, cardsWithIds, cardMap, cfg, dailyCounts]);

  // ── Persist progress (debounced) ─────────────────────────────────────
  const persist = useCallback(
    (nextCardMap, nextDaily) => {
      const blob = { cards: nextCardMap, daily: nextDaily };

      // Always save to localStorage (instant, offline-safe)
      try {
        localStorage.setItem(
          `cozycards_progress_${deckId}`,
          JSON.stringify(blob)
        );
      } catch {
        /* quota exceeded? */
      }

      // Debounced save to Sheets
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveProgress(deckId, blob).catch(() => {
          /* silently fail — localStorage is the backup */
        });
      }, 2000);
    },
    [deckId]
  );

  // ── Submit a review ──────────────────────────────────────────────────
  const submitReview = useCallback(
    (cardId, rating) => {
      const current = cardMap[cardId] || newCardProgress();
      const wasNew = current.state === STATE.NEW;
      const wasReview = current.state === STATE.REVIEW;

      const next = computeNext(current, rating, cfg);

      // Update card map
      const nextCardMap = { ...cardMap, [cardId]: next };
      setCardMap(nextCardMap);

      // Update daily counts
      const nextDaily = { ...dailyCounts };
      if (wasNew) nextDaily.newDone += 1;
      if (wasReview) nextDaily.reviewDone += 1;
      setDailyCounts(nextDaily);

      persist(nextCardMap, nextDaily);

      // Update queue: remove the reviewed card.
      // If it's still in learning/relearning, the queue-rebuild timer will
      // re-add it once its due time arrives (1m, 10m, etc.).
      setQueue((prev) => prev.filter((c) => c._id !== cardId));
    },
    [cardMap, dailyCounts, cfg, persist]
  );

  // ── Compute queue counts for display ─────────────────────────────────
  // Anki counts ALL learning/relearning cards (including those with pending
  // timers), not just the ones currently in the queue.
  const counts = useMemo(() => {
    const result = { newCount: 0, learningCount: 0, dueCount: 0 };
    const t = now();

    // Count new/review from the queue (they are capped)
    for (const card of queue) {
      const p = cardMap[card._id];
      if (!p || p.state === STATE.NEW) result.newCount++;
      else if (p.state === STATE.REVIEW) result.dueCount++;
      // learning cards in queue are counted below with all learning cards
    }

    // Count ALL learning/relearning cards across the entire deck
    for (const card of cardsWithIds) {
      const p = cardMap[card._id];
      if (p && (p.state === STATE.LEARNING || p.state === STATE.RELEARNING)) {
        result.learningCount++;
      }
    }

    return result;
  }, [queue, cardMap, cardsWithIds]);

  // ── Current card ─────────────────────────────────────────────────────
  const currentCard = queue[0] || null;

  // ── Time until next learning card is due (for waiting screen) ────────
  const nextDueIn = useMemo(() => {
    if (currentCard) return 0; // no wait if there's a card to show
    const t = now();
    let soonest = Infinity;
    for (const card of cardsWithIds) {
      const p = cardMap[card._id];
      if (p && (p.state === STATE.LEARNING || p.state === STATE.RELEARNING) && p.due > t) {
        soonest = Math.min(soonest, p.due - t);
      }
    }
    return soonest === Infinity ? 0 : soonest;
  }, [currentCard, cardsWithIds, cardMap]);

  // ── Button labels for current card ───────────────────────────────────
  const buttonLabels = useMemo(() => {
    if (!currentCard) return null;
    const prog = cardMap[currentCard._id] || newCardProgress();
    return computeButtonLabels(prog, cfg);
  }, [currentCard, cardMap, cfg]);

  return {
    /** The card currently being studied (or null if done/waiting). */
    currentCard,
    /** The full session queue. */
    queue,
    /** { newCount, learningCount, dueCount } for the current queue. */
    counts,
    /** { AGAIN: {label, delayMs}, HARD: …, GOOD: …, EASY: … } or null. */
    buttonLabels,
    /** Call to submit a rating: submitReview(cardId, RATING.GOOD) */
    submitReview,
    /** ms until the next learning card is due (0 if nothing is waiting). */
    nextDueIn,
    /** Config object (merged defaults + user settings). */
    cfg,
    /** Whether initial progress has been loaded from storage. */
    loaded,
    /** Full progress card map (for external reads). */
    cardMap,
  };
}

