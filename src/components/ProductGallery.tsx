"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  images: string[];
  alt: string;
};

export function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [zoomNatural, setZoomNatural] = useState<{ width: number; height: number } | null>(null);
  const safeImages = images.length > 0 ? images : ["/hero/slide-1.webp"];
  const imageCount = safeImages.length;

  const openZoom = (index: number) => {
    setActive(index);
    setZoomIndex(index);
  };

  const closeZoom = () => {
    setZoomIndex(null);
  };

  const goZoom = (dir: 1 | -1) => {
    setZoomIndex((prev) => {
      if (prev === null) return prev;
      const next = (prev + imageCount + dir) % imageCount;
      setActive(next);
      return next;
    });
  };

  useEffect(() => {
    if (zoomIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeZoom();
      if (event.key === "ArrowRight") goZoom(1);
      if (event.key === "ArrowLeft") goZoom(-1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zoomIndex, imageCount]);

  useEffect(() => {
    if (zoomIndex !== null) setZoomNatural(null);
  }, [zoomIndex]);

  return (
    <div className="product-gallery">
      <div className="product-gallery__thumbs">
        {safeImages.map((src, index) => (
          <button
            key={src + index}
            className={`product-gallery__thumb ${index === active ? "is-active" : ""}`}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => openZoom(index)}
            aria-label={`繧ｵ繝繝阪う繝ｫ ${index + 1}`}
          >
            <Image src={src} alt={`${alt} 繧ｵ繝繝阪う繝ｫ ${index + 1}`} fill sizes="96px" />
          </button>
        ))}
      </div>
      <div className="product-gallery__main">
        <Image src={safeImages[active]} alt={alt} fill sizes="(max-width: 768px) 100vw, 640px" />
      </div>
      {zoomIndex !== null && (
        <div
          className="product-gallery__lightbox"
          onClick={closeZoom}
          role="dialog"
          aria-modal="true"
        >
          <div className="product-gallery__lightbox-inner">
            <button
              className="product-gallery__lightbox-arrow is-prev"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goZoom(-1);
              }}
              aria-label="蜑阪・逕ｻ蜒上∈"
              disabled={imageCount < 2}
            >
              {"<"}
            </button>
            <div
              className="product-gallery__lightbox-media"
              onClick={(event) => {
                event.stopPropagation();
                if (!zoomNatural) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;
                const scale = Math.min(rect.width / zoomNatural.width, rect.height / zoomNatural.height);
                const drawnWidth = zoomNatural.width * scale;
                const drawnHeight = zoomNatural.height * scale;
                const offsetX = (rect.width - drawnWidth) / 2;
                const offsetY = (rect.height - drawnHeight) / 2;
                const withinX = clickX >= offsetX && clickX <= offsetX + drawnWidth;
                const withinY = clickY >= offsetY && clickY <= offsetY + drawnHeight;
                if (!withinX || !withinY) closeZoom();
              }}
            >
              <Image
                src={safeImages[zoomIndex]}
                alt={`${alt} 諡｡螟ｧ逕ｻ蜒・${zoomIndex + 1}`}
                fill
                sizes="(max-width: 900px) 90vw, 900px"
                onLoadingComplete={(img) => {
                  setZoomNatural({ width: img.naturalWidth, height: img.naturalHeight });
                }}
              />
            </div>
            <button
              className="product-gallery__lightbox-arrow is-next"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goZoom(1);
              }}
              aria-label="谺｡縺ｮ逕ｻ蜒上∈"
              disabled={imageCount < 2}
            >
              {">"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
