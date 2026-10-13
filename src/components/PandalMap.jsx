/**
 * PandalMap.jsx
 *
 * Plan a pandal-hopping route. Choose a metro station, an area (locality) or a region,
 * see those clubs as numbered pins on a MapLibre map (OpenFreeMap "Liberty" style, no API key),
 * untick any you want to skip, then open the whole route in Google Maps.
 *
 * Setup: npm install maplibre-gl
 *
 * Only clubs that have latitude and longitude are pinned. Clubs with just an address still
 * appear in the list and in the route (Google Maps searches the address).
 *
 * Keep the map attribution visible: OpenFreeMap's terms ask for it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    AlertTriangle,
    Bike,
    Car,
    Compass,
    ExternalLink,
    Footprints,
    Loader2,
    MapPin,
    MapPinned,
    Navigation,
    Train,
} from 'lucide-react';
import { REGIONS, StatusBadge, getDirectionsUrl, hasCoordinates, ui } from './Pandalform.jsx';

// Vite worker setup (required once, before the first map is created).
setWorkerUrl(workerUrl);

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const KOLKATA = [88.3639, 22.5726]; // [longitude, latitude]
const MAX_STOPS = 10; // a Google Maps route link: origin + destination + up to 8 waypoints

const GROUPINGS = [
    { id: 'metro', label: 'Metro station', icon: Train, pick: (p) => p.nearestMetro },
    { id: 'area', label: 'Area', icon: MapPin, pick: (p) => p.locality },
    { id: 'region', label: 'Region', icon: Compass, pick: (p) => p.region },
];

const TRAVEL_MODES = [
    { id: 'walking', label: 'Walk', icon: Footprints },
    { id: 'driving', label: 'Drive', icon: Car },
    { id: 'bicycling', label: 'Cycle', icon: Bike },
];

const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16325C]';
const byName = (a, b) => a.clubName.localeCompare(b.clubName, 'en', { sensitivity: 'base' });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function stopQuery(pandal) {
    if (hasCoordinates(pandal)) return `${pandal.latitude},${pandal.longitude}`;
    const base = pandal.address?.trim() || [pandal.clubName, pandal.locality].filter(Boolean).join(', ');
    return /kolkata/i.test(base) ? base : `${base}, Kolkata`;
}

/** Nearest-neighbour order for pinned clubs (starting in the north), unpinned clubs last. */
function orderStops(list) {
    const pinned = list.filter(hasCoordinates);
    const unpinned = list.filter((p) => !hasCoordinates(p)).sort(byName);
    if (!pinned.length) return unpinned;

    const dist = (a, b) => {
        const dx = (a.longitude - b.longitude) * 0.924; // degrees of longitude are shorter than latitude at Kolkata
        const dy = a.latitude - b.latitude;
        return dx * dx + dy * dy;
    };

    const remaining = [...pinned];
    let current = remaining.reduce((best, p) => (p.latitude > best.latitude ? p : best), remaining[0]);
    remaining.splice(remaining.indexOf(current), 1);
    const ordered = [current];
    while (remaining.length) {
        let nearest = 0;
        for (let i = 1; i < remaining.length; i += 1) {
            if (dist(current, remaining[i]) < dist(current, remaining[nearest])) nearest = i;
        }
        current = remaining.splice(nearest, 1)[0];
        ordered.push(current);
    }
    return [...ordered, ...unpinned];
}

