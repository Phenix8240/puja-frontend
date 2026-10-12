/**
 * SearchFilters.jsx
 *
 * Controlled search + filter bar. All filters are combined (AND) by `applyFilters`,
 * which is also what App.jsx uses to compute the visible list, so the logic lives in
 * exactly one place.
 *
 * Also exports: DEFAULT_FILTERS, SORT_OPTIONS, applyFilters, getMetroOptions,
 * groupPandals, countActiveFilters and the <NoResults /> state.
 *
 * Mobile: the search box and selects use 16px text below `sm` so iOS Safari does not zoom
 * the page when they are focused.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Heart, Search, SearchX, SlidersHorizontal, Train, X } from 'lucide-react';
import { REGIONS, REGION_STYLES, ui } from './Pandalform';

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

export const DEFAULT_FILTERS = {
    query: '',
    regions: [], // empty array = all regions
    metro: 'all', // 'all' or a station name
    status: 'all', // 'all' | 'visited' | 'notVisited'
    favouritesOnly: false,
    sortBy: 'name', // 'name' | 'region' | 'metro' | 'status'
};

export const SORT_OPTIONS = [
    { value: 'name', label: 'Club name' },
    { value: 'region', label: 'Region' },
    { value: 'metro', label: 'Metro station' },
    { value: 'status', label: 'Visit status' },
];

const byName = (a, b) => a.clubName.localeCompare(b.clubName, 'en', { sensitivity: 'base' });

const COMPARATORS = {
    name: byName,
    region: (a, b) => REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region) || byName(a, b),
    metro: (a, b) => {
        if (!a.nearestMetro && b.nearestMetro) return 1; // pandals without a station go last
        if (a.nearestMetro && !b.nearestMetro) return -1;
        return a.nearestMetro.localeCompare(b.nearestMetro, 'en', { sensitivity: 'base' }) || byName(a, b);
    },
    status: (a, b) => Number(a.visited) - Number(b.visited) || byName(a, b), // not visited first
};

/** Apply search, every filter, and sorting together. Never mutates the input. */
export function applyFilters(pandals, filters = DEFAULT_FILTERS) {
    const f = { ...DEFAULT_FILTERS, ...filters };
    const tokens = f.query.toLowerCase().split(/\s+/).filter(Boolean);

    const matches = pandals.filter((pandal) => {
        if (tokens.length) {
            const haystack = [pandal.clubName, pandal.address, pandal.locality, pandal.nearestMetro]
                .join(' ')
                .toLowerCase();
            if (!tokens.every((token) => haystack.includes(token))) return false;
        }
        if (f.regions.length && !f.regions.includes(pandal.region)) return false;
        if (f.metro !== 'all' && pandal.nearestMetro !== f.metro) return false;
        if (f.status === 'visited' && !pandal.visited) return false;
        if (f.status === 'notVisited' && pandal.visited) return false;
        if (f.favouritesOnly && !pandal.favourite) return false;
        return true;
    });

    return matches.sort(COMPARATORS[f.sortBy] || COMPARATORS.name);
}

/** Unique metro stations with how many pandals list each one. */
export function getMetroOptions(pandals) {
    const counts = new Map();
    pandals.forEach((pandal) => {
        if (pandal.nearestMetro) counts.set(pandal.nearestMetro, (counts.get(pandal.nearestMetro) || 0) + 1);
    });
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
    );
}

/**
 * Group an already-filtered list for the Explore views.
 * Returns [{ key, label, items }] with empty groups removed.
 */
export function groupPandals(pandals, mode) {
    if (mode === 'region') {
        return REGIONS.map((region) => ({
            key: region,
            label: region,
            items: pandals.filter((pandal) => pandal.region === region),
        })).filter((group) => group.items.length);
    }
    if (mode === 'metro') {
        const map = new Map();
        pandals.forEach((pandal) => {
            const key = pandal.nearestMetro || '';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(pandal);
        });
        return Array.from(map, ([key, items]) => ({
            key: key || '__none',
            label: key || 'No metro station listed',
            items,
        })).sort((a, b) => {
            if (a.key === '__none') return 1;
            if (b.key === '__none') return -1;
            return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
        });
    }
    return [{ key: 'all', label: '', items: pandals }];
}

