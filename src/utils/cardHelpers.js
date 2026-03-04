// src/utils/cardHelpers.js
// ═══════════════════════════════════════════════════════════════════════════
// Shared card sanitisation & rendering helpers used by Flashcard, CardBrowser,
// and any other component that renders raw HTML card content.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strip <script> tags from HTML — they don't execute via
 * dangerouslySetInnerHTML anyway and clutter the DOM.
 */
export function stripScripts(html) {
  if (!html) return html;
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

/**
 * Replaces unresolvable relative image srcs with a placeholder.
 * Keeps data: URIs and absolute URLs intact.
 * Adds loading="lazy" to all kept images for performance.
 */
export function sanitizeImages(html) {
  if (!html) return html;
  return html.replace(
    /<img\s+([^>]*)>/gi,
    (tag, attrs) => {
      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      if (!srcMatch) return tag;
      const src = srcMatch[1];
      if (!/^(https?:\/\/|data:)/i.test(src)) {
        const fname = src.split('/').pop();
        return `<span class="anki-img-placeholder" title="${fname}">\u{1F5BC} ${fname}</span>`;
      }
      // Add loading="lazy" if not already present
      if (!/loading=/i.test(tag)) {
        return tag.replace(/<img\s/i, '<img loading="lazy" ');
      }
      return tag;
    }
  );
}

/**
 * Detects whether a string contains any HTML tags.
 */
export function isHTML(str) {
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * Scope Anki CSS: rewrite selectors so styles don't leak.
 *  - @media / @keyframes / @font-face / @supports — kept as-is (not selectors)
 *  - :root / html / body  →  .scopeClass
 *  - everything else      →  .scopeClass selector
 */
export function buildScopedCSS(css, scopeClass) {
  if (!css) return '';

  // Temporarily replace content inside @-rules to avoid mangling
  // We handle nested {} by tracking brace depth
  const result = [];
  let i = 0;
  while (i < css.length) {
    // Detect @-rules that contain blocks (media, keyframes, supports, font-face)
    const atMatch = css.slice(i).match(/^@(media|keyframes|font-face|supports|layer)[\s\S]*?\{/);
    if (atMatch) {
      // Copy the @-rule preamble + opening brace
      result.push(atMatch[0]);
      i += atMatch[0].length;
      // Find matching closing brace (handle nesting)
      let depth = 1;
      const start = i;
      while (i < css.length && depth > 0) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') depth--;
        if (depth > 0) i++;
      }
      // Recursively scope the inner CSS (for @media) or keep as-is (for @keyframes)
      const inner = css.slice(start, i);
      if (atMatch[1] === 'keyframes' || atMatch[1] === 'font-face') {
        result.push(inner); // Don't scope keyframe or font-face internals
      } else {
        result.push(buildScopedCSS(inner, scopeClass));
      }
      result.push('}');
      i++; // skip closing brace
      continue;
    }

    // Regular rule: selector { ... }
    const ruleMatch = css.slice(i).match(/^([^{}@]+)\{([^}]*)\}/);
    if (ruleMatch) {
      const selectorBlock = ruleMatch[1];
      const declarations = ruleMatch[2];
      const scoped = selectorBlock
        .split(',')
        .map((s) => {
          const t = s.trim();
          if (!t) return t;
          if (/^(:root|html|body)$/i.test(t)) return `.${scopeClass}`;
          // Don't prefix % keyframe stops
          if (/^\d+%$|^(from|to)$/i.test(t)) return t;
          return `.${scopeClass} ${t}`;
        })
        .join(', ');
      result.push(`${scoped} {${declarations}}`);
      i += ruleMatch[0].length;
      continue;
    }

    // Anything else (whitespace, comments) — copy as-is
    result.push(css[i]);
    i++;
  }
  return result.join('');
}

/**
 * Full pipeline: strip scripts → render LaTeX → sanitize images.
 * Returns processed HTML string ready for dangerouslySetInnerHTML.
 */
export function processCardHTML(html, { renderLatex = null } = {}) {
  if (!html) return '';
  let result = stripScripts(html);
  if (renderLatex) {
    // Lazily apply LaTeX rendering if a renderer is provided
    result = renderLatex(result);
  }
  result = sanitizeImages(result);
  return result;
}

/**
 * Strip all HTML tags and return plain text. Useful for search matching.
 */
export function stripHTML(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}
