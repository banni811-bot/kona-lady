"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Order = {
  id: number;
  status: string;
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError("");

    const { data, error } = await supabase
      .from("orders")
      .select("id, status");

    if (error) {
      console.error(error);
      setOrdersError("Не удалось загрузить заказы.");
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setOrdersLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const totalOrders = orders.length;

  const newOrders = orders.filter(
    (order) => order.status === "Новый"
  ).length;

  const inProgressOrders = orders.filter((order) =>
    ["Подтверждён", "Собирается"].includes(order.status)
  ).length;

  const shippedOrders = orders.filter(
    (order) => order.status === "Отправлен"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Доставлен"
  ).length;

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
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "2px solid #cbbddd",
            borderRadius: "24px",
            padding: "28px",
            marginBottom: "24px",
            boxShadow: "0 6px 20px rgba(80, 50, 120, 0.10)",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#7b6b91",
              marginBottom: "8px",
            }}
          >
            ✦ KONA LADY
          </div>

          <h1
            style={{
              fontSize: "32px",
              margin: "0 0 8px",
              fontWeight: 700,
            }}
          >
            Панель управления
          </h1>

          <p
            style={{
              margin: 0,
              color: "#75677f",
            }}
          >
            Управление магазином, товарами, заказами и категориями
          </p>
        </div>

        <section style={{ marginBottom: "28px" }}>
          <h2
            style={{
              fontSize: "22px",
              margin: "0 0 16px",
            }}
          >
            📦 Заказы
          </h2>

          {ordersError && (
            <div
              style={{
                background: "#fff1f1",
                border: "2px solid #e6b8b8",
                borderRadius: "16px",
                padding: "16px",
                color: "#b42318",
                marginBottom: "16px",
              }}
            >
              {ordersError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "2px solid #cbbddd",
                borderRadius: "18px",
                padding: "18px",
                boxShadow:
                  "0 4px 14px rgba(80, 50, 120, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#5f526d",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Всего заказов
              </div>

              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#241b35",
                }}
              >
                {ordersLoading ? "…" : totalOrders}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "2px solid #e3c2c2",
                borderRadius: "18px",
                padding: "18px",
                boxShadow:
                  "0 4px 14px rgba(80, 50, 120, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#5f526d",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                🔴 Новые
              </div>

              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#b42318",
                }}
              >
                {ordersLoading ? "…" : newOrders}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "2px solid #dfd0b5",
                borderRadius: "18px",
                padding: "18px",
                boxShadow:
                  "0 4px 14px rgba(80, 50, 120, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#5f526d",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                🟠 В работе
              </div>

              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#9a6700",
                }}
              >
                {ordersLoading ? "…" : inProgressOrders}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "2px solid #c7d4e3",
                borderRadius: "18px",
                padding: "18px",
                boxShadow:
                  "0 4px 14px rgba(80, 50, 120, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#5f526d",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                🚚 Отправлены
              </div>

              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#315b87",
                }}
              >
                {ordersLoading ? "…" : shippedOrders}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "2px solid #c4dccd",
                borderRadius: "18px",
                padding: "18px",
                boxShadow:
                  "0 4px 14px rgba(80, 50, 120, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#5f526d",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                🟢 Доставлены
              </div>

              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#19703c",
                }}
              >
                {ordersLoading ? "…" : deliveredOrders}
              </div>
            </div>
          </div>

          <Link
            href="/admin/orders"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              background: "#241b35",
              color: "#ffffff",
              borderRadius: "14px",
              padding: "15px 20px",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            📦 Перейти к заказам →
          </Link>
        </section>

        <section>
          <h2
            style={{
              fontSize: "22px",
              marginBottom: "16px",
            }}
          >
            Управление магазином
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <Link
              href="/admin/products"
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "#ffffff",
                border: "2px solid #cbbddd",
                borderRadius: "20px",
                padding: "24px",
                boxShadow:
                  "0 6px 20px rgba(80, 50, 120, 0.10)",
                display: "block",
              }}
            >
              <div
                style={{
                  fontSize: "36px",
                  marginBottom: "12px",
                }}
              >
                🛍️
              </div>

              <h3
                style={{
                  fontSize: "20px",
                  margin: "0 0 8px",
                }}
              >
                Товары
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#75677f",
                  lineHeight: 1.5,
                }}
              >
                Добавление, редактирование и удаление товаров
              </p>
            </Link>

            <Link
              href="/category/accessories"
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "#ffffff",
                border: "2px solid #cbbddd",
                borderRadius: "20px",
                padding: "24px",
                boxShadow:
                  "0 6px 20px rgba(80, 50, 120, 0.10)",
                display: "block",
              }}
            >
              <div
                style={{
                  fontSize: "36px",
                  marginBottom: "12px",
                }}
              >
                📂
              </div>

              <h3
                style={{
                  fontSize: "20px",
                  margin: "0 0 8px",
                }}
              >
                Категории
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#75677f",
                  lineHeight: 1.5,
                }}
              >
                Просмотр категорий и товаров магазина
              </p>
            </Link>

           <Link
  href="/admin/manager"
  style={{
    textDecoration: "none",
    color: "inherit",
    background: "#ffffff",
    border: "2px solid #cbbddd",
    borderRadius: "20px",
    padding: "24px",
    boxShadow:
      "0 6px 20px rgba(80, 50, 120, 0.10)",
    display: "block",
  }}
            >
              <div
                style={{
                  fontSize: "36px",
                  marginBottom: "12px",
                }}
              >
                📊
              </div>

              <h3
                style={{
                  fontSize: "20px",
                  margin: "0 0 8px",
                }}
              >
                KONA MANAGER
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#75677f",
                  lineHeight: 1.5,
                }}
              >
                Отчёты, бухгалтерия, продажи, клиенты и остатки
              </p>
            </Link>

            <Link
              href="/"
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "#ffffff",
                border: "2px solid #cbbddd",
                borderRadius: "20px",
                padding: "24px",
                boxShadow:
                  "0 6px 20px rgba(80, 50, 120, 0.10)",
                display: "block",
              }}
            >
              <div
                style={{
                  fontSize: "36px",
                  marginBottom: "12px",
                }}
              >
                🏪
              </div>

              <h3
                style={{
                  fontSize: "20px",
                  margin: "0 0 8px",
                }}
              >
                Открыть магазин
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#75677f",
                  lineHeight: 1.5,
                }}
              >
                Перейти в публичную часть KONA LADY
              </p>
            </Link>
          </div>
        </section>

        <div
          style={{
            marginTop: "24px",
            background: "#ffffff",
            border: "2px solid #cbbddd",
            borderRadius: "20px",
            padding: "20px 24px",
            boxShadow:
              "0 6px 20px rgba(80, 50, 120, 0.10)",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#75677f",
            }}
          >
            Административная панель KONA LADY
          </div>

          <div
            style={{
              marginTop: "6px",
              fontWeight: 600,
            }}
          >
            Управление магазином в одном месте ✦
          </div>
        </div>
      </div>
    </main>
  );
}