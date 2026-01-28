"use client";

import { useEffect, useRef, useState } from "react";

export function GlobalLoading() {
  const [pending, setPending] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const update = (delta: number) => {
      countRef.current = Math.max(0, countRef.current + delta);
      setPending(countRef.current);
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const shouldTrack = url.includes("/api/");

      if (shouldTrack) update(1);
      try {
        return await originalFetch(input, init);
      } finally {
        if (shouldTrack) update(-1);
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (pending <= 0) return null;

  return (
    <div className="global-loading" role="status" aria-live="polite">
      <div className="global-loading__backdrop" />
      <div className="global-loading__spinner" aria-label="Loading" />
    </div>
  );
}
