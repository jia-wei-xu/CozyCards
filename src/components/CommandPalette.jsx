// src/components/CommandPalette.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Monkeytype-style command palette overlay
// Triggered by Escape or Ctrl+Shift+P
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Palette, Image, BookOpen, Sparkles, Monitor, ChevronRight,
  Check, ArrowLeft, X, Sun, Moon, Type,
} from 'lucide-react';
import {
  THEME_PRESETS, DEFAULT_BG, DEFAULT_DISPLAY, DEFAULT_STUDY, DEFAULT_FUNBOX,
  DEFAULT_THEME, CUSTOM_COLOR_GROUPS, FONT_OPTIONS,
  applyTheme, applyBackground, applyBorderRadius, applyFontSize,
  applyUiOpacity, applyUiBlur, applyFontFamily,
  applyCustomColors, getCurrentColors, loadSettings, saveSettings,
} from '../services/theme';

// ── Command categories ───────────────────────────────────────────────────
function buildCommands(settings) {
  const themeNames = Object.keys(THEME_PRESETS);

  return [
    // ─ Theme ─
    ...themeNames.map((name) => ({
      id: `theme:${name}`,
      category: 'Theme',
      label: name,
      icon: Palette,
      active: settings.theme === name,
      action: (s) => {
        applyTheme(name);
        return { ...s, theme: name };
      },
    })),
    {
      id: 'theme:Custom',
      category: 'Theme',
      label: 'Custom…',
      icon: Palette,
      active: settings.theme === 'Custom',
      type: 'custom-theme',
      action: () => {}, // handled separately
    },
    // ─ Background ─
    {
      id: 'bg:url',
      category: 'Background',
      label: 'Set Background Image URL',
      icon: Image,
      type: 'input',
      inputLabel: 'Image URL (leave empty to clear)',
      inputValue: (s) => s.background?.url || '',
      action: (s, val) => {
        const bg = { ...(s.background || DEFAULT_BG), url: val || '' };
        applyBackground(bg);
        return { ...s, background: bg };
      },
    },
    {
      id: 'bg:blur',
      category: 'Background',
      label: 'Background Blur',
      icon: Image,
      type: 'slider',
      min: 0, max: 30, step: 1, unit: 'px',
      getValue: (s) => s.background?.blur ?? DEFAULT_BG.blur,
      action: (s, val) => {
        const bg = { ...(s.background || DEFAULT_BG), blur: Number(val) };
        applyBackground(bg);
        return { ...s, background: bg };
      },
    },
    {
      id: 'bg:brightness',
      category: 'Background',
      label: 'Background Brightness',
      icon: Sun,
      type: 'slider',
      min: 0, max: 200, step: 5, unit: '%',
      getValue: (s) => s.background?.brightness ?? DEFAULT_BG.brightness,
      action: (s, val) => {
        const bg = { ...(s.background || DEFAULT_BG), brightness: Number(val) };
        applyBackground(bg);
        return { ...s, background: bg };
      },
    },
    {
      id: 'bg:saturation',
      category: 'Background',
      label: 'Background Saturation',
      icon: Palette,
      type: 'slider',
      min: 0, max: 200, step: 5, unit: '%',
      getValue: (s) => s.background?.saturation ?? DEFAULT_BG.saturation,
      action: (s, val) => {
        const bg = { ...(s.background || DEFAULT_BG), saturation: Number(val) };
        applyBackground(bg);
        return { ...s, background: bg };
      },
    },
    {
      id: 'bg:opacity',
      category: 'Background',
      label: 'Background Opacity',
      icon: Moon,
      type: 'slider',
      min: 0, max: 100, step: 5, unit: '%',
      getValue: (s) => s.background?.opacity ?? DEFAULT_BG.opacity,
      action: (s, val) => {
        const bg = { ...(s.background || DEFAULT_BG), opacity: Number(val) };
        applyBackground(bg);
        return { ...s, background: bg };
      },
    },
    // ─ Display ─
    {
      id: 'display:radius',
      category: 'Display',
      label: 'Border Radius',
      icon: Monitor,
      type: 'slider',
      min: 0, max: 2, step: 0.1, unit: 'rem',
      getValue: (s) => s.display?.borderRadius ?? DEFAULT_DISPLAY.borderRadius,
      action: (s, val) => {
        const display = { ...(s.display || DEFAULT_DISPLAY), borderRadius: Number(val) };
        applyBorderRadius(display.borderRadius);
        return { ...s, display };
      },
    },

    {
      id: 'display:uiOpacity',
      category: 'Display',
      label: 'UI Opacity',
      icon: Moon,
      type: 'slider',
      min: 20, max: 100, step: 5, unit: '%',
      getValue: (s) => s.display?.uiOpacity ?? DEFAULT_DISPLAY.uiOpacity,
      action: (s, val) => {
        const display = { ...(s.display || DEFAULT_DISPLAY), uiOpacity: Number(val) };
        applyUiOpacity(display.uiOpacity);
        return { ...s, display };
      },
    },
    {
      id: 'display:uiBlur',
      category: 'Display',
      label: 'UI Blur (Glass)',
      icon: Monitor,
      type: 'slider',
      min: 0, max: 30, step: 1, unit: 'px',
      getValue: (s) => s.display?.uiBlur ?? DEFAULT_DISPLAY.uiBlur,
      action: (s, val) => {
        const display = { ...(s.display || DEFAULT_DISPLAY), uiBlur: Number(val) };
        applyUiBlur(display.uiBlur);
        return { ...s, display };
      },
    },
    // ─ Font ─
    {
      id: 'font:fontSize',
      category: 'Font',
      label: 'Font Size',
      icon: Type,
      type: 'slider',
      min: 12, max: 24, step: 1, unit: 'px',
      getValue: (s) => s.display?.fontSize ?? DEFAULT_DISPLAY.fontSize,
      action: (s, val) => {
        const display = { ...(s.display || DEFAULT_DISPLAY), fontSize: Number(val) };
        applyFontSize(display.fontSize);
        return { ...s, display };
      },
    },
    ...FONT_OPTIONS.map((font) => ({
      id: `font:family:${font}`,
      category: 'Font',
      label: font,
      icon: Type,
      type: 'pick',  // stays open on select (not a theme)
      active: (settings.display?.fontFamily ?? DEFAULT_DISPLAY.fontFamily) === font,
      action: (s) => {
        const display = { ...(s.display || DEFAULT_DISPLAY), fontFamily: font };
        applyFontFamily(font);
        return { ...s, display };
      },
    })),
    // ─ Study ─
    {
      id: 'study:newPerDay',
      category: 'Study',
      label: 'New Cards Per Day',
      icon: BookOpen,
      type: 'slider',
      min: 0, max: 100, step: 1, unit: '',
      getValue: (s) => s.study?.newPerDay ?? DEFAULT_STUDY.newPerDay,
      action: (s, val) => {
        const study = { ...(s.study || DEFAULT_STUDY), newPerDay: Number(val) };
        return { ...s, study };
      },
    },
    {
      id: 'study:maxReviews',
      category: 'Study',
      label: 'Max Reviews Per Day',
      icon: BookOpen,
      type: 'slider',
      min: 0, max: 500, step: 10, unit: '',
      getValue: (s) => s.study?.maxReviews ?? DEFAULT_STUDY.maxReviews,
      action: (s, val) => {
        const study = { ...(s.study || DEFAULT_STUDY), maxReviews: Number(val) };
        return { ...s, study };
      },
    },
    {
      id: 'study:learningSteps',
      category: 'Study',
      label: 'Learning Steps',
      icon: BookOpen,
      type: 'input',
      inputLabel: 'Space-separated minutes (e.g. "1 10" = 1min then 10min)',
      inputValue: (s) => s.study?.learningSteps ?? DEFAULT_STUDY.learningSteps,
      action: (s, val) => {
        const study = { ...(s.study || DEFAULT_STUDY), learningSteps: val || DEFAULT_STUDY.learningSteps };
        return { ...s, study };
      },
    },
    // ─ Funbox ─
    {
      id: 'funbox:confetti',
      category: 'Funbox',
      label: 'Confetti on Easy/Good',
      icon: Sparkles,
      type: 'toggle',
      getValue: (s) => s.funbox?.confetti ?? DEFAULT_FUNBOX.confetti,
      action: (s) => {
        const current = s.funbox?.confetti ?? DEFAULT_FUNBOX.confetti;
        return { ...s, funbox: { ...(s.funbox || DEFAULT_FUNBOX), confetti: !current } };
      },
    },
    {
      id: 'funbox:animations',
      category: 'Funbox',
      label: 'Animations',
      icon: Sparkles,
      type: 'toggle',
      getValue: (s) => s.funbox?.animations ?? DEFAULT_FUNBOX.animations,
      action: (s) => {
        const current = s.funbox?.animations ?? DEFAULT_FUNBOX.animations;
        return { ...s, funbox: { ...(s.funbox || DEFAULT_FUNBOX), animations: !current } };
      },
    },
  ];
}

