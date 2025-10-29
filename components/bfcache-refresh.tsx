"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function BFCacheRefresh() {
  const router = useRouter();

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // If page was restored from bfcache, refresh to get fresh data
      if (event.persisted) {
        console.log("Page restored from bfcache, refreshing data...");
        router.refresh();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [router]);

  return null;
}

