/**
 * PandalForm.jsx
 *
 * Besides the add/edit drawer (default export), this file is the single home for
 * everything the other components share, so business logic is never duplicated:
 *
 *   - Data model:      REGIONS, createPandal, normalizePandal, createSamplePandals
 *   - Data layer:      usePandals() hook (localStorage, or the API when VITE_API_URL is set)
 *   - Helpers:         todayISO, formatDate, getDirectionsUrl, getPlaceUrl, isSafeMapsUrl
 *   - Image handling:  validateImageFile, readImageAsDataUrl
 *   - UI primitives:   ui (class tokens), ConfirmDialog, ImageWithFallback, RegionBadge,
 *                      StatusBadge
 *
 * Adding a region: add its name to REGIONS and its colours to REGION_STYLE_MAP. If you forget
 * the colours, REGION_STYLES falls back to a neutral style instead of crashing the app.
 *
 * Mobile notes
 *   - Every text field uses text-base (16px) below `sm`. iOS Safari zooms the page when a
 *     smaller field is focused, which was the "everything zooms" bug.
 *   - Hover-only motion uses the [@media(hover:hover)] variant so touch screens never get a stuck hover.
 *   - Buttons use touch-manipulation to disable double-tap zoom.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flower2,
  Heart,
  ImagePlus,
  Landmark,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

/* ========================================================================== */
/* 1. Constants and design tokens                                             */
/* ========================================================================== */

export const REGIONS = [
  'North Kolkata',
  'South Kolkata',
  'Central Kolkata',
  'West Kolkata',
  'East Kolkata',
  'Outside Kolkata',
];

/*
 * Palette (from the logo)
 *   navy #16325C   deep navy #0F2547   orange #F5822A   dark orange (text) #B8530A
 *   ink #2A2622    muted #6B645C       line #E6E0D2      cream #FAF6EE
 */
const REGION_STYLE_MAP = {
  'North Kolkata': {
    badge: 'bg-[#FFF1E4] text-[#A84A07] ring-[#F8D2AE]',
    bar: 'bg-[#F5822A]',
  },
  'South Kolkata': {
    badge: 'bg-[#E7ECF5] text-[#16325C] ring-[#C3CFE6]',
    bar: 'bg-[#16325C]',
  },
  'Central Kolkata': {
    badge: 'bg-[#E3F3EF] text-[#1F6355] ring-[#BADFD6]',
    bar: 'bg-[#2E8B7A]',
  },
  'West Kolkata': {
    badge: 'bg-[#F7EFD9] text-[#8A6A1C] ring-[#E8D6A5]',
    bar: 'bg-[#B58B2E]',
  },
  'East Kolkata': {
    badge: 'bg-[#F1E9F5] text-[#5B2E75] ring-[#DAC8E6]',
    bar: 'bg-[#7A4A96]',
  },
  'Outside Kolkata': {
    badge: 'bg-[#ECEAE6] text-[#3F3A34] ring-[#D5D0C7]',
    bar: 'bg-[#8A8276]',
  },
};

const FALLBACK_REGION_STYLE = {
  badge: 'bg-[#ECEAE6] text-[#3F3A34] ring-[#D5D0C7]',
  bar: 'bg-[#8A8276]',
};

/**
 * Looking up any region name always returns a style object, so
 * `REGION_STYLES[region].bar` can never throw, even for a region added later.
 */
export const REGION_STYLES = new Proxy(REGION_STYLE_MAP, {
  get: (target, key) => target[key] ?? FALLBACK_REGION_STYLE,
});

export const regionBar = (region) => REGION_STYLES[region].bar;

export const STORAGE_KEY = 'pujotrack.pandals.v1';

export const IMAGE_RULES = {
  types: ['image/jpeg', 'image/png', 'image/webp'],
  maxBytes: 5 * 1024 * 1024, // reject originals above 5 MB
  maxDimension: 1100, // longest side after resizing
  quality: 0.78, // JPEG quality after resizing
};

/**
 * Hover-only effects (card lift, image zoom) must be written with the full variant, for
 * example `[@media(hover:hover)]:hover:-translate-y-0.5`, so they only run on devices that
 * really hover. On touch screens :hover sticks after a tap, which made cards look zoomed.
 * Write the class out in full: Tailwind cannot see classes built from template strings.
 */

const RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16325C] focus-visible:ring-offset-2';

/** Shared Tailwind class tokens so every component looks consistent. */
export const ui = {
  card:
    'rounded-2xl border border-[#E6E0D2] bg-white shadow-[0_1px_2px_rgba(15,37,71,0.04),0_6px_20px_rgba(15,37,71,0.05)]',
  primaryBtn: `inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#F5822A] px-4 py-2.5 text-sm font-semibold text-[#0F2547] shadow-sm transition-colors hover:bg-[#FF9440] active:bg-[#E0721D] ${RING} disabled:cursor-not-allowed disabled:opacity-60`,
  secondaryBtn: `inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border border-[#D9D4C6] bg-white px-4 py-2.5 text-sm font-semibold text-[#16325C] shadow-sm transition-colors hover:border-[#B9C4DA] hover:bg-[#F4F6FA] active:bg-[#EAEEF6] ${RING} disabled:cursor-not-allowed disabled:opacity-60`,
  dangerBtn: `inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#B82D16] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#9A2412] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B82D16] focus-visible:ring-offset-2 disabled:opacity-60`,
  iconBtn: `inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-transparent text-[#5A6478] transition-colors hover:bg-[#EEF1F7] hover:text-[#16325C] active:bg-[#E3E8F2] sm:h-9 sm:w-9 ${RING}`,
  /** Text fields and selects: 16px on phones (prevents iOS zoom), 14px from sm up. */
  select:
    'w-full touch-manipulation appearance-none rounded-xl border border-[#D9D4C6] bg-white py-2.5 pl-3.5 pr-10 text-base text-[#2A2622] transition-colors hover:border-[#B9C4DA] focus:border-[#16325C] focus:outline-none focus:ring-2 focus:ring-[#16325C]/20 sm:text-sm',
  muted: 'text-[#6B645C]',
};

