"use client";

import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("kona-cart");

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        setCart([]);
      }
    }
  }, []);

  function updateCart(updatedCart: CartItem[]) {
    setCart(updatedCart);
    localStorage.setItem("kona-cart", JSON.stringify(updatedCart));
  }

  function increaseQuantity(id: string) {
    const updatedCart = cart.map((item) =>
      item.id === id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );

    updateCart(updatedCart);
  }

  function decreaseQuantity(id: string) {
    const updatedCart = cart
      .map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
      .filter((item) => item.quantity > 0);

    updateCart(updatedCart);
  }

  function removeItem(id: string) {
    const updatedCart = cart.filter((item) => item.id !== id);
    updateCart(updatedCart);
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-6 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <a
          href="/"
          className="mb-6 inline-block text-sm font-medium text-purple-700 hover:underline"
        >
          ← Вернуться в магазин
        </a>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-900">
            ✦ KONA LADY
          </h1>

          <p className="mt-1 text-gray-600">
            Ваша корзина
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-6xl">🛒</div>

            <h2 className="mt-5 text-2xl font-bold">
              Корзина пока пуста
            </h2>

            <p className="mt-2 text-gray-500">
              Добавьте товары из магазина, и они появятся здесь.
            </p>

            <a
              href="/"
              className="mt-6 inline-block rounded-2xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
            >
              Перейти к покупкам
            </a>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <a
                      href={`/product/${item.id}`}
                      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-5xl hover:bg-purple-100"
                    >
                      {item.emoji}
                    </a>

                    <div className="min-w-0 flex-1">
                      <a
                        href={`/product/${item.id}`}
                        className="text-lg font-bold hover:text-purple-700"
                      >
                        {item.name}
                      </a>

                      <p className="mt-1 text-gray-500">
                        {item.price.toLocaleString("uk-UA")} грн
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-lg font-bold text-purple-700 hover:bg-purple-200"
                        >
                          −
                        </button>

                        <span className="min-w-6 text-center font-semibold">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => increaseQuantity(item.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-lg font-bold text-purple-700 hover:bg-purple-200"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-lg font-bold text-purple-900">
                        {(item.price * item.quantity).toLocaleString(
                          "uk-UA"
                        )}{" "}
                        грн
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <h2 className="text-xl font-bold">
                Ваш заказ
              </h2>

              <div className="mt-5 flex justify-between text-gray-600">
                <span>Товары</span>
                <span>{cart.length}</span>
              </div>

              <div className="mt-3 flex justify-between text-gray-600">
                <span>Количество</span>
                <span>
                  {cart.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )}
                </span>
              </div>

              <div className="my-5 border-t border-gray-200" />

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">
                  Итого
                </span>

                <span className="text-2xl font-bold text-purple-800">
                  {total.toLocaleString("uk-UA")} грн
                </span>
              </div>

              <a
  href="/checkout"
  className="mt-6 block w-full rounded-2xl bg-purple-600 px-5 py-3 text-center font-semibold text-white hover:bg-purple-700"
>
  Перейти к оформлению
</a>

              <p className="mt-3 text-center text-xs text-gray-400">
                Оформление заказа подключим следующим шагом.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}