function buildRouteUrl(stops, travelMode, startAtFirst) {
    if (!stops.length) return null;
    const params = new URLSearchParams({ api: '1', travelmode: travelMode });
    const queries = stops.map(stopQuery);

    if (startAtFirst && queries.length > 1) {
        params.set('origin', queries[0]);
        params.set('destination', queries[queries.length - 1]);
        const middle = queries.slice(1, -1);
        if (middle.length) params.set('waypoints', middle.join('|'));
    } else {
        // No origin: Google Maps starts from the person's current location.
        params.set('destination', queries[queries.length - 1]);
        const waypoints = queries.slice(0, -1);
        if (waypoints.length) params.set('waypoints', waypoints.join('|'));
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Popup content built with DOM nodes (no innerHTML, so club names can never inject markup). */
function buildInfo(pandal, onOpenDetails) {
    const root = document.createElement('div');
    root.style.cssText = 'max-width:230px;font-family:system-ui,sans-serif;padding:2px 4px 2px 0';

    const title = document.createElement('strong');
    title.textContent = pandal.clubName;
    title.style.cssText = 'display:block;color:#2A2622;font-size:14px;line-height:1.3';
    root.appendChild(title);

    const meta = [pandal.locality, pandal.nearestMetro && `${pandal.nearestMetro} metro`].filter(Boolean).join(' · ');
    if (meta) {
        const line = document.createElement('div');
        line.textContent = meta;
        line.style.cssText = 'margin-top:2px;color:#6B645C;font-size:12px';
        root.appendChild(line);
    }

    const actions = document.createElement('div');
    actions.style.cssText = 'margin-top:8px;display:flex;gap:12px;font-size:12px;font-weight:600';

    const directions = document.createElement('a');
    directions.href = getDirectionsUrl(pandal);
    directions.target = '_blank';
    directions.rel = 'noopener noreferrer';
    directions.textContent = 'Directions';
    directions.style.cssText = 'color:#B8530A;text-decoration:none';
    actions.appendChild(directions);

    const details = document.createElement('button');
    details.type = 'button';
    details.textContent = 'Details';
    details.style.cssText = 'color:#16325C;background:none;border:0;padding:0;cursor:pointer;font:inherit';
    details.addEventListener('click', () => onOpenDetails(pandal.id));
    actions.appendChild(details);

    root.appendChild(actions);
    return root;
}

/** Numbered round pin. Green when visited, orange when not. */
function buildPin(pandal, number) {
    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', `${number}. ${pandal.clubName}`);
    el.textContent = String(number);
    el.className = pandal.visited
        ? 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#2E7D4F] text-xs font-bold text-white shadow-lg'
        : 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#F5822A] text-xs font-bold text-[#0F2547] shadow-lg';
    return el;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Props
 *   pandals            array     The full collection.
 *   isLoading          boolean   Shows a placeholder while data loads.
 *   onSelectPandal(id) function  Opens the details page.
 */
export default function PandalMap({ pandals, isLoading = false, onSelectPandal }) {
    const [groupBy, setGroupBy] = useState('metro');
    const [value, setValue] = useState('');
    const [onlyNotVisited, setOnlyNotVisited] = useState(false);
    const [travelMode, setTravelMode] = useState('walking');
    const [startAtFirst, setStartAtFirst] = useState(false);
    const [excluded, setExcluded] = useState(() => new Set());
    const [mapState, setMapState] = useState('loading'); // loading | ready | error

    const mapEl = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]); // [{ id, marker, popup }]
    const selectRef = useRef(onSelectPandal);
    selectRef.current = onSelectPandal;

    const grouping = GROUPINGS.find((g) => g.id === groupBy);

    // Options for the second dropdown, with how many clubs each has.
    const options = useMemo(() => {
        const counts = new Map();
        pandals.forEach((pandal) => {
            const key = grouping.pick(pandal);
            if (key) counts.set(key, (counts.get(key) || 0) + 1);
        });
        const list = Array.from(counts, ([name, count]) => ({ name, count }));
        if (groupBy === 'region') {
            return list.sort((a, b) => REGIONS.indexOf(a.name) - REGIONS.indexOf(b.name));
        }
        return list.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    }, [pandals, grouping, groupBy]);

    const activeValue = options.some((option) => option.name === value) ? value : options[0]?.name ?? '';

    const ordered = useMemo(() => {
        const matches = pandals.filter(
            (pandal) => grouping.pick(pandal) === activeValue && (!onlyNotVisited || !pandal.visited),
        );
        return orderStops(matches);
    }, [pandals, grouping, activeValue, onlyNotVisited]);

    const included = useMemo(() => ordered.filter((p) => !excluded.has(p.id)), [ordered, excluded]);
    const routeStops = included.slice(0, MAX_STOPS);
    const routeUrl = buildRouteUrl(routeStops, travelMode, startAtFirst);

    const numberById = useMemo(() => new Map(included.map((p, index) => [p.id, index + 1])), [included]);
    const plotted = useMemo(
        () => included.filter(hasCoordinates).map((pandal) => ({ pandal, number: numberById.get(pandal.id) })),
        [included, numberById],
    );
    const unpinnedCount = included.length - plotted.length;

    const changeGroup = (next) => {
        setGroupBy(next);
        setValue('');
        setExcluded(new Set());
    };
    const changeValue = (next) => {
        setValue(next);
        setExcluded(new Set());
    };
    const toggleStop = (id) =>
        setExcluded((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    /* ---- Create the map once ---- */
    useEffect(() => {
        if (!mapEl.current) return undefined;
        setMapState('loading');
        let loaded = false;

        const map = new MapLibreMap({
            container: mapEl.current,
            style: MAP_STYLE,
            center: KOLKATA,
            zoom: 11.5,
            cooperativeGestures: true, // Ctrl/two-finger to zoom, so the page can still scroll
        });
        map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
        map.on('load', () => {
            loaded = true;
            setMapState('ready');
        });
        map.on('error', () => {
            if (!loaded) setMapState('error'); // ignore single failed tiles after the map is up
        });
        mapRef.current = map;

        return () => {
            markersRef.current.forEach(({ marker }) => marker.remove());
            markersRef.current = [];
            map.remove();
            mapRef.current = null;
        };
    }, []);

    /* ---- Draw the pins whenever the selection changes ---- */
    useEffect(() => {
        const map = mapRef.current;
        if (mapState !== 'ready' || !map) return;

        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];

        const bounds = new LngLatBounds();

        plotted.forEach(({ pandal, number }) => {
            const lngLat = [pandal.longitude, pandal.latitude];

            const popup = new Popup({ offset: 20, maxWidth: '260px' }).setDOMContent(
                buildInfo(pandal, (id) => selectRef.current?.(id)),
            );
            // Only one popup open at a time.
            popup.on('open', () => {
                markersRef.current.forEach((item) => {
                    if (item.popup !== popup && item.popup.isOpen()) item.popup.remove();
                });
            });

            const marker = new Marker({ element: buildPin(pandal, number) })
                .setLngLat(lngLat)
                .setPopup(popup)
                .addTo(map);

            markersRef.current.push({ id: pandal.id, marker, popup });
            bounds.extend(lngLat);
        });

        if (plotted.length === 0) {
            map.flyTo({ center: KOLKATA, zoom: 11.5 });
        } else {
            map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 600 });
        }
    }, [mapState, plotted]);

    const focusOnMap = useCallback((id) => {
        const map = mapRef.current;
        const entry = markersRef.current.find((item) => item.id === id);
        if (!map || !entry) return;
        map.flyTo({ center: entry.marker.getLngLat(), zoom: 17 });
        if (!entry.popup.isOpen()) entry.marker.togglePopup();
        mapEl.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, []);

    const selectClass = `${ui.select} h-11`;

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-serif text-3xl font-semibold">Route map</h1>
                <p className="mt-1 text-[#6B645C]">
                    Pick a metro station, an area or a region and walk the whole pandal trail in one route.
                </p>
            </header>

            <div className="grid gap-4 sm:gap-5 lg:grid-cols-5">
                {/* Controls */}
                <section className={`${ui.card} space-y-4 p-4 sm:p-5 lg:col-span-2`} aria-label="Route options">
                    <div>
                        <p id="group-label" className="mb-2 text-sm font-medium text-[#2A2622]">
                            Group clubs by
                        </p>
                        <div
                            role="radiogroup"
                            aria-labelledby="group-label"
                            className="grid grid-cols-3 gap-1 rounded-xl border border-[#D9D4C6] bg-[#F4F2EC] p-1"
                        >
                            {GROUPINGS.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="radio"
                                    aria-checked={groupBy === id}
                                    onClick={() => changeGroup(id)}
                                    className={`flex min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors sm:text-sm ${ring} ${
                                        groupBy === id ? 'bg-white text-[#16325C] shadow-sm' : 'text-[#6B645C] hover:text-[#2A2622]'
                                    }`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="map-value" className="mb-2 block text-sm font-medium text-[#2A2622]">
                            {grouping.label}
                        </label>
                        <select
                            id="map-value"
                            value={activeValue}
                            onChange={(event) => changeValue(event.target.value)}
                            disabled={!options.length}
                            className={selectClass}
                        >
                            {!options.length && <option value="">Nothing to choose yet</option>}
                            {options.map((option) => (
                                <option key={option.name} value={option.name}>
                                    {option.name} ({option.count})
                                </option>
                            ))}
                        </select>
                    </div>

                    <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-[#2A2622]">
                        <input
                            type="checkbox"
                            checked={onlyNotVisited}
                            onChange={(event) => {
                                setOnlyNotVisited(event.target.checked);
                                setExcluded(new Set());
                            }}
                            className="h-4 w-4 rounded border-[#D9D4C6] accent-[#F5822A]"
                        />
                        Only pandals I have not visited
                    </label>

                    <div>
                        <p id="mode-label" className="mb-2 text-sm font-medium text-[#2A2622]">
                            Travel by
                        </p>
                        <div role="radiogroup" aria-labelledby="mode-label" className="grid grid-cols-3 gap-2">
                            {TRAVEL_MODES.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="radio"
                                    aria-checked={travelMode === id}
                                    onClick={() => setTravelMode(id)}
                                    className={`inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${ring} ${
                                        travelMode === id
                                            ? 'border-[#F5822A] bg-[#FFF1E4] text-[#A84A07]'
                                            : 'border-[#D9D4C6] bg-white text-[#4A443D] hover:border-[#B9C4DA]'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex min-h-10 cursor-pointer items-start gap-3 text-sm text-[#2A2622]">
                        <input
                            type="checkbox"
                            checked={startAtFirst}
                            onChange={(event) => setStartAtFirst(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-[#D9D4C6] accent-[#F5822A]"
                        />
                        <span>
                            Start at stop 1
                            <span className="block text-xs text-[#6B645C]">Otherwise the route starts from your current location.</span>
                        </span>
                    </label>

                    {routeUrl ? (
                        <a href={routeUrl} target="_blank" rel="noopener noreferrer" className={`${ui.primaryBtn} w-full`}>
                            <Navigation className="h-4 w-4" />
                            Start route in Google Maps
                            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                            <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                    ) : (
                        <button type="button" disabled className={`${ui.primaryBtn} w-full`}>
                            <Navigation className="h-4 w-4" />
                            Start route in Google Maps
                        </button>
                    )}

                    {included.length > MAX_STOPS && (
                        <p className="flex items-start gap-2 rounded-lg bg-[#F7EFD9] px-3 py-2 text-xs text-[#6F5516]">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            A Google Maps route holds up to {MAX_STOPS} stops. The first {MAX_STOPS} in the order below are used.
                            Untick some clubs to change which ones.
                        </p>
                    )}
                </section>

                {/* Map */}
                <section
                    className={`${ui.card} relative h-[22rem] overflow-hidden sm:h-[28rem] lg:col-span-3 lg:row-span-2 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] lg:self-start`}
                    aria-label="Map of selected pandals"
                >
                    <div ref={mapEl} className="h-full w-full" />

                    {mapState === 'loading' && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#F7F9FC]">
                            <Loader2 className="h-6 w-6 animate-spin text-[#F5822A]" />
                        </div>
                    )}

                    {mapState === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#F7F9FC] px-6 text-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E7ECF5] text-[#16325C]">
                                <MapPinned className="h-7 w-7" strokeWidth={1.5} />
                            </span>
                            <h2 className="font-serif text-xl font-semibold text-[#2A2622]">The map could not load</h2>
                            <p className="max-w-sm text-sm leading-relaxed text-[#6B645C]">
                                Check your internet connection and try again. The list and the route button still work.
                            </p>
                        </div>
                    )}

                    {mapState === 'ready' && !isLoading && included.length > 0 && plotted.length === 0 && (
                        <p className="pointer-events-none absolute inset-x-4 top-4 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-[#6B645C] shadow">
                            These clubs have no coordinates yet, so no pins. Add latitude and longitude when you edit them.
                        </p>
                    )}
                </section>

                {/* Stops */}
                <section className={`${ui.card} p-4 sm:p-5 lg:col-span-2`} aria-labelledby="stops-title">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 id="stops-title" className="font-serif text-xl font-semibold text-[#2A2622]">
                            Stops
                        </h2>
                        <p className="text-sm text-[#6B645C]">
                            {isLoading
                                ? 'Loading…'
                                : `${included.length} selected${plotted.length !== included.length ? `, ${plotted.length} on the map` : ''}`}
                        </p>
                    </div>

                    {ordered.length > 0 && (
                        <div className="mt-1 flex gap-1">
                            <button
                                type="button"
                                onClick={() => setExcluded(new Set())}
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#B8530A] hover:bg-[#FFF1E4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5822A]"
                            >
                                Select all
                            </button>
                            <button
                                type="button"
                                onClick={() => setExcluded(new Set(ordered.map((p) => p.id)))}
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#6B645C] hover:bg-[#F4F2EC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16325C]"
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="mt-4 h-24 animate-pulse rounded-xl bg-[#F1EEE6] motion-reduce:animate-none" />
                    ) : ordered.length === 0 ? (
                        <div className="mt-4 rounded-xl bg-[#F7F9FC] p-4 text-sm text-[#6B645C]">
                            {options.length
                                ? 'No pandals match these choices. Try turning off "Only pandals I have not visited".'
                                : 'Add pandals with a metro station, locality or region to plan a route.'}
                        </div>
                    ) : (
                        <ol className="mt-2 max-h-[26rem] divide-y divide-[#F0EADB] overflow-y-auto overscroll-contain pr-1">
                            {ordered.map((pandal) => {
                                const isIncluded = !excluded.has(pandal.id);
                                const number = numberById.get(pandal.id);
                                const pinned = hasCoordinates(pandal);
                                const inRoute = isIncluded && number <= MAX_STOPS;
                                return (
                                    <li key={pandal.id} className="flex items-center gap-3 py-3">
                                        <input
                                            type="checkbox"
                                            checked={isIncluded}
                                            onChange={() => toggleStop(pandal.id)}
                                            aria-label={`Include ${pandal.clubName} in the route`}
                                            className="h-4 w-4 shrink-0 rounded border-[#D9D4C6] accent-[#F5822A]"
                                        />
                                        <span
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                inRoute ? 'bg-[#F5822A] text-[#0F2547]' : 'bg-[#ECEAE6] text-[#8A8276]'
                                            }`}
                                            aria-hidden="true"
                                        >
                                            {isIncluded ? number : '–'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onSelectPandal?.(pandal.id)}
                                            className={`min-w-0 flex-1 touch-manipulation rounded-lg text-left ${ring} ${isIncluded ? '' : 'opacity-50'}`}
                                        >
                                            <span className="block truncate text-sm font-semibold text-[#2A2622]">{pandal.clubName}</span>
                                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B645C]">
                                                <span className="truncate">
                                                    {[pandal.locality, pandal.nearestMetro && `${pandal.nearestMetro} metro`]
                                                        .filter(Boolean)
                                                        .join(' · ') || pandal.region}
                                                </span>
                                                <StatusBadge visited={pandal.visited} />
                                                {!pinned && <span title="Add latitude and longitude to show this club on the map">No pin</span>}
                                            </span>
                                        </button>
                                        {pinned && isIncluded && mapState === 'ready' && (
                                            <button
                                                type="button"
                                                onClick={() => focusOnMap(pandal.id)}
                                                aria-label={`Show ${pandal.clubName} on the map`}
                                                title="Show on map"
                                                className={ui.iconBtn}
                                            >
                                                <MapPin className="h-4 w-4" />
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    )}

                    {unpinnedCount > 0 && (
                        <p className="mt-3 text-xs text-[#6B645C]">
                            {unpinnedCount} {unpinnedCount === 1 ? 'club has' : 'clubs have'} no coordinates. They are still in the route
                            (Google Maps searches their address) but not pinned here.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}