/* ========================================================================== */
/* 2. Data model                                                              */
/* ========================================================================== */

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pandal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Create a complete pandal record. Any field can be overridden. */
export function createPandal(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    clubName: '',
    address: '',
    locality: '',
    region: REGIONS[0],
    nearestMetro: '',
    metroDistance: '',
    latitude: null,
    longitude: null,
    googleMapsUrl: '',
    description: '',
    pandalImage: null, // data URL (demo) or hosted URL (future backend)
    idolImage: null,
    visited: false,
    visitDate: null, // 'YYYY-MM-DD'
    favourite: false,
    isSample: false, // true for demo records that are not verified information
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const toCoordinate = (value, min, max) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};

const toImage = (value) =>
  typeof value === 'string' && /^(data:image\/|https?:\/\/)/i.test(value) ? value : null;

/**
 * Turn anything (saved JSON, form output, API response) into a safe pandal record.
 * Returns null when the record is unusable.
 */
export function normalizePandal(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const clubName = text(raw.clubName);
  if (!clubName) return null;

  const now = new Date().toISOString();
  const lat = toCoordinate(raw.latitude, -90, 90);
  const lng = toCoordinate(raw.longitude, -180, 180);
  const bothCoordinates = lat !== null && lng !== null;
  const visited = raw.visited === true;
  const visitDate =
    typeof raw.visitDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw.visitDate)
      ? raw.visitDate.slice(0, 10)
      : null;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : makeId(),
    clubName,
    address: text(raw.address),
    locality: text(raw.locality),
    region: REGIONS.includes(raw.region) ? raw.region : REGIONS[0],
    nearestMetro: text(raw.nearestMetro),
    metroDistance: text(raw.metroDistance),
    latitude: bothCoordinates ? lat : null,
    longitude: bothCoordinates ? lng : null,
    googleMapsUrl: text(raw.googleMapsUrl),
    description: text(raw.description),
    pandalImage: toImage(raw.pandalImage),
    idolImage: toImage(raw.idolImage),
    visited,
    visitDate: visited ? visitDate : null,
    favourite: raw.favourite === true,
    isSample: raw.isSample === true,
    createdAt: text(raw.createdAt) || now,
    updatedAt: text(raw.updatedAt) || now,
  };
}

/* ========================================================================== */
/* 3. Sample (demo) data                                                      */
/* ========================================================================== */

/**
 * IMPORTANT: these are DEMO records. The club names are invented, and localities and
 * metro stations are only a rough guide to the area. Distances are illustrative, and
 * there are no coordinates. Replace them with verified details as you add real clubs.
 */
const SAMPLE_SEEDS = [
  // [clubName, locality, region, nearestMetro, metroDistance, { visitedDaysAgo, favourite }]
  ['Demo Sarbojanin Puja, Shyambazar', 'Shyambazar', 'North Kolkata', 'Shyambazar', '400 m', { visitedDaysAgo: 2, favourite: true }],
  ['Demo Puja Committee, Girish Park', 'Girish Park', 'North Kolkata', 'Girish Park', '350 m', {}],
  ['Demo Club, Baghbazar', 'Baghbazar', 'North Kolkata', 'Shobhabazar Sutanuti', '900 m', { favourite: true }],
  ['Demo Sarbojanin, Kalighat', 'Kalighat', 'South Kolkata', 'Kalighat', '500 m', { visitedDaysAgo: 5 }],
  ['Demo Puja Club, Bhowanipore', 'Bhowanipore', 'South Kolkata', 'Netaji Bhavan', '700 m', {}],
  ['Demo Club, Tollygunge', 'Tollygunge', 'South Kolkata', 'Mahanayak Uttam Kumar', '300 m', { favourite: true }],
  ['Demo Puja, Dhakuria', 'Dhakuria', 'South Kolkata', 'Rabindra Sarobar', '600 m', {}],
  ['Demo Club, Salt Lake Sector V', 'Salt Lake', 'East Kolkata', 'Sector V', '500 m', {}],
  ['Demo Puja, Phoolbagan', 'Phoolbagan', 'East Kolkata', 'Phoolbagan', '300 m', { visitedDaysAgo: 9 }],
  ['Demo Sarbojanin, Karunamoyee', 'Salt Lake', 'East Kolkata', 'Karunamoyee', '600 m', {}],
  ['Demo Puja, Howrah Maidan', 'Howrah', 'West Kolkata', 'Howrah Maidan', '700 m', {}],
  ['Demo Club, Howrah Station area', 'Howrah', 'West Kolkata', 'Howrah', '250 m', {}],
  ['Demo Sarbojanin, Shibpur', 'Shibpur', 'West Kolkata', 'Howrah Maidan', '2.5 km', {}],
];

