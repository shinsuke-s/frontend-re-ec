import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/data";
import { ProductGallery } from "@/components/ProductGallery";
import { fetchExternalProduct, fetchExternalVariants } from "@/lib/productRepo";
import { VariantSelector } from "@/components/VariantSelector";
import { ShareButtons } from "@/components/ShareButtons";
import { RelatedProducts } from "@/components/RelatedProducts";
import type { ProductRecord } from "@/lib/productRepo";

const copy = {
  reserveBadge: "\u4e88\u7d04",
  reserveStatus: "\u4e88\u7d04\u53d7\u4ed8\u4e2d",
  lowStock: "\u6b8b\u308a\u308f\u305a\u304b",
  inStock: "\u5728\u5eab\u3042\u308a",
  outOfStock: "\u5728\u5eab\u306a\u3057",
  leadReserve:
    "\u767a\u9001\u6642\u671f: \u4e88\u7d04\u53d7\u4ed8\u4e2d\uff08\u5165\u8377\u6b21\u7b2c\u767a\u9001\uff09",
  leadNormal:
    "\u767a\u9001\u6642\u671f: \u901a\u5e382\u301c5\u55b6\u696d\u65e5\u3067\u767a\u9001",
  share: "\u30b7\u30a7\u30a2",
  faqTitle: "\u5546\u54c1\u306b\u3064\u3044\u3066\u306eFAQ",
  related: "\u95a2\u9023\u5546\u54c1",
  description: "\u5546\u54c1\u8aac\u660e",
  view: "\u8a73\u7d30",
  addToCart: "\u30ab\u30fc\u30c8\u306b\u8ffd\u52a0",
  category: "\u30ab\u30c6\u30b4\u30ea",
  variation: "\u30d0\u30ea\u30a8\u30fc\u30b7\u30e7\u30f3",
  type: "\u30bf\u30a4\u30d7",
  point: "\u30dd\u30a4\u30f3\u30c8",
  normalType: "\u901a\u5e38",
  oorePoints: "RE\u30dd\u30a4\u30f3\u30c8",
} as const;

const faqs = [
  {
    q: "\u8fd4\u54c1\u30fb\u4ea4\u63db\u306f\u3067\u304d\u307e\u3059\u304b\uff1f",
    a: "\u5546\u54c1\u5230\u7740\u5f8c7\u65e5\u4ee5\u5185\u3067\u3001\u672a\u4f7f\u7528\u30fb\u672a\u958b\u5c01\u306b\u9650\u308a\u5bfe\u5fdc\u3057\u307e\u3059\u3002",
  },
  {
    q: "\u304a\u624b\u5165\u308c\u65b9\u6cd5\u3092\u6559\u3048\u3066\u304f\u3060\u3055\u3044\u3002",
    a: "\u8efd\u304f\u6c5a\u308c\u3092\u62ed\u304d\u53d6\u3063\u305f\u5f8c\u3001\u9670\u5e72\u3057\u3067\u4e7e\u71e5\u3055\u305b\u3066\u304f\u3060\u3055\u3044\u3002",
  },
  {
    q: "\u30ae\u30d5\u30c8\u5305\u88c5\u306f\u53ef\u80fd\u3067\u3059\u304b\uff1f",
    a: "\u73fe\u5728\u30ae\u30d5\u30c8\u5305\u88c5\u306f\u6e96\u5099\u4e2d\u3067\u3059\u3002\u518d\u958b\u307e\u3067\u304a\u5f85\u3061\u304f\u3060\u3055\u3044\u3002",
  },
];

const getStockStatus = (item: ProductRecord) => {
  const isReserved = item.type === "per_order";
  const hasStockFlag =
    typeof item.has_stock === "boolean" ? item.has_stock : true;
  const stockCount =
    Number.isFinite(item.stock) && item.stock > 0 ? item.stock : null;
  if (isReserved) return copy.reserveStatus;
  if (!hasStockFlag) return copy.outOfStock;
  if (stockCount !== null && stockCount <= 5) return copy.lowStock;
  return copy.inStock;
};

const getVariantLabel = (item: ProductRecord) =>
  [item.dimension1, item.dimension2].filter(Boolean).join(" / ");

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await fetchExternalProduct(params.id);

  if (!product) {
    return notFound();
  }

  let variants = await fetchExternalVariants(product.slug);
  if ((!variants || variants.length === 0) && product.groupId) {
    variants = await fetchExternalVariants(product.groupId);
  }
  const variantList = variants.length ? variants : [product];
  const related = variantList.filter((v) => v.slug !== product.slug);

  const isReserved = product.type === "per_order";
  const isNew = product.type === "new";
  const stockStatus = getStockStatus(product);
  const leadTime = isReserved ? copy.leadReserve : copy.leadNormal;

  return (
    <div className="page product-detail">
      <div className="product-detail__gallery">
        <ProductGallery images={product.images} alt={product.name} />
      </div>

      <div className="product-detail__info">
        <div className="inline" style={{ gap: 8, flexWrap: "wrap" }}>
          {isNew && <span className="status-pill">NEW</span>}
          {isReserved && (
            <span className="status-pill">{copy.reserveBadge}</span>
          )}
          {product.category && (
            <span className="status-pill">{product.category}</span>
          )}
        </div>
        <h1>{product.name}</h1>
        <p className="muted">{product.description}</p>
        <div className="meta">
          <span className="price">{formatCurrency(product.price)}</span>
          <span className="tag">{stockStatus}</span>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {copy.oorePoints}
          {typeof product.point === "number" ? ` : ${product.point}pt` : ""}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {leadTime}
        </div>

        <VariantSelector variants={variantList} currentSlug={product.slug} />

        <div className="stack" style={{ gap: 6 }}>
          <ShareButtons title={product.name} />
        </div>
      </div>

      <div className="panel product-faq">
        <div className="panel-header">
          <h2>{copy.faqTitle}</h2>
        </div>
        <div className="product-faq__list">
          {faqs.map((faq, index) => (
            <details
              key={`${product.id}-faq-${index}`}
              className="product-faq__item"
              open
            >
              <summary className="product-faq__question">
                <span className="product-faq__badge">Q</span>
                <span className="product-faq__title">{faq.q}</span>
              </summary>
              <div className="product-faq__answer">
                <span className="product-faq__badge is-answer">A</span>
                <p>{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <RelatedProducts
          items={related}
          title={copy.related}
          variationLabel={copy.variation}
          viewLabel={copy.view}
        />
      )}
    </div>
  );
}
