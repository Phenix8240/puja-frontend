/**
 * Dashboard.jsx
 *
 * Overview of the whole collection. Every number is calculated from the `pandals`
 * prop on each render, so it updates the moment a record is added, edited or deleted.
 */
import { useMemo } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Compass,
    Footprints,
    Heart,
    Landmark,
    Plus,
    Sparkles,
    X,
} from 'lucide-react';
import {
    ImageWithFallback,
    REGIONS,
    REGION_STYLES,
    formatDate,
    ui,
} from './Pandalform.jsx';

function StatCard({ icon: Icon, label, value, tone, onClick, loading }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${ui.card} group flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(42,38,34,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B58B2E]`}
        >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
                <span className="block text-sm text-[#6B645C]">{label}</span>
                {loading ? (
                    <span className="mt-1 block h-8 w-12 animate-pulse rounded bg-[#EFE9DB]" />
                ) : (
                    <span className="block font-serif text-3xl font-semibold tabular-nums text-[#2A2622]">{value}</span>
                )}
            </span>
        </button>
    );
}

function MiniRow({ pandal, meta, actionLabel, onAction, onSelect }) {
    return (
        <li className="flex items-center gap-3 py-3">
            <button
                type="button"
                onClick={() => onSelect(pandal.id)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B58B2E]"
            >
                <ImageWithFallback
                    src={pandal.pandalImage}
                    alt=""
                    kind="pandal"
                    compact
                    className="h-12 w-12 shrink-0 rounded-lg"
                />
                <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-[#2A2622]">{pandal.clubName}</span>
                        {pandal.favourite && <Heart className="h-3.5 w-3.5 shrink-0 fill-[#D9381E] text-[#D9381E]" />}
                    </span>
                    <span className="block truncate text-xs text-[#6B645C]">{meta}</span>
                </span>
            </button>
            {onAction && (
                <button
                    type="button"
                    onClick={() => onAction(pandal.id)}
                    className="shrink-0 rounded-lg border border-[#E2D9C6] bg-white px-3 py-1.5 text-xs font-semibold text-[#2A2622] transition-colors hover:border-[#CDBF9F] hover:bg-[#FBF8F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B58B2E]"
                >
                    {actionLabel}
                </button>
            )}
        </li>
    );
}

function ListCard({ title, description, emptyText, actionText, onEmptyAction, children, hasItems, footer }) {
    return (
        <section className={`${ui.card} flex flex-col p-5`}>
            <h2 className="font-serif text-xl font-semibold text-[#2A2622]">{title}</h2>
            <p className="mt-0.5 text-sm text-[#6B645C]">{description}</p>
            {hasItems ? (
                <ul className="mt-2 divide-y divide-[#F0EADB]">{children}</ul>
            ) : (
                <div className="mt-4 flex flex-1 flex-col items-start gap-3 rounded-xl bg-[#FBF8F1] p-4">
                    <p className="text-sm text-[#6B645C]">{emptyText}</p>
                    {actionText && (
                        <button type="button" onClick={onEmptyAction} className={ui.secondaryBtn}>
                            {actionText}
                        </button>
                    )}
                </div>
            )}
            {hasItems && footer}
        </section>
    );
}

/**
 * Props
 *   pandals            array     The full collection.
 *   isLoading          boolean   Shows skeleton placeholders.
 *   storageError       string?   Message when saving or loading localStorage failed.
 *   onDismissError()   optional  Hides the storage message.
 *   onNavigate(view)   function  'all' | 'visited' | 'notVisited' | 'favourites' | 'regions' ...
 *   onAddNew()         function  Opens the add form.
 *   onSelectPandal(id) function  Opens the details view.
 *   onToggleVisited(id) function Quick "mark visited" action on the Up next list.
 *   onLoadSamples()    optional  Adds demo records from the empty state.
 */
export default function Dashboard({
    pandals,
    isLoading = false,
    storageError = null,
    onDismissError,
    onNavigate,
    onAddNew,
    onSelectPandal,
    onToggleVisited,
    onLoadSamples,
}) {
    const stats = useMemo(() => {
        const total = pandals.length;
        const visited = pandals.filter((pandal) => pandal.visited).length;
        const favourites = pandals.filter((pandal) => pandal.favourite).length;
        const percent = total ? Math.round((visited / total) * 100) : 0;

        const regions = REGIONS.map((region) => {
            const items = pandals.filter((pandal) => pandal.region === region);
            const regionVisited = items.filter((pandal) => pandal.visited).length;
            return {
                region,
                total: items.length,
                visited: regionVisited,
                percent: items.length ? Math.round((regionVisited / items.length) * 100) : 0,
            };
        });

        const recent = pandals
            .filter((pandal) => pandal.visited)
            .sort(
                (a, b) =>
                    (b.visitDate || '').localeCompare(a.visitDate || '') || b.updatedAt.localeCompare(a.updatedAt),
            )
            .slice(0, 4);

        // The visit list: not visited yet, favourites first, then alphabetical.
        const upcoming = pandals
            .filter((pandal) => !pandal.visited)
            .sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.clubName.localeCompare(b.clubName))
            .slice(0, 5);
        const upcomingTotal = total - visited;

        return { total, visited, notVisited: total - visited, favourites, percent, regions, recent, upcoming, upcomingTotal };
    }, [pandals]);

    const hasDemo = pandals.some((pandal) => pandal.isSample);

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-bengali text-3xl font-semibold text-[#2A2622] sm:text-4xl">
    তোমার পুজো পরিক্রমা
</h1>
<p className="mt-1.5 max-w-xl text-[#6B645C]">
    কতগুলো প্যান্ডেল ঘোরা হল, আর কোনগুলো এখনও বাকি, এক নজরে দেখে নাও।
</p>
                </div>
            </header>

            {storageError && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-[#F4C7BC] bg-[#FDEEEA] p-4 text-sm text-[#8F2210]"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="flex-1">{storageError}</p>
                    {onDismissError && (
                        <button
                            type="button"
                            onClick={onDismissError}
                            aria-label="Dismiss message"
                            className="rounded p-0.5 hover:bg-[#F8D9D1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}

            {!isLoading && stats.total === 0 ? (
                <div className={`${ui.card} flex flex-col items-center px-6 py-16 text-center`}>
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FDEEEA] text-[#D9381E]">
                        <Landmark className="h-8 w-8" strokeWidth={1.5} />
                    </span>
                    <h2 className="mt-5 font-serif text-2xl font-semibold text-[#2A2622]">Start your pandal list</h2>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6B645C]">
                        Add the clubs you want to see this Pujo. Your dashboard will fill in as you add them and mark visits.
                    </p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                        <button type="button" onClick={onAddNew} className={ui.primaryBtn}>
                            <Plus className="h-4 w-4" />
                            Add a puja club
                        </button>
                        {onLoadSamples && (
                            <button type="button" onClick={onLoadSamples} className={ui.secondaryBtn}>
                                <Sparkles className="h-4 w-4" />
                                Load demo data
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Progress and quick actions */}
                    <div className="grid gap-5 lg:grid-cols-3">
                        <section className={`${ui.card} p-6 lg:col-span-2`} aria-labelledby="progress-title">
                            <h2 id="progress-title" className="text-sm font-medium text-[#6B645C]">
                                Overall visit progress
                            </h2>
                            <div className="mt-2 flex items-baseline gap-3">
                                {isLoading ? (
                                    <span className="block h-14 w-32 animate-pulse rounded bg-[#EFE9DB]" />
                                ) : (
                                    <>
                                        <span className="font-serif text-6xl font-semibold tabular-nums text-[#D9381E]">
                                            {stats.percent}%
                                        </span>
                                        <span className="text-[#4A443D]">
                                            {stats.visited} of {stats.total} pandals visited
                                        </span>
                                    </>
                                )}
                            </div>
                            <div
                                role="progressbar"
                                aria-label="Overall visit progress"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={stats.percent}
                                className="mt-5 h-3 overflow-hidden rounded-full bg-[#EFE9DB]"
                            >
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#D9381E] to-[#B58B2E] transition-[width] duration-700 ease-out motion-reduce:transition-none"
                                    style={{ width: `${stats.percent}%` }}
                                />
                            </div>
                            <p className="mt-3 text-sm text-[#6B645C]">
                                {stats.total === stats.visited && stats.total > 0
                                    ? 'You have visited every pandal on your list.'
                                    : `${stats.notVisited} still to go.`}
                            </p>
                            {hasDemo && (
                                <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#F7EFD9] px-3 py-2 text-xs text-[#6F5516]">
                                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    Some records are demo data and are not verified. Edit them with real details or delete them.
                                </p>
                            )}
                        </section>

                        <section className={`${ui.card} flex flex-col gap-3 p-6`} aria-labelledby="actions-title">
                            <h2 id="actions-title" className="font-serif text-xl font-semibold text-[#2A2622]">
                                Quick actions
                            </h2>
                            <button type="button" onClick={onAddNew} className={`${ui.primaryBtn} w-full justify-start`}>
                                <Plus className="h-4 w-4" />
                                Add a new puja club
                            </button>
                            <button type="button" onClick={() => onNavigate('all')} className={`${ui.secondaryBtn} w-full justify-start`}>
                                <Landmark className="h-4 w-4" />
                                Explore all pandals
                            </button>
                            <button type="button" onClick={() => onNavigate('regions')} className={`${ui.secondaryBtn} w-full justify-start`}>
                                <Compass className="h-4 w-4" />
                                Browse by region
                            </button>
                        </section>
                    </div>

                    {/* Summary cards */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            icon={Landmark}
                            label="Total puja clubs"
                            value={stats.total}
                            tone="bg-[#F7EFD9] text-[#8A6A1C]"
                            loading={isLoading}
                            onClick={() => onNavigate('all')}
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Visited pandals"
                            value={stats.visited}
                            tone="bg-[#E4F1E8] text-[#255B3C]"
                            loading={isLoading}
                            onClick={() => onNavigate('visited')}
                        />
                        <StatCard
                            icon={Footprints}
                            label="Not visited pandals"
                            value={stats.notVisited}
                            tone="bg-[#ECEAE6] text-[#3F3A34]"
                            loading={isLoading}
                            onClick={() => onNavigate('notVisited')}
                        />
                        <StatCard
                            icon={Heart}
                            label="Favourite pandals"
                            value={stats.favourites}
                            tone="bg-[#FDEEEA] text-[#D9381E]"
                            loading={isLoading}
                            onClick={() => onNavigate('favourites')}
                        />
                    </div>

                    {/* Region breakdown */}
                    <section aria-labelledby="regions-title">
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <h2 id="regions-title" className="font-serif text-xl font-semibold text-[#2A2622]">
                                By region
                            </h2>
                            <button
                                type="button"
                                onClick={() => onNavigate('regions')}
                                className="rounded-lg px-2 py-1 text-sm font-semibold text-[#B82D16] transition-colors hover:bg-[#FDEEEA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                            >
                                Explore regions
                            </button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {stats.regions.map((item) => (
                                <button
                                    key={item.region}
                                    type="button"
                                    onClick={() => onNavigate('regions')}
                                    className={`${ui.card} p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(42,38,34,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B58B2E]`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${REGION_STYLES[item.region].bar}`} />
                                        <span className="text-sm font-semibold text-[#2A2622]">{item.region}</span>
                                    </div>
                                    <p className="mt-3 font-serif text-3xl font-semibold tabular-nums text-[#2A2622]">
                                        {isLoading ? '–' : item.total}
                                        <span className="ml-1.5 font-sans text-sm font-normal text-[#6B645C]">
                                            {item.total === 1 ? 'pandal' : 'pandals'}
                                        </span>
                                    </p>
                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EFE9DB]">
                                        <div
                                            className={`h-full rounded-full transition-[width] duration-500 ${REGION_STYLES[item.region].bar}`}
                                            style={{ width: `${item.percent}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-[#6B645C]">
                                        {item.total === 0 ? 'Nothing added yet' : `${item.visited} visited, ${item.percent}% done`}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Recent and upcoming */}
                    <div className="grid gap-5 lg:grid-cols-2">
                        <ListCard
                            title="Recently visited"
                            description="Your latest stops."
                            hasItems={stats.recent.length > 0}
                            emptyText="You have not marked any pandal as visited yet."
                            actionText="See what's next"
                            onEmptyAction={() => onNavigate('notVisited')}
                            footer={
                                <button
                                    type="button"
                                    onClick={() => onNavigate('visited')}
                                    className="mt-2 self-start rounded-lg px-2 py-1 text-sm font-semibold text-[#B82D16] hover:bg-[#FDEEEA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                                >
                                    View all visited
                                </button>
                            }
                        >
                            {stats.recent.map((pandal) => (
                                <MiniRow
                                    key={pandal.id}
                                    pandal={pandal}
                                    meta={`${pandal.visitDate ? `Visited ${formatDate(pandal.visitDate)}` : 'Visited'} in ${pandal.locality || pandal.region}`}
                                    onSelect={onSelectPandal}
                                />
                            ))}
                        </ListCard>

                        <ListCard
                            title="Up next on your list"
                            description="Favourites come first."
                            hasItems={stats.upcoming.length > 0}
                            emptyText={
                                stats.total > 0 ? 'Nothing left to visit. Add another club to keep the trail going.' : 'Add a club to start your list.'
                            }
                            actionText="Add a puja club"
                            onEmptyAction={onAddNew}
                            footer={
                                stats.upcomingTotal > stats.upcoming.length && (
                                    <button
                                        type="button"
                                        onClick={() => onNavigate('notVisited')}
                                        className="mt-2 self-start rounded-lg px-2 py-1 text-sm font-semibold text-[#B82D16] hover:bg-[#FDEEEA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
                                    >
                                        View all {stats.upcomingTotal} not visited
                                    </button>
                                )
                            }
                        >
                            {stats.upcoming.map((pandal) => (
                                <MiniRow
                                    key={pandal.id}
                                    pandal={pandal}
                                    meta={[pandal.locality, pandal.nearestMetro && `${pandal.nearestMetro} metro`].filter(Boolean).join(', ') || pandal.region}
                                    actionLabel="Mark visited"
                                    onAction={onToggleVisited}
                                    onSelect={onSelectPandal}
                                />
                            ))}
                        </ListCard>
                    </div>
                </>
            )}
        </div>
    );
}