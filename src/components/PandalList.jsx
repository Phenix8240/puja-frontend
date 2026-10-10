/**
 * PandalList.jsx
 *
 * Responsive grid (or list) of pandal cards. It receives the already-filtered pandals
 * from App.jsx and can group them by region or metro station for the Explore views.
 */
import { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    Circle,
    Heart,
    Landmark,
    LayoutGrid,
    List,
    MapPin,
    Navigation,
    Pencil,
    Plus,
    Sparkles,
    Train,
    Trash2,
} from 'lucide-react';
import {
    ConfirmDialog,
    ImageWithFallback,
    REGION_STYLES,
    RegionBadge,
    StatusBadge,
    formatDate,
    getDirectionsUrl,
    ui,
} from './Pandalform.jsx';
import { NoResults, groupPandals } from './SearchFilters.jsx';

const VIEW_MODE_KEY = 'pujotrack.listMode';

function metroLine(pandal) {
    if (pandal.nearestMetro && pandal.metroDistance) {
        return `${pandal.metroDistance} from ${pandal.nearestMetro} metro`;
    }
    if (pandal.nearestMetro) return `Near ${pandal.nearestMetro} metro`;
    return 'Nearest metro not added yet';
}

function DemoBadge() {
    return (
        <span
            title="Demo record. Details are not verified."
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#F7EFD9] px-2 py-0.5 text-xs font-medium text-[#6F5516] ring-1 ring-inset ring-[#E8D6A5]"
        >
            <Sparkles className="h-3 w-3" />
            Demo
        </span>
    );
}

function FavouriteButton({ pandal, onToggleFavourite, className = '' }) {
    return (
        <button
            type="button"
            onClick={() => onToggleFavourite(pandal.id)}
            aria-pressed={pandal.favourite}
            aria-label={pandal.favourite ? `Remove ${pandal.clubName} from favourites` : `Add ${pandal.clubName} to favourites`}
            title={pandal.favourite ? 'Remove from favourites' : 'Add to favourites'}
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5 transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${className}`}
        >
            <Heart
                className={`h-[18px] w-[18px] transition-colors ${pandal.favourite ? 'fill-[#D9381E] text-[#D9381E]' : 'text-[#6B645C]'
                    }`}
            />
        </button>
    );
}

function CardActions({ pandal, onToggleVisited, onEdit, onRequestDelete }) {
    return (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                onClick={() => onToggleVisited(pandal.id)}
                aria-pressed={pandal.visited}
                className={`inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B58B2E] ${pandal.visited
                    ? 'border-[#BBDCC6] bg-[#E4F1E8] text-[#255B3C] hover:bg-[#D6EADC]'
                    : 'border-[#E2D9C6] bg-white text-[#2A2622] hover:border-[#CDBF9F] hover:bg-[#FBF8F1]'
                    }`}
            >
                {pandal.visited ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                <span className="truncate">{pandal.visited ? 'Visited' : 'Mark visited'}</span>
            </button>

            <a
                href={getDirectionsUrl(pandal)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Get directions to ${pandal.clubName} in Google Maps (opens in a new tab)`}
                title="Directions in Google Maps"
                className={`${ui.iconBtn} border-[#E2D9C6] bg-white text-[#2A2622] hover:border-[#CDBF9F]`}
            >
                <Navigation className="h-4 w-4" />
            </a>
            <button
                type="button"
                onClick={() => onEdit(pandal.id)}
                aria-label={`Edit ${pandal.clubName}`}
                title="Edit"
                className={ui.iconBtn}
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => onRequestDelete(pandal)}
                aria-label={`Delete ${pandal.clubName}`}
                title="Delete"
                className={`${ui.iconBtn} hover:!bg-[#FDEEEA] hover:!text-[#B82D16]`}
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

function PandalCard({ pandal, handlers }) {
    const { onSelect, onToggleFavourite } = handlers;
    return (
        <article className={`${ui.card} group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(42,38,34,0.10)]`}>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => onSelect(pandal.id)}
                    aria-label={`Open details for ${pandal.clubName}`}
                    className="block w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D9381E]"
                >
                    <ImageWithFallback
                        src={pandal.pandalImage}
                        alt={`${pandal.clubName} pandal`}
                        kind="pandal"
                        className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                </button>
                <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <StatusBadge visited={pandal.visited} />
                </div>
                <FavouriteButton pandal={pandal} onToggleFavourite={onToggleFavourite} className="absolute right-3 top-3" />
                {pandal.idolImage && (
                    <div className="pointer-events-none absolute -bottom-7 right-4 h-14 w-14 overflow-hidden rounded-full bg-white shadow-md ring-4 ring-white">
                        <ImageWithFallback src={pandal.idolImage} alt={`Maa Durga idol at ${pandal.clubName}`} kind="idol" compact className="h-full w-full" />
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => onSelect(pandal.id)}
                tabIndex={-1}
                className={`block w-full px-4 pb-3 pt-4 text-left ${pandal.idolImage ? 'pr-20' : ''}`}
            >
                <h3 className="line-clamp-2 break-words font-serif text-lg font-semibold leading-snug text-[#2A2622]" title={pandal.clubName}>
                    {pandal.clubName}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6B645C]">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9A7A2E]" />
                    <span className="truncate" title={pandal.address || pandal.locality}>
                        {pandal.locality || pandal.address}
                    </span>
                </p>
            </button>

            <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    <RegionBadge region={pandal.region} />
                    {pandal.isSample && <DemoBadge />}
                </div>
                <p className="flex items-start gap-2 text-sm text-[#4A443D]">
                    <Train className="mt-0.5 h-4 w-4 shrink-0 text-[#8A8276]" />
                    <span className="min-w-0 break-words">{metroLine(pandal)}</span>
                </p>
                {pandal.visited && pandal.visitDate && (
                    <p className="text-xs text-[#6B645C]">Visited on {formatDate(pandal.visitDate)}</p>
                )}
                <div className="mt-auto border-t border-[#F0EADB] pt-3">
                    <CardActions
                        pandal={pandal}
                        onToggleVisited={handlers.onToggleVisited}
                        onEdit={handlers.onEdit}
                        onRequestDelete={handlers.onRequestDelete}
                    />
                </div>
            </div>
        </article>
    );
}

