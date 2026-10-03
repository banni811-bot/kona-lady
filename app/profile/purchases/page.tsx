"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Purchase = {
  id: number;
  product_name: string;
  store_name: string | null;
  product_id: number | null;
  size: string | null;
  color: string | null;
  quantity: number;
  price_uah: number;
  purchased_at: string;
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Вы не вошли в аккаунт.");
      setLoading(false);
      return;
    }

    const { data, error: purchasesError } = await supabase
      .from("purchases")
      .select(
        "id, product_name, store_name, product_id, size, color, quantity, price_uah, purchased_at",
      )
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false });

    if (purchasesError) {
      setError(purchasesError.message);
      setLoading(false);
      return;
    }

    setPurchases(data ?? []);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-8 text-zinc-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <a
            href="/profile"
            className="text-sm font-semibold text-purple-600 hover:text-purple-800"
          >
            ← Назад в кабинет
          </a>

          <div className="mt-4 text-3xl font-black text-purple-700">
            ✦ KONA LADY
          </div>

          <div className="mt-1 text-sm text-zinc-500">
            Мои покупки
          </div>
        </div>

        <section className="rounded-[32px] bg-white p-6 shadow-lg md:p-8">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🛍️</div>

            <div>
              <h1 className="text-2xl font-black">
                История покупок
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Здесь будут храниться ваши покупки.
              </p>
            </div>
          </div>

          {loading && (
            <div className="mt-8 rounded-2xl bg-purple-50 p-5 text-sm text-zinc-600">
              Загружаем покупки...
            </div>
          )}

          {error && (
            <div className="mt-8 rounded-2xl bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && purchases.length === 0 && (
            <div className="mt-8 rounded-2xl bg-purple-50 p-6 text-center">
              <div className="text-4xl">🛍️</div>

              <div className="mt-3 font-bold">
                Покупок пока нет
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Когда вы совершите покупку, она появится здесь.
              </div>
            </div>
          )}

          {!loading && !error && purchases.length > 0 && (
            <div className="mt-8 space-y-4">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="rounded-2xl border border-purple-100 bg-purple-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black">
                        {purchase.product_name}
                      </div>

                      {purchase.store_name && (
                        <div className="mt-1 text-sm text-zinc-500">
                          {purchase.store_name}
                        </div>
                      )}
                    </div>

                    <div className="whitespace-nowrap font-black text-purple-700">
                      {purchase.price_uah} грн
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-zinc-600">
                    <div>
                      Количество:{" "}
                      <span className="font-semibold text-zinc-900">
                        {purchase.quantity}
                      </span>
                    </div>

                    {purchase.size && (
                      <div>
                        Размер:{" "}
                        <span className="font-semibold text-zinc-900">
                          {purchase.size}
                        </span>
                      </div>
                    )}

                    {purchase.color && (
                      <div>
                        Цвет:{" "}
                        <span className="font-semibold text-zinc-900">
                          {purchase.color}
                        </span>
                      </div>
                    )}

                    <div>
                      Дата покупки:{" "}
                      <span className="font-semibold text-zinc-900">
                        {new Date(
                          purchase.purchased_at,
                        ).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}