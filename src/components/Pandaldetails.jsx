/**
 * PandalDetails.jsx
 *
 * Full view of one puja club: image gallery, details, visit tracking and Google Maps links.
 *
 * Maps behaviour (implemented in Pandalform.jsx so the list cards share it):
 *   Get Directions     https://www.google.com/maps/dir/?api=1&destination=<lat,lng or address>
 *                      Coordinates are preferred; otherwise the address. Always encodeURIComponent.
 *   Open in Google Maps  The saved Google Maps link if it is a valid https Google link,
 *                      otherwise a search URL built from the coordinates or the address.
 *
 * Mobile: swipe left or right on the main photo to change image; the lightbox allows
 * pinch-zoom (the only place zoom is wanted); all tap targets are 40px or larger.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  Heart,
  Landmark,
  Maximize2,
  MapPin,
  Navigation,
  Pencil,
  Sparkles,
  Train,
  Trash2,
  X,
} from 'lucide-react';
import {
  ConfirmDialog,
  ImageWithFallback,
  RegionBadge,
  StatusBadge,
  formatDate,
  getDirectionsUrl,
  getPlaceUrl,
  hasCoordinates,
  ui,
} from './Pandalform';

const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16325C]';

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E7ECF5] text-[#16325C]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#6B645C]">{label}</p>
        <div className="mt-0.5 break-words text-sm text-[#2A2622]">{children}</div>
      </div>
    </div>
  );
}

function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[65] flex items-center justify-center bg-[#0F2547]/95 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close full size image"
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:top-4"
      >
        <X className="h-5 w-5" />
      </button>
      {/* pinch-zoom is intentionally allowed here, and only here */}
      <img
        src={src}
        alt={alt}
        style={{ touchAction: 'pinch-zoom' }}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

/**
 * Props
 *   pandal              object   The record to show. If null or missing, a "not found" state appears.
 *   onBack()            function Return to the previous list or the dashboard.
 *   onEdit(id)          function Open the form for this pandal.
 *   onDelete(id)        function Called after the user confirms deletion.
 *   onToggleFavourite(id), onToggleVisited(id)
 *   backLabel           string   Text for the back button (default "Back").
 */
