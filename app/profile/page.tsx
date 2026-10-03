"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  name: string | null;
  phone: string | null;
  birth_date: string | null;
  city: string | null;
  bio: string | null;
  interests: string[] | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
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

    setEmail(user.email ?? "");

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, name, phone, birth_date, city, bio, interests, avatar_url",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setProfile(data);
    setLoading(false);
  }

  async function saveProfile() {
    if (!profile) return;

    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        phone: profile.phone,
        birth_date: profile.birth_date,
        city: profile.city,
        bio: profile.bio,
        interests: profile.interests,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Профиль сохранён! ✦");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f3ff] p-6 text-zinc-900">
        <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-8 shadow-lg">
          Загрузка профиля...
        </div>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="min-h-screen bg-[#f7f3ff] p-6 text-zinc-900">
        <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-8 shadow-lg">
          <div className="text-2xl font-black text-purple-700">
            ✦ KONA LADY
          </div>

          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-8 text-zinc-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <a
            href="/"
            className="inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-bold text-purple-700 shadow-sm transition hover:bg-purple-50"
          >
            ← Вернуться в магазин
          </a>

          <div className="mt-5 text-3xl font-black text-purple-700">
            ✦ KONA LADY
          </div>

          <div className="mt-1 text-sm text-zinc-500">
            Личный кабинет
          </div>
        </div>

        <section className="rounded-[32px] bg-white p-6 shadow-lg md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 text-4xl">
              👩🏻
            </div>

            <div>
              <div className="text-2xl font-black">
                {profile.name || "Пользователь"}
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                {email}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a
              href="/profile/purchases"
              className="block rounded-2xl bg-purple-50 p-5 transition hover:bg-purple-100"
            >
              <div className="text-2xl">🛍️</div>

              <div className="mt-2 font-bold">
                Мои покупки
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                История покупок
              </div>
            </a>

            <a
              href="/profile/orders"
              className="block rounded-2xl bg-purple-50 p-5 transition hover:bg-purple-100"
            >
              <div className="text-2xl">📦</div>

              <div className="mt-2 font-bold">
                Мои заказы
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Текущие и прошлые заказы
              </div>
            </a>

            <a
              href="/profile/calendar"
              className="block rounded-2xl bg-purple-50 p-5 transition hover:bg-purple-100"
            >
              <div className="text-2xl">📅</div>

              <div className="mt-2 font-bold">
                Календарь покупок
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Размеры, товары и даты
              </div>
            </a>

            <a
              href="/profile/favorites"
              className="block rounded-2xl bg-purple-50 p-5 transition hover:bg-purple-100"
            >
              <div className="text-2xl">❤️</div>

              <div className="mt-2 font-bold">
                Избранное
              </div>

              <div className="mt-1 text-sm text-zinc-500">
                Сохранённые товары
              </div>
            </a>
          </div>

          <div className="mt-8 border-t border-zinc-100 pt-8">
            <div className="text-xl font-black">
              Мои данные
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Имя
                </label>

                <input
                  type="text"
                  value={profile.name ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      name: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Телефон
                </label>

                <input
                  type="tel"
                  value={profile.phone ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      phone: event.target.value,
                    })
                  }
                  placeholder="+380..."
                  className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Дата рождения
                </label>

                <input
                  type="date"
                  value={profile.birth_date ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      birth_date: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Город
                </label>

                <input
                  type="text"
                  value={profile.city ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      city: event.target.value,
                    })
                  }
                  placeholder="Например, Одесса"
                  className="w-full rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  О себе
                </label>

                <textarea
                  value={profile.bio ?? ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      bio: event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Расскажите немного о себе"
                  className="w-full resize-none rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 outline-none focus:border-purple-400"
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
                type="button"
                onClick={saveProfile}
                className="w-full rounded-2xl bg-purple-600 px-5 py-4 font-bold text-white transition hover:bg-purple-700"
              >
                Сохранить профиль
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}