"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError("Неверный email или пароль.");
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        await supabase.auth.signOut();
        setError("Не удалось проверить сессию. Попробуйте войти ещё раз.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError || profile?.role !== "admin") {
        await supabase.auth.signOut();
        setError("Доступ запрещён. Эта страница предназначена только для администратора.");
        return;
      }

      window.location.assign("/admin/manager");
    } catch {
      setError("Не удалось подключиться к серверу. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ff] px-4 py-8 text-zinc-900">
      <section className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-lg md:p-8">
        <div className="text-center">
          <div className="text-3xl font-black text-purple-700">
            KONA LADY
          </div>
          <h1 className="mt-4 text-2xl font-bold">
            Вход администратора
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Панель управления магазином
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block text-sm font-semibold"
            >
              Email администратора
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-sm font-semibold"
            >
              Пароль
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
              placeholder="Введите пароль"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-purple-600 px-4 py-3 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Проверяем доступ..." : "Войти в панель"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Доступ разрешён только аккаунтам с ролью admin.
        </p>
      </section>
    </main>
  );
}
