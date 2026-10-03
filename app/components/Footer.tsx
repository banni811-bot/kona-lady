export default function Footer() {
  return (
    <footer className="mt-12 border-t border-purple-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="text-center">
          <div className="mb-3 text-2xl font-bold text-purple-700">
            ✦ KONA LADY
          </div>

          <p className="mb-5 text-sm text-gray-500">
            Всё для женщин — стиль, красота и настроение
          </p>

          <div className="flex flex-col items-center gap-3 text-sm">
            <a
              href="tel:+380731216990"
              className="font-medium text-gray-700 transition hover:text-purple-600"
            >
              📞 +380 73 121 69 90
            </a>

            <a
              href="mailto:natalyakona0@gmail.com"
              className="font-medium text-gray-700 transition hover:text-purple-600"
            >
              ✉️ natalyakona0@gmail.com
            </a>
          </div>

          <div className="mt-7 border-t border-gray-100 pt-5">
            <div className="text-xs text-gray-400">
              Основатель: Наталья
            </div>

            <div className="mt-2 text-xs text-gray-400">
              © {new Date().getFullYear()} KONA LADY. Все права защищены.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}