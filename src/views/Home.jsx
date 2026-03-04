import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, PlusCircle, Upload, Zap, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchQuizletSet, parseCSV, uploadApkg } from '../services/importers';
import { saveDeck } from '../services/api';

export default function Home() {
  const navigate = useNavigate();

  // --- Quizlet state ---
  const [quizUrl, setQuizUrl] = useState('');
  const [quizStatus, setQuizStatus] = useState('idle'); // idle | loading | success | error
  const [quizMsg, setQuizMsg] = useState('');

  // --- Upload state ---
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMsg, setUploadMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // ---- Quizlet handler ----
  const handleQuizlet = async (e) => {
    e.preventDefault();
    if (!quizUrl.trim()) return;
    setQuizStatus('loading');
    setQuizMsg('Fetching cards from Quizlet...');
    try {
      const { title, cards } = await fetchQuizletSet(quizUrl);
      setQuizMsg(`Found ${cards.length} cards. Saving...`);
      const result = await saveDeck({ deckName: title, cards });
      setQuizStatus('success');
      setQuizMsg(`Imported "${title}" — ${cards.length} cards`);
      setTimeout(() => navigate(`/study/${result.deckId}`), 800);
    } catch (err) {
      setQuizStatus('error');
      setQuizMsg(err.message);
    }
  };

  // ---- File upload handler ----
  const processFile = async (file) => {
    if (!file) return;
    setUploadStatus('loading');
    setUploadMsg(`Parsing ${file.name}...`);
    try {
      let title, cards;
      if (file.name.endsWith('.apkg')) {
        const result = await uploadApkg(file);
        title = result.title;
        cards = result.cards;
      } else {
        const result = await parseCSV(file);
        title = result.title;
        cards = result.cards;
      }
      if (!cards.length) throw new Error('No cards found in file.');
      setUploadMsg(`Found ${cards.length} cards. Saving...`);
      const saved = await saveDeck({ deckName: title, cards });
      setUploadStatus('success');
      setUploadMsg(`Imported "${title}" — ${cards.length} cards`);
      setTimeout(() => navigate(`/study/${saved.deckId}`), 800);
    } catch (err) {
      setUploadStatus('error');
      setUploadMsg(err.message);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const onFileInput = (e) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  // ---- tiny status badge ----
  const StatusBadge = ({ status, msg }) => {
    if (status === 'idle') return null;
    const colors = {
      loading: 'text-[var(--info)]',
      success: 'text-[var(--success)]',
      error: 'text-[var(--error)]',
    };
    return (
      <div className={`mt-3 flex items-center gap-2 text-xs px-3 py-2 ${colors[status]}`}
        style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)' }}>
        {status === 'loading' && <Loader size={14} className="animate-spin" />}
        {status === 'success' && <CheckCircle size={14} />}
        {status === 'error' && <AlertCircle size={14} />}
        <span className="truncate">{msg}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow py-12 w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-10"
      >
        <h1 className="text-5xl md:text-6xl font-extrabold mb-3 tracking-tight"
          style={{ color: 'var(--text-primary)' }}>
          Ready to study?
        </h1>
        <p className="text-lg font-light max-w-md mx-auto"
          style={{ color: 'var(--text-secondary)' }}>
          Import a deck and start learning instantly.
        </p>
      </motion.div>

      {/* ---- Action widgets ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4 mb-8">

        {/* Quizlet import */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="glass-panel p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <Zap size={18} />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Import from Quizlet</h3>
            </div>
            <form onSubmit={handleQuizlet} className="flex gap-2">
              <input
                type="url"
                placeholder="https://quizlet.com/..."
                value={quizUrl}
                onChange={(e) => setQuizUrl(e.target.value)}
                disabled={quizStatus === 'loading'}
                className="flex-1 min-w-0 px-3 py-2 text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                }}
                required
              />
              <button
                type="submit"
                disabled={quizStatus === 'loading' || !quizUrl.trim()}
                className="px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 shrink-0"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg-primary)',
                  borderRadius: 'var(--radius)',
                }}
              >
                {quizStatus === 'loading' ? '...' : 'Go'}
              </button>
            </form>
            <StatusBadge status={quizStatus} msg={quizMsg} />
          </div>
        </motion.div>

        {/* File upload */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="glass-panel p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <Upload size={18} />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Upload Deck</h3>
            </div>
            <label
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={onDrop}
              className="flex-1 flex items-center justify-center border-2 border-dashed p-4 cursor-pointer transition-all text-center text-sm"
              style={{
                borderColor: isDragging ? 'var(--accent)' : 'var(--border-color)',
                background: isDragging ? 'var(--accent-dim)' : 'transparent',
                borderRadius: 'var(--radius)',
                color: 'var(--text-secondary)',
              }}
            >
              <input
                type="file"
                accept=".apkg,.csv,.txt"
                onChange={onFileInput}
                className="hidden"
                disabled={uploadStatus === 'loading'}
              />
              <span className="pointer-events-none">
                {uploadStatus === 'loading'
                  ? 'Processing...'
                  : 'Drop .apkg, .csv, or .txt here — or click to browse'}
              </span>
            </label>
            <StatusBadge status={uploadStatus} msg={uploadMsg} />
          </div>
        </motion.div>
      </div>

      {/* ---- Quick links ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-4"
      >
        <Link
          to="/create"
          className="flex items-center gap-2 px-5 py-2.5 glass-panel text-sm font-medium transition-all hover:opacity-80"
          style={{ color: 'var(--text-primary)' }}
        >
          <PlusCircle size={16} /> Create Deck
        </Link>
        <Link
          to="/library"
          className="flex items-center gap-2 px-5 py-2.5 glass-panel text-sm font-medium transition-all hover:opacity-80"
          style={{ color: 'var(--text-primary)' }}
        >
          <BookOpen size={16} /> Library
        </Link>
      </motion.div>
    </div>
  );
}
