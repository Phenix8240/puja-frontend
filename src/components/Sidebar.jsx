/**
 * Sidebar.jsx
 *
 * Fixed sidebar on large screens; below `lg` it becomes a top bar with a slide-in drawer.
 * Counts are calculated from the `pandals` prop, so nothing here is hardcoded.
 *
 * Also exports VIEW_CONFIG, which describes how each list-style view behaves. App.jsx
 * reads it so the sidebar and the content area always agree on what a view means.
 */
import { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    Compass,
    Flower2,
    Footprints,
    Heart,
    Landmark,
    LayoutDashboard,
    Menu,
    Plus,
    Train,
    X,
} from 'lucide-react';
import { ui } from './Pandalform';

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

function NavButton({ icon: Icon, label, count, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B58B2E] ${active ? 'bg-[#FDEEEA] text-[#B82D16]' : 'text-[#4A443D] hover:bg-[#F3EEE3] hover:text-[#2A2622]'
                }`}
        >
            {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[#D9381E]" />}
            <Icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-[#D9381E]' : 'text-[#8A8276] group-hover:text-[#4A443D]'}`}
            />
            <span className="flex-1 truncate">{label}</span>
            {typeof count === 'number' && (
                <span
                    className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${active ? 'bg-[#D9381E] text-white' : 'bg-[#EFE9DB] text-[#6B645C]'
                        }`}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

function Logo() {
    return (
        <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D9381E] text-white shadow-sm">
                <Flower2 className="h-5 w-5" />
            </span>
            <div className="leading-tight">
                <p className="font-serif text-lg font-semibold text-[#2A2622]">PujoTrack Kolkata</p>
                <p className="text-xs text-[#8A8276]">Your Durga Puja pandal planner</p>
            </div>
        </div>
    );
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
            {/* Mobile and tablet top bar */}
            <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[#EBE4D5] bg-white/95 px-4 backdrop-blur lg:hidden">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D9381E] text-white">
                        <Flower2 className="h-4 w-4" />
                    </span>
                    <span className="font-serif text-base font-semibold text-[#2A2622]">PujoTrack Kolkata</span>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={add} aria-label="Add new pandal" className={ui.iconBtn}>
                        <Plus className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label="Open navigation menu"
                        aria-expanded={open}
                        aria-controls="app-sidebar"
                        className={ui.iconBtn}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Drawer backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-[#2A2622]/50 lg:hidden"
                    onMouseDown={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                id="app-sidebar"
                aria-label="Main navigation"
                className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#EBE4D5] bg-white transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none lg:visible lg:w-64 lg:translate-x-0 ${open ? 'visible translate-x-0 shadow-2xl' : 'invisible -translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between px-5 pb-4 pt-6">
                    <Logo />
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close navigation menu"
                        className={`${ui.iconBtn} -mr-2 lg:hidden`}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
                    <div className="space-y-1">
                        <NavButton
                            icon={LayoutDashboard}
                            label="Dashboard"
                            active={activeView === 'dashboard'}
                            onClick={() => go('dashboard')}
                        />
                    </div>

                    <div>
                        <p className="mb-1.5 px-3 text-xs font-semibold text-[#8A8276]">Pandals</p>
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
                        <p className="mb-1.5 px-3 text-xs font-semibold text-[#8A8276]">Explore</p>
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

                <div className="space-y-4 border-t border-[#EBE4D5] p-4">
                    <div>
                        <div className="mb-1.5 flex items-baseline justify-between text-xs text-[#6B645C]">
                            <span>Trail progress</span>
                            <span className="font-semibold text-[#2A2622]">
                                {counts.visited} of {counts.total} visited
                            </span>
                        </div>
                        <div
                            role="progressbar"
                            aria-label="Visited pandals"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={percent}
                            className="h-1.5 overflow-hidden rounded-full bg-[#EFE9DB]"
                        >
                            <div
                                className="h-full rounded-full bg-[#D9381E] transition-[width] duration-500"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                    <button type="button" onClick={add} className={`${ui.primaryBtn} w-full`}>
                        <Plus className="h-4 w-4" />
                        Add New Pandal
                    </button>
                </div>
            </aside>
        </>
    );
}