import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Navbar, { VIEW_CONFIG, VIEW_PATHS, getLockedFilterKeys } from './components/Navbar';
import Dashboard from './components/Dashboard';
import PandalList from './components/Pandallist';
import PandalDetails from './components/Pandaldetails';
import PandalForm from './components/Pandalform';
import SearchFilters, { DEFAULT_FILTERS, applyFilters } from './components/SearchFilters';
import usePandals from './usePandals.js';
import PandalMap from './components/PandalMap.jsx';

/** One list-style page (All, Not visited, Visited, Favourites, Regions, Metros). */
function ListPage({ viewKey, store, filters, setFilters, resetFilters, openDetails, openForm }) {
  const config = VIEW_CONFIG[viewKey];
  const { pandals } = store;

  const viewPandals = useMemo(
    () => applyFilters(pandals, { ...DEFAULT_FILTERS, ...config.locked }),
    [pandals, config],
  );
  const visible = useMemo(
    () => applyFilters(pandals, { ...filters, ...config.locked }),
    [pandals, filters, config],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">{config.title}</h1>
        <p className="mt-1 text-[#6B645C]">{config.subtitle}</p>
      </header>
      <SearchFilters
        filters={filters}
        onChange={setFilters}
        pandals={viewPandals}
        resultCount={visible.length}
        lockedFilters={getLockedFilterKeys(viewKey)}
      />
      <PandalList
        pandals={visible}
        totalCount={viewPandals.length}
        isLoading={store.isLoading}
        groupBy={config.groupBy}
        onSelect={openDetails}
        onEdit={openForm}
        onDelete={store.deletePandal}
        onToggleFavourite={store.toggleFavourite}
        onToggleVisited={store.toggleVisited}
        onClearFilters={resetFilters}
        onAddNew={() => openForm()}
        onLoadSamples={() => store.loadSamples()}
      />
    </div>
  );
}

/** Details page for /pandals/:id */
function DetailsPage({ store, openForm, goBack }) {
  const { id } = useParams();

  // Avoid flashing "not found" while data is still loading (e.g. on a page refresh).
  if (store.isLoading) return <div className="min-h-[40vh]" aria-busy="true" />;

  const pandal = store.pandals.find((p) => p.id === id) ?? null;

  return (
    <PandalDetails
      pandal={pandal}
      onBack={goBack}
      onEdit={openForm}
      onDelete={(pandalId) => {
        store.deletePandal(pandalId);
        goBack(true);
      }}
      onToggleFavourite={store.toggleFavourite}
      onToggleVisited={store.toggleVisited}
    />
  );
}

export default function App() {
  const store = usePandals(); // single source of truth (talks to the API)
  const { pandals } = store;

  const location = useLocation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [form, setForm] = useState({ open: false, id: null });

  // A search typed in the navbar from another page. The route-change effect below would
  // otherwise wipe it, so it is parked here and applied after the reset.
  const pendingQuery = useRef(null);

  const resetFilters = useCallback(() => setFilters((f) => ({ ...DEFAULT_FILTERS, sortBy: f.sortBy })), []);

  // Every page change starts with clean filters (sort order is kept) and scrolls to the top.
  // Exception: a navbar search that triggered this navigation keeps its query.
  useEffect(() => {
    const query = pendingQuery.current;
    pendingQuery.current = null;
    if (query) {
      setFilters((f) => ({ ...DEFAULT_FILTERS, sortBy: f.sortBy, query }));
    } else {
      resetFilters();
    }
    window.scrollTo?.({ top: 0 });
  }, [location.pathname, resetFilters]);

  // Called by the navbar search (Enter / "See all"). The navbar then navigates to All pandals.
  const handleSearch = useCallback(
    (query) => {
      if (location.pathname === VIEW_PATHS.all) {
        // Already on that page: no route change, so apply the query directly.
        setFilters((f) => ({ ...DEFAULT_FILTERS, sortBy: f.sortBy, query }));
      } else {
        pendingQuery.current = query;
      }
    },
    [location.pathname],
  );

  // Dashboard calls onNavigate('all' | 'visited' | 'notVisited' | 'favourites' | 'regions' | ...).
  const goToView = useCallback((viewKey) => navigate(VIEW_PATHS[viewKey] ?? VIEW_PATHS.dashboard), [navigate]);

  // Remember which page the details view was opened from, so Back returns there.
  const openDetails = useCallback(
    (id) => navigate(`/pandals/${id}`, { state: { from: location.pathname } }),
    [navigate, location.pathname],
  );

  const goBack = useCallback(
    (replace = false) => navigate(location.state?.from ?? VIEW_PATHS.all, { replace: replace === true }),
    [navigate, location.state],
  );

  const openForm = (id = null) => setForm({ open: true, id });
  const editing = pandals.find((p) => p.id === form.id) ?? null;

  const listProps = { store, filters, setFilters, resetFilters, openDetails, openForm };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2A2622]">
      <Navbar pandals={pandals} onAddNew={() => openForm()} onSearch={handleSearch} />
      <main>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Routes>
            <Route
              path={VIEW_PATHS.dashboard}
              element={
                <Dashboard
                  pandals={pandals}
                  isLoading={store.isLoading}
                  storageError={store.storageError}
                  onDismissError={store.dismissStorageError}
                  onNavigate={goToView}
                  onAddNew={() => openForm()}
                  onSelectPandal={openDetails}
                  onToggleVisited={store.toggleVisited}
                  onLoadSamples={() => store.loadSamples()}
                />
              }
            />

            {Object.entries(VIEW_CONFIG).map(([key, config]) => (
              <Route key={key} path={config.path} element={<ListPage viewKey={key} {...listProps} />} />
            ))}

            <Route
              path="/pandals/:id"
              element={<DetailsPage store={store} openForm={openForm} goBack={goBack} />}
            />

            <Route
              path="/map"
              element={<PandalMap pandals={pandals} isLoading={store.isLoading} onSelectPandal={openDetails} />}
            />
            <Route path="*" element={<Navigate to={VIEW_PATHS.dashboard} replace />} />
          </Routes>
        </div>
      </main>

      <PandalForm
        isOpen={form.open}
        pandal={editing}
        existingPandals={pandals}
        onClose={() => setForm({ open: false, id: null })}
        onSave={(data) => (form.id ? store.updatePandal(form.id, data) : store.addPandal(data))}
      />
    </div>
  );
}