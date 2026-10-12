/**
 * Sidebar.jsx
 *
 * Responsive navigation for Pujor Pothe (পুজোর পথে).
 *   Phones   (< sm)   compact top bar with logo + name, slide-in drawer (85% width, max 20rem)
 *   Tablets  (sm–lg)  roomier top bar that also shows the tagline, same drawer
 *   Desktop  (lg+)    fixed 16rem sidebar, no top bar
 *
 * Counts are calculated from the `pandals` prop, so nothing here is hardcoded.
 *
 * Also exports VIEW_CONFIG, which describes how each list-style view behaves. App.jsx
 * reads it so the sidebar and the content area always agree on what a view means.
 *
 * Bengali font: add this once to index.html so the name renders well on every device.
 *   <link rel="preconnect" href="https://fonts.googleapis.com" />
 *   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 *   <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@500;600;700&display=swap" rel="stylesheet" />
 */
import { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    Compass,
    Footprints,
    Heart,
    Landmark,
    LayoutDashboard,
    Menu,
    Plus,
    Train,
    X,
} from 'lucide-react';
import logoUrl from '../assets/logo.png';

/** App name, used everywhere so it only needs changing in one place. */
export const APP_NAME = 'পুজোর পথে';
export const APP_TAGLINE = 'Your Durga Puja pandal planner';

/**
 * `locked` are filter values fixed by the view (merged over the user's filters).
 * `groupBy` tells PandalList how to arrange the results.
 */
export const VIEW_CONFIG = {
    all: {
        title: 'All pandals',
        subtitle: 'Every puja club you are tracking.',
        locked: {},
        groupBy: 'none',
    },
    notVisited: {
        title: 'Not visited',
        subtitle: 'Pandals still on your list.',
        locked: { status: 'notVisited' },
        groupBy: 'none',
    },
    visited: {
        title: 'Visited',
        subtitle: 'Pandals you have already seen.',
        locked: { status: 'visited' },
        groupBy: 'none',
    },
    favourites: {
        title: 'Favourites',
        subtitle: 'The pandals you want to remember.',
        locked: { favouritesOnly: true },
        groupBy: 'none',
    },
    regions: {
        title: 'Explore by region',
        subtitle: 'North, South, East and West Kolkata, side by side.',
        locked: {},
        groupBy: 'region',
    },
    metros: {
        title: 'Explore by metro',
        subtitle: 'Pandals grouped by their nearest metro station, handy for planning a route.',
        locked: {},
        groupBy: 'metro',
    },
};

/** Which filter controls a view hides because it already fixes them. */
export const getLockedFilterKeys = (viewId) => Object.keys(VIEW_CONFIG[viewId]?.locked ?? {});

/*
 * Palette, taken from the logo
 *   navy        #16325C   sidebar surface
 *   deep navy   #0F2547   progress card, badges
 *   orange      #F5822A   active marker, progress, primary action
 *   mist        #C5D0E6   body text on navy
 *   slate       #8C9BB8   section labels, idle icons
 */
const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5822A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16325C]';

// 44px touch target on phones and tablets, tighter on desktop.
const barIconBtn = `inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#C5D0E6] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 lg:h-10 lg:w-10 ${focusRing}`;

// Bengali-friendly serif with safe fallbacks. leading-snug keeps matras from clipping.
const brandFont = "font-['Noto_Serif_Bengali','Hind_Siliguri',serif] font-semibold leading-snug";

