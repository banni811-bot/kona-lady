"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

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
  { slug: "dresses", name: "Платья", emoji: "👗" },
  { slug: "tops", name: "Топы и футболки", emoji: "👚" },
  { slug: "jeans", name: "Джинсы и брюки", emoji: "👖" },
  { slug: "skirts", name: "Юбки", emoji: "💃" },
  { slug: "sportswear", name: "Спортивные костюмы", emoji: "🏃‍♀️" },
  { slug: "outerwear", name: "Куртки и жилетки", emoji: "🧥" },
  { slug: "sweaters", name: "Свитеры и кардиганы", emoji: "🧶" },
  { slug: "homewear", name: "Домашняя одежда", emoji: "🏠" },
];

const shoeSubcategories = [
  { slug: "sneakers", name: "Кроссовки", emoji: "👟" },
  { slug: "heels", name: "Туфли", emoji: "👠" },
  { slug: "sandals", name: "Босоножки", emoji: "👡" },
  { slug: "boots", name: "Сапоги", emoji: "🥾" },
  { slug: "ankle-boots", name: "Ботинки", emoji: "👢" },
  { slug: "flats", name: "Балетки", emoji: "🥿" },
  { slug: "home-shoes", name: "Домашняя обувь", emoji: "🩴" },
];

const cosmeticSubcategories = [
  { slug: "makeup", name: "Макияж", emoji: "💄" },
  { slug: "face-care", name: "Уход за лицом", emoji: "🧴" },
  { slug: "hair-care", name: "Уход за волосами", emoji: "💇‍♀️" },
  { slug: "perfume", name: "Парфюмерия", emoji: "🌸" },
  { slug: "nails", name: "Ногти", emoji: "💅" },
  { slug: "body-care", name: "Уход за телом", emoji: "🫧" },
  { slug: "sun-care", name: "Защита от солнца", emoji: "☀️" },
];

const accessorySubcategories = [
  { slug: "bags", name: "Сумки", emoji: "👜" },
  { slug: "wallets", name: "Кошельки", emoji: "👛" },
  { slug: "clutches", name: "Клатчи", emoji: "👝" },
  { slug: "belts", name: "Ремни", emoji: "👗" },
  { slug: "jewelry", name: "Украшения", emoji: "💍" },
  { slug: "earrings", name: "Серьги", emoji: "💎" },
  { slug: "rings", name: "Кольца", emoji: "💍" },
  { slug: "bracelets", name: "Браслеты", emoji: "📿" },
  { slug: "necklaces", name: "Ожерелья", emoji: "📿" },
  { slug: "glasses", name: "Очки", emoji: "🕶️" },
  { slug: "hats", name: "Головные уборы", emoji: "🧢" },
  { slug: "scarves", name: "Шарфы и платки", emoji: "🧣" },
];

const clothingNames: Record<string, string> = {
  dresses: "Платья",
  tops: "Топы и футболки",
  jeans: "Джинсы и брюки",
  skirts: "Юбки",
  sportswear: "Спортивные костюмы",
  outerwear: "Куртки и жилетки",
  sweaters: "Свитеры и кардиганы",
  homewear: "Домашняя одежда",
};

const shoeNames: Record<string, string> = {
  sneakers: "Кроссовки",
  heels: "Туфли",
  sandals: "Босоножки",
  boots: "Сапоги",
  "ankle-boots": "Ботинки",
  flats: "Балетки",
  "home-shoes": "Домашняя обувь",
};

const cosmeticNames: Record<string, string> = {
  makeup: "Макияж",
  "face-care": "Уход за лицом",
  "hair-care": "Уход за волосами",
  perfume: "Парфюмерия",
  nails: "Ногти",
  "body-care": "Уход за телом",
  "sun-care": "Защита от солнца",
};

const accessoryNames: Record<string, string> = {
  bags: "Сумки",
  wallets: "Кошельки",
  clutches: "Клатчи",
  belts: "Ремни",
  jewelry: "Украшения",
  earrings: "Серьги",
  rings: "Кольца",
  bracelets: "Браслеты",
  necklaces: "Ожерелья",
  glasses: "Очки",
  hats: "Головные уборы",
  scarves: "Шарфы и платки",
};

const clothingEmojis: Record<string, string> = {
  dresses: "👗",
  tops: "👚",
  jeans: "👖",
  skirts: "💃",
  sportswear: "🏃‍♀️",
  outerwear: "🧥",
  sweaters: "🧶",
  homewear: "🏠",
};

const shoeEmojis: Record<string, string> = {
  sneakers: "👟",
  heels: "👠",
  sandals: "👡",
  boots: "🥾",
  "ankle-boots": "👢",
  flats: "🥿",
  "home-shoes": "🩴",
};

const cosmeticEmojis: Record<string, string> = {
  makeup: "💄",
  "face-care": "🧴",
  "hair-care": "💇‍♀️",
  perfume: "🌸",
  nails: "💅",
  "body-care": "🫧",
  "sun-care": "☀️",
};

const accessoryEmojis: Record<string, string> = {
  bags: "👜",
  wallets: "👛",
  clutches: "👝",
  belts: "👗",
  jewelry: "💍",
  earrings: "💎",
  rings: "💍",
  bracelets: "📿",
  necklaces: "📿",
  glasses: "🕶️",
  hats: "🧢",
  scarves: "🧣",
};

