"use client";

import { useEffect, useState } from "react";

type Props = {
  title: string;
};

export function ShareButtons({ title }: Props) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(window.location.href);
    }
  }, []);

  const handleShare = async () => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // ignore
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="inline" style={{ gap: 8, flexWrap: "wrap" }}>
      <button className="btn secondary" type="button" onClick={handleShare}>
        <img
          src="/images/share.svg"
          alt=""
          aria-hidden="true"
          style={{ width: 18, height: 18 }}
        />
        {"\u30b7\u30a7\u30a2"}
      </button>
    </div>
  );
}