function NavButton({ icon: Icon, label, count, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors lg:py-2.5 ${focusRing} ${active
                    ? 'bg-white/10 text-white'
                    : 'text-[#C5D0E6] hover:bg-white/5 hover:text-white active:bg-white/10'
                }`}
        >
            {active && (
                <span className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-[#F5822A]" aria-hidden="true" />
            )}
            <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors ${active ? 'text-[#F5822A]' : 'text-[#8C9BB8] group-hover:text-white'
                    }`}
            />
            <span className="flex-1 truncate">{label}</span>
            {typeof count === 'number' && (
                <span
                    className={`min-w-7 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${active ? 'bg-[#F5822A] text-[#0F2547]' : 'bg-[#0F2547] text-[#C5D0E6]'
                        }`}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

/** White tile keeps the navy part of the logo visible against the navy surface. */
function LogoMark({ size = 'lg' }) {
    const box = size === 'lg' ? 'h-14 w-14 p-1.5' : 'h-10 w-10 p-1 sm:h-11 sm:w-11';
    return (
        <span className={`flex shrink-0 items-center justify-center rounded-xl shadow-sm ${box}`}>
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
        </span>
    );
}

function Logo() {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <LogoMark />
            <div className="min-w-0">
                <p className={`truncate text-xl text-white ${brandFont}`}>{APP_NAME}</p>
                <p className="text-xs leading-tight text-[#8C9BB8]">{APP_TAGLINE}</p>
            </div>
        </div>
    );
}

function SectionLabel({ children }) {
    return <p className="mb-2 px-3 text-xs font-semibold text-[#8C9BB8]">{children}</p>;
}

/**
 * Props
 *   activeView   string    'dashboard' | 'all' | 'notVisited' | 'visited' | 'favourites'
 *                          | 'regions' | 'metros'. Anything else (such as 'detail') shows no active item.
 *   onNavigate   function  Called with a view id when the user picks a navigation item.
 *   onAddNew     function  Called when the user chooses Add New Pandal.
 *   pandals      array     Used to calculate the count badges.
 */
export default function Sidebar({ activeView, onNavigate, onAddNew, pandals }) {
    const [open, setOpen] = useState(false);

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

    // Close the drawer with Escape, and stop the page behind it from scrolling.
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    // If the window grows to desktop width while the drawer is open, reset it.
    useEffect(() => {
        const query = window.matchMedia('(min-width: 1024px)');
        const onChange = (event) => {
            if (event.matches) setOpen(false);
        };
        query.addEventListener?.('change', onChange);
        return () => query.removeEventListener?.('change', onChange);
    }, []);

    const go = (view) => {
        onNavigate(view);
        setOpen(false);
    };

    const add = () => {
        setOpen(false);
        onAddNew();
    };

    return (
        <>
            {/* Phone and tablet top bar */}
            <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-[#16325C] px-3 sm:px-5 lg:hidden">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <LogoMark size="sm" />
                    <div className="min-w-0">
                        <p className={`truncate text-base text-white sm:text-lg ${brandFont}`}>{APP_NAME}</p>
                        <p className="hidden text-xs leading-tight text-[#8C9BB8] sm:block">{APP_TAGLINE}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                    <button type="button" onClick={add} aria-label="Add new pandal" className={barIconBtn}>
                        <Plus className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label="Open navigation menu"
                        aria-expanded={open}
                        aria-controls="app-sidebar"
                        className={barIconBtn}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Drawer backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-[#0F2547]/60 backdrop-blur-[2px] lg:hidden"
                    onMouseDown={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                id="app-sidebar"
                aria-label="Main navigation"
                className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[85vw] max-w-xs flex-col bg-[#16325C] transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none lg:visible lg:w-64 lg:max-w-none lg:translate-x-0 ${open ? 'visible translate-x-0 shadow-2xl' : 'invisible -translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-5 sm:px-5 sm:pt-6 lg:pb-5">
                    <Logo />
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close navigation menu"
                        className={`${barIconBtn} -mr-1 shrink-0 lg:hidden`}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-2 lg:space-y-6">
                    <div className="space-y-1">
                        <NavButton
                            icon={LayoutDashboard}
                            label="Dashboard"
                            active={activeView === 'dashboard'}
                            onClick={() => go('dashboard')}
                        />
                    </div>

                    <div>
                        <SectionLabel>Pandals</SectionLabel>
                        <div className="space-y-1">
                            <NavButton
                                icon={Landmark}
                                label="All Pandals"
                                count={counts.total}
                                active={activeView === 'all'}
                                onClick={() => go('all')}
                            />
                            <NavButton
                                icon={Footprints}
                                label="Not Visited"
                                count={counts.notVisited}
                                active={activeView === 'notVisited'}
                                onClick={() => go('notVisited')}
                            />
                            <NavButton
                                icon={CheckCircle2}
                                label="Visited"
                                count={counts.visited}
                                active={activeView === 'visited'}
                                onClick={() => go('visited')}
                            />
                            <NavButton
                                icon={Heart}
                                label="Favourites"
                                count={counts.favourites}
                                active={activeView === 'favourites'}
                                onClick={() => go('favourites')}
                            />
                        </div>
                    </div>

                    <div>
                        <SectionLabel>Explore</SectionLabel>
                        <div className="space-y-1">
                            <NavButton
                                icon={Compass}
                                label="Explore by Region"
                                count={counts.regions}
                                active={activeView === 'regions'}
                                onClick={() => go('regions')}
                            />
                            <NavButton
                                icon={Train}
                                label="Explore by Metro"
                                count={counts.metros}
                                active={activeView === 'metros'}
                                onClick={() => go('metros')}
                            />
                        </div>
                    </div>
                </nav>

                {/* Footer respects the phone home-indicator area */}
                <div className="space-y-3 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:space-y-4">
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
                        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#F5822A] px-4 py-2.5 text-sm font-semibold text-[#0F2547] transition-colors hover:bg-[#FF9440] active:bg-[#E0721D] ${focusRing}`}
                    >
                        <Plus className="h-4 w-4" />
                        Add New Pandal
                    </button>
                </div>
            </aside>
        </>
    );
}