"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Product = {
  id: number;
  name: string;
  category: string;
  subcategory: string | null;
  price_uah: number;
  image_url: string | null;
  description: string | null;
  store_name: string | null;
};

const clothingSubcategories = [
  { name: "Платья", slug: "dresses", emoji: "👗" },
  { name: "Топы", slug: "tops", emoji: "👚" },
  { name: "Джинсы", slug: "jeans", emoji: "👖" },
  { name: "Юбки", slug: "skirts", emoji: "🩷" },
  { name: "Спортивная одежда", slug: "sportswear", emoji: "🏃🏻‍♀️" },
  { name: "Куртки и жилетки", slug: "outerwear", emoji: "🧥" },
  { name: "Свитеры", slug: "sweaters", emoji: "🧶" },
  { name: "Домашняя одежда", slug: "homewear", emoji: "🏠" },
];

const shoeSubcategories = [
  { name: "Кроссовки", slug: "sneakers", emoji: "👟" },
  { name: "Туфли", slug: "heels", emoji: "👠" },
  { name: "Сандалии", slug: "sandals", emoji: "👡" },
  { name: "Сапоги", slug: "boots", emoji: "🥾" },
  { name: "Ботильоны", slug: "ankle-boots", emoji: "👢" },
  { name: "Балетки", slug: "flats", emoji: "🥿" },
  { name: "Домашняя обувь", slug: "home-shoes", emoji: "🩴" },
];

const cosmeticSubcategories = [
  { name: "Макияж", slug: "makeup", emoji: "💄" },
  { name: "Уход за лицом", slug: "face-care", emoji: "🧴" },
  { name: "Уход за волосами", slug: "hair-care", emoji: "💇🏻‍♀️" },
  { name: "Парфюмерия", slug: "perfume", emoji: "🌸" },
  { name: "Ногти", slug: "nails", emoji: "💅🏻" },
  { name: "Уход за телом", slug: "body-care", emoji: "🫧" },
  { name: "Защита от солнца", slug: "sun-care", emoji: "☀️" },
];

const accessorySubcategories = [
  { name: "Сумки", slug: "bags", emoji: "👜" },
  { name: "Кошельки", slug: "wallets", emoji: "👛" },
  { name: "Клатчи", slug: "clutches", emoji: "👝" },
  { name: "Ремни", slug: "belts", emoji: "👗" },
  { name: "Украшения", slug: "jewelry", emoji: "💍" },
  { name: "Серьги", slug: "earrings", emoji: "💎" },
  { name: "Кольца", slug: "rings", emoji: "💍" },
  { name: "Браслеты", slug: "bracelets", emoji: "📿" },
  { name: "Ожерелья", slug: "necklaces", emoji: "📿" },
  { name: "Очки", slug: "glasses", emoji: "🕶️" },
  { name: "Головные уборы", slug: "hats", emoji: "🧢" },
  { name: "Шарфы и платки", slug: "scarves", emoji: "🧣" },
];

const categoryInfo: Record<
  string,
  {
    name: string;
    emoji: string;
    description: string;
  }
> = {
  all: {
    name: "Все товары",
    emoji: "✦",
    description: "Все товары KONA LADY",
  },
  clothes: {
    name: "Одежда",
    emoji: "👗",
    description: "Стильная одежда на каждый день",
  },
  shoes: {
    name: "Обувь",
    emoji: "👟",
    description: "Обувь для любого образа",
  },
  cosmetics: {
    name: "Косметика",
    emoji: "💄",
    description: "Красота и уход на каждый день",
  },
  accessories: {
    name: "Аксессуары",
    emoji: "👜",
    description: "Сумки, ремни, украшения и детали для образа",
  },
};

export default function CategoryPage() {
  const params = useParams();
  const category = String(params.category);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const info = categoryInfo[category] || categoryInfo.all;

  const isClothing = category === "clothes";
  const isShoes = category === "shoes";
  const isCosmetics = category === "cosmetics";
  const isAccessories = category === "accessories";

  let subcategories: {
    name: string;
    slug: string;
    emoji: string;
  }[] = [];

  if (isClothing) {
    subcategories = clothingSubcategories;
  } else if (isShoes) {
    subcategories = shoeSubcategories;
  } else if (isCosmetics) {
    subcategories = cosmeticSubcategories;
  } else if (isAccessories) {
    subcategories = accessorySubcategories;
  }

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);

      let query = supabase
        .from("products")
        .select(
          "id, name, category, subcategory, price_uah, image_url, description, store_name",
        )
        .eq("is_active", true)
        .order("id", { ascending: true });

      if (isClothing) {
        query = query.eq("category", "Одежда");
      } else if (isShoes) {
        query = query.eq("category", "Обувь");
      } else if (isCosmetics) {
        query = query.eq("category", "Косметика");
      } else if (isAccessories) {
        query = query.eq("category", "Аксессуары");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Ошибка загрузки товаров:", error);
        setProducts([]);
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    }

    loadProducts();
  }, [
    category,
    isClothing,
    isShoes,
    isCosmetics,
    isAccessories,
  ]);

  return (
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-6 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          ← Вернуться в магазин
        </Link>

        <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-100 via-white to-purple-200 p-6 shadow-sm md:p-10">
          <div className="mb-3 text-5xl">{info.emoji}</div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">
            KONA LADY COLLECTION
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {info.name}
          </h1>

          <p className="mt-3 max-w-2xl text-gray-600">
            {info.description}
          </p>
        </section>

        {subcategories.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold">
              Категории {info.name.toLowerCase()}
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  href={`/category/${category}/${subcategory.slug}`}
                  className="rounded-2xl bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-2 text-3xl">
                    {subcategory.emoji}
                  </div>

                  <div className="text-sm font-semibold">
                    {subcategory.name}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {category === "all"
                  ? "Все товары"
                  : "Товары категории"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "Загрузка..."
                  : `${products.length} ${
                      products.length === 1
                        ? "товар"
                        : products.length >= 2 && products.length <= 4
                          ? "товара"
                          : "товаров"
                    }`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center text-gray-500 shadow-sm">
              Загружаем товары...
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <div className="mb-3 text-5xl">🛍️</div>

              <h3 className="text-xl font-bold">
                Пока нет товаров
              </h3>

              <p className="mt-2 text-gray-500">
                В этой категории пока нет добавленных товаров.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex aspect-square items-center justify-center bg-purple-50 text-7xl">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <span>
                        {product.category === "Одежда"
                          ? "👗"
                          : product.category === "Обувь"
                            ? "👟"
                            : product.category === "Косметика"
                              ? "💄"
                              : product.category === "Аксессуары"
                                ? "👜"
                                : "🛍️"}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="mb-1 text-xs text-purple-500">
                      {product.store_name || "KONA LADY"}
                    </p>

                    <h3 className="line-clamp-2 min-h-[48px] font-semibold">
                      {product.name}
                    </h3>

                    <p className="mt-3 text-lg font-bold">
                      {product.price_uah.toLocaleString("uk-UA")} грн
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}