function PandalRow({ pandal, handlers }) {
    return (
        <article className={`${ui.card} group flex flex-col overflow-hidden transition-shadow hover:shadow-[0_10px_30px_rgba(42,38,34,0.10)] sm:flex-row`}>
            <div className="relative sm:w-52 sm:shrink-0 lg:w-60">
                <button
                    type="button"
                    onClick={() => handlers.onSelect(pandal.id)}
                    aria-label={`Open details for ${pandal.clubName}`}
                    className="block h-full w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D9381E]"
                >
                    <ImageWithFallback
                        src={pandal.pandalImage}
                        alt={`${pandal.clubName} pandal`}
                        kind="pandal"
                        className="aspect-[16/10] w-full sm:aspect-auto sm:h-full sm:min-h-[9.5rem]"
                    />
                </button>
                <div className="pointer-events-none absolute left-3 top-3">
                    <StatusBadge visited={pandal.visited} />
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                    {pandal.idolImage && (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-[#EBE4D5]">
                            <ImageWithFallback src={pandal.idolImage} alt={`Maa Durga idol at ${pandal.clubName}`} kind="idol" compact className="h-full w-full" />
                        </div>
                    )}
                    <button type="button" onClick={() => handlers.onSelect(pandal.id)} tabIndex={-1} className="min-w-0 flex-1 text-left">
                        <h3 className="line-clamp-2 break-words font-serif text-lg font-semibold leading-snug text-[#2A2622]" title={pandal.clubName}>
                            {pandal.clubName}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#6B645C]">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9A7A2E]" />
                            <span className="truncate" title={pandal.address || pandal.locality}>
                                {pandal.address || pandal.locality}
                            </span>
                        </p>
                    </button>
                    <FavouriteButton pandal={pandal} onToggleFavourite={handlers.onToggleFavourite} className="shrink-0 !bg-[#FBF8F1]" />
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <RegionBadge region={pandal.region} />
                    {pandal.isSample && <DemoBadge />}
                    <span className="flex min-w-0 items-center gap-1.5 text-sm text-[#4A443D]">
                        <Train className="h-4 w-4 shrink-0 text-[#8A8276]" />
                        <span className="break-words">{metroLine(pandal)}</span>
                    </span>
                    {pandal.visited && pandal.visitDate && (
                        <span className="text-xs text-[#6B645C]">Visited on {formatDate(pandal.visitDate)}</span>
                    )}
                </div>

                <div className="mt-auto sm:max-w-md">
                    <CardActions
                        pandal={pandal}
                        onToggleVisited={handlers.onToggleVisited}
                        onEdit={handlers.onEdit}
                        onRequestDelete={handlers.onRequestDelete}
                    />
                </div>
            </div>
        </article>
    );
}

function SkeletonCard() {
    return (
        <div className={`${ui.card} animate-pulse overflow-hidden`} aria-hidden="true">
            <div className="aspect-[16/10] bg-[#EFE9DB]" />
            <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded bg-[#EFE9DB]" />
                <div className="h-4 w-1/2 rounded bg-[#F3EEE3]" />
                <div className="h-4 w-2/3 rounded bg-[#F3EEE3]" />
                <div className="h-9 rounded-lg bg-[#F3EEE3]" />
            </div>
        </div>
    );
}

function EmptyCollection({ onAddNew, onLoadSamples }) {
    return (
        <div className={`${ui.card} flex flex-col items-center px-6 py-16 text-center`}>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FDEEEA] text-[#D9381E]">
                <Landmark className="h-8 w-8" strokeWidth={1.5} />
            </span>
            <h3 className="mt-5 font-serif text-2xl font-semibold text-[#2A2622]">Your pandal list is empty</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6B645C]">
                Add the first puja club you plan to visit, or load a few demo records to see how the app works.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={onAddNew} className={ui.primaryBtn}>
                    <Plus className="h-4 w-4" />
                    Add a pandal
                </button>
                {onLoadSamples && (
                    <button type="button" onClick={onLoadSamples} className={ui.secondaryBtn}>
                        <Sparkles className="h-4 w-4" />
                        Load demo data
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Props
 *   pandals            array     Already filtered and sorted by App.jsx.
 *   totalCount         number    Size of the unfiltered collection (to tell "empty" from "no matches").
 *   isLoading          boolean   Shows skeleton cards.
 *   groupBy            string    'none' | 'region' | 'metro'.
 *   onSelect(id)       open the details view.
 *   onEdit(id)         open the form for this pandal.
 *   onDelete(id)       called after the user confirms deletion.
 *   onToggleFavourite(id), onToggleVisited(id)
 *   onClearFilters()   shown on the no-results state.
 *   onAddNew()         shown on the empty state.
 *   onLoadSamples()    optional; adds a "Load demo data" button to the empty state.
 */
export default function PandalList({
    pandals,
    totalCount = pandals.length,
    isLoading = false,
    groupBy = 'none',
    onSelect,
    onEdit,
    onDelete,
    onToggleFavourite,
    onToggleVisited,
    onClearFilters,
    onAddNew,
    onLoadSamples,
}) {
    const [mode, setMode] = useState(() => {
        try {
            return window.localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid';
        } catch (error) {
            return 'grid';
        }
    });
    const [pendingDelete, setPendingDelete] = useState(null);

    useEffect(() => {
        try {
            window.localStorage.setItem(VIEW_MODE_KEY, mode);
        } catch (error) {
            /* storage unavailable: the choice just won't persist */
        }
    }, [mode]);

    const groups = useMemo(() => groupPandals(pandals, groupBy), [pandals, groupBy]);

    const handlers = {
        onSelect,
        onEdit,
        onToggleFavourite,
        onToggleVisited,
        onRequestDelete: setPendingDelete,
    };

    const renderItems = (items) =>
        mode === 'grid' ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((pandal) => (
                    <PandalCard key={pandal.id} pandal={pandal} handlers={handlers} />
                ))}
            </div>
        ) : (
            <div className="flex flex-col gap-4">
                {items.map((pandal) => (
                    <PandalRow key={pandal.id} pandal={pandal} handlers={handlers} />
                ))}
            </div>
        );

    let body;
    if (isLoading) {
        body = (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" role="status" aria-label="Loading pandals">
                {Array.from({ length: 6 }, (_, index) => (
                    <SkeletonCard key={index} />
                ))}
            </div>
        );
    } else if (totalCount === 0) {
        body = <EmptyCollection onAddNew={onAddNew} onLoadSamples={onLoadSamples} />;
    } else if (pandals.length === 0) {
        body = <NoResults onClear={onClearFilters} />;
    } else if (groupBy === 'none') {
        body = renderItems(pandals);
    } else {
        body = (
            <div className="space-y-10">
                {groups.map((group) => (
                    <section key={group.key} aria-labelledby={`group-${group.key}`}>
                        <div className="mb-4 flex items-center gap-3 border-b border-[#EBE4D5] pb-2.5">
                            {groupBy === 'region' ? (
                                <span className={`h-3 w-3 rounded-full ${REGION_STYLES[group.label]?.bar || 'bg-[#3F3A34]'}`} />
                            ) : (
                                <Train className="h-4 w-4 text-[#9A7A2E]" />
                            )}
                            <h2 id={`group-${group.key}`} className="font-serif text-xl font-semibold text-[#2A2622]">
                                {group.label}
                            </h2>
                            <span className="rounded-full bg-[#EFE9DB] px-2.5 py-0.5 text-xs font-semibold text-[#6B645C]">
                                {group.items.length} {group.items.length === 1 ? 'pandal' : 'pandals'}
                            </span>
                            <span className="ml-auto text-xs text-[#8A8276]">
                                {group.items.filter((item) => item.visited).length} visited
                            </span>
                        </div>
                        {renderItems(group.items)}
                    </section>
                ))}
            </div>
        );
    }

    return (
        <div>
            {!isLoading && totalCount > 0 && pandals.length > 0 && (
                <div className="mb-4 flex justify-end">
                    <div role="group" aria-label="Layout" className="inline-flex rounded-xl border border-[#E2D9C6] bg-white p-1 shadow-sm">
                        {[
                            ['grid', LayoutGrid, 'Grid view'],
                            ['list', List, 'List view'],
                        ].map(([value, Icon, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setMode(value)}
                                aria-pressed={mode === value}
                                aria-label={label}
                                title={label}
                                className={`flex h-8 w-9 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B58B2E] ${mode === value ? 'bg-[#2A2622] text-white' : 'text-[#6B645C] hover:bg-[#F3EEE3]'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {body}

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title="Delete this pandal?"
                message={
                    pendingDelete
                        ? `${pendingDelete.clubName} will be removed from your list, including its photos and visit history. This cannot be undone.`
                        : ''
                }
                confirmLabel="Delete pandal"
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => {
                    if (pendingDelete) onDelete(pendingDelete.id);
                    setPendingDelete(null);
                }}
            />
        </div>
    );
}