export default function PandalDetails({
  pandal,
  onBack,
  onEdit,
  onDelete,
  onToggleFavourite,
  onToggleVisited,
  backLabel = 'Back',
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const touchStart = useRef(null);

  // Start on the first image whenever a different pandal opens.
  useEffect(() => {
    setActiveIndex(0);
    setLightbox(false);
    setConfirmDelete(false);
  }, [pandal?.id]);

  if (!pandal) {
    return (
      <div className={`${ui.card} flex flex-col items-center px-5 py-14 text-center sm:px-6 sm:py-16`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E7ECF5] text-[#16325C]">
          <Landmark className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-[#2A2622]">This pandal is no longer here</h2>
        <p className="mt-1.5 max-w-sm text-sm text-[#6B645C]">It may have been deleted. Go back to see the rest of your list.</p>
        <button type="button" onClick={onBack} className={`${ui.secondaryBtn} mt-5`}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      </div>
    );
  }

  const gallery = [
    { key: 'pandal', label: 'Pandal', kind: 'pandal', src: pandal.pandalImage, alt: `${pandal.clubName} pandal` },
    { key: 'idol', label: 'Maa Durga idol', kind: 'idol', src: pandal.idolImage, alt: `Maa Durga idol at ${pandal.clubName}` },
  ];
  const current = gallery[activeIndex];
  const step = (direction) => setActiveIndex((index) => (index + direction + gallery.length) % gallery.length);
  const coordinates = hasCoordinates(pandal);

  // Horizontal swipe on the main photo. Vertical movement is left to the page scroll.
  const onTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <button
        type="button"
        onClick={onBack}
        className={`-ml-2 inline-flex min-h-10 touch-manipulation items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#16325C] transition-colors hover:bg-[#EEF1F7] ${ring}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-5">
        {/* Gallery */}
        <div className="min-w-0 space-y-3 lg:col-span-3">
          <div
            className={`${ui.card} relative touch-pan-y overflow-hidden`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <ImageWithFallback
              key={current.key}
              src={current.src}
              alt={current.alt}
              kind={current.kind}
              className="aspect-[4/3] w-full sm:aspect-[16/10]"
            />
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#16325C] shadow-sm">
              {current.label}
            </span>
            {current.src && (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                aria-label="View full size"
                title="View full size"
                className="absolute right-3 top-3 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full bg-white/95 text-[#16325C] shadow-sm transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16325C]"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            {['previous', 'next'].map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => step(direction === 'next' ? 1 : -1)}
                aria-label={`Show ${direction} image`}
                className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/95 text-[#16325C] shadow transition-colors hover:bg-white ${ring} ${
                  direction === 'next' ? 'right-3' : 'left-3'
                }`}
              >
                {direction === 'next' ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
            ))}
            {/* position dots */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
              {gallery.map((item, index) => (
                <span
                  key={item.key}
                  className={`h-1.5 rounded-full bg-white shadow transition-all ${index === activeIndex ? 'w-5' : 'w-1.5 opacity-70'}`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3" role="tablist" aria-label="Gallery images">
            {gallery.map((item, index) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                className={`flex min-w-0 touch-manipulation items-center gap-2.5 rounded-xl border bg-white p-2 text-left transition-colors sm:gap-3 ${ring} ${
                  index === activeIndex ? 'border-[#F5822A] ring-1 ring-[#F5822A]' : 'border-[#D9D4C6] hover:border-[#B9C4DA]'
                }`}
              >
                <ImageWithFallback src={item.src} alt="" kind={item.kind} compact className="h-12 w-12 shrink-0 rounded-lg sm:h-14 sm:w-14" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[#2A2622]">{item.label}</span>
                  <span className="block truncate text-xs text-[#6B645C]">{item.src ? 'Photo added' : 'No photo yet'}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary and actions */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <div className={`${ui.card} p-5 sm:p-6`}>
            <div className="flex flex-wrap items-center gap-2">
              <RegionBadge region={pandal.region} />
              <StatusBadge visited={pandal.visited} />
              {pandal.isSample && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F7EFD9] px-2.5 py-0.5 text-xs font-medium text-[#6F5516] ring-1 ring-inset ring-[#E8D6A5]">
                  <Sparkles className="h-3 w-3" />
                  Demo record
                </span>
              )}
            </div>
            <h1 className="mt-3 break-words font-serif text-2xl font-semibold leading-tight text-[#2A2622] sm:text-3xl">
              {pandal.clubName}
            </h1>
            {pandal.locality && (
              <p className="mt-1 flex items-center gap-1.5 text-[#6B645C]">
                <MapPin className="h-4 w-4 shrink-0 text-[#F5822A]" />
                {pandal.locality}
              </p>
            )}

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <a
                href={getDirectionsUrl(pandal)}
                target="_blank"
                rel="noopener noreferrer"
                className={ui.primaryBtn}
              >
                <Navigation className="h-4 w-4" />
                Get Directions
                <span className="sr-only"> (opens Google Maps in a new tab)</span>
              </a>
              <a href={getPlaceUrl(pandal)} target="_blank" rel="noopener noreferrer" className={ui.secondaryBtn}>
                <ExternalLink className="h-4 w-4" />
                Open in Google Maps
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>

          <div className={`${ui.card} space-y-4 p-5 sm:p-6`}>
            <h2 className="font-serif text-lg font-semibold text-[#2A2622]">Visit tracking</h2>
            <InfoRow icon={Calendar} label="Visit date">
              {pandal.visited ? (
                pandal.visitDate ? (
                  formatDate(pandal.visitDate)
                ) : (
                  'Visited, date not recorded'
                )
              ) : (
                <span className="text-[#6B645C]">Not visited yet</span>
              )}
            </InfoRow>

            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
              <button
                type="button"
                onClick={() => onToggleVisited(pandal.id)}
                aria-pressed={pandal.visited}
                className={`inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${ring} ${
                  pandal.visited
                    ? 'border-[#BBDCC6] bg-[#E4F1E8] text-[#255B3C] hover:bg-[#D6EADC]'
                    : 'border-[#D9D4C6] bg-white text-[#16325C] hover:border-[#B9C4DA] hover:bg-[#F4F6FA]'
                }`}
              >
                {pandal.visited ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                <span>{pandal.visited ? 'Visited. Mark as not visited' : 'Mark as visited'}</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleFavourite(pandal.id)}
                aria-pressed={pandal.favourite}
                className={`inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E] ${
                  pandal.favourite
                    ? 'border-[#F4C7BC] bg-[#FDEEEA] text-[#B82D16] hover:bg-[#FBE2DB]'
                    : 'border-[#D9D4C6] bg-white text-[#16325C] hover:border-[#B9C4DA] hover:bg-[#F4F6FA]'
                }`}
              >
                <Heart className={`h-4 w-4 shrink-0 ${pandal.favourite ? 'fill-current' : ''}`} />
                {pandal.favourite ? 'In favourites' : 'Add to favourites'}
              </button>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button type="button" onClick={() => onEdit(pandal.id)} className={`${ui.secondaryBtn} flex-1`}>
              <Pencil className="h-4 w-4" />
              Edit details
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={`${ui.secondaryBtn} text-[#B82D16] hover:!border-[#F4C7BC] hover:!bg-[#FDEEEA]`}
              aria-label={`Delete ${pandal.clubName}`}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-5">
        <section className={`${ui.card} min-w-0 p-5 sm:p-6 lg:col-span-3`} aria-labelledby="about-title">
          <h2 id="about-title" className="font-serif text-xl font-semibold text-[#2A2622]">
            About this pandal
          </h2>
          {pandal.description ? (
            <p className="mt-3 max-w-prose whitespace-pre-line break-words leading-relaxed text-[#4A443D]">
              {pandal.description}
            </p>
          ) : (
            <div className="mt-3 rounded-xl bg-[#F7F9FC] p-4">
              <p className="text-sm text-[#6B645C]">
                No description yet. Add the theme, the idol style and anything worth seeing nearby.
              </p>
              <button type="button" onClick={() => onEdit(pandal.id)} className={`${ui.secondaryBtn} mt-3`}>
                <Pencil className="h-4 w-4" />
                Add a description
              </button>
            </div>
          )}
        </section>

        <section className={`${ui.card} min-w-0 space-y-5 p-5 sm:p-6 lg:col-span-2`} aria-labelledby="location-title">
          <h2 id="location-title" className="font-serif text-xl font-semibold text-[#2A2622]">
            Location
          </h2>
          <InfoRow icon={MapPin} label="Full address">
            {pandal.address || <span className="text-[#6B645C]">Address not added</span>}
          </InfoRow>
          <InfoRow icon={Train} label="Nearest metro">
            {pandal.nearestMetro ? (
              <>
                {pandal.nearestMetro}
                {pandal.metroDistance && <span className="text-[#6B645C]">, {pandal.metroDistance} walk</span>}
              </>
            ) : (
              <span className="text-[#6B645C]">Not added yet</span>
            )}
          </InfoRow>
          <InfoRow icon={Navigation} label="Coordinates">
            {coordinates ? (
              <span className="tabular-nums">
                {pandal.latitude}, {pandal.longitude}
              </span>
            ) : (
              <span className="text-[#6B645C]">Not added. Directions use the address.</span>
            )}
          </InfoRow>
        </section>
      </div>

      {lightbox && current.src && <Lightbox src={current.src} alt={current.alt} onClose={() => setLightbox(false)} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this pandal?"
        message={`${pandal.clubName} will be removed from your list, including its photos and visit history. This cannot be undone.`}
        confirmLabel="Delete pandal"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(pandal.id);
        }}
      />
    </div>
  );
}