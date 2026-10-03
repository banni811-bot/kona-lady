"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Favorite = {
  id: number;
  product_id: number | null;
  product_name: string;
  store_name: string | null;
  price_uah: number | null;
  image_url: string | null;
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Сначала войдите в аккаунт.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select(
        "id, product_id, product_name, store_name, price_uah, image_url",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setFavorites(data ?? []);
    setLoading(false);
  }

  async function removeFavorite(id: number) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setFavorites((current) =>
      current.filter((favorite) => favorite.id !== id),
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f3ff] p-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-sm">
          Загружаем избранное...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <a
          href="/profile"
          className="mb-5 inline-block text-sm font-semibold text-purple-700"
        >
          ← Назад в кабинет
        </a>

        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8">
            <div className="text-sm font-semibold text-purple-600">
              ✦ KONA LADY
            </div>

            <div className="mt-2 flex items-center gap-3">
              <div className="text-3xl">❤️</div>

              <h1 className="text-3xl font-black">
                Избранное
              </h1>
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              Товары, которые вы сохранили.
            </p>
          </div>

          {message && (
            <div className="mb-5 rounded-2xl bg-purple-50 px-4 py-3 text-sm text-purple-800">
              {message}
            </div>
          )}

          {favorites.length === 0 ? (
            <div className="rounded-3xl bg-purple-50 p-10 text-center">
              <div className="text-5xl">🛍️</div>

              <div className="mt-4 text-xl font-bold">
                Избранное пока пусто
              </div>

              <p className="mt-2 text-sm text-zinc-500">
                Добавляйте понравившиеся товары с помощью ❤️
              </p>

              <a
                href="/"
                className="mt-5 inline-block rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white"
              >
                Перейти в магазин
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="overflow-hidden rounded-3xl border border-purple-100 bg-white transition hover:shadow-md"
                >
                  <a
                    href={
                      favorite.product_id !== null
                        ? `/product/${favorite.product_id}`
                        : "/"
                    }
                    className="block cursor-pointer"
                  >
                    <div className="flex h-40 items-center justify-center bg-purple-50 text-6xl">
                      {favorite.image_url ? (
                        <img
                          src={favorite.image_url}
                          alt={favorite.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "🛍️"
                      )}
                    </div>

                    <div className="p-5">
                      <div className="text-xs font-semibold text-purple-600">
                        {favorite.store_name || "KONA LADY"}
                      </div>

                      <div className="mt-1 text-lg font-black">
                        {favorite.product_name}
                      </div>

                      {favorite.price_uah !== null && (
                        <div className="mt-3 text-lg font-black">
                          {favorite.price_uah.toLocaleString(
                            "uk-UA",
                          )}{" "}
                          грн
                        </div>
                      )}
                    </div>
                  </a>

                  <div className="px-5 pb-5">
                    <button
                      type="button"
                      onClick={() =>
                        removeFavorite(favorite.id)
                      }
                      className="w-full cursor-pointer rounded-2xl bg-purple-50 px-4 py-3 text-sm font-bold text-purple-700 transition hover:bg-purple-100"
                    >
                      Убрать из избранного
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}