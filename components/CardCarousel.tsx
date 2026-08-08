"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

/**
 * Horizontal carousel showing up to 4 cards per view (1 on mobile, 2 on tablet,
 * 4 on desktop). Pass card nodes as children.
 */
export default function CardCarousel({ children }: { children: React.ReactNode }) {
  const [ref, embla] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
    };
  }, [embla, onSelect]);

  const slides = Array.isArray(children) ? children.filter(Boolean) : [children];

  return (
    <div className="relative">
      <div ref={ref} className="overflow-hidden">
        <div className="flex -ml-4">
          {slides.map((slide, i) => (
            <div key={i} className="min-w-0 shrink-0 grow-0 basis-full pl-4 sm:basis-1/2 lg:basis-1/4">
              {slide}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Previous"
        onClick={() => embla?.scrollPrev()}
        disabled={!canPrev}
        className="absolute -left-5 top-1/2 z-10 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 hover:border-white/40 disabled:pointer-events-none disabled:opacity-0"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => embla?.scrollNext()}
        disabled={!canNext}
        className="absolute -right-5 top-1/2 z-10 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 hover:border-white/40 disabled:pointer-events-none disabled:opacity-0"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
