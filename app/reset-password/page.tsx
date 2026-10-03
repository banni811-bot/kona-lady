"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setReady(true);
      } else {
        setError(
          "Ссылка для восстановления пароля недействительна или устарела.",
        );
      }

      setCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setError("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Пароль успешно изменён! Теперь вы можете войти с новым паролем.",
    );
    setPassword("");
    setConfirmPassword("");
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
              Новый пароль
            </div>
          </div>

          {checkingSession ? (
            <div className="mt-8 text-center text-sm text-zinc-500">
              Проверяем ссылку...
            </div>
          ) : !ready ? (
            <div className="mt-8">
              <div className="rounded-2xl bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                {error}
              </div>

              <Link
                href="/forgot-password"
                className="mt-5 block text-center text-sm font-semibold text-purple-600 hover:text-purple-800"
              >
                Запросить новую ссылку
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <h1 className="text-2xl font-black text-zinc-900">
                  Придумайте новый пароль
                </h1>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Введите новый пароль для вашего аккаунта KONA LADY.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Новый пароль
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Минимум 6 символов"
                      minLength={6}
                      required
                      className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 pr-12 outline-none focus:border-purple-400"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      aria-label={
                        showPassword
                          ? "Скрыть пароль"
                          : "Показать пароль"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xl text-purple-600 transition hover:bg-purple-100"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Повторите пароль
                  </label>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Введите пароль ещё раз"
                      minLength={6}
                      required
                      className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 pr-12 outline-none focus:border-purple-400"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Скрыть пароль"
                          : "Показать пароль"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xl text-purple-600 transition hover:bg-purple-100"
                    >
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
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
                  {loading ? "Сохраняем..." : "Изменить пароль"}
                </button>
              </form>

              {message && (
                <Link
                  href="/login"
                  className="mt-5 block text-center text-sm font-semibold text-purple-600 hover:text-purple-800"
                >
                  Перейти ко входу
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}