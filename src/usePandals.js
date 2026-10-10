import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { createSamplePandals, todayISO } from './components/Pandalform';

export default function usePandals() {
  const [pandals, setPandals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState(null);
  const latest = useRef(pandals);
  latest.current = pandals;

  const reload = useCallback(async () => {
    try {
      setPandals(await api.list());
      setStorageError(null);
    } catch (err) {
      setStorageError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const replace = (saved) => setPandals((list) => list.map((p) => (p.id === saved.id ? saved : p)));

  // add/update THROW on failure so the form stays open and shows the message.
  const addPandal = async (data) => {
    const saved = await api.create(data);
    setPandals((list) => [saved, ...list]);
    return saved;
  };

  const updatePandal = async (id, data) => {
    const saved = await api.update(id, data);
    replace(saved);
    return saved;
  };

  const deletePandal = async (id) => {
    const before = latest.current;
    setPandals((list) => list.filter((p) => p.id !== id));
    try {
      await api.remove(id);
    } catch (err) {
      setPandals(before);
      setStorageError(err.message);
    }
  };

  const optimisticPatch = async (id, change, body) => {
    const before = latest.current;
    const current = before.find((p) => p.id === id);
    if (!current) return;
    setPandals((list) => list.map((p) => (p.id === id ? { ...p, ...change(p) } : p)));
    try {
      replace(await api.patch(id, body(current)));
    } catch (err) {
      setPandals(before);
      setStorageError(err.message);
    }
  };

  const toggleVisited = (id) =>
    optimisticPatch(
      id,
      (p) => ({ visited: !p.visited, visitDate: p.visited ? null : p.visitDate || todayISO() }),
      (p) => ({ visited: !p.visited, visitDate: p.visitDate || todayISO() }),
    );

  const toggleFavourite = (id) =>
    optimisticPatch(
      id,
      (p) => ({ favourite: !p.favourite }),
      (p) => ({ favourite: !p.favourite }),
    );

  const loadSamples = async (samples = createSamplePandals()) => {
    try {
      await api.bulk(samples);
      await reload();
    } catch (err) {
      setStorageError(err.message);
    }
  };

  const dismissStorageError = () => setStorageError(null);

  return {
    pandals,
    isLoading,
    storageError,
    dismissStorageError,
    dismissError: dismissStorageError,
    reload,
    addPandal,
    updatePandal,
    deletePandal,
    toggleVisited,
    toggleFavourite,
    loadSamples,
  };
}