function daysAgoISO(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return todayISO(date);
}

export function createSamplePandals() {
  const now = new Date().toISOString();
  return SAMPLE_SEEDS.map(([clubName, locality, region, nearestMetro, metroDistance, flags], index) =>
    createPandal({
      id: `sample-${index + 1}`,
      clubName,
      locality,
      region,
      nearestMetro,
      metroDistance,
      address: `${locality}, Kolkata, West Bengal`,
      description:
        'Demo record for previewing the app. Edit it with the real theme, idol and attractions, or delete it.',
      visited: Boolean(flags.visitedDaysAgo),
      visitDate: flags.visitedDaysAgo ? daysAgoISO(flags.visitedDaysAgo) : null,
      favourite: Boolean(flags.favourite),
      isSample: true,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

/* ========================================================================== */
/* 4. Data layer: localStorage, or the API when VITE_API_URL is set           */
/* ========================================================================== */

export function loadPandals() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { pandals: createSamplePandals(), error: null };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      // Keep a copy of the unreadable data so nothing is lost silently.
      try {
        window.localStorage.setItem(`${STORAGE_KEY}.corrupt-backup`, raw);
      } catch (backupError) {
        /* ignore: storage may be full */
      }
      throw parseError;
    }
    if (!Array.isArray(parsed)) throw new Error('Saved data has an unexpected format.');

    const seen = new Set();
    const pandals = [];
    parsed.forEach((item) => {
      const record = normalizePandal(item);
      if (record && !seen.has(record.id)) {
        seen.add(record.id);
        pandals.push(record);
      }
    });
    return { pandals, error: null };
  } catch (error) {
    return {
      pandals: createSamplePandals(),
      error: 'Your saved pandals could not be read, so the demo data was loaded instead.',
    };
  }
}

export function savePandals(pandals) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pandals));
    return null;
  } catch (error) {
    return 'Your changes could not be saved in this browser. Storage may be full: remove a few images or pandals and try again.';
  }
}

