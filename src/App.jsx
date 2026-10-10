import { useCallback, useMemo, useState } from 'react';
import Sidebar, { VIEW_CONFIG, getLockedFilterKeys } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PandalList from './components/Pandallist';
import PandalDetails from './components/Pandaldetails';
import PandalForm from './components/Pandalform';
import SearchFilters, { DEFAULT_FILTERS, applyFilters } from './components/SearchFilters';
import usePandals from './usePandals.js';

export default function App() {
  const store = usePandals(); // single source of truth (talks to the API)
  const { pandals } = store;

  const [view, setView] = useState('dashboard'); // dashboard | detail | any key of VIEW_CONFIG
  const [backView, setBackView] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [form, setForm] = useState({ open: false, id: null });

  const config = VIEW_CONFIG[view]; // undefined for dashboard/detail
  const viewPandals = useMemo(
    () => (config ? applyFilters(pandals, { ...DEFAULT_FILTERS, ...config.locked }) : []),
    [pandals, config],
  );
  const visible = useMemo(
    () => (config ? applyFilters(pandals, { ...filters, ...config.locked }) : []),
    [pandals, filters, config],
  );

  const resetFilters = () => setFilters((f) => ({ ...DEFAULT_FILTERS, sortBy: f.sortBy }));
  const navigate = useCallback((next) => {
    setView(next);
    setSelectedId(null);
    setFilters((f) => ({ ...DEFAULT_FILTERS, sortBy: f.sortBy }));
    window.scrollTo?.({ top: 0 });
  }, []);
  const openDetails = (id) => {
    setBackView(view === 'detail' ? backView : view);
    setSelectedId(id);
    setView('detail');
  };
  const openForm = (id = null) => setForm({ open: true, id });

  const selected = pandals.find((p) => p.id === selectedId) ?? null;
  const editing = pandals.find((p) => p.id === form.id) ?? null;

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2A2622]">
      <Sidebar activeView={view} onNavigate={navigate} onAddNew={() => openForm()} pandals={pandals} />

      <main className="pt-14 lg:pl-64 lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {view === 'dashboard' && (
            <Dashboard
              pandals={pandals} isLoading={store.isLoading}
              storageError={store.storageError} onDismissError={store.dismissStorageError}
              onNavigate={navigate} onAddNew={() => openForm()}
              onSelectPandal={openDetails} onToggleVisited={store.toggleVisited}
              onLoadSamples={() => store.loadSamples()}
            />
          )}

          {config && (
            <div className="space-y-6">
              <header>
                <h1 className="font-serif text-3xl font-semibold">{config.title}</h1>
                <p className="mt-1 text-[#6B645C]">{config.subtitle}</p>
              </header>
              <SearchFilters
                filters={filters} onChange={setFilters} pandals={viewPandals}
                resultCount={visible.length} lockedFilters={getLockedFilterKeys(view)}
              />
              <PandalList
                pandals={visible} totalCount={viewPandals.length}
                isLoading={store.isLoading} groupBy={config.groupBy}
                onSelect={openDetails} onEdit={openForm} onDelete={store.deletePandal}
                onToggleFavourite={store.toggleFavourite} onToggleVisited={store.toggleVisited}
                onClearFilters={resetFilters} onAddNew={() => openForm()}
                onLoadSamples={() => store.loadSamples()}
              />
            </div>
          )}

          {view === 'detail' && (
            <PandalDetails
              pandal={selected} onBack={() => navigate(backView)} onEdit={openForm}
              onDelete={(id) => { store.deletePandal(id); navigate(backView); }}
              onToggleFavourite={store.toggleFavourite} onToggleVisited={store.toggleVisited}
            />
          )}
        </div>
      </main>

      <PandalForm
        isOpen={form.open} pandal={editing} existingPandals={pandals}
        onClose={() => setForm({ open: false, id: null })}
        onSave={(data) => (form.id ? store.updatePandal(form.id, data) : store.addPandal(data))}
      />
    </div>
  );
}