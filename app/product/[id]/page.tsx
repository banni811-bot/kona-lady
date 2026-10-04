"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Product = {
  id: number;
  name: string;
  category: string | null;
  subcategory: string | null;
  price_uah: number | null;
  image_url: string | null;
  description: string | null;
  store_name: string | null;
  is_active: boolean | null;
  is_available: boolean | null;
  brand: string | null;
  material: string | null;
  color: string | null;
  season: string | null;
  style: string | null;
  gender: string | null;
  country: string | null;
  composition: string | null;
  size_group: string | null;
  sleeve: string | null;
  length: string | null;
  neckline: string | null;
  closure: string | null;
  fit: string | null;
  fabric_features: string | null;
};

type ProductImage = {
  id: number;
  image_url: string;
  sort_order: number;
};

type Measurement = {
  id: number;
  size: string;
  bust_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  length_cm: number | null;
  sleeve_cm: number | null;
};

type Review = {
  id: number;
  author_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
};

type Tab =
  | "characteristics"
  | "reviews"
  | "measurements";

export default function ProductPage() {
  const params = useParams();

  const productId = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>(
    [],
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(
    null,
  );

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [activeTab, setActiveTab] =
    useState<Tab>("characteristics");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setLoading(false);
      return;
    }

    loadProduct();
    loadProductImages();
    loadMeasurements();
    loadReviews();
    loadFavorite();
  }, [productId]);

  async function loadProduct() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        category,
        subcategory,
        price_uah,
        image_url,
        description,
        store_name,
        is_active,
        is_available,
        brand,
        material,
        color,
        season,
        style,
        gender,
        country,
        composition,
        size_group,
        sleeve,
        length,
        neckline,
        closure,
        fit,
        fabric_features
        `,
      )
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      console.error("PRODUCT ERROR:", error);
      setLoading(false);
      return;
    }

    setProduct(data);

    if (data?.image_url) {
      setSelectedImage(data.image_url);
    }

    setLoading(false);
  }

  async function loadProductImages() {
    const { data, error } = await supabase
      .from("product_images")
      .select("id, image_url, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("PRODUCT IMAGES ERROR:", error);
      return;
    }

    setProductImages(data ?? []);
  }

  async function loadMeasurements() {
    const { data, error } = await supabase
      .from("product_measurements")
      .select(
        "id, size, bust_cm, waist_cm, hips_cm, length_cm, sleeve_cm",
      )
      .eq("product_id", productId)
      .order("id", { ascending: true });

    if (error) {
      console.error("MEASUREMENTS ERROR:", error.message);
      console.error(
        "MEASUREMENTS ERROR DETAILS:",
        error.details,
      );
      console.error("MEASUREMENTS ERROR HINT:", error.hint);
      console.error("MEASUREMENTS ERROR CODE:", error.code);
      return;
    }

    setMeasurements(data ?? []);
  }

  async function loadReviews() {
    const { data, error } = await supabase
      .from("product_reviews")
      .select(
        "id, author_name, rating, review_text, created_at",
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("REVIEWS ERROR:", error);
      return;
    }

    setReviews(data ?? []);
  }

  async function loadFavorite() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      console.error("FAVORITE ERROR:", error);
      return;
    }

    setIsFavorite(Boolean(data));
  }

  async function toggleFavorite() {
    setMessage("");
    setFavoriteLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Сначала войдите в аккаунт.");
      setFavoriteLoading(false);
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) {
        console.error(error);
        setMessage(error.message);
        setFavoriteLoading(false);
        return;
      }

      setIsFavorite(false);
      setMessage("Товар убран из избранного.");
    } else {
      if (!product) {
        setFavoriteLoading(false);
        return;
      }

      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          store_name: product.store_name || "KONA LADY",
          price_uah: product.price_uah,
          image_url: product.image_url,
        });

      if (error) {
        console.error(error);
        setMessage(error.message);
        setFavoriteLoading(false);
        return;
      }

      setIsFavorite(true);
      setMessage("Товар добавлен в избранное ❤️");
    }

    setFavoriteLoading(false);
  }

 async function addToCart() {
  if (!product) return;

  if (product.is_available === false) {
    setMessage("Этот товар сейчас нет в наличии.");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cartKey = user ? `kona-cart-${user.id}` : "kona-cart-guest";

  const savedCart = localStorage.getItem(cartKey);
  let cart: CartItem[] = [];

  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
    } catch {
      cart = [];
    }
  }

  const productIdString = String(product.id);

  const existingItem = cart.find(
    (item) => item.id === productIdString,
  );

  let updatedCart: CartItem[];

  if (existingItem) {
    updatedCart = cart.map((item) =>
      item.id === productIdString
        ? { ...item, quantity: item.quantity + 1 }
        : item,
    );
  } else {
    updatedCart = [
      ...cart,
      {
        id: productIdString,
        name: product.name,
        price: Number(product.price_uah || 0),
        emoji: "🛍️",
        quantity: 1,
      },
    ];
  }

  localStorage.setItem(cartKey, JSON.stringify(updatedCart));
  window.dispatchEvent(new Event("kona-cart-updated"));

  setMessage("Товар добавлен в корзину 🛒");
}

  async function submitReview() {
    setMessage("");

    if (!reviewName.trim()) {
      setMessage("Укажи своё имя.");
      return;
    }

    if (!reviewText.trim()) {
      setMessage("Напиши текст отзыва.");
      return;
    }

    setReviewLoading(true);

    const { error } = await supabase
      .from("product_reviews")
      .insert({
        product_id: productId,
        author_name: reviewName.trim(),
        rating: reviewRating,
        review_text: reviewText.trim(),
      });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setReviewLoading(false);
      return;
    }

    setReviewName("");
    setReviewText("");
    setReviewRating(5);

    await loadReviews();

    setMessage("Спасибо! Твой отзыв добавлен 💜");
    setReviewLoading(false);
  }

  /*
   * Формируем список фотографий.
   *
   * Основное фото из products.image_url тоже добавляем,
   * если его ещё нет среди product_images.
   *
   * Это защищает старые товары, созданные до появления
   * таблицы product_images.
   */
  const galleryImages: string[] = [];

  if (product?.image_url) {
    galleryImages.push(product.image_url);
  }

  for (const image of productImages) {
    if (
      image.image_url &&
      !galleryImages.includes(image.image_url)
    ) {
      galleryImages.push(image.image_url);
    }
  }

  const currentImage =
    selectedImage || galleryImages[0] || null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f3ff] p-6 text-zinc-900">
        <div className="mx-auto max-w-4xl rounded-[32px] bg-white p-8 text-center shadow-sm">
          <div className="text-2xl font-black text-purple-700">
            ✦ KONA LADY
          </div>

          <div className="mt-6 text-sm text-zinc-500">
            Загружаем товар...
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f7f3ff] p-6 text-zinc-900">
        <div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 shadow-lg">
          <div className="text-3xl font-black text-purple-700">
            ✦ KONA LADY
          </div>

          <div className="mt-8 text-2xl font-black">
            Товар не найден
          </div>

          <a
            href="/"
            className="mt-6 inline-block rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white"
          >
            Вернуться в магазин
          </a>
        </div>
      </main>
    );
  }

  const available =
    product.is_available !== false &&
    product.is_active !== false;

  return (
    <main className="min-h-screen bg-[#f7f3ff] text-zinc-900">
      <header className="border-b border-purple-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 md:px-8">
          <a
            href="/"
            className="text-2xl font-black tracking-tight text-purple-700"
          >
            ✦ KONA LADY
          </a>

          <a
            href="/cart"
            className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700"
          >
            🛒 Корзина
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
        <a
          href="/"
          className="text-sm font-semibold text-purple-700 hover:underline"
        >
          ← Вернуться к товарам
        </a>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          {/* ФОТОГАЛЕРЕЯ */}
          <div>
            <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-[32px] bg-white shadow-sm">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="h-full max-h-[600px] w-full object-contain"
                />
              ) : (
                <div className="text-[140px]">
                  🛍️
                </div>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {galleryImages.map((image, index) => {
                  const isSelected =
                    currentImage === image;

                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedImage(image)
                      }
                      className={`relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-white transition ${
                        isSelected
                          ? "ring-2 ring-purple-600 ring-offset-2"
                          : "border border-purple-100 hover:border-purple-300"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} — фото ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 rounded-full bg-purple-600 px-2 py-1 text-[10px] font-bold text-white">
                          Главное
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {galleryImages.length > 1 && (
              <div className="mt-3 text-center text-xs text-zinc-400">
                Фото {Math.max(
                  1,
                  galleryImages.indexOf(currentImage || "") + 1,
                )}{" "}
                из {galleryImages.length}
              </div>
            )}
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm md:p-8">
            <div className="text-sm font-semibold text-purple-600">
              {product.category || "Товар"}
            </div>

            {product.subcategory && (
              <div className="mt-1 text-xs text-zinc-400">
                {product.subcategory}
              </div>
            )}

            <h1 className="mt-2 text-4xl font-black">
              {product.name}
            </h1>

            <div className="mt-6 text-3xl font-black">
              {Number(product.price_uah || 0).toLocaleString(
                "uk-UA",
              )}{" "}
              грн
            </div>

            {!available && (
              <div className="mt-4 inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
                Нет в наличии
              </div>
            )}

            {product.description && (
              <div className="mt-8">
                <div className="text-lg font-black">
                  Описание
                </div>

                <p className="mt-3 leading-7 text-zinc-600">
                  {product.description}
                </p>
              </div>
            )}

            <div className="mt-8 rounded-2xl bg-purple-50 p-4">
              <div className="font-bold">
                ✦ KONA LADY
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                {product.store_name || "KONA LADY"}
              </div>
            </div>

            {message && (
              <div className="mt-5 rounded-2xl bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700">
                {message}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className="cursor-pointer rounded-2xl border border-purple-200 bg-white px-5 py-4 font-bold text-purple-700 transition hover:bg-purple-50 disabled:cursor-wait disabled:opacity-50"
              >
                {isFavorite
                  ? "❤️ В избранном"
                  : "♡ В избранное"}
              </button>

              <button
                type="button"
                onClick={addToCart}
                disabled={!available}
                className="cursor-pointer rounded-2xl bg-purple-600 px-5 py-4 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {available
                  ? "🛒 Купить"
                  : "Нет в наличии"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[32px] bg-white shadow-sm">
          <div className="grid grid-cols-3 border-b border-purple-100">
            <button
              type="button"
              onClick={() =>
                setActiveTab("characteristics")
              }
              className={`cursor-pointer px-3 py-4 text-sm font-bold transition md:px-6 ${
                activeTab === "characteristics"
                  ? "bg-purple-600 text-white"
                  : "text-purple-700 hover:bg-purple-50"
              }`}
            >
              Характеристики
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("reviews")
              }
              className={`cursor-pointer px-3 py-4 text-sm font-bold transition md:px-6 ${
                activeTab === "reviews"
                  ? "bg-purple-600 text-white"
                  : "text-purple-700 hover:bg-purple-50"
              }`}
            >
              Отзывы
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("measurements")
              }
              className={`cursor-pointer px-3 py-4 text-sm font-bold transition md:px-6 ${
                activeTab === "measurements"
                  ? "bg-purple-600 text-white"
                  : "text-purple-700 hover:bg-purple-50"
              }`}
            >
              Замеры изделия
            </button>
          </div>

          <div className="p-5 md:p-8">
            {activeTab === "characteristics" && (
              <div>
                <h2 className="text-2xl font-black">
                  Характеристики
                </h2>

                <div className="mt-6 overflow-hidden rounded-2xl border border-purple-100">
                  {[
                    ["Бренд", product.brand],
                    ["Материал", product.material],
                    ["Цвет", product.color],
                    ["Сезон", product.season],
                    ["Стиль", product.style],
                    ["Пол", product.gender],
                    ["Страна", product.country],
                    ["Состав", product.composition],
                    ["Размерная группа", product.size_group],
                    ["Рукав", product.sleeve],
                    ["Длина", product.length],
                    ["Вырез", product.neckline],
                    ["Застёжка", product.closure],
                    ["Посадка", product.fit],
                    [
                      "Особенности ткани",
                      product.fabric_features,
                    ],
                  ]
                    .filter(
                      ([, value]) =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== "",
                    )
                    .map(([label, value], index) => (
                      <div
                        key={label}
                        className={`grid grid-cols-1 gap-1 px-4 py-4 sm:grid-cols-[220px_1fr] ${
                          index % 2 === 0
                            ? "bg-purple-50/60"
                            : "bg-white"
                        }`}
                      >
                        <div className="text-sm font-semibold text-zinc-500">
                          {label}
                        </div>

                        <div className="text-sm font-bold text-zinc-900">
                          {value}
                        </div>
                      </div>
                    ))}
                </div>

                {[
                  product.brand,
                  product.material,
                  product.color,
                  product.season,
                  product.style,
                  product.gender,
                  product.country,
                  product.composition,
                  product.size_group,
                  product.sleeve,
                  product.length,
                  product.neckline,
                  product.closure,
                  product.fit,
                  product.fabric_features,
                ].every(
                  (value) =>
                    value === null ||
                    value === undefined ||
                    String(value).trim() === "",
                ) && (
                  <div className="mt-6 rounded-2xl bg-purple-50 p-5 text-sm text-zinc-500">
                    Характеристики этого товара пока не
                    заполнены.
                  </div>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                <h2 className="text-2xl font-black">
                  Оставить отзыв
                </h2>

                <div className="mt-5 rounded-2xl bg-purple-50 p-5">
                  <div className="text-sm font-bold">
                    Твоя оценка
                  </div>

                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() =>
                          setReviewRating(rating)
                        }
                        className={`cursor-pointer text-2xl transition hover:scale-110 ${
                          rating <= reviewRating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <input
                    value={reviewName}
                    onChange={(event) =>
                      setReviewName(event.target.value)
                    }
                    placeholder="Твоё имя"
                    className="mt-5 w-full rounded-2xl border border-purple-100 bg-white px-4 py-3 outline-none focus:border-purple-400"
                  />

                  <textarea
                    value={reviewText}
                    onChange={(event) =>
                      setReviewText(event.target.value)
                    }
                    placeholder="Напиши свой отзыв..."
                    rows={4}
                    className="mt-3 w-full resize-none rounded-2xl border border-purple-100 bg-white px-4 py-3 outline-none focus:border-purple-400"
                  />

                  <button
                    type="button"
                    onClick={submitReview}
                    disabled={reviewLoading}
                    className="mt-3 cursor-pointer rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white transition hover:bg-purple-700 disabled:cursor-wait disabled:opacity-50"
                  >
                    {reviewLoading
                      ? "Отправляем..."
                      : "Опубликовать отзыв"}
                  </button>
                </div>

                <div className="mt-8">
                  <div className="text-lg font-black">
                    Отзывы покупателей
                  </div>

                  {reviews.length === 0 ? (
                    <div className="mt-4 rounded-2xl bg-gray-50 p-5 text-sm text-zinc-500">
                      Пока отзывов нет. Будь первой 💜
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="rounded-2xl border border-purple-100 p-5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-bold">
                              {review.author_name}
                            </div>

                            <div className="text-yellow-400">
                              {"★".repeat(review.rating)}
                              <span className="text-gray-200">
                                {"★".repeat(
                                  5 - review.rating,
                                )}
                              </span>
                            </div>
                          </div>

                          {review.review_text && (
                            <p className="mt-3 text-sm leading-6 text-zinc-600">
                              {review.review_text}
                            </p>
                          )}

                          <div className="mt-3 text-xs text-zinc-400">
                            {new Date(
                              review.created_at,
                            ).toLocaleDateString("uk-UA")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "measurements" && (
              <div>
                <h2 className="text-2xl font-black">
                  Замеры изделия
                </h2>

                {measurements.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-purple-50 p-5 text-sm leading-6 text-zinc-500">
                    Замеры для этого товара пока не
                    добавлены.
                  </div>
                ) : (
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-purple-100">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead>
                        <tr className="bg-purple-50">
                          <th className="px-4 py-4 text-left font-bold">
                            Размер
                          </th>
                          <th className="px-4 py-4 text-left font-bold">
                            Грудь, см
                          </th>
                          <th className="px-4 py-4 text-left font-bold">
                            Талия, см
                          </th>
                          <th className="px-4 py-4 text-left font-bold">
                            Бёдра, см
                          </th>
                          <th className="px-4 py-4 text-left font-bold">
                            Длина, см
                          </th>
                          <th className="px-4 py-4 text-left font-bold">
                            Рукав, см
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {measurements.map(
                          (measurement) => (
                            <tr
                              key={measurement.id}
                              className="border-t border-purple-100"
                            >
                              <td className="px-4 py-4 font-bold">
                                {measurement.size}
                              </td>

                              <td className="px-4 py-4">
                                {measurement.bust_cm ?? "—"}
                              </td>

                              <td className="px-4 py-4">
                                {measurement.waist_cm ?? "—"}
                              </td>

                              <td className="px-4 py-4">
                                {measurement.hips_cm ?? "—"}
                              </td>

                              <td className="px-4 py-4">
                                {measurement.length_cm ?? "—"}
                              </td>

                              <td className="px-4 py-4">
                                {measurement.sleeve_cm ?? "—"}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}