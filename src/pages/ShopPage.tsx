import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/StoreContext";
import type { ProductCategory } from "../types/models";

const categories: ProductCategory[] = [
  "ALL",
  "OUTERWEAR",
  "FOOTWEAR",
  "BAGS",
  "ACCESSORIES",
  "ESSENTIALS",
];

export default function ShopPage() {
  const { products, addToCart } = useStore();
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = activeCategory === "ALL" || product.category === activeCategory;
      const queryLower = query.trim().toLowerCase();
      const matchesQuery =
        queryLower.length === 0 ||
        product.name.toLowerCase().includes(queryLower) ||
        product.tagline.toLowerCase().includes(queryLower);

      return matchesCategory && matchesQuery;
    });
  }, [products, activeCategory, query]);

  return (
    <PageShell>
      <section className="section-head brutal-block">
        <div>
          <h2>Shop All</h2>
          <p>Filter by category and search the catalog in real time.</p>
        </div>
        <label className="search-wrap" htmlFor="product-search">
          Search
          <input
            id="product-search"
            className="text-input"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Try 'boots' or 'jacket'"
          />
        </label>
      </section>

      <section className="category-bar brutal-block">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={category === activeCategory ? "chip chip-active" : "chip"}
            onClick={() => {
              setActiveCategory(category);
            }}
          >
            {category}
          </button>
        ))}
      </section>

      <section className="product-grid">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </section>

      {visibleProducts.length === 0 ? (
        <section className="empty-state brutal-block">
          <h3>No products match this filter.</h3>
          <p>Try another category or a different search term.</p>
        </section>
      ) : null}
    </PageShell>
  );
}
