
"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AgerPreviewPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");

  async function runPreview() {
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Сессия администратора не найдена. Войдите заново.");
      }

      const response = await fetch("/api/import/ager/preview", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Ошибка сервера: HTTP ${response.status}`
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось проверить каталог"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Предварительный просмотр AGER
      </h1>

      <p style={{ marginTop: 16, lineHeight: 1.6 }}>
        Проверяем XML-каталог, идентификаторы товаров, цены и доступность.
        На этом этапе товары в базу данных не записываются.
      </p>

      <button
        onClick={runPreview}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "12px 20px",
          border: 0,
          borderRadius: 8,
          background: loading ? "#888" : "#222",
          color: "#fff",
          fontSize: 16,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Загружаем каталог..." : "Проверить каталог AGER"}
      </button>

      {error && (
        <p
          style={{
            marginTop: 24,
            padding: 16,
            background: "#fff0f0",
            color: "#a00000",
            borderRadius: 8,
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </p>
      )}

      {result !== null && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Результат проверки
          </h2>
          <pre
            style={{
              marginTop: 12,
              padding: 16,
              background: "#f4f4f4",
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