const CATEGORIES = ['Theme', 'Background', 'Display', 'Font', 'Study', 'Funbox'];

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
export default function CommandPalette({ isOpen, onClose }) {
  const [settings, setSettings] = useState(() => loadSettings());
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeInput, setActiveInput] = useState(null); // for text inputs
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [customColors, setCustomColors] = useState(null); // custom theme color map
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // ── Live theme preview state ───────────────────────────────────────
  const originalThemeRef = useRef(null); // theme name before preview started
  const originalCustomColorsRef = useRef(null); // custom colors before preview started

  // Re-load settings whenever palette opens
  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      setQuery('');
      setActiveCategory(null);
      setActiveInput(null);
      setHighlightIdx(0);
      setCustomColors(null);
      originalThemeRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Capture original theme on first need (lazy — set in the preview effect)
  const captureOriginalTheme = useCallback(() => {
    if (originalThemeRef.current === null) {
      const current = loadSettings();
      originalThemeRef.current = current.theme || DEFAULT_THEME;
      originalCustomColorsRef.current = current.customColors || null;
    }
  }, []);

  // Restore the original theme (used on cancel / escape)
  const restoreOriginalTheme = useCallback(() => {
    if (originalThemeRef.current) {
      if (originalThemeRef.current === 'Custom' && originalCustomColorsRef.current) {
        applyTheme(DEFAULT_THEME);
        applyCustomColors(originalCustomColorsRef.current);
      } else {
        applyTheme(originalThemeRef.current);
      }
      originalThemeRef.current = null;
      originalCustomColorsRef.current = null;
    }
  }, []);

  const allCommands = useMemo(() => buildCommands(settings), [settings]);

  const filtered = useMemo(() => {
    let cmds = allCommands;
    if (activeCategory) {
      cmds = cmds.filter((c) => c.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      cmds = cmds.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }
    return cmds;
  }, [allCommands, activeCategory, query]);

  // Group by category when no filter active
  const grouped = useMemo(() => {
    if (activeCategory || query.trim()) return null;
    const map = {};
    for (const cmd of filtered) {
      if (!map[cmd.category]) map[cmd.category] = [];
      map[cmd.category].push(cmd);
    }
    return map;
  }, [filtered, activeCategory, query]);

  // In overview mode only 3 items per category are rendered, so we need
  // a flat list that matches the visual indices used by renderRow / hover
  const visibleItems = useMemo(() => {
    if (grouped) {
      const items = [];
      for (const cat of CATEGORIES) {
        const cmds = grouped[cat];
        if (!cmds || cmds.length === 0) continue;
        items.push(...cmds.slice(0, 3));
      }
      return items;
    }
    return filtered;
  }, [filtered, grouped]);

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightIdx(0);
  }, [visibleItems.length, activeCategory, query]);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${highlightIdx}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  // ── Live theme preview: apply highlighted theme in real-time ───────
  // Works in ALL contexts: Theme category, search results, overview hover
  const highlightedCmd = visibleItems[highlightIdx] || null;
  const isPreviewingTheme = highlightedCmd?.id?.startsWith('theme:') && highlightedCmd.id !== 'theme:Custom';
  const isPreviewing = isPreviewingTheme || activeCategory === 'Custom';

  // Track previous preview state to restore when leaving theme items
  const wasPreviewing = useRef(false);

  useEffect(() => {
    if (isPreviewingTheme) {
      captureOriginalTheme();
      const themeName = highlightedCmd.id.replace('theme:', '');
      applyTheme(themeName);
      wasPreviewing.current = true;
    } else if (wasPreviewing.current && activeCategory !== 'Custom') {
      // Moved away from a theme item → restore original
      restoreOriginalTheme();
      wasPreviewing.current = false;
    }
  }, [highlightedCmd, isPreviewingTheme, activeCategory, captureOriginalTheme, restoreOriginalTheme]);

  const persistSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const handleSelect = useCallback(
    (cmd) => {
      if (cmd.type === 'input') {
        setActiveInput(cmd);
        return;
      }
      if (cmd.type === 'slider') {
        // Sliders are inline, no special action needed
        return;
      }
      if (cmd.type === 'custom-theme') {
        // Enter custom theme editor
        const baseTheme = settings.theme && settings.theme !== 'Custom' ? settings.theme : DEFAULT_THEME;
        const startColors = settings.customColors || getCurrentColors(baseTheme);
        setCustomColors(startColors);
        setActiveCategory('Custom');
        // Apply the custom colors immediately
        applyTheme(baseTheme); // start from base
        applyCustomColors(startColors);
        return;
      }
      // Toggle, pick, or simple action
      const newSettings = cmd.action(settings);
      persistSettings(newSettings);
      if (!cmd.type) {
        // simple select (like theme) — commit and close
        originalThemeRef.current = null;
        originalCustomColorsRef.current = null;
        onClose();
      }
      // 'toggle' and 'pick' types stay open
    },
    [settings, persistSettings, onClose]
  );

  const handleSliderChange = useCallback(
    (cmd, value) => {
      const newSettings = cmd.action(settings, value);
      persistSettings(newSettings);
    },
    [settings, persistSettings]
  );

  const handleInputSubmit = useCallback(
    (cmd, value) => {
      const newSettings = cmd.action(settings, value);
      persistSettings(newSettings);
      setActiveInput(null);
    },
    [settings, persistSettings]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (activeInput) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setActiveInput(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeCategory) {
          restoreOriginalTheme();
          if (activeCategory === 'Custom') {
            setCustomColors(null);
            setActiveCategory('Theme');
          } else {
            setActiveCategory(null);
          }
          setQuery('');
        } else {
          restoreOriginalTheme();
          setCustomColors(null);
          onClose();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, visibleItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = visibleItems[highlightIdx];
        if (cmd) handleSelect(cmd);
      } else if (e.key === 'Backspace' && !query && activeCategory) {
        if (activeCategory === 'Custom') {
          restoreOriginalTheme();
          setCustomColors(null);
          setActiveCategory('Theme');
        } else {
          restoreOriginalTheme();
          setActiveCategory(null);
        }
      }
    },
    [activeCategory, activeInput, visibleItems, highlightIdx, handleSelect, onClose, query]
  );

  if (!isOpen) return null;

  // ── Input sub-view ─────────────────────────────────────────────────
  const renderInputView = () => {
    if (!activeInput) return null;
    return (
      <InputView
        cmd={activeInput}
        settings={settings}
        onSubmit={(val) => handleInputSubmit(activeInput, val)}
        onCancel={() => setActiveInput(null)}
      />
    );
  };

  // ── Custom theme editor ────────────────────────────────────────────
  const renderCustomEditor = () => {
    if (!customColors) return null;

    const handleColorChange = (groupKey, color) => {
      const next = { ...customColors, [groupKey]: color };
      setCustomColors(next);
      applyCustomColors(next);
    };

    const handleSaveCustom = () => {
      const newSettings = { ...settings, theme: 'Custom', customColors };
      persistSettings(newSettings);
      originalThemeRef.current = null;
      originalCustomColorsRef.current = null;
      onClose();
    };

    const handleCancelCustom = () => {
      restoreOriginalTheme();
      setCustomColors(null);
      setActiveCategory('Theme');
    };

    return (
      <div className="p-4" onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); handleCancelCustom(); }
        if (e.key === 'Enter') { e.preventDefault(); handleSaveCustom(); }
      }}>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleCancelCustom}
            className="shrink-0 p-1 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Custom Theme
          </span>
        </div>

        <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
          {CUSTOM_COLOR_GROUPS.map((group) => (
            <div
              key={group.key}
              className="flex items-center gap-3 px-2 py-1.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              <label
                htmlFor={`custom-${group.key}`}
                className="text-sm flex-1 cursor-pointer"
                style={{ color: 'var(--text-primary)' }}
              >
                {group.label}
              </label>
              <div className="relative">
                <input
                  id={`custom-${group.key}`}
                  type="color"
                  value={customColors[group.key] || '#888888'}
                  onChange={(e) => handleColorChange(group.key, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-2 appearance-none"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: customColors[group.key] || '#888888',
                  }}
                />
              </div>
              <span className="text-xs font-mono w-16 text-right" style={{ color: 'var(--text-secondary)' }}>
                {customColors[group.key] || '#888888'}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={handleCancelCustom}
            className="px-4 py-1.5 text-xs rounded transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCustom}
            className="px-4 py-1.5 text-xs font-bold rounded transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              borderRadius: 'var(--radius)',
            }}
          >
            Save Theme
          </button>
        </div>
      </div>
    );
  };

  // ── Render a single command row ────────────────────────────────────
  const renderRow = (cmd, idx) => {
    const Icon = cmd.icon;
    const isHighlighted = idx === highlightIdx;

    if (cmd.type === 'slider') {
      const val = cmd.getValue(settings);
      return (
        <div
          key={cmd.id}
          data-idx={idx}
          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
            isHighlighted ? 'bg-[var(--bg-tertiary)]' : ''
          }`}
          onMouseEnter={() => setHighlightIdx(idx)}
        >
          <Icon size={16} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
            {cmd.label}
          </span>
          <input
            type="range"
            min={cmd.min}
            max={cmd.max}
            step={cmd.step}
            value={val}
            onChange={(e) => handleSliderChange(cmd, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-24 accent-[var(--accent)] cursor-pointer"
          />
          <span className="text-xs font-mono w-14 text-right" style={{ color: 'var(--text-secondary)' }}>
            {val}{cmd.unit}
          </span>
        </div>
      );
    }

    if (cmd.type === 'toggle') {
      const val = cmd.getValue(settings);
      return (
        <div
          key={cmd.id}
          data-idx={idx}
          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
            isHighlighted ? 'bg-[var(--bg-tertiary)]' : ''
          }`}
          onClick={() => handleSelect(cmd)}
          onMouseEnter={() => setHighlightIdx(idx)}
        >
          <Icon size={16} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
            {cmd.label}
          </span>
          <div
            className="w-8 h-4 rounded-full relative transition-colors"
            style={{ background: val ? 'var(--accent)' : 'var(--border-color)' }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
              style={{ left: val ? '1.125rem' : '0.125rem' }}
            />
          </div>
        </div>
      );
    }

    // Regular command (theme pick, input trigger)
    const isThemeCmd = cmd.id.startsWith('theme:') && cmd.id !== 'theme:Custom';
    const themePreview = isThemeCmd ? THEME_PRESETS[cmd.label] : null;

    return (
      <div
        key={cmd.id}
        data-idx={idx}
        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
          isHighlighted ? 'bg-[var(--bg-tertiary)]' : ''
        }`}
        onClick={() => handleSelect(cmd)}
        onMouseEnter={() => setHighlightIdx(idx)}
      >
        <Icon size={16} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
        <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
          {cmd.label}
        </span>
        {/* Theme color swatches */}
        {themePreview && (
          <div className="flex gap-0.5 shrink-0">
            {['--bg-primary', '--text-primary', '--accent', '--error'].map((v) => (
              <div
                key={v}
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: themePreview[v], borderColor: themePreview['--border-color'] }}
              />
            ))}
          </div>
        )}
        {cmd.active && <Check size={14} style={{ color: 'var(--accent)' }} />}
        {cmd.type === 'input' && <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />}
        {cmd.type === 'custom-theme' && <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />}
      </div>
    );
  };

  // ── Flatten for indexed rendering ──────────────────────────────────
  let flatIdx = 0;
  const flatElements = [];

  if (grouped && !activeCategory && !query.trim()) {
    for (const cat of CATEGORIES) {
      const cmds = grouped[cat];
      if (!cmds || cmds.length === 0) continue;
      flatElements.push(
        <div
          key={`cat:${cat}`}
          className="px-4 pt-3 pb-1.5 text-xs font-bold uppercase tracking-widest cursor-pointer hover:underline"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => { setActiveCategory(cat); setQuery(''); }}
        >
          {cat} <ChevronRight size={10} className="inline ml-0.5" />
        </div>
      );
      // Show at most 3 items per category in overview
      const preview = cmds.slice(0, 3);
      for (const cmd of preview) {
        flatElements.push(renderRow(cmd, flatIdx));
        flatIdx++;
      }
      if (cmds.length > 3) {
        flatElements.push(
          <div
            key={`more:${cat}`}
            className="px-4 py-1 text-xs cursor-pointer hover:underline"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => { setActiveCategory(cat); setQuery(''); }}
          >
            and {cmds.length - 3} more…
          </div>
        );
      }
    }
  } else {
    for (const cmd of filtered) {
      flatElements.push(renderRow(cmd, flatIdx));
      flatIdx++;
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop — fully transparent when previewing a theme */}
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{ background: isPreviewing ? 'transparent' : 'rgba(0,0,0,0.6)' }}
            onClick={() => {
              restoreOriginalTheme();
              onClose();
            }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg mx-4 overflow-hidden"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onKeyDown={handleKeyDown}
          >
            {activeInput ? (
              renderInputView()
            ) : activeCategory === 'Custom' && customColors ? (
              renderCustomEditor()
            ) : (
              <>
                {/* Search bar */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  {activeCategory ? (
                    <button
                      onClick={() => { setActiveCategory(null); setQuery(''); }}
                      className="shrink-0 p-1 rounded transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  ) : (
                    <Search size={16} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
                  )}

                  {activeCategory && (
                    <span
                      className="text-xs font-bold uppercase tracking-wider shrink-0"
                      style={{ color: 'var(--accent)' }}
                    >
                      {activeCategory} &rsaquo;
                    </span>
                  )}

                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={activeCategory ? `Search ${activeCategory.toLowerCase()}…` : 'Type a command…'}
                    className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-40"
                    style={{ color: 'var(--text-primary)' }}
                  />

                  <button
                    onClick={onClose}
                    className="shrink-0 p-1 rounded transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Command list */}
                <div
                  ref={listRef}
                  className="max-h-[50vh] overflow-y-auto py-1"
                >
                  {flatElements.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No commands found.
                    </p>
                  ) : (
                    flatElements
                  )}
                </div>

                {/* Footer hint */}
                <div
                  className="px-4 py-2 text-[0.65rem] flex items-center gap-4"
                  style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <span><kbd className="font-bold">↑↓</kbd> navigate</span>
                  <span><kbd className="font-bold">↵</kbd> select</span>
                  <span><kbd className="font-bold">esc</kbd> {activeCategory ? 'back' : 'close'}</span>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Input sub-view (for text inputs like BG URL) ─────────────────────────
function InputView({ cmd, settings, onSubmit, onCancel }) {
  const [value, setValue] = useState(() => cmd.inputValue?.(settings) || '');
  const ref = useRef(null);

  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 50);
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onCancel}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {cmd.label}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(value);
        }}
      >
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={cmd.inputLabel || ''}
          className="w-full px-3 py-2.5 text-sm rounded outline-none"
          style={{
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold rounded transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              borderRadius: 'var(--radius)',
            }}
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}
