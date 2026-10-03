export default function ContactsPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ff] text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <a
          href="/"
          className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50"
        >
          ← На главную
        </a>

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">
            ✦ KONA LADY
          </div>

          <h1 className="mt-2 text-3xl font-black">
            Контакты
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Если у тебя есть вопрос по товару, заказу или покупке —
            свяжись с нами удобным способом.
          </p>

          <div className="mt-8 grid gap-4">
            <a
              href="tel:+380731216990"
              className="rounded-2xl bg-purple-50 p-5 transition hover:bg-purple-100"
            >
              <div className="text-sm text-zinc-500">
                Телефон
              </div>

              <div className="mt-1 text-lg font-bold text-purple-700">
                📞 +380 73 121 69 90
              </div>
            </a>

            <a
              href="mailto:natalyakona0@gmail.com"
              className="rounded-2xl bg-purple-50 p-5 transition hover:bg-purple-100"
            >
              <div className="text-sm text-zinc-500">
                Email
              </div>

              <div className="mt-1 break-all text-lg font-bold text-purple-700">
                ✉️ natalyakona0@gmail.com
              </div>
            </a>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-5 text-center">
            <div className="text-xs text-gray-400">
              Основатель: Наталья
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}