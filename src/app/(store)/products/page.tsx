import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/data";
import { fetchExternalSearch, type ProductRecord } from "@/lib/productRepo";

type ProductsPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const query = (searchParams?.q ?? "").trim();

  let products: ProductRecord[] = [];
  if (query) {
    products = await fetchExternalSearch(query);
  }

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Catalog</span>
        <h1>商品一覧</h1>
        {query ? (
          <div className="meta">
            <span className="tag">検索: {query}</span>
            <span className="muted">該当 {products.length} 件</span>
          </div>
        ) : (
          <div className="muted">キーワードを入力して検索してください。</div>
        )}
      </div>

      {query && products.length === 0 ? (
        <p className="muted">該当する商品がありませんでした。</p>
      ) : (
        <div className="product-list">
          <div className="product-list-grid">
            {products.map((product, index) => (
              <div key={product.id} className="product-card product-card--list">
                <div className="product-media">
                  <span className="product-flag">
                    こちらは予約商品になります。
                  </span>
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 320px"
                      priority={index === 0}
                    />
                  ) : null}
                </div>
                <div className="product-body">
                  <h3>{product.name}</h3>
                  <p className="muted">{product.description}</p>
                </div>
                <div className="product-meta-row">
                  <span className="price">{formatCurrency(product.price)}</span>
                  <Link
                    className="btn secondary"
                    href={`/products/${product.slug || product.id}`}
                  >
                    詳細
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
