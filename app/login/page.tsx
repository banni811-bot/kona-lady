"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getFriendlyError(errorMessage: string) {
    const text = errorMessage.toLowerCase();

    if (
      text.includes("user already registered") ||
      text.includes("already registered") ||
      text.includes("already exists")
    ) {
      return "Пользователь с таким email уже зарегистрирован. Попробуйте войти в аккаунт.";
    }

    if (
      text.includes("invalid login credentials") ||
      text.includes("invalid credentials")
    ) {
      return "Неверный email или пароль. Проверьте данные и попробуйте ещё раз.";
    }

    if (
      text.includes("email not confirmed") ||
      text.includes("email_not_confirmed")
    ) {
      return "Ваша почта ещё не подтверждена. Откройте письмо от KONA LADY и подтвердите регистрацию.";
    }

    if (
      text.includes("password should be at least") ||
      text.includes("password must be at least")
    ) {
      return "Пароль должен содержать минимум 6 символов.";
    }

    if (
      text.includes("invalid email") ||
      text.includes("unable to validate email")
    ) {
      return "Введите корректный адрес электронной почты.";
    }

    if (
      text.includes("rate limit") ||
      text.includes("too many requests")
    ) {
      return "Слишком много попыток. Немного подождите и попробуйте снова.";
    }

    if (
      text.includes("network") ||
      text.includes("fetch") ||
      text.includes("failed to fetch")
    ) {
      return "Не удалось соединиться с сервером. Проверьте интернет и попробуйте ещё раз.";
    }

    return "Не удалось выполнить операцию. Проверьте введённые данные и попробуйте ещё раз.";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    if (mode === "register") {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;

      const {
        data: signUpData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name || null,
          },
        },
      });

      if (signUpError) {
        setError(getFriendlyError(signUpError.message));
        setLoading(false);
        return;
      }

      setMessage(
        `📧 Письмо отправлено!

Мы отправили письмо для подтверждения регистрации на ${email}.

Откройте письмо от KONA LADY и нажмите ссылку для подтверждения регистрации.

Если письма нет — проверьте папку «Спам».

После подтверждения почты вернитесь на сайт и войдите в свой аккаунт.`
      );

      setLoading(false);
      return;
    }

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(getFriendlyError(loginError.message));
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError(
        "Вход выполнен, но сессия не найдена. Попробуйте войти ещё раз."
      );
      setLoading(false);
      return;
    }

    window.location.assign("/profile");
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
              Начни свой стиль с KONA
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 rounded-2xl bg-purple-50 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
                setError("");
              }}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                mode === "login"
                  ? "bg-purple-600 text-white"
                  : "text-purple-700"
              }`}
            >
              Войти
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage("");
                setError("");
              }}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                mode === "register"
                  ? "bg-purple-600 text-white"
                  : "text-purple-700"
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Имя
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Например, Анна"
                  className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
                />
              </div>
            )}

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

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Пароль
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
                    showPassword ? "Скрыть пароль" : "Показать пароль"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xl text-purple-600 transition hover:bg-purple-100"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-purple-600 hover:text-purple-800"
                >
                  Забыли пароль?
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="whitespace-pre-line rounded-2xl bg-green-50 px-4 py-4 text-sm leading-6 text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-purple-600 px-5 py-4 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Подождите..."
                : mode === "login"
                  ? "Войти"
                  : "Создать аккаунт"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs leading-5 text-zinc-400">
            KONA LADY хранит данные вашего профиля, покупок и заказов в вашем
            аккаунте.
          </div>
        </div>
      </div>
    </main>
  );
}