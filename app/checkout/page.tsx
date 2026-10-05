"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type CartItem = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [deliveryMethod, setDeliveryMethod] =
    useState("Новая почта");

  const [paymentMethod, setPaymentMethod] =
    useState("Наложенный платеж");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadCart() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const cartKey = user
        ? `kona-cart-${user.id}`
        : "kona-cart-guest";

      const savedCart = localStorage.getItem(cartKey);

      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch {
          setCart([]);
        }
      } else {
        setCart([]);
      }
    }

    loadCart();
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  function getAddressLabel() {
    switch (deliveryMethod) {
      case "Новая почта":
        return "Отделение / почтомат";

      case "Укрпочта":
        return "Отделение Укрпочты";

      case "Самовывоз":
        return "Адрес пункта самовывоза";

      default:
        return "Адрес / отделение";
    }
  }

  function getAddressPlaceholder() {
    switch (deliveryMethod) {
      case "Новая почта":
        return "Например: отделение Новой почты №5";

      case "Укрпочта":
        return "Например: отделение Укрпочты №12";

      case "Самовывоз":
        return "Например: ул. Дерибасовская, 10";

      default:
        return "Укажите адрес или отделение";
    }
  }

  async function openLiqPay(orderNumber: string) {
    try {
      const response = await fetch("/api/liqpay/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: total,
          orderId: orderNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error("LIQPAY ERROR:", result);

        setMessage(
          result.error ||
            "Не удалось подготовить оплату LiqPay.",
        );

        setLoading(false);
        return;
      }

      const form = document.createElement("form");

      form.method = "POST";
      form.action = result.checkoutUrl;

      form.style.display = "none";

      const dataInput = document.createElement("input");
      dataInput.type = "hidden";
      dataInput.name = "data";
      dataInput.value = result.data;

      const signatureInput =
        document.createElement("input");

      signatureInput.type = "hidden";
      signatureInput.name = "signature";
      signatureInput.value = result.signature;

      form.appendChild(dataInput);
      form.appendChild(signatureInput);

      document.body.appendChild(form);

      form.submit();
    } catch (error) {
      console.error("LIQPAY OPEN ERROR:", error);

      setMessage(
        "Не удалось открыть страницу оплаты.",
      );

      setLoading(false);
    }
  }

  async function createOrder() {
    setMessage("");
    setSuccess(false);

    if (cart.length === 0) {
      setMessage("Корзина пуста.");
      return;
    }

    if (
      !name.trim() ||
      !phone.trim() ||
      !region.trim() ||
      !city.trim() ||
      !address.trim()
    ) {
      setMessage(
        "Заполните имя, телефон, область, город и данные доставки.",
      );
      return;
    }

    setLoading(true);

    let createdOrderId: number | null = null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Сначала войдите в аккаунт.");
        setLoading(false);
        return;
      }

      const orderNumber = `KONA-${Date.now()}`;

      const { data: order, error: orderError } =
        await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            order_number: orderNumber,
            status: "new",
            total_uah: total,

            customer_name: name.trim(),
            customer_phone: phone.trim(),
            customer_email: user.email || null,

            delivery_method: deliveryMethod,
            delivery_region: region.trim(),
            delivery_city: city.trim(),

            // Новое поле для области/отделения.
            delivery_branch: address.trim(),

            // Оставляем старое поле тоже,
            // чтобы не сломать существующую веб-логику.
            delivery_address: address.trim(),

            payment_method: paymentMethod,
          })
          .select()
          .single();

      if (orderError || !order) {
        console.error(
          "ORDER ERROR:",
          orderError,
        );

        setMessage(
          orderError?.message ||
            "Не удалось создать заказ.",
        );

        setLoading(false);
        return;
      }

      createdOrderId = order.id;

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: Number(item.id),
        product_name: item.name,
        quantity: item.quantity,
        price_uah: item.price,
      }));

      const { error: itemsError } =
        await supabase
          .from("order_items")
          .insert(orderItems);

      if (itemsError) {
        console.error(
          "ORDER ITEMS ERROR:",
          itemsError,
        );

        await supabase
          .from("orders")
          .delete()
          .eq("id", createdOrderId);

        setMessage(
          `Не удалось сохранить товары заказа: ${itemsError.message}`,
        );

        setLoading(false);
        return;
      }

      /*
       * ОПЛАТА КАРТОЙ
       *
       * Заказ уже создан и товары сохранены.
       * Теперь передаём сумму и номер заказа
       * на серверный API LiqPay.
       */
      if (paymentMethod === "Оплата картой") {
        setMessage(
          "Заказ создан. Переходим к тестовой оплате LiqPay...",
        );

        await openLiqPay(orderNumber);

        return;
      }

      /*
       * Остальные способы оплаты работают
       * как и раньше.
       */
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const cartKey = currentUser
        ? `kona-cart-${currentUser.id}`
        : "kona-cart-guest";

      localStorage.removeItem(cartKey);

      setCart([]);

      window.dispatchEvent(
        new Event("kona-cart-updated"),
      );

      setSuccess(true);

      setMessage(
        `Заказ ${orderNumber} успешно создан! ✦`,
      );
    } catch (error) {
      console.error(
        "CHECKOUT ERROR:",
        error,
      );

      if (createdOrderId !== null) {
        await supabase
          .from("orders")
          .delete()
          .eq("id", createdOrderId);
      }

      setMessage(
        "Произошла ошибка. Заказ не создан.",
      );
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-6 text-gray-900">
      <div className="mx-auto max-w-5xl">
        {!success && (
          <a
            href="/cart"
            className="mb-6 inline-block text-sm font-medium text-purple-700 hover:underline"
          >
            ← Вернуться в корзину
          </a>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-900">
            ✦ KONA LADY
          </h1>

          <p className="mt-1 text-gray-600">
            {success
              ? "Заказ оформлен"
              : "Оформление заказа"}
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-2xl p-5 shadow-sm ${
              success
                ? "bg-green-50 text-green-800"
                : "bg-white text-purple-800"
            }`}
          >
            <div className="font-semibold">
              {message}
            </div>
          </div>
        )}

        {success ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-6xl">
              ✅
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              Спасибо за заказ!
            </h2>

            <p className="mt-2 text-gray-500">
              Ваш заказ сохранён.
              Вы можете посмотреть его
              в личном кабинете.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="/profile/orders"
                className="rounded-2xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
              >
                Мои заказы
              </a>

              <a
                href="/"
                className="rounded-2xl bg-purple-100 px-6 py-3 font-semibold text-purple-800 hover:bg-purple-200"
              >
                Вернуться в магазин
              </a>
            </div>
          </div>
        ) : cart.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-6xl">
              🛒
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              Корзина пуста
            </h2>

            <a
              href="/"
              className="mt-6 inline-block rounded-2xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
            >
              Вернуться в магазин
            </a>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Данные получателя
              </h2>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Имя
                  </label>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Ваше имя"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Телефон
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    placeholder="+380..."
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </div>

                {/* ДОСТАВКА */}

                <div>
                  <label className="mb-3 block text-sm font-medium">
                    🚚 Способ доставки
                  </label>

                  <div className="space-y-3">
                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        deliveryMethod ===
                        "Новая почта"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value="Новая почта"
                          checked={
                            deliveryMethod ===
                            "Новая почта"
                          }
                          onChange={(e) =>
                            setDeliveryMethod(
                              e.target.value,
                            )
                          }
                          className="mt-1"
                        />

                        <div>
                          <div className="font-semibold">
                            Новая почта
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            Доставка в отделение или почтомат
                          </div>
                        </div>
                      </div>
                    </label>

                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        deliveryMethod ===
                        "Укрпочта"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value="Укрпочта"
                          checked={
                            deliveryMethod ===
                            "Укрпочта"
                          }
                          onChange={(e) =>
                            setDeliveryMethod(
                              e.target.value,
                            )
                          }
                          className="mt-1"
                        />

                        <div>
                          <div className="font-semibold">
                            Укрпочта
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            Доставка в отделение Укрпочты
                          </div>
                        </div>
                      </div>
                    </label>

                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        deliveryMethod ===
                        "Самовывоз"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value="Самовывоз"
                          checked={
                            deliveryMethod ===
                            "Самовывоз"
                          }
                          onChange={(e) =>
                            setDeliveryMethod(
                              e.target.value,
                            )
                          }
                          className="mt-1"
                        />

                        <div>
                          <div className="font-semibold">
                            Самовывоз
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            Забрать заказ самостоятельно
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* ОБЛАСТЬ */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Область
                  </label>

                  <input
                    value={region}
                    onChange={(e) =>
                      setRegion(e.target.value)
                    }
                    placeholder="Например, Одесская область"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </div>

                {/* ГОРОД */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Город
                  </label>

                  <input
                    value={city}
                    onChange={(e) =>
                      setCity(e.target.value)
                    }
                    placeholder="Например, Одесса"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </div>

                {/* ОТДЕЛЕНИЕ / АДРЕС */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    {getAddressLabel()}
                  </label>

                  <textarea
                    value={address}
                    onChange={(e) =>
                      setAddress(e.target.value)
                    }
                    placeholder={getAddressPlaceholder()}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </div>

                {/* ОПЛАТА */}

                <div className="pt-2">
                  <label className="mb-3 block text-sm font-medium">
                    💳 Способ оплаты
                  </label>

                  <div className="space-y-3">
                    {/* НАЛОЖЕННЫЙ ПЛАТЁЖ */}

                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        paymentMethod ===
                        "Наложенный платеж"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value="Наложенный платеж"
                          checked={
                            paymentMethod ===
                            "Наложенный платеж"
                          }
                          onChange={(e) =>
                            setPaymentMethod(
                              e.target.value,
                            )
                          }
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <span>💵</span>
                            <span>
                              Наложенный платёж
                            </span>
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            Оплата при получении заказа
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* ОПЛАТА КАРТОЙ */}

                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        paymentMethod ===
                        "Оплата картой"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value="Оплата картой"
                          checked={
                            paymentMethod ===
                            "Оплата картой"
                          }
                          onChange={(e) =>
                            setPaymentMethod(
                              e.target.value,
                            )
                          }
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <span>💳</span>
                            <span>
                              Оплата картой
                            </span>
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            Visa / Mastercard
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* GOOGLE PAY / APPLE PAY */}

                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        paymentMethod ===
                        "Google Pay / Apple Pay"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value="Google Pay / Apple Pay"
                          checked={
                            paymentMethod ===
                            "Google Pay / Apple Pay"
                          }
                          onChange={(e) =>
                            setPaymentMethod(
                              e.target.value,
                            )
                          }
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <span>📱</span>
                            <span>
                              Google Pay / Apple Pay
                            </span>
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            Быстрая оплата со смартфона
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* РЕКВИЗИТЫ */}

                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        paymentMethod ===
                        "Оплата по реквизитам"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value="Оплата по реквизитам"
                          checked={
                            paymentMethod ===
                            "Оплата по реквизитам"
                          }
                          onChange={(e) =>
                            setPaymentMethod(
                              e.target.value,
                            )
                          }
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <span>🏦</span>
                            <span>
                              Оплата по реквизитам
                            </span>
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            Банковский перевод
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>

                  {paymentMethod ===
                    "Оплата картой" && (
                    <div className="mt-3 rounded-2xl bg-purple-50 p-4 text-sm text-purple-800">
                      🔒 Тестовая безопасная оплата
                      картой через LiqPay.

                      <div className="mt-1 text-purple-600">
                        Сейчас используется тестовый
                        режим. Реальные деньги не
                        списываются.
                      </div>
                    </div>
                  )}

                  {paymentMethod ===
                    "Google Pay / Apple Pay" && (
                    <div className="mt-3 rounded-2xl bg-purple-50 p-4 text-sm text-purple-800">
                      🔒 Быстрая и безопасная оплата.

                      <div className="mt-1 text-purple-600">
                        Этот способ подключим через
                        платёжную систему после
                        завершения интеграции.
                      </div>
                    </div>
                  )}

                  {paymentMethod ===
                    "Оплата по реквизитам" && (
                    <div className="mt-3 rounded-2xl bg-purple-50 p-4 text-sm text-purple-800">
                      🏦 Оплата банковским переводом.

                      <div className="mt-1 text-purple-600">
                        Реквизиты для оплаты будут
                        показаны после подключения
                        этого способа.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <h2 className="text-xl font-bold">
                Ваш заказ
              </h2>

              <div className="mt-5 space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-2xl">
                        {item.emoji}
                      </div>

                      <div>
                        <div className="font-medium">
                          {item.name}
                        </div>

                        <div className="text-sm text-gray-500">
                          {item.quantity} ×{" "}
                          {item.price.toLocaleString(
                            "uk-UA",
                          )}{" "}
                          грн
                        </div>
                      </div>
                    </div>

                    <div className="font-semibold">
                      {(
                        item.price *
                        item.quantity
                      ).toLocaleString(
                        "uk-UA",
                      )}{" "}
                      грн
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-5 border-t border-gray-200" />

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">
                  Итого
                </span>

                <span className="text-2xl font-bold text-purple-800">
                  {total.toLocaleString(
                    "uk-UA",
                  )}{" "}
                  грн
                </span>
              </div>

              <button
                onClick={createOrder}
                disabled={loading}
                className="mt-6 w-full rounded-2xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? paymentMethod ===
                    "Оплата картой"
                    ? "Переходим к оплате..."
                    : "Создаём заказ..."
                  : paymentMethod ===
                    "Оплата картой"
                  ? "💳 Перейти к оплате"
                  : "Подтвердить заказ"}
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}