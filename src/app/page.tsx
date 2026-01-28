import { HeroSlider } from "@/components/HeroSlider";
import { ProductCarousel } from "@/components/ProductCarousel";
import { fetchExternalAll } from "@/lib/productRepo";

type BannerSlide = {
  id: string;
  image: string;
  alt: string;
};

const bannerApiBase =
  process.env.EXTERNAL_PRODUCT_API_BASE || "http://192.168.0.25:4649";

const normalizeBannerImage = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const clean = url.replace(/^\/+/, "");
  return `${bannerApiBase.replace(/\/$/, "")}/resource/${clean}`;
};

const fetchBanners = async (): Promise<BannerSlide[]> => {
  try {
    const res = await fetch(
      `${bannerApiBase.replace(/\/$/, "")}/banner/app`,
      { next: { revalidate: 300 } }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    const list = Array.isArray(json?.data) ? json.data : [];
    return list
      .slice()
      .sort(
        (a: any, b: any) => Number(a?.sequence || 0) - Number(b?.sequence || 0)
      )
      .map((item: any, index: number) => ({
        id: String(item?.sequence ?? index),
        image: normalizeBannerImage(String(item?.url || "")),
        alt: `Banner ${item?.sequence ?? index + 1}`,
      }))
      .filter((item: any) => item.image);
  } catch {
    return [];
  }
};

export default async function Home() {
  const [products, banners] = await Promise.all([
    fetchExternalAll(),
    fetchBanners(),
  ]);

  return (
    <div className="page">
      <HeroSlider initialSlides={banners} />
      <ProductCarousel products={products} title="商品一覧" />
    </div>
  );
}
