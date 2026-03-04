// src/components/CardEditor.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Rich text editor for card fronts/backs, powered by TipTap.
// Outputs HTML string — matches Anki's card format.
// ═══════════════════════════════════════════════════════════════════════════
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight,
  Image as ImageIcon, Highlighter, Type, Undo2, Redo2,
  List, ListOrdered, Minus, Quote,
} from 'lucide-react';

// ── Color palettes ────────────────────────────────────────────────────
const COLORS = [
  null,      // reset (default)
  '#000000', '#374151', '#6b7280', '#9ca3af', '#ffffff',
  '#ef4444', '#dc2626', '#b91c1c',
  '#f97316', '#ea580c', '#c2410c',
  '#eab308', '#ca8a04', '#a16207',
  '#22c55e', '#16a34a', '#15803d',
  '#3b82f6', '#2563eb', '#1d4ed8',
  '#8b5cf6', '#7c3aed', '#6d28d9',
  '#ec4899', '#db2777', '#be185d',
  '#14b8a6', '#0d9488', '#0f766e',
];

const HIGHLIGHTS = [
  null,
  '#fef08a', '#fde68a', '#fed7aa',
  '#bbf7d0', '#a7f3d0', '#bfdbfe',
  '#c7d2fe', '#e9d5ff', '#fbcfe8',
  '#fecaca', '#99f6e4', '#fef9c3',
];

// ── Toolbar button ────────────────────────────────────────────────────
function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick?.(); }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-all text-xs ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
      style={active
        ? { background: 'var(--accent)', color: 'var(--bg-primary)' }
        : { color: 'var(--text-secondary)' }
      }
    >
      {children}
    </button>
  );
}

// ── Color dropdown with custom picker ─────────────────────────────────
function ColorPicker({ colors, currentColor, onSelect, title, icon: Icon }) {
  const ref = useRef(null);
  const customInputRef = useRef(null);
  const [open, setOpen] = useToggle(false);

  useOutsideClick(ref, () => setOpen(false));

  // Apply color live as user drags in the native picker — don't close dropdown
  const handleCustomColor = useCallback((e) => {
    const val = e.target.value;
    if (val) onSelect(val);
  }, [onSelect]);

  return (
    <div className="relative" ref={ref}>
      <Btn onClick={() => setOpen(!open)} active={open} title={title}>
        <div className="flex items-center gap-0.5">
          <Icon size={14} />
          <div
            className="w-2.5 h-2.5 rounded-sm border"
            style={{ background: currentColor || 'transparent', borderColor: 'var(--border-color)' }}
          />
        </div>
      </Btn>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 rounded-lg shadow-xl z-50 min-w-[160px]"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="grid grid-cols-5 gap-1 mb-1.5">
            {colors.map((c, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(c); setOpen(false); }}
                className={`w-5 h-5 rounded-sm border transition-transform hover:scale-125 ${
                  c === currentColor ? 'ring-2 ring-offset-1' : ''
                } ${!c ? 'relative after:content-[""] after:absolute after:inset-0.5 after:border-t after:rotate-45' : ''}`}
                style={{
                  ...(c ? { background: c } : { background: 'var(--bg-input)' }),
                  borderColor: c === currentColor ? 'var(--accent)' : 'var(--border-color)',
                  '--tw-ring-color': 'var(--accent)',
                  ...((!c) ? { '--tw-border-opacity': 1 } : {}),
                }}
                title={c || 'Default'}
              />
            ))}
          </div>
          <div className="pt-1.5 flex items-center gap-1.5" style={{ borderTop: '1px solid var(--border-color)' }}>
            <input
              ref={customInputRef}
              type="color"
              defaultValue={currentColor || '#000000'}
              className="w-5 h-5 rounded-sm border cursor-pointer appearance-none p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none"
              style={{ borderColor: 'var(--border-color)' }}
              onInput={handleCustomColor}
              title="Pick custom color"
            />
            <span className="text-[10px] font-medium select-none" style={{ color: 'var(--text-secondary)' }}>Custom</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tiny hooks ────────────────────────────────────────────────────────
function useToggle(init = false) {
  const [v, setV] = useState(init);
  return [v, setV];
}

function useOutsideClick(ref, cb) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) cbRef.current(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref]);
}