/** Browser-only version. The single source of truth for pandal records. */
function useLocalPandals() {
  const [pandals, setPandals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const result = loadPandals();
    setPandals(result.pandals);
    setLoadError(result.error);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    setSaveError(savePandals(pandals));
  }, [pandals, isLoading]);

  useEffect(() => {
    if (saveError || loadError) setDismissed(false);
  }, [saveError, loadError]);

  const addPandal = useCallback((data) => {
    const now = new Date().toISOString();
    const record = normalizePandal({ ...data, id: makeId(), isSample: false, createdAt: now, updatedAt: now });
    if (record) setPandals((current) => [record, ...current]);
    return record;
  }, []);

  const updatePandal = useCallback((id, changes) => {
    setPandals((current) =>
      current.map((pandal) => {
        if (pandal.id !== id) return pandal;
        const next = normalizePandal({
          ...pandal,
          ...changes,
          id: pandal.id,
          createdAt: pandal.createdAt,
          isSample: false, // saving a demo record through the form makes it the user's own
          updatedAt: new Date().toISOString(),
        });
        return next || pandal;
      }),
    );
  }, []);

  const deletePandal = useCallback((id) => {
    setPandals((current) => current.filter((pandal) => pandal.id !== id));
  }, []);

  const toggleFavourite = useCallback((id) => {
    setPandals((current) =>
      current.map((pandal) =>
        pandal.id === id
          ? { ...pandal, favourite: !pandal.favourite, updatedAt: new Date().toISOString() }
          : pandal,
      ),
    );
  }, []);

  const toggleVisited = useCallback((id) => {
    setPandals((current) =>
      current.map((pandal) => {
        if (pandal.id !== id) return pandal;
        const visited = !pandal.visited;
        return {
          ...pandal,
          visited,
          visitDate: visited ? pandal.visitDate || todayISO() : null,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const loadSamples = useCallback(() => {
    setPandals((current) => {
      const existing = new Set(current.map((pandal) => pandal.id));
      return [...current, ...createSamplePandals().filter((sample) => !existing.has(sample.id))];
    });
  }, []);

  return {
    pandals,
    isLoading,
    storageError: dismissed ? null : saveError || loadError,
    dismissStorageError: () => setDismissed(true),
    addPandal,
    updatePandal,
    deletePandal,
    toggleFavourite,
    toggleVisited,
    loadSamples,
  };
}

/* ---- API-backed version (used when VITE_API_URL is set, e.g. http://localhost:4000) ---- */

const API_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    let message = 'The server could not complete that request.';
    try {
      message = (await response.json()).error || message;
    } catch (e) {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

function useApiPandals() {
  const [pandals, setPandals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await api('/pandals');
      setPandals(list.map(normalizePandal).filter(Boolean));
      setError(null);
    } catch (e) {
      setError(`Could not reach the server: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const fail = useCallback(
    (e) => {
      setError(e.message);
      setDismissed(false);
      refresh(); // roll back optimistic changes to what the server really has
    },
    [refresh],
  );

  const addPandal = useCallback(async (data) => {
    const saved = await api('/pandals', { method: 'POST', body: JSON.stringify(data) }); // throws into the form
    setPandals((current) => [normalizePandal(saved), ...current]);
    return saved;
  }, []);

  const updatePandal = useCallback(async (id, data) => {
    const saved = await api(`/pandals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    setPandals((current) => current.map((p) => (p.id === id ? normalizePandal(saved) : p)));
    return saved;
  }, []);

  const deletePandal = useCallback(
    (id) => {
      setPandals((current) => current.filter((p) => p.id !== id));
      api(`/pandals/${id}`, { method: 'DELETE' }).catch(fail);
    },
    [fail],
  );

  const toggleFavourite = useCallback(
    (id) => {
      setPandals((current) => current.map((p) => (p.id === id ? { ...p, favourite: !p.favourite } : p)));
      api(`/pandals/${id}/favourite`, { method: 'PATCH' }).catch(fail);
    },
    [fail],
  );

  const toggleVisited = useCallback(
    (id) => {
      setPandals((current) =>
        current.map((p) =>
          p.id === id ? { ...p, visited: !p.visited, visitDate: p.visited ? null : p.visitDate || todayISO() } : p,
        ),
      );
      api(`/pandals/${id}/visited`, { method: 'PATCH' }).catch(fail);
    },
    [fail],
  );

  return {
    pandals,
    isLoading,
    storageError: dismissed ? null : error,
    dismissStorageError: () => setDismissed(true),
    addPandal,
    updatePandal,
    deletePandal,
    toggleFavourite,
    toggleVisited,
    loadSamples: undefined, // demo data is only for the offline localStorage mode
  };
}

/** Backend when VITE_API_URL is set, otherwise browser localStorage. Same return shape. */
export const usePandals = API_URL ? useApiPandals : useLocalPandals;

/* ========================================================================== */
/* 5. Helpers: dates and Google Maps                                          */
/* ========================================================================== */

/** Local date as YYYY-MM-DD (not UTC, so late-evening visits land on the right day). */
export function todayISO(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function hasCoordinates(pandal) {
  return Number.isFinite(pandal?.latitude) && Number.isFinite(pandal?.longitude);
}

function addressQuery(pandal) {
  const base =
    pandal.address?.trim() || [pandal.clubName, pandal.locality].filter(Boolean).join(', ');
  return /kolkata/i.test(base) ? base : `${base}, Kolkata`;
}

/** Only allow https links that point at Google Maps. */
export function isSafeMapsUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return (
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)
    );
  } catch (error) {
    return false;
  }
}

/** Directions URL. Coordinates win; otherwise the address is used. */
export function getDirectionsUrl(pandal) {
  const destination = hasCoordinates(pandal)
    ? `${pandal.latitude},${pandal.longitude}`
    : addressQuery(pandal);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** "Open in Google Maps": the saved link if valid, otherwise coordinates, otherwise address. */
export function getPlaceUrl(pandal) {
  if (isSafeMapsUrl(pandal.googleMapsUrl)) return pandal.googleMapsUrl;
  const query = hasCoordinates(pandal) ? `${pandal.latitude},${pandal.longitude}` : addressQuery(pandal);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/* ========================================================================== */
/* 6. Image handling                                                          */
/* ========================================================================== */

const formatBytes = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export function validateImageFile(file) {
  if (!file) return 'Choose an image to upload.';
  if (!IMAGE_RULES.types.includes(file.type)) return 'Use a JPEG, PNG or WebP image.';
  if (file.size > IMAGE_RULES.maxBytes) {
    return `This image is ${formatBytes(file.size)}. Choose one under ${formatBytes(IMAGE_RULES.maxBytes)}.`;
  }
  return null;
}

/** Reads a file, shrinks it, and returns a compact JPEG data URL for localStorage. */
export function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The file could not be read. Try another image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('This file is not a valid image.'));
      image.onload = () => {
        const scale = Math.min(1, IMAGE_RULES.maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Your browser could not process this image.'));
          return;
        }
        context.fillStyle = '#ffffff'; // flatten transparent PNG/WebP onto white
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', IMAGE_RULES.quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ========================================================================== */
/* 7. Shared UI primitives                                                    */
/* ========================================================================== */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0F2547]/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              tone === 'danger' ? 'bg-[#FDEEEA] text-[#B82D16]' : 'bg-[#FFF1E4] text-[#B8530A]'
            }`}
          >
            {tone === 'danger' ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="font-serif text-xl font-semibold text-[#2A2622]">
              {title}
            </h2>
            <p id="confirm-message" className="mt-1.5 break-words text-sm leading-relaxed text-[#6B645C]">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} className={ui.secondaryBtn}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={tone === 'danger' ? ui.dangerBtn : ui.primaryBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Image that falls back to an attractive placeholder when missing or broken. */
export function ImageWithFallback({ src, alt, kind = 'pandal', className = '', compact = false }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  const Icon = kind === 'idol' ? Flower2 : Landmark;
  return (
    <div
      role="img"
      aria-label={kind === 'idol' ? 'No Maa Durga idol photo yet' : 'No pandal photo yet'}
      className={`flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#F1F4FA] via-[#E7ECF5] to-[#DCE4F1] text-[#5C6F94] ${className}`}
    >
      <Icon className={compact ? 'h-5 w-5' : 'h-8 w-8'} strokeWidth={1.5} />
      {!compact && (
        <span className="px-2 text-center text-xs font-medium text-[#4A5E85]">
          {kind === 'idol' ? 'No idol photo yet' : 'No pandal photo yet'}
        </span>
      )}
    </div>
  );
}

export function RegionBadge({ region, className = '' }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${REGION_STYLES[region].badge} ${className}`}
    >
      {region}
    </span>
  );
}

export function StatusBadge({ visited, className = '' }) {
  return visited ? (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E4F1E8] px-2.5 py-0.5 text-xs font-semibold text-[#255B3C] ring-1 ring-inset ring-[#BBDCC6] ${className}`}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      Visited
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-[#6B645C] ring-1 ring-inset ring-[#DDD5C3] ${className}`}
    >
      Not visited
    </span>
  );
}

/* ========================================================================== */
/* 8. The form                                                                */
/* ========================================================================== */

// text-base on phones stops iOS Safari from zooming into the field on focus.
const inputClass = (hasError) =>
  `block w-full touch-manipulation rounded-xl border bg-white px-3.5 py-2.5 text-base text-[#2A2622] placeholder:text-[#A39B8D] transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
    hasError
      ? 'border-[#D9381E] focus:border-[#D9381E] focus:ring-[#D9381E]/25'
      : 'border-[#D9D4C6] hover:border-[#B9C4DA] focus:border-[#16325C] focus:ring-[#16325C]/20'
  }`;

function Field({ id, label, required, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#2A2622]">
        {label}
        {required && (
          <span className="text-[#D9381E]" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-[#B82D16]">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-[#6B645C]">{hint}</p>
      )}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="space-y-4 rounded-2xl border border-[#E6E0D2] bg-white p-4 sm:p-5">
      <div>
        <h3 className="font-serif text-lg font-semibold text-[#2A2622]">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-[#6B645C]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, description, icon: Icon, activeClass }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-xl border border-[#D9D4C6] bg-white p-3 text-left transition-colors hover:border-[#B9C4DA] ${RING}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          checked ? activeClass : 'bg-[#F1EEE6] text-[#8A8276]'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#2A2622]">{label}</span>
        <span className="block text-xs text-[#6B645C]">{description}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#16325C]' : 'bg-[#D3CEC0]'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

function ImageField({ id, label, hint, kind, value, busy, error, onSelect, onRemove }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files) => {
    const file = files && files[0];
    if (file) onSelect(file);
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[#2A2622]">{label}</span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = '';
        }}
      />

      {value ? (
        <div className="overflow-hidden rounded-xl border border-[#D9D4C6] bg-white">
          <div className="relative">
            <ImageWithFallback src={value} alt={`${label} preview`} kind={kind} className="aspect-[4/3] w-full" />
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Loader2 className="h-6 w-6 animate-spin text-[#F5822A]" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-[#EBE4D5] p-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className={`inline-flex min-h-10 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#16325C] transition-colors hover:bg-[#EEF1F7] ${RING} disabled:opacity-50`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="inline-flex min-h-10 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#B82D16] transition-colors hover:bg-[#FDEEEA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files);
          }}
          disabled={busy}
          className={`flex aspect-[16/9] w-full touch-manipulation flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors sm:aspect-[4/3] ${RING} ${
            dragging
              ? 'border-[#F5822A] bg-[#FFF1E4]'
              : 'border-[#C9D3E6] bg-[#F7F9FC] hover:border-[#16325C] hover:bg-[#EEF2F9]'
          }`}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#F5822A]" />
          ) : (
            <ImagePlus className="h-6 w-6 text-[#16325C]" strokeWidth={1.6} />
          )}
          <span className="text-sm font-medium text-[#2A2622]">{busy ? 'Preparing image…' : 'Add a photo'}</span>
          <span className="text-xs text-[#6B645C]">{hint}</span>
        </button>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-[#B82D16]">
          {error}
        </p>
      )}
    </div>
  );
}

function toFormValues(pandal) {
  return {
    clubName: pandal?.clubName ?? '',
    address: pandal?.address ?? '',
    locality: pandal?.locality ?? '',
    region: pandal?.region ?? '',
    nearestMetro: pandal?.nearestMetro ?? '',
    metroDistance: pandal?.metroDistance ?? '',
    latitude: Number.isFinite(pandal?.latitude) ? String(pandal.latitude) : '',
    longitude: Number.isFinite(pandal?.longitude) ? String(pandal.longitude) : '',
    googleMapsUrl: pandal?.googleMapsUrl ?? '',
    description: pandal?.description ?? '',
    pandalImage: pandal?.pandalImage ?? null,
    idolImage: pandal?.idolImage ?? null,
    visited: pandal?.visited ?? false,
    visitDate: pandal?.visitDate ?? '',
    favourite: pandal?.favourite ?? false,
  };
}

function toPandalData(values) {
  const lat = values.latitude.trim();
  const lng = values.longitude.trim();
  return {
    clubName: values.clubName.trim(),
    address: values.address.trim(),
    locality: values.locality.trim(),
    region: values.region,
    nearestMetro: values.nearestMetro.trim(),
    metroDistance: values.metroDistance.trim(),
    latitude: lat === '' ? null : Number(lat),
    longitude: lng === '' ? null : Number(lng),
    googleMapsUrl: values.googleMapsUrl.trim(),
    description: values.description.trim(),
    pandalImage: values.pandalImage,
    idolImage: values.idolImage,
    visited: values.visited,
    visitDate: values.visited ? values.visitDate : null,
    favourite: values.favourite,
  };
}

/** Returns an object of { fieldName: message }. Empty object means valid. */
export function validatePandalValues(values, existing = [], editingId = null) {
  const errors = {};
  const name = values.clubName.trim();

  if (!name) errors.clubName = 'Enter the club or puja name.';
  else if (name.length > 120) errors.clubName = 'Keep the name under 120 characters.';

  if (!values.locality.trim()) errors.locality = 'Enter the locality, for example Shyambazar.';
  if (!REGIONS.includes(values.region)) errors.region = 'Choose a region.';
  if (!values.address.trim()) errors.address = 'Enter the full address so directions work.';

  const latText = values.latitude.trim();
  const lngText = values.longitude.trim();
  if (latText || lngText) {
    const lat = Number(latText);
    const lng = Number(lngText);
    if (!latText) errors.latitude = 'Add a latitude, or clear the longitude.';
    else if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      errors.latitude = 'Latitude must be a number between -90 and 90.';
    if (!lngText) errors.longitude = 'Add a longitude, or clear the latitude.';
    else if (!Number.isFinite(lng) || lng < -180 || lng > 180)
      errors.longitude = 'Longitude must be a number between -180 and 180.';
  }

  if (values.googleMapsUrl.trim() && !isSafeMapsUrl(values.googleMapsUrl.trim())) {
    errors.googleMapsUrl = 'Paste a Google Maps link that starts with https://.';
  }

  if (values.visited) {
    if (!values.visitDate) errors.visitDate = 'Choose the date you visited.';
    else if (values.visitDate > todayISO()) errors.visitDate = 'The visit date cannot be in the future.';
  }

  if (!errors.clubName && values.locality.trim()) {
    const duplicate = existing.some(
      (pandal) =>
        pandal.id !== editingId &&
        pandal.clubName.trim().toLowerCase() === name.toLowerCase() &&
        pandal.locality.trim().toLowerCase() === values.locality.trim().toLowerCase(),
    );
    if (duplicate) errors.clubName = 'A club with this name already exists in this locality.';
  }

  return errors;
}

const FIELD_ORDER = [
  'clubName',
  'locality',
  'region',
  'address',
  'latitude',
  'longitude',
  'googleMapsUrl',
  'visitDate',
];

function FormPanel({ pandal, existingPandals, onSave, onClose }) {
  const isEdit = Boolean(pandal);
  const initialRef = useRef(null);
  if (initialRef.current === null) initialRef.current = toFormValues(pandal);

  const [values, setValues] = useState(initialRef.current);
  const [errors, setErrors] = useState({});
  const [imageState, setImageState] = useState({
    pandalImage: { busy: false, error: '' },
    idolImage: { busy: false, error: '' },
  });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [shown, setShown] = useState(false);
  const mounted = useRef(true);

  const isDirty = Object.keys(values).some((key) => values[key] !== initialRef.current[key]);
  const imagesBusy = imageState.pandalImage.busy || imageState.idolImage.busy;
  const errorCount = Object.keys(errors).length;

  const metroSuggestions = Array.from(
    new Set(existingPandals.map((item) => item.nearestMetro).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  // Slide-in on open, lock page scroll, track mount state.
  useEffect(() => {
    mounted.current = true;
    const frame = requestAnimationFrame(() => setShown(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first field only with a mouse. On phones, auto-focus opens the keyboard
    // immediately and the page jumps, which feels like an unwanted zoom.
    const timer = setTimeout(() => {
      if (window.matchMedia?.('(pointer: fine)').matches) {
        document.getElementById('field-clubName')?.focus();
      }
    }, 320);

    return () => {
      mounted.current = false;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Warn before the tab is closed with unsaved changes.
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  }, [saving, isDirty, onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !confirmDiscard) requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDiscard, requestClose]);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmitError('');
  };

  const setVisited = (visited) => {
    setValues((current) => ({
      ...current,
      visited,
      visitDate: visited ? current.visitDate || todayISO() : '',
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.visitDate;
      return next;
    });
  };

  const handleImage = async (field, file) => {
    const problem = validateImageFile(file);
    if (problem) {
      setImageState((current) => ({ ...current, [field]: { busy: false, error: problem } }));
      return;
    }
    setImageState((current) => ({ ...current, [field]: { busy: true, error: '' } }));
    try {
      const dataUrl = await readImageAsDataUrl(file);
      if (!mounted.current) return;
      setValues((current) => ({ ...current, [field]: dataUrl }));
      setImageState((current) => ({ ...current, [field]: { busy: false, error: '' } }));
    } catch (error) {
      if (!mounted.current) return;
      setImageState((current) => ({
        ...current,
        [field]: { busy: false, error: error.message || 'This image could not be used.' },
      }));
    }
  };

  const removeImage = (field) => {
    setValues((current) => ({ ...current, [field]: null }));
    setImageState((current) => ({ ...current, [field]: { busy: false, error: '' } }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || imagesBusy) return;

    const found = validatePandalValues(values, existingPandals, pandal?.id ?? null);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((key) => found[key]);
    if (firstInvalid) {
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }

    setSaving(true);
    setSubmitError('');
    try {
      await onSave(toPandalData(values));
      onClose(); // saved: close without the discard prompt
    } catch (error) {
      if (mounted.current) {
        setSubmitError(error?.message || 'The pandal could not be saved. Try again.');
        setSaving(false);
      }
    }
  };

  const lat = Number(values.latitude);
  const lng = Number(values.longitude);
  const coordinatesLookOff =
    values.latitude.trim() !== '' &&
    values.longitude.trim() !== '' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (lat < 22.3 || lat > 22.85 || lng < 88.1 || lng > 88.6);

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className={`absolute inset-0 bg-[#0F2547]/55 transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onMouseDown={requestClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pandal-form-title"
        className={`absolute inset-y-0 right-0 flex h-dvh w-full max-w-2xl flex-col bg-[#FAF6EE] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#E6E0D2] bg-white px-4 py-3.5 sm:px-7 sm:py-4">
          <div className="min-w-0">
            <h2 id="pandal-form-title" className="font-serif text-xl font-semibold text-[#2A2622] sm:text-2xl">
              {isEdit ? 'Edit puja club' : 'Add a puja club'}
            </h2>
            <p className="mt-0.5 text-sm text-[#6B645C]">
              {isEdit
                ? `Update the details for ${pandal.clubName}.`
                : 'Fields marked with * are required. You can add the rest later.'}
            </p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Close form" className={`${ui.iconBtn} -mr-1 h-11 w-11 sm:mr-0 sm:h-9 sm:w-9`}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
            {(errorCount > 0 || submitError) && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-[#F4C7BC] bg-[#FDEEEA] p-3.5 text-sm text-[#8F2210]"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {submitError ||
                    `Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} below to save this pandal.`}
                </p>
              </div>
            )}

            {pandal?.isSample && (
              <div className="rounded-xl border border-[#E8D6A5] bg-[#F7EFD9] p-3.5 text-sm text-[#6F5516]">
                This is a demo record. Saving your edits marks it as your own information.
              </div>
            )}

            <Section title="Basic information">
              <Field id="field-clubName" label="Club or puja name" required error={errors.clubName}>
                <input
                  id="field-clubName"
                  type="text"
                  value={values.clubName}
                  onChange={(event) => update('clubName', event.target.value)}
                  aria-invalid={Boolean(errors.clubName)}
                  aria-describedby={errors.clubName ? 'field-clubName-error' : undefined}
                  placeholder="Name of the club or committee"
                  className={inputClass(errors.clubName)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="field-locality" label="Locality" required error={errors.locality}>
                  <input
                    id="field-locality"
                    type="text"
                    value={values.locality}
                    onChange={(event) => update('locality', event.target.value)}
                    aria-invalid={Boolean(errors.locality)}
                    placeholder="For example, Shyambazar"
                    className={inputClass(errors.locality)}
                  />
                </Field>

                <div>
                  <span id="region-label" className="mb-1.5 block text-sm font-medium text-[#2A2622]">
                    Region
                    <span className="text-[#D9381E]" aria-hidden="true">
                      {' '}
                      *
                    </span>
                  </span>
                  <div role="radiogroup" aria-labelledby="region-label" className="grid grid-cols-2 gap-2">
                    {REGIONS.map((region, index) => {
                      const selected = values.region === region;
                      return (
                        <button
                          key={region}
                          id={index === 0 ? 'field-region' : undefined}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => update('region', region)}
                          className={`min-h-11 touch-manipulation rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${RING} ${
                            selected
                              ? 'border-[#F5822A] bg-[#FFF1E4] text-[#A84A07]'
                              : 'border-[#D9D4C6] bg-white text-[#4A443D] hover:border-[#B9C4DA]'
                          }`}
                        >
                          {region.replace(' Kolkata', '')}
                        </button>
                      );
                    })}
                  </div>
                  {errors.region && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-[#B82D16]">
                      {errors.region}
                    </p>
                  )}
                </div>
              </div>

              <Field id="field-address" label="Full address" required error={errors.address}>
                <textarea
                  id="field-address"
                  rows={2}
                  value={values.address}
                  onChange={(event) => update('address', event.target.value)}
                  aria-invalid={Boolean(errors.address)}
                  placeholder="Street, landmark, locality, Kolkata, PIN"
                  className={`${inputClass(errors.address)} resize-y`}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="field-nearestMetro"
                  label="Nearest metro station"
                  hint="Pick a suggestion or type a new one."
                >
                  <input
                    id="field-nearestMetro"
                    type="text"
                    list="metro-suggestions"
                    value={values.nearestMetro}
                    onChange={(event) => update('nearestMetro', event.target.value)}
                    placeholder="For example, Kalighat"
                    className={inputClass(false)}
                  />
                  <datalist id="metro-suggestions">
                    {metroSuggestions.map((station) => (
                      <option key={station} value={station} />
                    ))}
                  </datalist>
                </Field>
                <Field
                  id="field-metroDistance"
                  label="Walking distance from the metro"
                  hint="An approximate figure is fine."
                >
                  <input
                    id="field-metroDistance"
                    type="text"
                    value={values.metroDistance}
                    onChange={(event) => update('metroDistance', event.target.value)}
                    placeholder="For example, 500 m or 1.2 km"
                    className={inputClass(false)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Field id="field-latitude" label="Latitude" error={errors.latitude}>
                  <input
                    id="field-latitude"
                    type="text"
                    inputMode="decimal"
                    value={values.latitude}
                    onChange={(event) => update('latitude', event.target.value)}
                    aria-invalid={Boolean(errors.latitude)}
                    placeholder="22.5726"
                    className={inputClass(errors.latitude)}
                  />
                </Field>
                <Field id="field-longitude" label="Longitude" error={errors.longitude}>
                  <input
                    id="field-longitude"
                    type="text"
                    inputMode="decimal"
                    value={values.longitude}
                    onChange={(event) => update('longitude', event.target.value)}
                    aria-invalid={Boolean(errors.longitude)}
                    placeholder="88.3639"
                    className={inputClass(errors.longitude)}
                  />
                </Field>
              </div>
              {coordinatesLookOff ? (
                <p className="-mt-2 text-xs font-medium text-[#B8530A]">
                  These coordinates are outside the Kolkata area. Check that latitude and longitude are not
                  swapped.
                </p>
              ) : (
                <p className="-mt-2 text-xs text-[#6B645C]">
                  Optional. In Google Maps, right-click the pandal and click the coordinates to copy them. When
                  present, directions use them.
                </p>
              )}

              <Field
                id="field-googleMapsUrl"
                label="Google Maps link"
                error={errors.googleMapsUrl}
                hint="Optional. Used by the Open in Google Maps button."
              >
                <input
                  id="field-googleMapsUrl"
                  type="url"
                  value={values.googleMapsUrl}
                  onChange={(event) => update('googleMapsUrl', event.target.value)}
                  aria-invalid={Boolean(errors.googleMapsUrl)}
                  placeholder="https://maps.app.goo.gl/…"
                  className={inputClass(errors.googleMapsUrl)}
                />
              </Field>

              <Field
                id="field-description"
                label="Description and special attractions"
                hint={`${values.description.length}/1000 characters`}
              >
                <textarea
                  id="field-description"
                  rows={4}
                  maxLength={1000}
                  value={values.description}
                  onChange={(event) => update('description', event.target.value)}
                  placeholder="Theme, idol style, lighting, nearby food stalls, best time to visit"
                  className={`${inputClass(false)} resize-y`}
                />
              </Field>
            </Section>

            <Section
              title="Images"
              description="JPEG, PNG or WebP up to 5 MB. Photos are resized and kept in this browser only; they are not uploaded anywhere."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageField
                  id="field-pandalImage"
                  label="Pandal photo"
                  hint="Tap or drop an image"
                  kind="pandal"
                  value={values.pandalImage}
                  busy={imageState.pandalImage.busy}
                  error={imageState.pandalImage.error}
                  onSelect={(file) => handleImage('pandalImage', file)}
                  onRemove={() => removeImage('pandalImage')}
                />
                <ImageField
                  id="field-idolImage"
                  label="Maa Durga idol photo"
                  hint="Tap or drop an image"
                  kind="idol"
                  value={values.idolImage}
                  busy={imageState.idolImage.busy}
                  error={imageState.idolImage.error}
                  onSelect={(file) => handleImage('idolImage', file)}
                  onRemove={() => removeImage('idolImage')}
                />
              </div>
            </Section>

            <Section title="Visit tracking">
              <div className="space-y-3">
                <Toggle
                  checked={values.visited}
                  onChange={setVisited}
                  label="I have visited this pandal"
                  description="Turns on the visit date."
                  icon={CheckCircle2}
                  activeClass="bg-[#E4F1E8] text-[#255B3C]"
                />
                {values.visited && (
                  <Field id="field-visitDate" label="Visit date" required error={errors.visitDate}>
                    <input
                      id="field-visitDate"
                      type="date"
                      max={todayISO()}
                      value={values.visitDate}
                      onChange={(event) => update('visitDate', event.target.value)}
                      aria-invalid={Boolean(errors.visitDate)}
                      className={`${inputClass(errors.visitDate)} sm:max-w-xs`}
                    />
                  </Field>
                )}
                <Toggle
                  checked={values.favourite}
                  onChange={(favourite) => update('favourite', favourite)}
                  label="Favourite"
                  description="Pin it to your favourites list."
                  icon={Heart}
                  activeClass="bg-[#FDEEEA] text-[#D9381E]"
                />
              </div>
            </Section>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-[#E6E0D2] bg-white px-4 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-7 sm:py-4">
            <button type="button" onClick={requestClose} disabled={saving} className={ui.secondaryBtn}>
              Cancel
            </button>
            <button type="submit" disabled={saving || imagesBusy} className={ui.primaryBtn}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add pandal'}
            </button>
          </footer>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        tone="warning"
        title="Discard your changes?"
        message="You have unsaved changes. If you close now, they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={onClose}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}

/**
 * Props
 *   isOpen          boolean   Show or hide the drawer.
 *   pandal          object?   Record to edit. Omit or pass null to create a new one.
 *   existingPandals array     Used for duplicate checks and metro suggestions.
 *   onSave(data)    function  Receives validated form data (no id). May return a Promise.
 *                             The form closes itself after onSave resolves.
 *   onClose()       function  Called when the form should be hidden.
 */
export default function PandalForm({ isOpen, pandal = null, existingPandals = [], onSave, onClose }) {
  if (!isOpen) return null;
  return (
    <FormPanel
      key={pandal?.id ?? 'new'}
      pandal={pandal}
      existingPandals={existingPandals}
      onSave={onSave}
      onClose={onClose}
    />
  );
}