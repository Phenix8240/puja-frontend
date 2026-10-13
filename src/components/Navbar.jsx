/**
 * Navbar.jsx
 *
 * Top navigation for Pujor Pothe (পুজোর পথে). Full-width bar.
 *   Desktop (lg+)      [Brand → Home] | right half starts at screen centre:
 *                      Home · Pandals ▾ · Explore ▾ · [Search] [Add Pandal]
 *   Phones / tablets   [Brand → Home]  ·····  [Search] [+] [Menu]  (grouped list in a dropdown panel)
 *
 * Search: the search icon (or Ctrl/Cmd + K) opens a panel under the bar with live results.
 * Clicking a result opens that pandal; Enter / "See all" goes to All pandals with the query applied.
 *
 * Also exports APP_NAME, APP_TAGLINE, VIEW_CONFIG, VIEW_PATHS and getLockedFilterKeys,
 * which App.jsx uses so the navbar, routes and list views always agree.
 *
 * Bengali font: add this once to index.html.
 *   <link rel="preconnect" href="https://fonts.googleapis.com" />
 *   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 *   <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@500;600;700&display=swap" rel="stylesheet" />
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    ChevronDown,
    Compass,
    Footprints,
    Heart,
    Home,
    Landmark,
    Menu,
    Plus,
    Search,
    Train,
    X,
} from 'lucide-react';
import logoUrl from '../assets/logo.png';
import { applyFilters } from './SearchFilters';

export const APP_NAME = 'পুজোর পথে';
export const APP_TAGLINE = 'Your Durga Puja pandal planner';

/** View key -> URL path. Dashboard's onNavigate(viewKey) uses this. "dashboard" is the one home page. */
export const VIEW_PATHS = {
    dashboard: '/',
    all: '/pandals',
    notVisited: '/not-visited',
    visited: '/visited',
    favourites: '/favourites',
    regions: '/regions',
    metros: '/metros',
};

/**
 * `locked` are filter values fixed by the view (merged over the user's filters).
 * `groupBy` tells PandalList how to arrange the results.
 */
export const VIEW_CONFIG = {
    all: {
        path: VIEW_PATHS.all,
        title: 'All pandals',
        subtitle: 'Every puja club you are tracking.',
        locked: {},
        groupBy: 'none',
    },
    notVisited: {
        path: VIEW_PATHS.notVisited,
        title: 'Not visited',
        subtitle: 'Pandals still on your list.',
        locked: { status: 'notVisited' },
        groupBy: 'none',
    },
    visited: {
        path: VIEW_PATHS.visited,
        title: 'Visited',
        subtitle: 'Pandals you have already seen.',
        locked: { status: 'visited' },
        groupBy: 'none',
    },
    favourites: {
        path: VIEW_PATHS.favourites,
        title: 'Favourites',
        subtitle: 'The pandals you want to remember.',
        locked: { favouritesOnly: true },
        groupBy: 'none',
    },
    regions: {
        path: VIEW_PATHS.regions,
        title: 'Explore by region',
        subtitle: 'North, South, East and West Kolkata, side by side.',
        locked: {},
        groupBy: 'region',
    },
    metros: {
        path: VIEW_PATHS.metros,
        title: 'Explore by metro',
        subtitle: 'Pandals grouped by their nearest metro station, handy for planning a route.',
        locked: {},
        groupBy: 'metro',
    },
};

export const getLockedFilterKeys = (viewId) => Object.keys(VIEW_CONFIG[viewId]?.locked ?? {});

/* ------------------------------------------------------------------ */
/* Navigation structure                                                */
/* ------------------------------------------------------------------ */

const PANDAL_ITEMS = [
    { to: VIEW_PATHS.all, label: 'All Pandals', hint: 'Every club on your list', icon: Landmark, count: 'total' },
    { to: VIEW_PATHS.notVisited, label: 'Not Visited', hint: 'Still left to see', icon: Footprints, count: 'notVisited' },
    { to: VIEW_PATHS.visited, label: 'Visited', hint: 'Already on your trail', icon: CheckCircle2, count: 'visited' },
    { to: VIEW_PATHS.favourites, label: 'Favourites', hint: 'The ones you love', icon: Heart, count: 'favourites' },
];

