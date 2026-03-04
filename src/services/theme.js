// src/services/theme.js
// ═══════════════════════════════════════════════════════════════════════════
// Theme system — CSS custom properties, presets, persistence
// ═══════════════════════════════════════════════════════════════════════════

// ── Theme presets ────────────────────────────────────────────────────────
export const THEME_PRESETS = {
  'Serika Dark': {
    '--bg-primary': '#323437',
    '--bg-secondary': '#2c2e31',
    '--bg-tertiary': '#3a3c3f',
    '--bg-card': '#2c2e31',
    '--bg-input': '#2c2e31',
    '--text-primary': '#d1d0c5',
    '--text-secondary': '#646669',
    '--text-accent': '#e2b714',
    '--border-color': '#444649',
    '--border-light': '#3a3c3f',
    '--shadow-color': 'rgba(0,0,0,0.3)',
    '--accent': '#e2b714',
    '--accent-hover': '#c9a212',
    '--accent-dim': 'rgba(226,183,20,0.15)',
    '--error': '#ca4754',
    '--success': '#7ec984',
    '--warning': '#e2b714',
    '--info': '#5b98d6',
    '--color-new': '#5b98d6',
    '--color-learning': '#e2b714',
    '--color-due': '#7ec984',
    '--btn-again': '#ca4754',
    '--btn-hard': '#e2965d',
    '--btn-good': '#7ec984',
    '--btn-easy': '#5b98d6',
  },
  'Serika Light': {
    '--bg-primary': '#e1e1e3',
    '--bg-secondary': '#d1d0c5',
    '--bg-tertiary': '#c8c7bd',
    '--bg-card': '#ffffff',
    '--bg-input': '#ffffff',
    '--text-primary': '#323437',
    '--text-secondary': '#999a9f',
    '--text-accent': '#e2b714',
    '--border-color': '#c4c4c4',
    '--border-light': '#d9d9d9',
    '--shadow-color': 'rgba(0,0,0,0.08)',
    '--accent': '#e2b714',
    '--accent-hover': '#c9a212',
    '--accent-dim': 'rgba(226,183,20,0.15)',
    '--error': '#ca4754',
    '--success': '#4caf50',
    '--warning': '#e2b714',
    '--info': '#2979ff',
    '--color-new': '#2979ff',
    '--color-learning': '#e2b714',
    '--color-due': '#4caf50',
    '--btn-again': '#ca4754',
    '--btn-hard': '#e2965d',
    '--btn-good': '#4caf50',
    '--btn-easy': '#2979ff',
  },
  'Dracula': {
    '--bg-primary': '#282a36',
    '--bg-secondary': '#21222c',
    '--bg-tertiary': '#343746',
    '--bg-card': '#21222c',
    '--bg-input': '#21222c',
    '--text-primary': '#f8f8f2',
    '--text-secondary': '#6272a4',
    '--text-accent': '#bd93f9',
    '--border-color': '#44475a',
    '--border-light': '#383a4a',
    '--shadow-color': 'rgba(0,0,0,0.3)',
    '--accent': '#bd93f9',
    '--accent-hover': '#a87de8',
    '--accent-dim': 'rgba(189,147,249,0.15)',
    '--error': '#ff5555',
    '--success': '#50fa7b',
    '--warning': '#f1fa8c',
    '--info': '#8be9fd',
    '--color-new': '#8be9fd',
    '--color-learning': '#f1fa8c',
    '--color-due': '#50fa7b',
    '--btn-again': '#ff5555',
    '--btn-hard': '#ffb86c',
    '--btn-good': '#50fa7b',
    '--btn-easy': '#8be9fd',
  },
  'Nord': {
    '--bg-primary': '#2e3440',
    '--bg-secondary': '#272c36',
    '--bg-tertiary': '#3b4252',
    '--bg-card': '#272c36',
    '--bg-input': '#272c36',
    '--text-primary': '#eceff4',
    '--text-secondary': '#616e88',
    '--text-accent': '#88c0d0',
    '--border-color': '#434c5e',
    '--border-light': '#3b4252',
    '--shadow-color': 'rgba(0,0,0,0.3)',
    '--accent': '#88c0d0',
    '--accent-hover': '#7ab4c4',
    '--accent-dim': 'rgba(136,192,208,0.15)',
    '--error': '#bf616a',
    '--success': '#a3be8c',
    '--warning': '#ebcb8b',
    '--info': '#81a1c1',
    '--color-new': '#81a1c1',
    '--color-learning': '#ebcb8b',
    '--color-due': '#a3be8c',
    '--btn-again': '#bf616a',
    '--btn-hard': '#d08770',
    '--btn-good': '#a3be8c',
    '--btn-easy': '#81a1c1',
  },
  'Rosé Pine': {
    '--bg-primary': '#191724',
    '--bg-secondary': '#1f1d2e',
    '--bg-tertiary': '#26233a',
    '--bg-card': '#1f1d2e',
    '--bg-input': '#1f1d2e',
    '--text-primary': '#e0def4',
    '--text-secondary': '#6e6a86',
    '--text-accent': '#ebbcba',
    '--border-color': '#393552',
    '--border-light': '#2a2740',
    '--shadow-color': 'rgba(0,0,0,0.4)',
    '--accent': '#ebbcba',
    '--accent-hover': '#d4a6a4',
    '--accent-dim': 'rgba(235,188,186,0.12)',
    '--error': '#eb6f92',
    '--success': '#9ccfd8',
    '--warning': '#f6c177',
    '--info': '#c4a7e7',
    '--color-new': '#c4a7e7',
    '--color-learning': '#f6c177',
    '--color-due': '#9ccfd8',
    '--btn-again': '#eb6f92',
    '--btn-hard': '#f6c177',
    '--btn-good': '#9ccfd8',
    '--btn-easy': '#c4a7e7',
  },
  'Catppuccin Mocha': {
    '--bg-primary': '#1e1e2e',
    '--bg-secondary': '#181825',
    '--bg-tertiary': '#313244',
    '--bg-card': '#181825',
    '--bg-input': '#181825',
    '--text-primary': '#cdd6f4',
    '--text-secondary': '#6c7086',
    '--text-accent': '#f5c2e7',
    '--border-color': '#45475a',
    '--border-light': '#313244',
    '--shadow-color': 'rgba(0,0,0,0.4)',
    '--accent': '#f5c2e7',
    '--accent-hover': '#dda8cf',
    '--accent-dim': 'rgba(245,194,231,0.12)',
    '--error': '#f38ba8',
    '--success': '#a6e3a1',
    '--warning': '#f9e2af',
    '--info': '#89b4fa',
    '--color-new': '#89b4fa',
    '--color-learning': '#f9e2af',
    '--color-due': '#a6e3a1',
    '--btn-again': '#f38ba8',
    '--btn-hard': '#fab387',
    '--btn-good': '#a6e3a1',
    '--btn-easy': '#89b4fa',
  },
  'Gruvbox Dark': {
    '--bg-primary': '#282828',
    '--bg-secondary': '#1d2021',
    '--bg-tertiary': '#3c3836',
    '--bg-card': '#1d2021',
    '--bg-input': '#1d2021',
    '--text-primary': '#ebdbb2',
    '--text-secondary': '#7c6f64',
    '--text-accent': '#fabd2f',
    '--border-color': '#504945',
    '--border-light': '#3c3836',
    '--shadow-color': 'rgba(0,0,0,0.3)',
    '--accent': '#fabd2f',
    '--accent-hover': '#e0a82a',
    '--accent-dim': 'rgba(250,189,47,0.15)',
    '--error': '#fb4934',
    '--success': '#b8bb26',
    '--warning': '#fabd2f',
    '--info': '#83a598',
    '--color-new': '#83a598',
    '--color-learning': '#fabd2f',
    '--color-due': '#b8bb26',
    '--btn-again': '#fb4934',
    '--btn-hard': '#fe8019',
    '--btn-good': '#b8bb26',
    '--btn-easy': '#83a598',
  },
  'Midnight': {
    '--bg-primary': '#0b0e13',
    '--bg-secondary': '#0f1219',
    '--bg-tertiary': '#161a22',
    '--bg-card': '#0f1219',
    '--bg-input': '#0f1219',
    '--text-primary': '#a0aec0',
    '--text-secondary': '#4a5568',
    '--text-accent': '#90cdf4',
    '--border-color': '#2d3748',
    '--border-light': '#1a202c',
    '--shadow-color': 'rgba(0,0,0,0.5)',
    '--accent': '#90cdf4',
    '--accent-hover': '#7bbde8',
    '--accent-dim': 'rgba(144,205,244,0.12)',
    '--error': '#fc8181',
    '--success': '#68d391',
    '--warning': '#f6e05e',
    '--info': '#63b3ed',
    '--color-new': '#63b3ed',
    '--color-learning': '#f6e05e',
    '--color-due': '#68d391',
    '--btn-again': '#fc8181',
    '--btn-hard': '#f6ad55',
    '--btn-good': '#68d391',
    '--btn-easy': '#63b3ed',
  },
};

