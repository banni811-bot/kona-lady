"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Order = {
  id: number;
  user_id: string;
  order_number: string;
  status: string;
  total_uah: number;
  delivery_address: string | null;
  delivery_city: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_method: string | null;
  payment_method: string | null;
};

type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string | null;
  quantity: number | null;
  price_uah: number | null;
};

const statuses = [
  "Новый",
  "Подтверждён",
  "Собирается",
  "Отправлен",
  "Доставлен",
  "Отменён",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError("");

    const [
      { data: ordersData, error: ordersError },
      { data: itemsData, error: itemsError },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select(
          `
          id,
          user_id,
          order_number,
          status,
          total_uah,
          delivery_address,
          delivery_city,
          created_at,
          updated_at,
          customer_name,
          customer_phone,
          delivery_method,
          payment_method
        `
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("order_items")
        .select(
          `
          id,
          order_id,
          product_id,
          product_name,
          quantity,
          price_uah
        `
        )
        .order("id", { ascending: true }),
    ]);

    if (ordersError) {
      console.error(ordersError);
      setError(
        `Не удалось загрузить заказы: ${ordersError.message}`
      );
      setOrders([]);
      setOrderItems([]);
      setLoading(false);
      return;
    }

    if (itemsError) {
      console.error(itemsError);
      setError(
        `Не удалось загрузить товары заказов: ${itemsError.message}`
      );
      setOrders(ordersData || []);
      setOrderItems([]);
      setLoading(false);
      return;
    }

    setOrders(ordersData || []);
    setOrderItems(itemsData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function getOrderItems(orderId: number) {
    return orderItems.filter(
      (item) => item.order_id === orderId
    );
  }

  async function updateStatus(
    orderId: number,
    newStatus: string
  ) {
    setUpdatingId(orderId);
    setError("");

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error(updateError);

      setError(
        `Не удалось изменить статус заказа: ${updateError.message}`
      );

      setUpdatingId(null);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : order
      )
    );

    setUpdatingId(null);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatPrice(price: number | null) {
    if (price === null) {
      return "—";
    }

    return `${price.toLocaleString("uk-UA")} грн`;
  }

  function getStatusStyle(status: string) {
    if (status === "Новый") {
      return {
        background: "#f1ecff",
        color: "#6941c6",
      };
    }

    if (status === "Подтверждён") {
      return {
        background: "#eef4ff",
        color: "#175cd3",
      };
    }

    if (status === "Собирается") {
      return {
        background: "#fff6ed",
        color: "#c4320a",
      };
    }

    if (status === "Отправлен") {
      return {
        background: "#ecfdf3",
        color: "#027a48",
      };
    }

    if (status === "Доставлен") {
      return {
        background: "#e9f8ef",
        color: "#19703c",
      };
    }

    if (status === "Отменён") {
      return {
        background: "#fff0f0",
        color: "#b42318",
      };
    }

    return {
      background: "#f2f4f7",
      color: "#344054",
    };
  }

  const innerCardStyle = {
    background: "#ffffff",
    border: "2px solid #d8cbea",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 4px 14px rgba(80, 50, 120, 0.08)",
  };

  const innerLabelStyle = {
    fontSize: "12px",
    color: "#5f526d",
    fontWeight: 700,
    marginBottom: "7px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f3ff",
        padding: "24px",
        color: "#241b35",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <Link
            href="/admin"
            style={{
              color: "#7653a6",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            ← Назад в админку
          </Link>

          <div
            style={{
              marginTop: "18px",
              fontSize: "14px",
              color: "#7b6b91",
              marginBottom: "6px",
            }}
          >
            ✦ KONA LADY
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "32px",
                }}
              >
                Заказы
              </h1>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#75677f",
                }}
              >
                Просмотр и управление заказами покупателей
              </p>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              style={{
                border: "2px solid #d8cbea",
                borderRadius: "14px",
                padding: "12px 18px",
                background: "#ffffff",
                color: "#241b35",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              🔄 Обновить
            </button>
          </div>
        </div>

        {/* СТАТИСТИКА */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "2px solid #d8cbea",
              borderRadius: "18px",
              padding: "20px",
              boxShadow:
                "0 4px 14px rgba(80, 50, 120, 0.12)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#5f526d",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Всего заказов
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#241b35",
              }}
            >
              {orders.length}
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "2px solid #d8cbea",
              borderRadius: "18px",
              padding: "20px",
              boxShadow:
                "0 4px 14px rgba(80, 50, 120, 0.12)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#5f526d",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Новые
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#241b35",
              }}
            >
              {
                orders.filter(
                  (order) => order.status === "Новый"
                ).length
              }
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "2px solid #d8cbea",
              borderRadius: "18px",
              padding: "20px",
              boxShadow:
                "0 4px 14px rgba(80, 50, 120, 0.12)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#5f526d",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              В работе
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#241b35",
              }}
            >
              {
                orders.filter(
                  (order) =>
                    order.status === "Подтверждён" ||
                    order.status === "Собирается" ||
                    order.status === "Отправлен"
                ).length
              }
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "2px solid #d8cbea",
              borderRadius: "18px",
              padding: "20px",
              boxShadow:
                "0 4px 14px rgba(80, 50, 120, 0.12)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#5f526d",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Доставлено
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#241b35",
              }}
            >
              {
                orders.filter(
                  (order) => order.status === "Доставлен"
                ).length
              }
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fff1f1",
              border: "2px solid #f0b8b8",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "20px",
              color: "#b42318",
              lineHeight: 1.5,
            }}
          >
            <strong>Ошибка</strong>

            <div style={{ marginTop: "4px" }}>
              {error}
            </div>
          </div>
        )}

        {loading && (
          <div
            style={{
              background: "#ffffff",
              border: "2px solid #d8cbea",
              borderRadius: "20px",
              padding: "40px",
              textAlign: "center",
              boxShadow:
                "0 4px 14px rgba(80, 50, 120, 0.08)",
            }}
          >
            Загружаем заказы...
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div
            style={{
              background: "#ffffff",
              border: "2px solid #d8cbea",
              borderRadius: "20px",
              padding: "50px 30px",
              textAlign: "center",
              boxShadow:
                "0 4px 14px rgba(80, 50, 120, 0.08)",
            }}
          >
            <div
              style={{
                fontSize: "52px",
                marginBottom: "12px",
              }}
            >
              📦
            </div>

            <h2
              style={{
                margin: "0 0 8px",
              }}
            >
              Заказов пока нет
            </h2>

            <p
              style={{
                margin: 0,
                color: "#75677f",
              }}
            >
              Когда покупатель оформит заказ, он появится
              здесь.
            </p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "22px",
            }}
          >
            {orders.map((order) => {
              const items = getOrderItems(order.id);
              const statusStyle = getStatusStyle(
                order.status
              );

              return (
                <article
                  key={order.id}
                  style={{
                    background: "#ffffff",
                    border: "2px solid #cbbddd",
                    borderRadius: "22px",
                    padding: "22px",
                    boxShadow:
                      "0 6px 20px rgba(80, 50, 120, 0.10)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "16px",
                      flexWrap: "wrap",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#5f526d",
                          fontWeight: 700,
                          marginBottom: "5px",
                        }}
                      >
                        Заказ
                      </div>

                      <h2
                        style={{
                          margin: 0,
                          fontSize: "21px",
                        }}
                      >
                        {order.order_number}
                      </h2>

                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "13px",
                          color: "#75677f",
                        }}
                      >
                        {formatDate(order.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth: "190px",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#5f526d",
                          marginBottom: "6px",
                        }}
                      >
                        Статус заказа
                      </label>

                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(event) =>
                          updateStatus(
                            order.id,
                            event.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          border: "none",
                          borderRadius: "999px",
                          padding: "10px 14px",
                          background:
                            statusStyle.background,
                          color: statusStyle.color,
                          fontWeight: 700,
                          fontSize: "13px",
                          outline: "none",
                          cursor:
                            updatingId === order.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {!statuses.includes(order.status) && (
                          <option value={order.status}>
                            {order.status}
                          </option>
                        )}

                        {statuses.map((status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ))}
                      </select>

                      {updatingId === order.id && (
                        <div
                          style={{
                            marginTop: "5px",
                            fontSize: "12px",
                            color: "#8b7b99",
                          }}
                        >
                          Сохраняем статус...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ПОКУПАТЕЛЬ / ДОСТАВКА / ОПЛАТА */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={innerCardStyle}>
                      <div style={innerLabelStyle}>
                        ПОКУПАТЕЛЬ
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: "5px",
                          color: "#241b35",
                        }}
                      >
                        {order.customer_name ||
                          "Не указан"}
                      </div>

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#5f526d",
                        }}
                      >
                        📞{" "}
                        {order.customer_phone ||
                          "Телефон не указан"}
                      </div>
                    </div>

                    <div style={innerCardStyle}>
                      <div style={innerLabelStyle}>
                        ДОСТАВКА
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: "5px",
                          color: "#241b35",
                        }}
                      >
                        🚚{" "}
                        {order.delivery_method ||
                          "Не указана"}
                      </div>

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#5f526d",
                          lineHeight: 1.5,
                        }}
                      >
                        {order.delivery_city ||
                          "Город не указан"}
                        {order.delivery_address && (
                          <>
                            <br />
                            {order.delivery_address}
                          </>
                        )}
                      </div>
                    </div>

                    <div style={innerCardStyle}>
                      <div style={innerLabelStyle}>
                        ОПЛАТА
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          lineHeight: 1.5,
                          color: "#241b35",
                        }}
                      >
                        💳{" "}
                        {order.payment_method ||
                          "Не указана"}
                      </div>
                    </div>
                  </div>

                  {/* ТОВАРЫ */}

                  <div
                    style={{
                      border: "2px solid #d8cbea",
                      borderRadius: "18px",
                      padding: "18px",
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#5f526d",
                        marginBottom: "14px",
                      }}
                    >
                      🛍️ ТОВАРЫ В ЗАКАЗЕ
                    </div>

                    {items.length === 0 ? (
                      <div
                        style={{
                          padding: "14px",
                          borderRadius: "12px",
                          background: "#ffffff",
                          border:
                            "2px solid #d8cbea",
                          color: "#5f526d",
                          fontSize: "14px",
                        }}
                      >
                        Товары заказа не найдены.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        {items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "1fr auto",
                              alignItems: "center",
                              gap: "12px",
                              padding: "14px 16px",
                              borderRadius: "14px",
                              background: "#ffffff",
                              border:
                                "2px solid #d8cbea",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#241b35",
                                }}
                              >
                                {item.product_name ||
                                  "Товар"}
                              </div>

                              <div
                                style={{
                                  fontSize: "13px",
                                  color: "#5f526d",
                                  marginTop: "4px",
                                }}
                              >
                                Количество:{" "}
                                {item.quantity || 0}
                              </div>
                            </div>

                            <div
                              style={{
                                fontWeight: 700,
                                color: "#241b35",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatPrice(
                                item.price_uah
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ИТОГО */}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                        marginTop: "16px",
                        padding: "16px",
                        borderRadius: "14px",
                        background: "#f7f3ff",
                        border:
                          "2px solid #cbbddd",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          color: "#5f526d",
                          fontWeight: 700,
                        }}
                      >
                        Итого
                      </span>

                      <strong
                        style={{
                          fontSize: "24px",
                          color: "#241b35",
                        }}
                      >
                        {formatPrice(order.total_uah)}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}