const EXPLORE_ITEMS = [
    { to: VIEW_PATHS.regions, label: 'By Region', hint: 'North, South, East and West', icon: Compass, count: 'regions' },
    { to: VIEW_PATHS.metros, label: 'By Metro', hint: 'Plan a route by station', icon: Train, count: 'metros' },
];

/*
 * Palette
 *   navy #16325C   deep navy #0F2547   orange #F5822A   dark orange #B8530A
 *   mist #C5D0E6   slate #8C9BB8       ink #2A2622       muted #6B645C
 */
const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5822A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16325C]';

const brandFont = "font-['Noto_Serif_Bengali','Hind_Siliguri',serif] font-semibold leading-snug";

const iconBtn = `inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#C5D0E6] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 ${focusRing}`;

/** Desktop top-level link / dropdown trigger, shown as a rounded pill. */
const pill = (active) =>
    `relative inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${focusRing} ${
        active
            ? 'bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]'
            : 'text-[#C5D0E6] hover:bg-white/[0.07] hover:text-white'
    }`;

function CountBadge({ value, tone = 'dark' }) {
    return (
        <span
            className={`min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
                tone === 'light' ? 'bg-[#E7ECF5] text-[#16325C]' : 'bg-[#0F2547] text-[#C5D0E6]'
            }`}
        >
            {value}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Brand (logo + name), always links to the home page                  */
/* ------------------------------------------------------------------ */

function Brand({ onClick }) {
    return (
        <Link
            to={VIEW_PATHS.dashboard}
            onClick={onClick}
            aria-label={`${APP_NAME}, go to home`}
            title="Go to home"
            className={`group flex min-w-0 shrink-0 items-center gap-3 rounded-xl ${focusRing}`}
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 p-0.5 ring-2 ring-white/20 transition-all group-hover:ring-[#F5822A]/70 sm:h-11 sm:w-11">
                <img src={logoUrl} alt="" className="h-full w-full rounded-full object-contain" />
            </span>
            <span className="min-w-0">
                <span className={`block whitespace-nowrap text-lg text-white sm:text-xl ${brandFont}`}>{APP_NAME}</span>
                <span className="hidden whitespace-nowrap text-[11px] leading-tight tracking-wide text-[#8C9BB8] sm:block">
                    {APP_TAGLINE}
                </span>
            </span>
        </Link>
    );
}

/* ------------------------------------------------------------------ */
/* Desktop dropdown                                                    */
/* ------------------------------------------------------------------ */

function NavDropdown({ label, icon: TriggerIcon, items, counts, alsoActiveFor }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const { pathname } = useLocation();

    const active = items.some((item) => item.to === pathname) || Boolean(alsoActiveFor?.(pathname));
    const highlighted = active || open;

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="true"
                aria-expanded={open}
                className={pill(highlighted)}
            >
                <TriggerIcon className={`h-[18px] w-[18px] ${highlighted ? 'text-[#F5822A]' : 'text-[#8C9BB8]'}`} strokeWidth={1.8} />
                {label}
                <ChevronDown
                    className={`h-4 w-4 text-[#8C9BB8] transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="absolute left-1/2 top-full z-50 mt-3 w-72 max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-2xl border border-[#E6E0D2] bg-white p-2 shadow-[0_18px_44px_rgba(8,20,45,0.30)]">
                    <ul className="space-y-0.5">
                        {items.map(({ to, label: itemLabel, hint, icon: Icon, count }) => (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    end
                                    className={({ isActive }) =>
                                        `group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16325C] ${
                                            isActive ? 'bg-[#FFF1E4]' : 'hover:bg-[#F4F6FA]'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <span
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                    isActive
                                                        ? 'bg-[#F5822A] text-white'
                                                        : 'bg-[#E7ECF5] text-[#16325C] group-hover:bg-[#DCE4F1]'
                                                }`}
                                            >
                                                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span
                                                    className={`block text-sm font-semibold ${
                                                        isActive ? 'text-[#B8530A]' : 'text-[#2A2622]'
                                                    }`}
                                                >
                                                    {itemLabel}
                                                </span>
                                                <span className="block truncate text-xs text-[#6B645C]">{hint}</span>
                                            </span>
                                            <CountBadge value={counts[count]} tone="light" />
                                        </>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Mobile menu pieces                                                  */
/* ------------------------------------------------------------------ */

function MobileLink({ to, label, icon: Icon, count, counts }) {
    return (
        <NavLink
            to={to}
            end
            className={({ isActive }) =>
                `group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${focusRing} ${
                    isActive ? 'bg-white/10 text-white' : 'text-[#C5D0E6] hover:bg-white/5 hover:text-white active:bg-white/10'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <span className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-[#F5822A]" aria-hidden="true" />
                    )}
                    <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                            isActive ? 'text-[#F5822A]' : 'text-[#8C9BB8] group-hover:text-white'
                        }`}
                    />
                    <span className="flex-1 truncate">{label}</span>
                    {count && <CountBadge value={counts[count]} />}
                </>
            )}
        </NavLink>
    );
}

function SectionLabel({ children }) {
    return <p className="mb-1.5 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-[#8C9BB8]">{children}</p>;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Props
 *   onAddNew         function  Called when the user chooses Add Pandal.
 *   pandals          array     Used for the counts, the progress bar and quick search.
 *   onSearch(query)  function  Optional. Called when the user submits a search (Enter or
 *                              "See all") so App.jsx can put the query into the shared filters:
 *                              onSearch={(query) => setFilters({ ...DEFAULT_FILTERS, query })}
 */
export default function Navbar({ onAddNew, pandals, onSearch }) {
    const [open, setOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const searchInputRef = useRef(null);
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const counts = useMemo(() => {
        const visited = pandals.filter((pandal) => pandal.visited).length;
        return {
            total: pandals.length,
            visited,
            notVisited: pandals.length - visited,
            favourites: pandals.filter((pandal) => pandal.favourite).length,
            regions: new Set(pandals.map((pandal) => pandal.region)).size,
            metros: new Set(pandals.map((pandal) => pandal.nearestMetro).filter(Boolean)).size,
        };
    }, [pandals]);

    const percent = counts.total ? Math.round((counts.visited / counts.total) * 100) : 0;

    // Live results for the search panel (same matching rules as the list filters).
    const quickResults = useMemo(() => {
        if (!query.trim()) return [];
        return applyFilters(pandals, { query, sortBy: 'name' });
    }, [pandals, query]);

    // Soft shadow once the page has scrolled.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 4);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close the mobile menu and the search panel on every route change.
    useEffect(() => {
        setOpen(false);
        setSearchOpen(false);
    }, [pathname]);

    // Escape closes the menu / search; lock page scroll while either is open.
    useEffect(() => {
        if (!open && !searchOpen) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                setSearchOpen(false);
            }
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, searchOpen]);

    // Ctrl/Cmd + K toggles search from anywhere.
    useEffect(() => {
        const onKey = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setOpen(false);
                setSearchOpen((value) => !value);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Focus the search input when the panel opens.
    useEffect(() => {
        if (searchOpen) searchInputRef.current?.focus();
    }, [searchOpen]);

    // Reset the menu if the window grows to desktop width.
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const onChange = (event) => {
            if (event.matches) setOpen(false);
        };
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, []);

    const add = () => {
        setOpen(false);
        setSearchOpen(false);
        onAddNew();
    };

    // Brand click: go home. If already home, the route doesn't change, so scroll to the top instead.
    const goHome = () => {
        setOpen(false);
        setSearchOpen(false);
        if (pathname === VIEW_PATHS.dashboard) window.scrollTo?.({ top: 0, behavior: 'smooth' });
    };

    const toggleMenu = () => {
        setSearchOpen(false);
        setOpen((value) => !value);
    };

    const toggleSearch = () => {
        setOpen(false);
        setSearchOpen((value) => !value);
    };

    const closeSearch = () => {
        setSearchOpen(false);
        setQuery('');
    };

    const submitSearch = (event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        onSearch?.(trimmed);
        navigate(VIEW_PATHS.all);
        setSearchOpen(false);
    };

    return (
        <>
            <header
                className={`sticky top-0 z-40 bg-gradient-to-r from-[#0F2547] via-[#16325C] to-[#1B3C70] transition-shadow duration-300 ${
                    scrolled ? 'shadow-[0_10px_28px_rgba(8,20,45,0.35)]' : 'shadow-none'
                }`}
            >
                {/* Festive accent line along the bottom edge */}
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5822A] to-transparent opacity-70"
                    aria-hidden="true"
                />

                <div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-0 lg:px-8 2xl:px-12">
                    {/* Left half: brand, pinned to the left edge */}
                    <div className="flex min-w-0 items-center">
                        <Brand onClick={goHome} />
                    </div>

                    {/* Right half: starts at the screen centre, items spread evenly to the right edge */}
                    <div className="ml-auto flex h-full items-center gap-1 lg:ml-0 lg:w-full lg:gap-0">
                        <nav
                            aria-label="Main navigation"
                            className="hidden h-full flex-1 items-center justify-between lg:flex"
                        >
                            <NavLink to={VIEW_PATHS.dashboard} end className={({ isActive }) => pill(isActive)}>
                                {({ isActive }) => (
                                    <>
                                        <Home
                                            className={`h-[18px] w-[18px] ${isActive ? 'text-[#F5822A]' : 'text-[#8C9BB8]'}`}
                                            strokeWidth={1.8}
                                        />
                                        Home
                                    </>
                                )}
                            </NavLink>
                            <NavDropdown
                                label="Pandals"
                                icon={Landmark}
                                items={PANDAL_ITEMS}
                                counts={counts}
                                alsoActiveFor={(path) => path.startsWith('/pandals/')}
                            />
                            <NavDropdown label="Explore" icon={Compass} items={EXPLORE_ITEMS} counts={counts} />
                        </nav>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1 lg:ml-6">
                            <button
                                type="button"
                                onClick={toggleSearch}
                                aria-label={searchOpen ? 'Close search' : 'Search pandals'}
                                aria-expanded={searchOpen}
                                aria-controls="search-panel"
                                title="Search (Ctrl+K)"
                                className={`${iconBtn} ${searchOpen ? 'bg-white/10 text-white' : ''} lg:mr-1`}
                            >
                                {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                            </button>

                            <button
                                type="button"
                                onClick={add}
                                className={`hidden h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#FF9440] to-[#F5822A] px-5 text-sm font-semibold text-[#0F2547] shadow-[0_4px_14px_rgba(245,130,42,0.35)] transition-all hover:from-[#FFA25C] hover:to-[#FF9440] hover:shadow-[0_6px_18px_rgba(245,130,42,0.45)] active:from-[#F5822A] active:to-[#E0721D] lg:inline-flex ${focusRing}`}
                            >
                                <Plus className="h-4 w-4" strokeWidth={2.4} />
                                Add Pandal
                            </button>

                            <button type="button" onClick={add} aria-label="Add new pandal" className={`${iconBtn} lg:hidden`}>
                                <Plus className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={toggleMenu}
                                aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
                                aria-expanded={open}
                                aria-controls="mobile-menu"
                                className={`${iconBtn} lg:hidden`}
                            >
                                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search panel */}
                {searchOpen && (
                    <div
                        id="search-panel"
                        className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-white/10 bg-[#16325C] shadow-2xl"
                    >
                        <div className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6">
                            <form onSubmit={submitSearch} role="search" className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#16325C]/60" />
                                <input
                                    ref={searchInputRef}
                                    type="search"
                                    inputMode="search"
                                    enterKeyHint="search"
                                    autoComplete="off"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search club, locality, address or metro"
                                    aria-label="Search pandals"
                                    className="h-12 w-full rounded-2xl border border-transparent bg-white pl-12 pr-4 text-base text-[#2A2622] shadow-sm placeholder:text-[#A39B8D] focus:outline-none focus:ring-2 focus:ring-[#F5822A] sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
                                />
                            </form>

                            {query.trim() && (
                                <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-lg">
                                    {quickResults.length === 0 ? (
                                        <p className="px-4 py-6 text-center text-sm text-[#6B645C]">
                                            No pandals match “{query.trim()}”.
                                        </p>
                                    ) : (
                                        <>
                                            <ul className="divide-y divide-[#EFEBDF]">
                                                {quickResults.slice(0, 6).map((pandal, index) => (
                                                    <li key={pandal.id ?? index}>
                                                        <Link
                                                            to={`/pandals/${pandal.id}`}
                                                            onClick={closeSearch}
                                                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#F4F6FA] focus:outline-none focus-visible:bg-[#F4F6FA]"
                                                        >
                                                            <Landmark
                                                                className="h-[18px] w-[18px] shrink-0 text-[#16325C]"
                                                                strokeWidth={1.8}
                                                            />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate text-sm font-semibold text-[#2A2622]">
                                                                    {pandal.clubName}
                                                                </span>
                                                                <span className="block truncate text-xs text-[#6B645C]">
                                                                    {[pandal.locality, pandal.region, pandal.nearestMetro]
                                                                        .filter(Boolean)
                                                                        .join(' · ')}
                                                                </span>
                                                            </span>
                                                            {pandal.visited && (
                                                                <CheckCircle2
                                                                    className="h-4 w-4 shrink-0 text-[#2E8B57]"
                                                                    aria-label="Visited"
                                                                />
                                                            )}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                            <button
                                                type="button"
                                                onClick={submitSearch}
                                                className="flex w-full items-center justify-between border-t border-[#EFEBDF] bg-[#FFF8F0] px-4 py-3 text-sm font-semibold text-[#B8530A] hover:bg-[#FFF1E4] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F5822A]"
                                            >
                                                <span>
                                                    See all {quickResults.length}{' '}
                                                    {quickResults.length === 1 ? 'result' : 'results'}
                                                </span>
                                                <span aria-hidden="true">→</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mobile / tablet panel */}
                {open && (
                    <div
                        id="mobile-menu"
                        className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-white/10 bg-[#16325C] shadow-2xl lg:hidden"
                    >
                        <nav aria-label="Main navigation" className="px-3 pb-2 pt-3 sm:px-5">
                            <MobileLink to={VIEW_PATHS.dashboard} label="Home" icon={Home} counts={counts} />

                            <SectionLabel>Pandals</SectionLabel>
                            <div className="space-y-1">
                                {PANDAL_ITEMS.map((item) => (
                                    <MobileLink key={item.to} {...item} counts={counts} />
                                ))}
                            </div>

                            <SectionLabel>Explore</SectionLabel>
                            <div className="space-y-1">
                                {EXPLORE_ITEMS.map((item) => (
                                    <MobileLink key={item.to} {...item} counts={counts} />
                                ))}
                            </div>
                        </nav>

                        <div className="space-y-3 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
                            <div className="rounded-xl bg-[#0F2547] p-3.5">
                                <div className="mb-2 flex items-baseline justify-between text-xs text-[#C5D0E6]">
                                    <span>Trail progress</span>
                                    <span className="font-semibold text-white">{percent}%</span>
                                </div>
                                <div
                                    role="progressbar"
                                    aria-label="Visited pandals"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={percent}
                                    className="h-2 overflow-hidden rounded-full bg-white/10"
                                >
                                    <div
                                        className="h-full rounded-full bg-[#F5822A] transition-[width] duration-500 motion-reduce:transition-none"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-[#8C9BB8]">
                                    {counts.visited} of {counts.total} visited
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={add}
                                className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#FF9440] to-[#F5822A] px-4 py-2.5 text-sm font-semibold text-[#0F2547] shadow-[0_4px_14px_rgba(245,130,42,0.35)] transition-colors active:from-[#F5822A] active:to-[#E0721D] ${focusRing}`}
                            >
                                <Plus className="h-4 w-4" strokeWidth={2.4} />
                                Add Pandal
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Backdrop for the mobile panel and the search panel */}
            {(open || searchOpen) && (
                <div
                    className={`fixed inset-0 top-16 z-30 bg-[#0F2547]/60 backdrop-blur-[2px] ${searchOpen ? '' : 'lg:hidden'}`}
                    onMouseDown={() => {
                        setOpen(false);
                        setSearchOpen(false);
                    }}
                    aria-hidden="true"
                />
            )}
        </>
    );
}