export const DEFAULT_THEME = 'Serika Dark';

// ── Editable color groups for Custom theme ───────────────────────────────
// These are the key CSS variable groups a user would want to customize.
// Each group maps a friendly label to its CSS variable(s).
export const CUSTOM_COLOR_GROUPS = [
  { key: 'bg',         label: 'Background',     vars: ['--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-card', '--bg-input'] },
  { key: 'text',       label: 'Text',           vars: ['--text-primary'] },
  { key: 'textSub',    label: 'Sub Text',       vars: ['--text-secondary'] },
  { key: 'accent',     label: 'Accent',         vars: ['--accent', '--accent-hover', '--text-accent'] },
  { key: 'border',     label: 'Border',         vars: ['--border-color', '--border-light'] },
  { key: 'error',      label: 'Error / Again',  vars: ['--error', '--btn-again'] },
  { key: 'success',    label: 'Success / Good',  vars: ['--success', '--btn-good', '--color-due'] },
  { key: 'warning',    label: 'Warning / Hard',  vars: ['--warning', '--btn-hard', '--color-learning'] },
  { key: 'info',       label: 'Info / Easy',     vars: ['--info', '--btn-easy', '--color-new'] },
];

// ── Background defaults ──────────────────────────────────────────────────
export const DEFAULT_BG = {
  url: '',
  blur: 0,
  brightness: 100,
  saturation: 100,
  opacity: 100,
};

