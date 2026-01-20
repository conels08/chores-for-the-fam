"use client";

import { useEffect } from "react";

/**
 * Minimal bfcache restore handler.
 * If the page is restored from the browser back/forward cache, force a reload.
 * No router.refresh, no Supabase auth interactions.
 */
export default function SessionRefreshListener() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
