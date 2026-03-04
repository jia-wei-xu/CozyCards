import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { fetchDeck, fetchDecks } from '../services/api';
import useSpacedRepetition, { RATING } from '../hooks/useSpacedRepetition';
import Flashcard from '../components/Flashcard';
import CardBrowser from '../components/CardBrowser';
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { loadSettings, DEFAULT_FUNBOX } from '../services/theme';

export default function Study() {
  const { deckId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState(location.state?.deckData || null);
  const [loading, setLoading] = useState(!deck);
  const [isFlipped, setIsFlipped] = useState(false);

  // Read funbox settings once on mount
  const funboxSettings = useMemo(() => {
    const s = loadSettings();
    return { ...DEFAULT_FUNBOX, ...(s.funbox || {}) };
  }, []);

  // Load deck if missing — try individual fetch first, fallback to all
  useEffect(() => {
    if (!deck) {
      (async () => {
        try {
          const found = await fetchDeck(deckId);
          if (found) { setDeck(found); setLoading(false); return; }
        } catch { /* fall through */ }
        try {
          const data = await fetchDecks();
          const list = Array.isArray(data) ? data : (data.data || []);
          const found = list.find(d => d.id === deckId);
          if (found) setDeck(found);
        } catch { /* nothing */ }
        setLoading(false);
      })();
    }
  }, [deck, deckId]);

  const stableCards = useMemo(() => deck?.cards || [], [deck?.cards]);
  const {
    currentCard,
    queue,
    counts,
    buttonLabels,
    submitReview,
    nextDueIn,
    loaded: srsLoaded,
  } = useSpacedRepetition(deckId, stableCards);

  // Live countdown for the waiting screen
  const [waitDisplay, setWaitDisplay] = useState('');
  useEffect(() => {
    if (!nextDueIn || nextDueIn <= 0 || currentCard) {
      setWaitDisplay('');
      return;
    }
    function tick() {
      const remaining = Math.max(0, nextDueIn - (Date.now() - tickStart));
      if (remaining <= 0) { setWaitDisplay(''); return; }
      const sec = Math.ceil(remaining / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      setWaitDisplay(m > 0 ? `${m}m ${s}s` : `${s}s`);
    }
    const tickStart = Date.now();
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextDueIn, currentCard]);

  const handleRate = useCallback((rating) => {
    if (!currentCard) return;
    
    // Confetti for Good and Easy (respect user setting)
    if (rating >= RATING.GOOD && funboxSettings.confetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea']
      });
    }

    submitReview(currentCard._id, rating);
    setIsFlipped(false);
  }, [currentCard, submitReview, funboxSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentCard) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isFlipped) setIsFlipped(true);
      }
      
      if (isFlipped) {
        if (e.key === '1') handleRate(RATING.AGAIN);
        if (e.key === '2') handleRate(RATING.HARD);
        if (e.key === '3') handleRate(RATING.GOOD);
        if (e.key === '4') handleRate(RATING.EASY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentCard, handleRate]);

  if (loading || !srsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mb-4"
          style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
        <p className="animate-pulse" style={{ color: 'var(--text-secondary)' }}>Loading deck...</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto mt-10">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Deck not found</h2>
        <button onClick={() => navigate('/library')}
          className="px-6 py-2"
          style={{ background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 'var(--radius)' }}>
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[min(95vw,54rem)] mx-auto px-4 pb-12 pt-4 flex flex-col min-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 glass-panel py-3 px-6">
        <button 
          onClick={() => navigate('/library')}
          className="p-2 rounded-full transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={20} />
        </button>
        
        <h2 className="flex-1 text-center text-sm font-semibold truncate px-4"
          style={{ color: 'var(--text-primary)' }}>
          {deck.name}
        </h2>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span style={{ color: 'var(--color-new)' }}>{counts.newCount} new</span>
          <span style={{ color: 'var(--color-learning)' }}>{counts.learningCount} learn</span>
          <span style={{ color: 'var(--color-due)' }}>{counts.dueCount} due</span>
        </div>
      </div>

      {/* Main Study Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <AnimatePresence mode="wait" initial={funboxSettings.animations}>
          {!currentCard && nextDueIn > 0 && waitDisplay ? (
            /* Waiting for learning cards — countdown */
            <motion.div
              key="waiting"
              initial={funboxSettings.animations ? { opacity: 0, scale: 0.9 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={funboxSettings.animations ? { opacity: 0, scale: 0.9 } : undefined}
              className="glass-panel p-12 text-center w-full"
            >
              <div className="mb-6 p-6 rounded-full inline-block"
                style={{ background: 'var(--accent-dim)', color: 'var(--color-learning)' }}>
                <RotateCcw size={40} className="animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Next card in</h2>
              <p className="text-4xl font-mono font-bold mb-6" style={{ color: 'var(--color-learning)' }}>{waitDisplay}</p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Learning cards will reappear when their timer expires.</p>
              <button 
                onClick={() => navigate('/library')}
                className="px-6 py-3 font-bold transition-all"
                style={{ background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 'var(--radius)' }}
              >
                Back to Library
              </button>
            </motion.div>
          ) : !currentCard ? (
            <motion.div 
              key="finished"
              initial={funboxSettings.animations ? { opacity: 0, scale: 0.9 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={funboxSettings.animations ? { opacity: 0, scale: 0.9 } : undefined}
              className="glass-panel p-12 text-center w-full"
            >
              <div className="mb-6 p-6 rounded-full inline-block"
                style={{ background: 'var(--accent-dim)', color: 'var(--success)' }}>
                <CheckCircle size={48} />
              </div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>All caught up!</h2>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>You&apos;ve reviewed all cards due for now.</p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => navigate('/library')} 
                  className="px-6 py-3 font-bold transition-all"
                  style={{ background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 'var(--radius)' }}
                >
                  Back to Library
                </button>
                 <button 
                  onClick={() => window.location.reload()} 
                  className="px-6 py-3 font-bold transition-all flex items-center gap-2"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                >
                  <RotateCcw size={18} /> Review Again
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="w-full flex flex-col items-center gap-6 relative z-10">
              <Flashcard 
                card={currentCard} 
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)} 
              />
              
              {/* Rating Buttons with time labels — muted colours, full card width */}
              <div className={`
                 transition-all duration-500 ease-out transform
                 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                 grid grid-cols-4 gap-2 md:gap-3 w-full
              `}>
                {[RATING.AGAIN, RATING.HARD, RATING.GOOD, RATING.EASY].map((rating) => {
                  const labels = { [RATING.AGAIN]: 'Again', [RATING.HARD]: 'Hard', [RATING.GOOD]: 'Good', [RATING.EASY]: 'Easy' };
                  const keys = { [RATING.AGAIN]: '1', [RATING.HARD]: '2', [RATING.GOOD]: '3', [RATING.EASY]: '4' };
                  const colorVars = { [RATING.AGAIN]: '--btn-again', [RATING.HARD]: '--btn-hard', [RATING.GOOD]: '--btn-good', [RATING.EASY]: '--btn-easy' };
                  return (
                    <button
                      key={labels[rating]}
                      onClick={() => handleRate(rating)}
                      className="flex flex-col items-center py-3 font-semibold transition-all"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius)',
                        color: `var(${colorVars[rating]})`,
                      }}
                      title={`${labels[rating]} (${keys[rating]})`}
                    >
                      <span className="text-[0.65rem] mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {buttonLabels?.[Object.keys(RATING)[rating]]?.label ?? ''}
                      </span>
                      <span className="text-sm">{labels[rating]}</span>
                    </button>
                  );
                })}
              </div>
              

            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Card Browser — anchored section below study area */}
      <CardBrowser cards={deck.cards || []} />
    </div>
  );
}
