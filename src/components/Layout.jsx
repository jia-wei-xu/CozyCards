// src/components/Layout.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Home, PlusCircle } from 'lucide-react';
import CommandPalette from './CommandPalette';
import { initializeTheme } from '../services/theme';

export default function Layout() {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Initialize theme on mount
  useEffect(() => { initializeTheme(); }, []);

  // Global keyboard listener for command palette
  const handleKeyDown = useCallback((e) => {
    // Ctrl+Shift+P opens palette
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      setPaletteOpen((p) => !p);
      return;
    }
    // Escape opens palette (when not in an input and palette not already open)
    if (e.key === 'Escape' && !paletteOpen) {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable || e.target.closest?.('.ProseMirror');
      if (!isInput) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
  }, [paletteOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const navItemClass = (path) => {
    const isActive = path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);
    return `flex items-center gap-2 px-4 py-2 transition-all duration-200 ${
      isActive
        ? 'text-[var(--text-accent)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;
  };

  return (
    <div className="relative min-h-screen" style={{ fontFamily: 'var(--font-family)', color: 'var(--text-primary)' }}>
      {/* Solid background color (always visible, sits behind optional BG image) */}
      <div className="fixed inset-0 z-0" style={{ backgroundColor: 'var(--bg-primary)' }} />

      {/* Background image layer (only visible if user sets a BG image via command palette) */}
      <div
        className="fixed inset-0 z-[1] bg-no-repeat bg-cover bg-center transition-all duration-500 pointer-events-none"
        style={{
          backgroundImage: 'var(--bg-image-url)',
          filter: `blur(var(--bg-blur)) brightness(var(--bg-brightness)) saturate(var(--bg-saturation))`,
          opacity: 'var(--bg-opacity)',
          transform: 'scale(1.02)',
        }}
      />

      {/* Full-width navbar */}
      <nav
        className="fixed top-0 z-50 w-full glass-surface"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link
            to="/"
            className="text-xl font-bold tracking-wider flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-accent)' }}
          >
            CozyCards
          </Link>

          <div className="flex gap-1 text-sm font-medium">
            <Link to="/" className={navItemClass('/')}>
              <Home size={16} /> Home
            </Link>
            <Link to="/library" className={navItemClass('/library')}>
              <BookOpen size={16} /> Library
            </Link>
            <Link to="/create" className={navItemClass('/create')}>
              <PlusCircle size={16} /> Create
            </Link>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="pt-20 pb-12 px-4 max-w-6xl mx-auto min-h-screen flex flex-col items-center relative z-10">
        <Outlet />
      </main>

      {/* Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}