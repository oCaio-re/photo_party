"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoItem } from "@/components/LiveGalleryView";
import type { GalleryFacets } from "@/lib/photo-queries";
import { guestHeaders } from "@/hooks/useGuestIdentity";

const POLL_INTERVAL_MS = 5000;
// Every Nth poll re-reads the first page to refresh counts, facets and drop deleted/hidden photos
const FULL_REFRESH_EVERY = 6;

export const EMPTY_FACETS: GalleryFacets = { totalApproved: 0, momentCounts: {}, momentCovers: {}, tables: [] };

function toTime(value: string | number): number {
  return new Date(value).getTime();
}

function joinQuery(...parts: string[]): string {
  return parts.filter(Boolean).join("&");
}

interface PhotoPage {
  photos: PhotoItem[];
  nextCursor: string | null;
  facets?: GalleryFacets;
}

interface LoadedPhotos {
  /** Filter query these photos were loaded for. */
  query: string;
  photos: PhotoItem[];
  cursor: string | null;
}

/**
 * Live Gallery data. Filters and sorting run on the server (`query`, e.g. "moment=festa&sort=likes"),
 * so they cover the whole Event rather than only loaded pages. The server renders the unfiltered
 * first page; after that this hook
 * - refetches page one whenever `query` changes (`isSwitching` meanwhile),
 * - polls only for photos newer than the newest one loaded (`since`, newest-first views),
 * - periodically refreshes the first page for like/comment counts and Event-wide facets,
 * - loads further pages on demand (`cursor`).
 */
export function useGalleryPhotos(options: {
  slug: string;
  query: string;
  initialPhotos: PhotoItem[];
  initialCursor: string | null;
  initialFacets?: GalleryFacets;
}) {
  const { slug, query } = options;
  const [loaded, setLoaded] = useState<LoadedPhotos>({
    query: "",
    photos: options.initialPhotos,
    cursor: options.initialCursor,
  });
  const [facets, setFacets] = useState<GalleryFacets>(options.initialFacets ?? EMPTY_FACETS);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadedRef = useRef(loaded);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  const fetchPage = useCallback(
    async (queryString: string): Promise<PhotoPage | null> => {
      const res = await fetch(`/api/events/${slug}/photos?${queryString}`, { headers: guestHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data.photos)) return null;
      return {
        photos: data.photos as PhotoItem[],
        nextCursor: (data.nextCursor as string | null) ?? null,
        facets: data.facets as GalleryFacets | undefined,
      };
    },
    [slug]
  );

  // Filters changed: load their first page from the server
  useEffect(() => {
    if (loadedRef.current.query === query) return;
    let cancelled = false;
    fetchPage(query)
      .then((page) => {
        if (cancelled || !page) return;
        if (page.facets) setFacets(page.facets);
        setLoaded({ query, photos: page.photos, cursor: page.nextCursor });
      })
      .catch((e) => console.warn("Filter load error:", e));
    return () => {
      cancelled = true;
    };
  }, [query, fetchPage]);

  useEffect(() => {
    const sortsByLikes = new URLSearchParams(query).get("sort") === "likes";
    let tick = 0;

    const poll = async () => {
      const current = loadedRef.current;
      if (current.query !== query) return; // still switching filters
      tick++;
      try {
        if (tick % FULL_REFRESH_EVERY === 0 || current.photos.length === 0) {
          const page = await fetchPage(query);
          if (!page) return;
          if (page.facets) setFacets(page.facets);
          setLoaded((prev) => {
            if (prev.query !== query) return prev;
            if (page.photos.length === 0) return { ...prev, photos: [], cursor: null };
            const freshIds = new Set(page.photos.map((p) => p.id));
            let rest: PhotoItem[];
            if (sortsByLikes) {
              // Keep photos beyond the refreshed first page that were loaded via "load more"
              rest = prev.photos.slice(page.photos.length).filter((p) => !freshIds.has(p.id));
            } else {
              const oldestFresh = Math.min(...page.photos.map((p) => toTime(p.createdAt)));
              rest = prev.photos.filter((p) => toTime(p.createdAt) < oldestFresh);
            }
            return {
              query,
              photos: [...page.photos, ...rest],
              cursor: prev.photos.length === 0 ? page.nextCursor : prev.cursor,
            };
          });
          return;
        }

        // In the most-liked view new photos (0 likes) belong at the end; full refreshes cover them
        if (sortsByLikes) return;

        const newest = Math.max(...current.photos.map((p) => toTime(p.createdAt)));
        const page = await fetchPage(joinQuery(query, `since=${newest}`));
        if (!page || page.photos.length === 0) return;
        setLoaded((prev) => {
          if (prev.query !== query) return prev;
          const known = new Set(prev.photos.map((p) => p.id));
          const fresh = page.photos.filter((p) => !known.has(p.id));
          return fresh.length > 0 ? { ...prev, photos: [...fresh, ...prev.photos] } : prev;
        });
      } catch (e) {
        console.warn("Polling error:", e);
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchPage, query]);

  const isSwitching = loaded.query !== query;

  const loadMore = useCallback(async () => {
    const current = loadedRef.current;
    if (current.cursor === null || current.query !== query || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await fetchPage(joinQuery(query, `cursor=${encodeURIComponent(current.cursor)}`));
      if (!page) return;
      setLoaded((prev) => {
        if (prev.query !== query) return prev;
        const known = new Set(prev.photos.map((p) => p.id));
        return {
          ...prev,
          photos: [...prev.photos, ...page.photos.filter((p) => !known.has(p.id))],
          cursor: page.nextCursor,
        };
      });
    } catch (e) {
      console.warn("Load more error:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [query, isLoadingMore, fetchPage]);

  const updatePhoto = useCallback((photoId: string, patch: (photo: PhotoItem) => Partial<PhotoItem>) => {
    setLoaded((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === photoId ? { ...p, ...patch(p) } : p)),
    }));
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setLoaded((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }));
  }, []);

  return {
    photos: loaded.photos,
    facets,
    isSwitching,
    hasMore: !isSwitching && loaded.cursor !== null,
    isLoadingMore,
    loadMore,
    updatePhoto,
    removePhoto,
  };
}