// ── Image insert handler ──────────────────────────────────────────────
function useImageInsert(editor) {
  const fileInputRef = useRef(null);

  const insertFromUrl = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const insertFromFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Convert to base64 — works offline and stores in Sheets
    const reader = new FileReader();
    reader.onload = () => {
      editor?.chain().focus().setImage({ src: reader.result }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [editor]);

  return { fileInputRef, insertFromUrl, insertFromFile, onFileChange };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
export default function CardEditor({ content, onChange, placeholder, label, borderColor = 'blue' }) {
  // Force re-render on every editor transaction so toolbar active-state
  // reflects immediately (not just on the next keystroke).
  const [, forceUpdate] = useState(0);

  // Track whether content change originated from this editor (typing)
  // vs external prop change (loading deck data)
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // use the dedicated extension instead
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: true, allowBase64: true }),
      CodeBlock,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Type here…' }),
    ],
    content: content || '',
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // TipTap returns '<p></p>' for empty content — normalise to ''
      const normalized = html === '<p></p>' ? '' : html;
      isInternalUpdate.current = true;
      onChange?.(normalized);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[4rem] px-3 py-2',
        style: 'color: var(--text-primary)',
      },
      // Allow pasting images
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find(i => i.type.startsWith('image/'));
        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (!file) return true;
          const reader = new FileReader();
          reader.onload = () => {
            const { schema } = view.state;
            const node = schema.nodes.image.create({ src: reader.result });
            const tr = view.state.tr.replaceSelectionWith(node);
            view.dispatch(tr);
          };
          reader.readAsDataURL(file);
          return true;
        }
        return false;
      },
      // Allow dropping images
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFile = files.find(f => f.type.startsWith('image/'));
        if (imageFile) {
          event.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            const { schema } = view.state;
            const node = schema.nodes.image.create({ src: reader.result });
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (coords) {
              const tr = view.state.tr.insert(coords.pos, node);
              view.dispatch(tr);
            }
          };
          reader.readAsDataURL(imageFile);
          return true;
        }
        return false;
      },
    },
  });

  // Subscribe to transactions so toolbar buttons re-render immediately
  useEffect(() => {
    if (!editor) return;
    const handler = () => forceUpdate((n) => n + 1);
    editor.on('transaction', handler);
    return () => { editor.off('transaction', handler); };
  }, [editor]);

  // Sync external content changes (e.g., loading a deck for editing)
  // Skip if the change came from the editor itself (user typing)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    // External content change — update editor
    const currentHtml = editor.getHTML();
    const normalizedCurrent = currentHtml === '<p></p>' ? '' : currentHtml;
    if ((content || '') !== normalizedCurrent) {
      editor.commands.setContent(content || '', false);
    }
  }, [content, editor]);

  const img = useImageInsert(editor);

  if (!editor) return null;

  return (
    <div className="transition-all group/editor" style={{
      borderRadius: 'var(--radius)',
      border: '2px solid var(--border-color)',
      background: 'var(--bg-input)',
    }}>
      {/* Label */}
      {label && (
        <div className="px-3 pt-2 pb-0">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Toolbar — shows on focus */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 opacity-60 group-focus-within/editor:opacity-100 transition-opacity"
        style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <Bold size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <Italic size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <UnderlineIcon size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={14} />
        </Btn>

        <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border-color)' }} />

        <ColorPicker
          colors={COLORS}
          currentColor={editor.getAttributes('textStyle')?.color || null}
          onSelect={(c) => c ? editor.chain().focus().setColor(c).run() : editor.chain().focus().unsetColor().run()}
          title="Text color"
          icon={Type}
        />
        <ColorPicker
          colors={HIGHLIGHTS}
          currentColor={editor.getAttributes('highlight')?.color || null}
          onSelect={(c) => c ? editor.chain().focus().toggleHighlight({ color: c }).run() : editor.chain().focus().unsetHighlight().run()}
          title="Highlight"
          icon={Highlighter}
        />

        <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border-color)' }} />

        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
          <AlignLeft size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
          <AlignCenter size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
          <AlignRight size={14} />
        </Btn>

        <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border-color)' }} />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <List size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          <ListOrdered size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
          <Quote size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
          <Code size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus size={14} />
        </Btn>

        <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border-color)' }} />

        <Btn onClick={img.insertFromFile} title="Upload image">
          <ImageIcon size={14} />
        </Btn>
        <Btn onClick={img.insertFromUrl} title="Image from URL">
          <span className="text-[10px] font-bold">URL</span>
        </Btn>

        <div className="flex-1" />

        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <Undo2 size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={14} />
        </Btn>
      </div>

      {/* Hidden file input for image uploads */}
      <input
        ref={img.fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={img.onFileChange}
      />
    </div>
  );
}