// ── Display defaults ─────────────────────────────────────────────────────
export const DEFAULT_DISPLAY = {
  borderRadius: 0.5,   // rem
  fontSize: 16,        // px
  uiOpacity: 100,      // % — opacity of navbar, panels, cards (100 = fully opaque)
  uiBlur: 0,           // px — backdrop-filter blur for glass effect (0 = off)
  fontFamily: 'Roboto Mono', // font-family name
};

// ── Available font families ───────────────────────────────────────────────
export const FONT_OPTIONS = [
  // Monospace / Code
  'Roboto Mono',
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'IBM Plex Mono',
  'Space Mono',
  'Inconsolata',
  // Sans-serif
  'Inter',
  'Poppins',
  'Nunito',
  'Quicksand',
  'Lexend',
  'Comfortaa',
  // Handwriting / Whimsical
  'Caveat',
  'Patrick Hand',
  'Indie Flower',
  // Serif
  'Lora',
  'Merriweather',
  // System
  'system-ui',
];

// ── Study settings defaults (Anki defaults) ─────────────────────────────
// learningSteps: space-separated minutes — "1 10" = 1min then 10min
export const DEFAULT_STUDY = {
  newPerDay: 20,
  maxReviews: 200,
  learningSteps: '1 10',
};

// ── Funbox defaults ──────────────────────────────────────────────────────
export const DEFAULT_FUNBOX = {
  confetti: true,
  animations: true,
};

// ── Settings key in localStorage ─────────────────────────────────────────
const SETTINGS_KEY = 'cozycards_settings';

// ── Load all settings ────────────────────────────────────────────────────
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

// ── Save all settings ────────────────────────────────────────────────────
export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Apply theme to document ──────────────────────────────────────────────
export function applyTheme(themeName) {
  const preset = THEME_PRESETS[themeName];
  if (!preset) return;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(preset)) {
    root.style.setProperty(prop, value);
  }
}

