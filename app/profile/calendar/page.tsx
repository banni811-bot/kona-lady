"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type CalendarPurchase = {
  id: number;
  purchase_id: number | null;
  title: string;
  event_date: string;
  product_name: string | null;
  size: string | null;
  color: string | null;
  quantity: number | null;
  price_uah: number | null;
  notes: string | null;
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  total_uah: number;
  delivery_city: string | null;
  delivery_address: string | null;
  delivery_method: string | null;
  created_at: string;
};

type OrderItem = {
  id: number;
  order_id: number;
  product_name: string;
  size: string | null;
  color: string | null;
  quantity: number;
  price_uah: number;
};

export default function PurchaseCalendarPage() {
  const [items, setItems] = useState<CalendarPurchase[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCalendar();
  }, []);

  async function loadCalendar() {
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

    // Старые записи календаря
    const { data: calendarData, error: calendarError } = await supabase
      .from("purchase_calendar")
      .select(
        "id, purchase_id, title, event_date, product_name, size, color, quantity, price_uah, notes",
      )
      .eq("user_id", user.id)
      .order("event_date", { ascending: false });

    if (calendarError) {
      setError(calendarError.message);
      setLoading(false);
      return;
    }

    setItems(calendarData ?? []);

    // Реальные заказы пользователя
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, total_uah, delivery_city, delivery_address, delivery_method, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      setError(ordersError.message);
      setLoading(false);
      return;
    }

    const loadedOrders = ordersData ?? [];
    setOrders(loadedOrders);

    // Товары из заказов
    if (loadedOrders.length > 0) {
      const orderIds = loadedOrders.map((order) => order.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select(
          "id, order_id, product_name, size, color, quantity, price_uah",
        )
        .in("order_id", orderIds)
        .order("id", { ascending: true });

      if (itemsError) {
        setError(itemsError.message);
        setLoading(false);
        return;
      }

      setOrderItems(itemsData ?? []);
    } else {
      setOrderItems([]);
    }

    setLoading(false);
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "new":
        return "Новый";
      case "processing":
        return "В обработке";
      case "shipped":
        return "Передан в доставку";
      case "completed":
        return "Выполнен";
      case "cancelled":
        return "Отменён";
      default:
        return status;
    }
  }

  function getDeliveryMethodLabel(method: string | null) {
    switch (method) {
      case "nova_poshta":
        return "Новая почта";
      case "ukrposhta":
        return "Укрпочта";
      case "pickup":
        return "Самовывоз";
      default:
        return method || "Не указан";
    }
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
            Календарь покупок
          </div>
        </div>

        <section className="rounded-[32px] bg-white p-6 shadow-lg md:p-8">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📅</div>

            <div>
              <h1 className="text-2xl font-black">
                Календарь покупок
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Размеры, товары, даты и другие данные о покупках.
              </p>
            </div>
          </div>

          {loading && (
            <div className="mt-8 rounded-2xl bg-purple-50 p-5 text-sm text-zinc-600">
              Загружаем календарь...
            </div>
          )}

          {error && (
            <div className="mt-8 rounded-2xl bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && orders.length === 0 && (
            <div className="mt-8 rounded-2xl bg-purple-50 p-6 text-center">
              <div className="text-4xl">📅</div>

              <div className="mt-3 font-bold">
                Записей пока нет
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Здесь будут появляться даты и данные ваших покупок.
              </div>
            </div>
          )}

          {/* РЕАЛЬНЫЕ ЗАКАЗЫ */}
          {!loading && !error && orders.length > 0 && (
            <div className="mt-8 space-y-5">
              <div className="text-lg font-black">
                🛍️ Ваши покупки
              </div>

              {orders.map((order) => {
                const orderProducts = orderItems.filter(
                  (item) => item.order_id === order.id,
                );

                const orderDate = new Date(
                  order.created_at,
                ).toLocaleDateString("ru-RU");

                return (
                  <div
                    key={`order-${order.id}`}
                    className="rounded-2xl border border-purple-100 bg-purple-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-black">
                          Заказ #{order.order_number}
                        </div>

                        <div className="mt-1 text-sm text-purple-700">
                          📅 {orderDate}
                        </div>
                      </div>

                      <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-purple-700">
                        {getStatusLabel(order.status)}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {orderProducts.map((product) => {
                        const productTotal =
                          product.price_uah * product.quantity;

                        return (
                          <div
                            key={product.id}
                            className="rounded-xl bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="font-bold">
                                  {product.product_name}
                                </div>

                                <div className="mt-1 text-sm text-zinc-500">
                                  {product.quantity} ×{" "}
                                  {product.price_uah.toLocaleString(
                                    "uk-UA",
                                  )}{" "}
                                  грн
                                </div>

                                {product.size && (
                                  <div className="text-sm text-zinc-500">
                                    Размер: {product.size}
                                  </div>
                                )}

                                {product.color && (
                                  <div className="text-sm text-zinc-500">
                                    Цвет: {product.color}
                                  </div>
                                )}
                              </div>

                              <div className="whitespace-nowrap font-black text-purple-700">
                                {productTotal.toLocaleString("uk-UA")} грн
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 border-t border-purple-100 pt-4">
                      {order.delivery_city && (
                        <div className="text-sm text-zinc-600">
                          📍 Город:{" "}
                          <span className="font-semibold text-zinc-900">
                            {order.delivery_city}
                          </span>
                        </div>
                      )}

                      {order.delivery_address && (
                        <div className="mt-1 text-sm text-zinc-600">
                          🏠 Адрес / отделение:{" "}
                          <span className="font-semibold text-zinc-900">
                            {order.delivery_address}
                          </span>
                        </div>
                      )}

                      {order.delivery_method && (
                        <div className="mt-1 text-sm text-zinc-600">
                          🚚 Доставка:{" "}
                          <span className="font-semibold text-zinc-900">
                            {getDeliveryMethodLabel(
                              order.delivery_method,
                            )}
                          </span>
                        </div>
                      )}

                      <div className="mt-3 text-lg font-black">
                        Итого:{" "}
                        <span className="text-purple-700">
                          {order.total_uah.toLocaleString("uk-UA")} грн
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* СТАРЫЕ РУЧНЫЕ ЗАПИСИ КАЛЕНДАРЯ */}
          {!loading && !error && items.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="text-lg font-black">
                📅 Записи календаря
              </div>

              {items.map((item) => (
                <div
                  key={`calendar-${item.id}`}
                  className="rounded-2xl border border-purple-100 bg-purple-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black">
                        {item.title}
                      </div>

                      <div className="mt-1 text-sm text-purple-700">
                        {new Date(
                          `${item.event_date}T00:00:00`,
                        ).toLocaleDateString("ru-RU")}
                      </div>
                    </div>

                    {item.price_uah !== null && (
                      <div className="whitespace-nowrap font-black text-purple-700">
                        {item.price_uah.toLocaleString("uk-UA")} грн
                      </div>
                    )}
                  </div>

                  {item.product_name && (
                    <div className="mt-4 rounded-xl bg-white p-4">
                      <div className="font-bold">
                        {item.product_name}
                      </div>

                      {item.size && (
                        <div className="mt-1 text-sm text-zinc-500">
                          Размер: {item.size}
                        </div>
                      )}

                      {item.color && (
                        <div className="text-sm text-zinc-500">
                          Цвет: {item.color}
                        </div>
                      )}

                      {item.quantity !== null && (
                        <div className="text-sm text-zinc-500">
                          Количество: {item.quantity}
                        </div>
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <div className="mt-3 text-sm text-zinc-600">
                      Заметка: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}