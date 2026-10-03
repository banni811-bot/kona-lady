"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: redirectUrl,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Письмо для восстановления пароля отправлено. Проверьте вашу почту.",
    );
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-8 text-zinc-900">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <div className="w-full rounded-[32px] bg-white p-6 shadow-lg md:p-8">
          <div className="text-center">
            <div className="text-3xl font-black text-purple-700">
              ✦ KONA LADY
            </div>

            <div className="mt-2 text-sm text-zinc-500">
              Восстановление пароля
            </div>
          </div>

          <div className="mt-8">
            <h1 className="text-2xl font-black text-zinc-900">
              Забыли пароль?
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Введите email, который использовали при регистрации. Мы отправим
              на него ссылку для создания нового пароля.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-purple-600 px-5 py-4 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Отправляем..." : "Отправить ссылку"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-purple-600 hover:text-purple-800"
            >
              ← Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}