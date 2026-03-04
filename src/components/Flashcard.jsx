import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { renderLatexInHTML, hasLatex } from '../utils/renderLatex';
import { stripScripts, sanitizeImages, isHTML, buildScopedCSS } from '../utils/cardHelpers';

/**
 * Renders card content: rich HTML (with scoped Anki CSS + LaTeX) or plain text.
 */
function CardContent({ html, css, side }) {
  const containsHTML = useMemo(() => isHTML(html || ''), [html]);
  const containsLatex = useMemo(() => hasLatex(html || ''), [html]);
  const isRich = containsHTML || containsLatex;

  const processedHTML = useMemo(() => {
    let result = html || '';
    result = stripScripts(result);
    if (containsLatex) result = renderLatexInHTML(result);
    result = sanitizeImages(result);
    return result;
  }, [html, containsLatex]);

  const scopeClass = useMemo(
    () => 'anki-scope-' + Math.random().toString(36).slice(2, 8),
    []
  );

  const scopedCSS = useMemo(
    () => buildScopedCSS(css, scopeClass),
    [css, scopeClass]
  );

  if (!isRich) {
    return (
      <div className="flex-1 flex items-center justify-center w-full overflow-y-auto scrollbar-hide">
        <p className={`text-center leading-relaxed ${
          side === 'front'
            ? 'text-2xl md:text-3xl font-bold'
            : 'text-xl md:text-2xl font-medium'
        }`} style={{ color: 'var(--text-primary)' }}>
          {html}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full overflow-y-auto scrollbar-hide">
      {scopedCSS && <style>{scopedCSS}</style>}
      <div
        className={`anki-card ${scopeClass} w-full`}
        dangerouslySetInnerHTML={{ __html: processedHTML }}
      />
    </div>
  );
}

export default function Flashcard({ card, isFlipped, onFlip }) {
  return (
    <div
      className="w-full perspective-1000 cursor-pointer group"
      style={{ height: 'clamp(24rem, 65vh, 50rem)' }}
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-8 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-primary)',
          }}
        >
          <CardContent html={card.front} css={card.css} side="front" />
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-8 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: 'var(--bg-card)',
            border: '2px solid var(--accent-dim)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-primary)',
          }}
        >
          <CardContent html={card.back} css={card.css} side="back" />
        </div>
      </motion.div>
    </div>
  );
}
