// src/App.jsx
import { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Route-level code splitting — each heavy view loads on demand
const Home = lazy(() => import('./views/Home'));
const Library = lazy(() => import('./views/Library'));
const Create = lazy(() => import('./views/Create'));
const Study = lazy(() => import('./views/Study'));

function RouteLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div
        className="w-10 h-10 border-4 rounded-full animate-spin"
        style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Suspense fallback={<RouteLoading />}><Home /></Suspense>} />
          <Route path="library" element={<Suspense fallback={<RouteLoading />}><Library /></Suspense>} />
          <Route path="create" element={<Suspense fallback={<RouteLoading />}><Create /></Suspense>} />
          <Route path="study/:deckId" element={<Suspense fallback={<RouteLoading />}><Study /></Suspense>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;