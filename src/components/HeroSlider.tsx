"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Slide = {
  id: string;
  image: string;
  alt: string;
};

const intervalMs = 6200;

type HeroSliderProps = {
  initialSlides?: Slide[];
};

export function HeroSlider({ initialSlides = [] }: HeroSliderProps) {
  const [active, setActive] = useState(0);
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = (next: number) => {
    setActive((prev) => {
      if (prev === next) return prev;
      return next;
    });
  };

  const go = (dir: 1 | -1) => {
    setActive((prev) => (prev + slides.length + dir) % slides.length);
  };

  useEffect(() => {
    if (initialSlides.length > 0) {
      setSlides(initialSlides);
      setActive(0);
    }
  }, [initialSlides]);

  useEffect(() => {
    if (initialSlides.length > 0) return;
    const fetchBanners = async () => {
      try {
        const res = await fetch("/api/banners", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && Array.isArray(data?.items) && data.items.length > 0) {
          setSlides(data.items);
          setActive(0);
        }
      } catch {
        setSlides([]);
      }
    };
    fetchBanners();
  }, [initialSlides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const reset = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => go(1), intervalMs);
    };
    reset();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="hero">
      <div className="hero-viewport">
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            className={`hero-slide ${index === active ? "is-active" : ""}`}
            aria-hidden={index !== active}
          >
            <div className="hero-media">
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                sizes="100vw"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
              />
              <div className="hero-overlay">
                <div className="hero-glow" />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hero-dots" aria-label="スライドナビゲーション">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            className={`hero-dot ${index === active ? "is-active" : ""}`}
            onClick={() => goTo(index)}
            aria-label={`${index + 1}枚目のスライド`}
          />
        ))}
      </div>
    </section>
  );
}
