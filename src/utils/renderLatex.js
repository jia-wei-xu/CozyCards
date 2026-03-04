import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Pre-processes an HTML string to render LaTeX math via KaTeX.
 *
 * Supported delimiters (all used by Anki / MathJax / standard LaTeX):
 *   \(...\)             inline math
 *   \[...\]             display math
 *   [$]...[/$]          Anki inline
 *   [$$]...[/$$]        Anki display
 *   [latex]...[/latex]   Anki legacy
 *   $$...$$             standard display math
 *   $...$               standard inline math
 */
export function renderLatexInHTML(html) {
  if (!html || typeof html !== 'string') return html;

  // 1) Normalise Anki-specific delimiters → standard \( \) / \[ \]
  html = html.replace(/\[\$\$\]([\s\S]*?)\[\/\$\$\]/g, '\\[$1\\]');
  html = html.replace(/\[\$\]([\s\S]*?)\[\/\$\]/g, '\\($1\\)');
  html = html.replace(/\[latex\]([\s\S]*?)\[\/latex\]/g, '\\($1\\)');

  // 2) Normalise standard $$ and $ delimiters → \[ \] / \( \)
  //    Do $$ first (greedy match of double-dollar before single-dollar)
  //    Avoid matching inside HTML tags or already-rendered KaTeX output
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, '\\[$1\\]');
  html = html.replace(
    /(?<![\\$])\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\d)/g,
    '\\($1\\)'
  );

  // 3) Render display math  \[...\]
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return _match;
    }
  });

  // 4) Render inline math  \(...\)
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return _match;
    }
  });

  return html;
}

/**
 * Quick check whether a string contains LaTeX delimiters.
 */
export function hasLatex(str) {
  if (!str) return false;
  return /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\[\$\]|\[\$\$\]|\[latex\]|\$\$.+?\$\$|(?<![\\$])\$(?!\$).+?\$/i.test(str);
}
