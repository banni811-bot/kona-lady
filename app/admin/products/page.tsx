"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Product = {
  id: number;
  name: string;
  category: string | null;
  subcategory: string | null;
  price_uah: number | null;
  image_url: string | null;
  is_available: boolean;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, category, subcategory, price_uah, image_url, is_available"
      )
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setError(error.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function toggleAvailability(
    id: number,
    currentValue: boolean
  ) {
    const { error } = await supabase
      .from("products")
      .update({
        is_available: !currentValue,
      })
      .eq("id", id);

    if (error) {
      alert(
        `Не удалось изменить наличие товара: ${error.message}`
      );
      return;
    }

    setProducts((current) =>
      current.map((product) =>
        product.id === id
          ? {
              ...product,
              is_available: !currentValue,
            }
          : product
      )
    );
  }

  async function deleteProduct(id: number, name: string) {
    const confirmed = window.confirm(
      `Удалить товар «${name}»?\n\nЭто действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      alert(
        `Не удалось удалить товар: ${error.message}`
      );
      return;
    }

    setProducts((current) =>
      current.filter((product) => product.id !== id)
    );
  }

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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
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
                fontSize: "14px",
                color: "#7b6b91",
                marginTop: "18px",
                marginBottom: "6px",
              }}
            >
              ✦ KONA LADY
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "32px",
              }}
            >
              Товары
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#75677f",
              }}
            >
              Управление товарами магазина
            </p>
          </div>

          <Link
            href="/admin/products/new"
            style={{
              textDecoration: "none",
              display: "inline-block",
              borderRadius: "14px",
              padding: "14px 20px",
              background: "#241b35",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            ＋ Добавить товар
          </Link>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow:
              "0 8px 30px rgba(80, 50, 120, 0.08)",
          }}
        >
          <strong>
            Всего товаров: {products.length}
          </strong>
        </div>

        {loading && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "30px",
              textAlign: "center",
            }}
          >
            Загружаем товары...
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              color: "#b42318",
            }}
          >
            <strong>Ошибка загрузки товаров</strong>

            <p style={{ marginBottom: 0 }}>
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          products.length === 0 && (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "40px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "12px",
                }}
              >
                🛍️
              </div>

              <h2 style={{ margin: "0 0 8px" }}>
                Товаров пока нет
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#75677f",
                }}
              >
                Здесь появятся товары магазина.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          products.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "18px",
              }}
            >
              {products.map((product) => (
                <article
                  key={product.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    overflow: "hidden",
                    boxShadow:
                      "0 8px 30px rgba(80, 50, 120, 0.08)",
                  }}
                >
                  <div
                    style={{
                      height: "220px",
                      background: "#f1ecf8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "64px",
                        }}
                      >
                        🛍️
                      </span>
                    )}

                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        padding: "7px 10px",
                        borderRadius: "999px",
                        background: product.is_available
                          ? "#e9f8ef"
                          : "#fff0f0",
                        color: product.is_available
                          ? "#19703c"
                          : "#b42318",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {product.is_available
                        ? "● В наличии"
                        : "● Нет в наличии"}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "18px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#8b7b99",
                        marginBottom: "6px",
                      }}
                    >
                      ID товара: {product.id}
                    </div>

                    <h2
                      style={{
                        fontSize: "18px",
                        margin: "0 0 10px",
                      }}
                    >
                      {product.name}
                    </h2>

                    <div
                      style={{
                        fontSize: "14px",
                        color: "#75677f",
                        marginBottom: "6px",
                      }}
                    >
                      Категория:{" "}
                      <strong>
                        {product.category || "—"}
                      </strong>
                    </div>

                    <div
                      style={{
                        fontSize: "14px",
                        color: "#75677f",
                        marginBottom: "12px",
                      }}
                    >
                      Подкатегория:{" "}
                      <strong>
                        {product.subcategory || "—"}
                      </strong>
                    </div>

                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        marginBottom: "16px",
                      }}
                    >
                      {product.price_uah !== null
                        ? `${product.price_uah.toLocaleString(
                            "uk-UA"
                          )} грн`
                        : "Цена не указана"}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        style={{
                          textAlign: "center",
                          textDecoration: "none",
                          padding: "11px 8px",
                          borderRadius: "12px",
                          background: "#f1ecf8",
                          color: "#241b35",
                          fontSize: "14px",
                          fontWeight: 600,
                        }}
                      >
                        ✏️ Редактировать
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          toggleAvailability(
                            product.id,
                            product.is_available
                          )
                        }
                        style={{
                          padding: "11px 8px",
                          borderRadius: "12px",
                          border: "1px solid #ded5e8",
                          background: "#ffffff",
                          color: "#241b35",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: 600,
                        }}
                      >
                        {product.is_available
                          ? "🔴 Нет в наличии"
                          : "🟢 В наличии"}
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: "8px",
                      }}
                    >
                      <Link
                        href={`/product/${product.id}`}
                        style={{
                          textAlign: "center",
                          textDecoration: "none",
                          padding: "11px 8px",
                          borderRadius: "12px",
                          background: "#ffffff",
                          border:
                            "1px solid #ded5e8",
                          color: "#241b35",
                          fontSize: "14px",
                          fontWeight: 600,
                        }}
                      >
                        Открыть
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          deleteProduct(
                            product.id,
                            product.name
                          )
                        }
                        style={{
                          padding: "11px 8px",
                          borderRadius: "12px",
                          border:
                            "1px solid #ead9df",
                          background: "#ffffff",
                          color: "#b42318",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: 600,
                        }}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
      </div>
    </main>
  );
}