/** Number of filters currently narrowing the list (search counts as one). */
export function countActiveFilters(filters, locked = []) {
    const f = { ...DEFAULT_FILTERS, ...filters };
    let count = 0;
    if (f.query.trim()) count += 1;
    if (f.regions.length) count += 1;
    if (f.metro !== 'all') count += 1;
    if (f.status !== 'all' && !locked.includes('status')) count += 1;
    if (f.favouritesOnly && !locked.includes('favouritesOnly')) count += 1;
    return count;
}

/* ------------------------------------------------------------------ */
/* No-results state                                                    */
/* ------------------------------------------------------------------ */

export function NoResults({ onClear }) {
    return (
        <div className={`${ui.card} flex flex-col items-center px-5 py-12 text-center sm:px-6 sm:py-14`}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E7ECF5] text-[#16325C]">
                <SearchX className="h-7 w-7" strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 font-serif text-xl font-semibold text-[#2A2622]">No pandals match these filters</h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#6B645C]">
                Try removing a filter, or search by locality or metro station instead of the club name.
            </p>
            {onClear && (
                <button type="button" onClick={onClear} className={`${ui.secondaryBtn} mt-5`}>
                    Clear all filters
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16325C]';

/**
 * Props
 *   filters         object    Current filter state (see DEFAULT_FILTERS).
 *   onChange(next)  function  Receives the complete next filters object.
 *   pandals         array     The full, unfiltered list (used for metro options and counts).
 *   resultCount     number    How many pandals the current filters produce.
 *   lockedFilters   string[]  Controls to hide because the current view fixes them,
 *                             e.g. ['status'] on the Visited view.
 *   searchDelay     number    Debounce for typing, in milliseconds (default 250).
 */
export default function SearchFilters({
    filters,
    onChange,
    pandals,
    resultCount,
    lockedFilters = [],
    searchDelay = 250,
}) {
    const f = { ...DEFAULT_FILTERS, ...filters };
    const [draft, setDraft] = useState(f.query);
    const [panelOpen, setPanelOpen] = useState(false);
    const committedQuery = useRef(f.query);
    const latest = useRef({ filters: f, onChange });
    latest.current = { filters: f, onChange };

    const metroOptions = useMemo(() => getMetroOptions(pandals), [pandals]);
    const regionCounts = useMemo(
        () => Object.fromEntries(REGIONS.map((region) => [region, pandals.filter((p) => p.region === region).length])),
        [pandals],
    );

    // Debounce typing into the shared filter state.
    useEffect(() => {
        if (draft === committedQuery.current) return undefined;
        const timer = setTimeout(() => {
            committedQuery.current = draft;
            latest.current.onChange({ ...latest.current.filters, query: draft });
        }, searchDelay);
        return () => clearTimeout(timer);
    }, [draft, searchDelay]);

    // Follow changes made elsewhere (for example, Clear all or switching views).
    useEffect(() => {
        if (f.query !== committedQuery.current) {
            committedQuery.current = f.query;
            setDraft(f.query);
        }
    }, [f.query]);

    const activeCount = countActiveFilters(f, lockedFilters);
    const set = (patch) => onChange({ ...f, ...patch });

    const toggleRegion = (region) =>
        set({ regions: f.regions.includes(region) ? f.regions.filter((r) => r !== region) : [...f.regions, region] });

    const clearAll = () => {
        committedQuery.current = '';
        setDraft('');
        onChange({ ...DEFAULT_FILTERS, sortBy: f.sortBy });
    };

    const metroKnown = f.metro === 'all' || metroOptions.some((option) => option.name === f.metro);

    return (
        <section aria-label="Search and filters" className="space-y-3">
            {/* Search row */}
            <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#16325C]/60" />
                    <input
                        type="search"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Search club, locality, address or metro"
                        aria-label="Search pandals"
                        className="h-12 w-full touch-manipulation rounded-2xl border border-[#D9D4C6] bg-white pl-12 pr-11 text-base text-[#2A2622] shadow-sm transition-colors placeholder:text-[#A39B8D] hover:border-[#B9C4DA] focus:border-[#16325C] focus:outline-none focus:ring-2 focus:ring-[#16325C]/20 sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
                    />
                    {draft && (
                        <button
                            type="button"
                            onClick={() => setDraft('')}
                            aria-label="Clear search"
                            className={`absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 touch-manipulation items-center justify-center rounded-lg text-[#6B645C] transition-colors hover:bg-[#EEF1F7] hover:text-[#16325C] ${ring}`}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2.5">
                    <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
                        <ArrowUpDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B645C]" />
                        <select
                            value={f.sortBy}
                            onChange={(event) => set({ sortBy: event.target.value })}
                            aria-label="Sort pandals by"
                            className={`${ui.select} h-12`}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    Sort: {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => setPanelOpen((open) => !open)}
                        aria-expanded={panelOpen}
                        aria-controls="filter-panel"
                        className={`${ui.secondaryBtn} relative h-12 shrink-0 md:hidden`}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                        {activeCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5822A] px-1.5 text-xs font-bold text-[#0F2547]">
                                {activeCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter panel */}
            <div
                id="filter-panel"
                className={`${panelOpen ? 'flex' : 'hidden'} flex-col gap-5 rounded-2xl border border-[#E6E0D2] bg-white p-4 shadow-sm md:flex`}
            >
                <div>
                    <p className="mb-2 text-sm font-medium text-[#2A2622]">Region</p>
                    <div className="flex flex-wrap gap-2">
                        {REGIONS.map((region) => {
                            const selected = f.regions.includes(region);
                            return (
                                <button
                                    key={region}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => toggleRegion(region)}
                                    className={`inline-flex min-h-10 touch-manipulation items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${ring} ${selected
                                            ? 'border-[#16325C] bg-[#16325C] text-white'
                                            : 'border-[#D9D4C6] bg-white text-[#4A443D] hover:border-[#B9C4DA] hover:bg-[#F7F9FC]'
                                        }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${selected ? 'bg-white/90' : REGION_STYLES[region].bar}`} />
                                    {region}
                                    <span className={`text-xs ${selected ? 'text-white/70' : 'text-[#6B645C]'}`}>
                                        {regionCounts[region]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                    <div>
                        <label htmlFor="metro-filter" className="mb-2 block text-sm font-medium text-[#2A2622]">
                            Metro station
                        </label>
                        <div className="relative">
                            <Train className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B645C]" />
                            <select
                                id="metro-filter"
                                value={f.metro}
                                onChange={(event) => set({ metro: event.target.value })}
                                className={`${ui.select} h-11`}
                            >
                                <option value="all">All stations</option>
                                {!metroKnown && <option value={f.metro}>{f.metro}</option>}
                                {metroOptions.map((option) => (
                                    <option key={option.name} value={option.name}>
                                        {option.name} ({option.count})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!lockedFilters.includes('status') && (
                        <div>
                            <p id="status-label" className="mb-2 text-sm font-medium text-[#2A2622]">
                                Visit status
                            </p>
                            <div
                                role="radiogroup"
                                aria-labelledby="status-label"
                                className="flex w-full rounded-xl border border-[#D9D4C6] bg-[#F4F2EC] p-1 sm:inline-flex sm:w-auto"
                            >
                                {[
                                    ['all', 'All'],
                                    ['notVisited', 'Not visited'],
                                    ['visited', 'Visited'],
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={f.status === value}
                                        onClick={() => set({ status: value })}
                                        className={`min-h-9 flex-1 touch-manipulation whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${ring} ${f.status === value ? 'bg-white text-[#16325C] shadow-sm' : 'text-[#6B645C] hover:text-[#2A2622]'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!lockedFilters.includes('favouritesOnly') && (
                        <button
                            type="button"
                            aria-pressed={f.favouritesOnly}
                            onClick={() => set({ favouritesOnly: !f.favouritesOnly })}
                            className={`inline-flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors sm:col-span-2 lg:col-span-1 lg:w-auto ${ring} ${f.favouritesOnly
                                    ? 'border-[#D9381E] bg-[#FDEEEA] text-[#B82D16]'
                                    : 'border-[#D9D4C6] bg-white text-[#4A443D] hover:border-[#B9C4DA]'
                                }`}
                        >
                            <Heart className={`h-4 w-4 ${f.favouritesOnly ? 'fill-current' : ''}`} />
                            Favourites only
                        </button>
                    )}
                </div>
            </div>

            {/* Result count */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
                <p aria-live="polite" className="text-sm text-[#6B645C]">
                    {resultCount === 0
                        ? 'No pandals found'
                        : `Showing ${resultCount} of ${pandals.length} ${pandals.length === 1 ? 'pandal' : 'pandals'}`}
                    {activeCount > 0 && ` with ${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} applied`}
                </p>
                {activeCount > 0 && (
                    <button
                        type="button"
                        onClick={clearAll}
                        className="inline-flex min-h-9 touch-manipulation items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold text-[#B8530A] transition-colors hover:bg-[#FFF1E4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5822A]"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear all filters
                    </button>
                )}
            </div>
        </section>
    );
}