// ── Apply custom colors (for the Custom theme editor) ────────────────────
// colorMap: { bg: '#...', text: '#...', accent: '#...', ... } keyed by CUSTOM_COLOR_GROUPS key
export function applyCustomColors(colorMap) {
  const root = document.documentElement;
  for (const group of CUSTOM_COLOR_GROUPS) {
    const color = colorMap[group.key];
    if (!color) continue;
    for (const cssVar of group.vars) {
      // For secondary bg/border, derive slightly lighter/darker variants
      if (cssVar === '--bg-secondary' || cssVar === '--bg-card' || cssVar === '--bg-input') {
        root.style.setProperty(cssVar, adjustBrightness(color, -8));
      } else if (cssVar === '--bg-tertiary') {
        root.style.setProperty(cssVar, adjustBrightness(color, 12));
      } else if (cssVar === '--accent-hover') {
        root.style.setProperty(cssVar, adjustBrightness(color, -15));
      } else if (cssVar === '--accent-dim') {
        root.style.setProperty(cssVar, color + '22');
      } else if (cssVar === '--border-light') {
        root.style.setProperty(cssVar, adjustBrightness(color, -10));
      } else if (cssVar === '--shadow-color') {
        root.style.setProperty(cssVar, 'rgba(0,0,0,0.3)');
      } else {
        root.style.setProperty(cssVar, color);
      }
    }
  }
}

// Simple brightness adjustment for hex colors
function adjustBrightness(hex, amount) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ── Get the representative color for each CUSTOM_COLOR_GROUP from current theme ─
export function getCurrentColors(themeName) {
  const preset = THEME_PRESETS[themeName];
  if (!preset) return {};
  const result = {};
  for (const group of CUSTOM_COLOR_GROUPS) {
    // Take the first CSS variable in the group as the representative color
    result[group.key] = preset[group.vars[0]] || '#888888';
  }
  return result;
}

// ── Apply border-radius ─────────────────────────────────────────────────
export function applyBorderRadius(rem) {
  document.documentElement.style.setProperty('--radius', `${rem}rem`);
}

// ── Apply font size ─────────────────────────────────────────────────────
export function applyFontSize(px) {
  document.documentElement.style.setProperty('--font-size', `${px}px`);
}

// ── Apply UI opacity (glass transparency) ─────────────────────────────
export function applyUiOpacity(percent) {
  document.documentElement.style.setProperty('--ui-opacity', String(percent / 100));
}

// ── Apply UI blur (glass blur) ────────────────────────────────────────
export function applyUiBlur(px) {
  document.documentElement.style.setProperty('--ui-blur', `${px}px`);
}

// ── Apply font family ─────────────────────────────────────────────────
export function applyFontFamily(family) {
  const stack = family === 'system-ui'
    ? 'system-ui, -apple-system, sans-serif'
    : `'${family}', system-ui, sans-serif`;
  document.documentElement.style.setProperty('--font-family', stack);
}

// ── Apply background ────────────────────────────────────────────────────
export function applyBackground(bg) {
  const root = document.documentElement;
  root.style.setProperty('--bg-image-url', bg.url ? `url("${bg.url}")` : 'none');
  root.style.setProperty('--bg-blur', `${bg.blur || 0}px`);
  root.style.setProperty('--bg-brightness', `${(bg.brightness ?? 100) / 100}`);
  root.style.setProperty('--bg-saturation', `${bg.saturation ?? 100}%`);
  root.style.setProperty('--bg-opacity', `${(bg.opacity ?? 100) / 100}`);
}

// ── Initialize on app load ──────────────────────────────────────────────
export function initializeTheme() {
  const settings = loadSettings();
  const themeName = settings.theme || DEFAULT_THEME;
  const bg = { ...DEFAULT_BG, ...(settings.background || {}) };
  const display = { ...DEFAULT_DISPLAY, ...(settings.display || {}) };

  if (themeName === 'Custom' && settings.customColors) {
    applyTheme(DEFAULT_THEME);
    applyCustomColors(settings.customColors);
  } else {
    applyTheme(themeName);
  }
  applyBackground(bg);
  applyBorderRadius(display.borderRadius);
  applyFontSize(display.fontSize);
  applyUiOpacity(display.uiOpacity ?? DEFAULT_DISPLAY.uiOpacity);
  applyUiBlur(display.uiBlur ?? DEFAULT_DISPLAY.uiBlur);
  applyFontFamily(display.fontFamily ?? DEFAULT_DISPLAY.fontFamily);

  return { theme: themeName, background: bg, display, study: { ...DEFAULT_STUDY, ...(settings.study || {}) }, funbox: { ...DEFAULT_FUNBOX, ...(settings.funbox || {}) } };
}