export default function SubcategoryPage() {
  const params = useParams();

  const category = String(params.category);
  const subcategory = String(params.subcategory);

  const isClothing = category === "clothes";
  const isShoes = category === "shoes";
  const isCosmetics = category === "cosmetics";
  const isAccessories = category === "accessories";

  const subcategories = isClothing
    ? clothingSubcategories
    : isShoes
      ? shoeSubcategories
      : isCosmetics
        ? cosmeticSubcategories
        : accessorySubcategories;

  const names = isClothing
    ? clothingNames
    : isShoes
      ? shoeNames
      : isCosmetics
        ? cosmeticNames
        : accessoryNames;

  const emojis = isClothing
    ? clothingEmojis
    : isShoes
      ? shoeEmojis
      : isCosmetics
        ? cosmeticEmojis
        : accessoryEmojis;

  const title = names[subcategory] || "Категория";
  const emoji = emojis[subcategory] || "✦";

  const databaseCategory = isClothing
    ? "Одежда"
    : isShoes
      ? "Обувь"
      : isCosmetics
        ? "Косметика"
        : "Аксессуары";

  const mainCategoryName = isClothing
    ? "Одежда"
    : isShoes
      ? "Обувь"
      : isCosmetics
        ? "Косметика"
        : "Аксессуары";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, category, subcategory, price_uah, image_url, description, store_name",
        )
        .eq("is_active", true)
        .eq("category", databaseCategory)
        .eq("subcategory", subcategory)
        .order("id", { ascending: true });

      if (error) {
        console.error("Ошибка загрузки товаров:", error);
        setProducts([]);
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    }

    if (isClothing || isShoes || isCosmetics || isAccessories) {
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [
    databaseCategory,
    isClothing,
    isShoes,
    isCosmetics,
    isAccessories,
    subcategory,
  ]);

  const description = isClothing
    ? "Выберите вещи для создания своего образа."
    : isShoes
      ? "Найдите свою идеальную пару для любого случая."
      : isCosmetics
        ? "Подберите косметику для красоты и ухода каждый день."
        : "Выберите аксессуары, которые дополнят ваш стиль.";

  return (
    <main className="min-h-screen bg-[#faf7ff] text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold text-purple-700">
            ✦ KONA LADY
          </Link>

          <div className="text-sm text-gray-600">
            Начни свой стиль с KONA
          </div>

          <nav className="flex gap-5 text-sm font-medium">
            <Link href="/" className="hover:text-purple-700">
              Главная
            </Link>

            <Link href="/cart" className="hover:text-purple-700">
              Корзина
            </Link>

            <Link href="/profile" className="hover:text-purple-700">
              Профиль
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-8">
        <div className="text-sm text-gray-500">
          <Link href="/" className="hover:text-purple-700">
            Главная
          </Link>

          <span className="mx-2">/</span>

          <Link
            href={`/category/${category}`}
            className="hover:text-purple-700"
          >
            {mainCategoryName}
          </Link>

          <span className="mx-2">/</span>

          <span>{title}</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-purple-800 to-fuchsia-700 px-8 py-12 text-white shadow-xl">
          <div className="max-w-3xl">
            <div className="mb-4 text-5xl">{emoji}</div>

            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-purple-200">
              KONA LADY COLLECTION
            </div>

            <h1 className="text-4xl font-bold md:text-5xl">
              {title}
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-purple-100">
              {description}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/category/${category}`}
            className="rounded-full border bg-white px-5 py-3 text-sm font-semibold shadow-sm hover:border-purple-400 hover:text-purple-700"
          >
            ← Вся {mainCategoryName.toLowerCase()}
          </Link>

          {subcategories.map((item) => {
            const active = item.slug === subcategory;

            return (
              <Link
                key={item.slug}
                href={`/category/${category}/${item.slug}`}
                className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-purple-700 text-white"
                    : "border bg-white hover:border-purple-400 hover:text-purple-700"
                }`}
              >
                {item.emoji} {item.name}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-purple-600">
              KONA LADY
            </p>

            <h2 className="mt-1 text-3xl font-bold">
              {title}
            </h2>
          </div>

          {!loading && (
            <div className="text-sm text-gray-500">
              {products.length}{" "}
              {products.length === 1
                ? "товар"
                : products.length >= 2 && products.length <= 4
                  ? "товара"
                  : "товаров"}
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            Загрузка товаров...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-purple-200 bg-white p-12 text-center">
            <div className="text-5xl">{emoji}</div>

            <h3 className="mt-4 text-xl font-bold">
              Товаров пока нет
            </h3>

            <p className="mt-2 text-gray-500">
              Скоро здесь появятся новые товары.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex h-64 items-center justify-center bg-purple-50 text-7xl">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    emoji
                  )}
                </div>

                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-purple-500">
                    {product.category}
                  </div>

                  <h3 className="mt-2 text-lg font-bold group-hover:text-purple-700">
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-4 text-xl font-bold">
                    {product.price_uah.toLocaleString("uk-UA")} грн
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}