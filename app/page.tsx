"use client";

import { useEffect, useState } from "react";
import { aiDictionary } from "../lib/ai/dictionary";
import { supabase } from "../lib/supabase";

const categories = [
  "Одежда",
  "Обувь",
  "Косметика",
  "Аксессуары",
];

const subcategories: Record<
  string,
  { value: string; label: string }[]
> = {
  Одежда: [
    { value: "blouses", label: "Блузы" },
    { value: "pants", label: "Брюки" },
    { value: "jeans", label: "Джинсы" },
    { value: "homewear", label: "Домашняя одежда" },
    { value: "vests", label: "Жилеты" },
    { value: "cardigans", label: "Кардиганы" },
    { value: "jumpsuits", label: "Комбинезоны" },
    { value: "suits", label: "Костюмы" },
    { value: "leggings", label: "Лосины" },
    { value: "tank-tops", label: "Майки" },
    { value: "blazers", label: "Пиджаки" },
    { value: "dresses", label: "Платья" },
    { value: "shirts", label: "Рубашки" },
    { value: "sundresses", label: "Сарафаны" },
    { value: "sweaters-hoodies", label: "Свитера, кофты и худи" },
    { value: "sportswear", label: "Спортивная одежда" },
    { value: "tops", label: "Топы" },
    { value: "tunics", label: "Туники" },
    { value: "t-shirts", label: "Футболки" },
    { value: "shorts", label: "Шорты" },
    { value: "skirts", label: "Юбки" },
    { value: "outerwear", label: "Куртки и верхняя одежда" },
    { value: "underwear", label: "Бельё" },
  ],
  Обувь: [
    { value: "uggs", label: "Угги" },
    { value: "loafers", label: "Лоферы" },
    { value: "clogs-slippers", label: "Сабо и шлёпанцы" },
    { value: "flip-flops", label: "Вьетнамки и сланцы" },
    { value: "sandals", label: "Босоножки" },
    { value: "boots", label: "Ботинки и ботильоны" },
    { value: "sneakers", label: "Кеды и кроссовки" },
    { value: "slippers", label: "Тапочки" },
  ],
  Косметика: [
    { value: "makeup", label: "Макияж" },
  ],
  Аксессуары: [
    { value: "bags", label: "Сумки" },
    { value: "wallets", label: "Кошельки" },
    { value: "clutches", label: "Клатчи" },
    { value: "belts", label: "Ремни" },
    { value: "jewelry", label: "Украшения" },
    { value: "earrings", label: "Серьги" },
    { value: "rings", label: "Кольца" },
    { value: "bracelets", label: "Браслеты" },
    { value: "necklaces", label: "Ожерелья" },
    { value: "glasses", label: "Очки" },
    { value: "hats", label: "Головные уборы" },
    { value: "scarves", label: "Шарфы и платки" },
  ],
};

const productEmojis: Record<number, string> = {
  1: "👗",
  2: "👟",
  3: "💄",
  4: "👜",
  5: "👔",
  6: "💎",
};

type Product = {
  id: number;
  name: string;
  category: string;
  subcategory: string | null;
  price_uah: number;
  image_url: string | null;
  description: string | null;
  store_name: string | null;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [aiFilteredProductIds, setAiFilteredProductIds] = useState<
    number[] | null
  >(null);

  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [selectedSubcategory, setSelectedSubcategory] = useState<
    string | null
  >(null);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    null,
  );

  const [aiMessage, setAiMessage] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const filteredProducts =
    aiFilteredProductIds !== null
      ? products.filter((product) =>
          aiFilteredProductIds.includes(product.id),
        )
      : selectedSubcategory !== null
        ? products.filter(
            (product) =>
              product.category === selectedCategory &&
              product.subcategory === selectedSubcategory,
          )
        : selectedCategory === "Все"
          ? products
          : products.filter(
              (product) => product.category === selectedCategory,
            );

  const selectedSubcategoryLabel =
    selectedCategory !== "Все" && selectedSubcategory
      ? subcategories[selectedCategory]?.find(
          (subcategory) =>
            subcategory.value === selectedSubcategory,
        )?.label
      : null;

  useEffect(() => {
    loadProducts();
    loadFavorites();
    loadCartCount();

    function handleCartUpdated() {
      loadCartCount();
    }

    window.addEventListener("storage", handleCartUpdated);
    window.addEventListener("kona-cart-updated", handleCartUpdated);

    return () => {
      window.removeEventListener("storage", handleCartUpdated);
      window.removeEventListener("kona-cart-updated", handleCartUpdated);
    };
  }, []);

  function loadCartCount() {
    const savedCart = localStorage.getItem("kona-cart");

    if (!savedCart) {
      setCartCount(0);
      return;
    }

    try {
      const cart: CartItem[] = JSON.parse(savedCart);

      const count = cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      );

      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }

  async function loadProducts() {
    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, category, subcategory, price_uah, image_url, description, store_name",
      )
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setLoadingProducts(false);
      return;
    }

    setProducts(data ?? []);
    setLoadingProducts(false);
  }

  async function loadFavorites() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      return;
    }

    setFavoriteIds(
      (data ?? [])
        .map((favorite) => favorite.product_id)
        .filter((id): id is number => id !== null)
        .map(String),
    );
  }

  async function toggleFavorite(product: Product) {
    setFavoriteMessage("");
    setFavoriteLoading(String(product.id));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFavoriteMessage("Сначала войдите в аккаунт.");
      setFavoriteLoading(null);
      return;
    }

    const productId = String(product.id);
    const isFavorite = favoriteIds.includes(productId);

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product.id);

      if (error) {
        setFavoriteMessage(error.message);
        setFavoriteLoading(null);
        return;
      }

      setFavoriteIds((current) =>
        current.filter((id) => id !== productId),
      );

      setFavoriteMessage("Товар убран из избранного.");
    } else {
      const { error } = await supabase.from("favorites").insert({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        store_name: product.store_name || "KONA LADY",
        price_uah: product.price_uah,
        image_url: product.image_url,
      });

      if (error) {
        setFavoriteMessage(error.message);
        setFavoriteLoading(null);
        return;
      }

      setFavoriteIds((current) => [...current, productId]);

      setFavoriteMessage("Товар добавлен в избранное ❤️");
    }

    setFavoriteLoading(null);
  }

  function askAI() {
    const text = aiMessage.toLowerCase().trim();

    const hasWord = (words: readonly string[]) =>
      words.some((word) => text.includes(word));

    const priceMatch = text.match(
      /(?:до|не дороже|максимум|меньше|дешевле|в пределах|бюджет(?:ом)?|бюджете|за|цена)\s*(\d{2,6})\s*(?:грн|гривен|гривны|гривна|₴)?/i,
    );

    const standalonePriceMatch =
      !priceMatch &&
      /(?:^|\s)(\d{2,6})(?:\s*(?:грн|гривен|гривны|гривна|₴))?(?:\s|$)/i.test(
        text,
      )
        ? text.match(
            /(?:^|\s)(\d{2,6})(?:\s*(?:грн|гривен|гривны|гривна|₴))?(?:\s|$)/i,
          )
        : null;

    const detectedPriceMatch =
      priceMatch || standalonePriceMatch;

    const maxPrice = detectedPriceMatch
      ? Number(
          detectedPriceMatch[1] ??
            detectedPriceMatch[0].match(/\d{2,6}/)?.[0],
        )
      : null;

    const isExactPrice =
      maxPrice !== null &&
      /(ровно|точно|именно|цена ровно|цена точно)/i.test(text);

    if (!text) {
      setAiFilteredProductIds(null);
      setSelectedSubcategory(null);
      setAiAnswer("Напиши, что ты ищешь 💜");
      return;
    }

    const isWalkRequest =
      text.includes("прогулк") ||
      text.includes("гулять") ||
      text.includes("погулять");

    const isUnsureRequest =
      text.includes("не знаю что хочу") ||
      text.includes("не знаю чего хочу") ||
      text.includes("не знаю что выбрать") ||
      text.includes("не знаю что надеть") ||
      text.includes("не знаю");

    const isOpenChoiceRequest =
      text.includes("что-нибудь") ||
      text.includes("что нибудь") ||
      text.includes("подкинь") ||
      text.includes("подбери");

    if (isWalkRequest) {
      let filtered = products.filter(
        (product) =>
          product.category === "Одежда" ||
          product.category === "Обувь",
      );

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setSelectedCategory("Одежда");
      setSelectedSubcategory(null);

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      if (filtered.length > 0) {
        setAiAnswer(
          hasWord(aiDictionary.common.slice(0, 9))
            ? `Привет 💜 Давай подберём что-нибудь для прогулки. Нашла ${filtered.length} ${
                filtered.length === 1 ? "вариант" : "варианта"
              } — посмотри, что тебе понравится 😊`
            : `Для прогулки нашла ${filtered.length} ${
                filtered.length === 1 ? "вариант" : "варианта"
              }${
                maxPrice !== null
                  ? isExactPrice
                    ? ` ровно за ${maxPrice} грн`
                    : ` до ${maxPrice} грн`
                  : ""
              } 💜`,
        );
      } else {
        setAiAnswer(
          maxPrice !== null
            ? `Пока не нашла подходящих вариантов для прогулки до ${maxPrice} грн 💜`
            : "Пока не нашла подходящих вариантов для прогулки 💜",
        );
      }

      return;
    }

    if (isUnsureRequest && isOpenChoiceRequest) {
      setAiFilteredProductIds([]);
      setSelectedCategory("Все");
      setSelectedSubcategory(null);

      setAiAnswer(
        "Это нормально 😄 Давай подберём вместе 💜 Скажи, куда ты собираешься: на прогулку, свидание, работу или просто хочется что-нибудь красивое?",
      );

      return;
    }

    if (isUnsureRequest) {
      setAiFilteredProductIds([]);
      setSelectedCategory("Все");
      setSelectedSubcategory(null);

      setAiAnswer(
        "Это нормально 😄 Давай подберём вместе 💜 Тебе хочется одежду, обувь, косметику или аксессуары?",
      );

      return;
    }

    let productType: keyof typeof aiDictionary.products | null = null;

    if (text.includes("кольц")) {
      const ringProducts = products.filter((product) => {
        const name = product.name.toLowerCase();
        const description = (product.description || "").toLowerCase();

        return (
          name.includes("кольц") ||
          description.includes("кольц")
        );
      });

      let filtered = ringProducts;

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setSelectedCategory("Аксессуары");
      setSelectedSubcategory(null);

      if (filtered.length > 0) {
        setAiAnswer(
          isExactPrice
            ? `Нашла ${filtered.length} ${
                filtered.length === 1 ? "товар" : "товара"
              } ровно за ${maxPrice} грн 💜`
            : maxPrice !== null
              ? `Нашла ${filtered.length} ${
                  filtered.length === 1 ? "товар" : "товара"
                } до ${maxPrice} грн 💜`
              : `Нашла ${filtered.length} ${
                  filtered.length === 1 ? "товар" : "товара"
                } по твоему запросу 💜`,
        );
      } else {
        setAiAnswer(
          isExactPrice
            ? `Пока не нашла колец ровно за ${maxPrice} грн 💜`
            : maxPrice !== null
              ? `Пока не нашла колец до ${maxPrice} грн 💜`
              : "Пока не нашла подходящих колец 💜",
        );
      }

      return;
    }

    if (text.includes("серьг")) {
      const earringProducts = products.filter((product) => {
        const name = product.name.toLowerCase();
        const description = (product.description || "").toLowerCase();

        return (
          name.includes("серьг") ||
          description.includes("серьг")
        );
      });

      let filtered = earringProducts;

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setSelectedCategory("Аксессуары");
      setSelectedSubcategory(null);

      if (filtered.length > 0) {
        setAiAnswer(
          isExactPrice
            ? `Нашла ${filtered.length} ${
                filtered.length === 1 ? "товар" : "товара"
              } ровно за ${maxPrice} грн 💜`
            : maxPrice !== null
              ? `Нашла ${filtered.length} ${
                  filtered.length === 1 ? "товар" : "товара"
                } до ${maxPrice} грн 💜`
              : `Нашла ${filtered.length} ${
                  filtered.length === 1 ? "товар" : "товара"
                } по твоему запросу 💜`,
        );
      } else {
        setAiAnswer(
          isExactPrice
            ? `Пока не нашла серёг ровно за ${maxPrice} грн 💜`
            : maxPrice !== null
              ? `Пока не нашла серёг до ${maxPrice} грн 💜`
              : "Пока не нашла подходящих серёг 💜",
        );
      }

      return;
    }

    if (
      text.includes("кроссов") ||
      text.includes("кросов") ||
      text.includes("кед")
    ) {
      productType = "sneakers";
    } else if (
      text.includes("сумк") ||
      text.includes("сумоч")
    ) {
      productType = "bags";
    } else if (text.includes("клатч")) {
      productType = "clutches";
    } else if (
      text.includes("кошел") ||
      text.includes("кошелёк")
    ) {
      productType = "wallets";
    } else if (
      text.includes("ремень") ||
      text.includes("ремн") ||
      text.includes("пояс")
    ) {
      productType = "belts";
    } else if (text.includes("браслет")) {
      productType = "jewelry";
    } else if (
      text.includes("ожерел") ||
      text.includes("цепоч") ||
      text.includes("колье")
    ) {
      productType = "jewelry";
    } else if (text.includes("украшен")) {
      productType = "jewelry";
    } else if (text.includes("очк")) {
      productType = "glasses";
    } else if (
      text.includes("шарф") ||
      text.includes("платок") ||
      text.includes("платки")
    ) {
      productType = "scarves";
    } else if (text.includes("плать")) {
      productType = "dresses";
    } else if (
      text.includes("рубаш") ||
      text.includes("блуз")
    ) {
      productType = "shirts";
    } else if (text.includes("юбк")) {
      productType = "skirts";
    } else if (text.includes("джинс")) {
      productType = "jeans";
    } else if (
      text.includes("помад") ||
      text.includes("туш") ||
      text.includes("пудр") ||
      text.includes("румян") ||
      text.includes("консил") ||
      text.includes("хайлайтер") ||
      text.includes("тональн") ||
      text.includes("сыворот") ||
      text.includes("маск") ||
      text.includes("шампун") ||
      text.includes("бальзам") ||
      text.includes("дух") ||
      text.includes("парфюм")
    ) {
      productType = "cosmetics";
    }

    if (!productType) {
      const productTypes = Object.keys(
        aiDictionary.products,
      ) as Array<keyof typeof aiDictionary.products>;

      for (const type of productTypes) {
        if (hasWord(aiDictionary.products[type])) {
          productType = type;
          break;
        }
      }
    }

    let category = "Все";

    if (hasWord(aiDictionary.categories.clothing)) {
      category = "Одежда";
    } else if (hasWord(aiDictionary.categories.shoes)) {
      category = "Обувь";
    } else if (hasWord(aiDictionary.categories.cosmetics)) {
      category = "Косметика";
    } else if (hasWord(aiDictionary.categories.accessories)) {
      category = "Аксессуары";
    }

    /*
     * Бюджет без конкретной категории.
     *
     * Например:
     * "есть какие-то варианты с бюджетом 2000"
     * "что есть до 2000"
     * "что можно найти в пределах 1500"
     *
     * Здесь показываем весь каталог в заданном бюджете.
     * Этот блок стоит ДО приветствия и общего ответа,
     * поэтому KONA больше не скажет "не совсем поняла",
     * если бюджет был понятен.
     */
    if (maxPrice !== null && !productType && category === "Все") {
      const filtered = products.filter((product) =>
        isExactPrice
          ? product.price_uah === maxPrice
          : product.price_uah <= maxPrice,
      );

      setSelectedCategory("Все");
      setSelectedSubcategory(null);

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      if (filtered.length > 0) {
        setAiAnswer(
          isExactPrice
            ? `Нашла ${filtered.length} ${
                filtered.length === 1 ? "вариант" : "варианта"
              } ровно за ${maxPrice} грн 💜`
            : `Нашла ${filtered.length} ${
                filtered.length === 1 ? "вариант" : "вариантов"
              } до ${maxPrice} грн 💜`,
        );
      } else {
        setAiAnswer(
          isExactPrice
            ? `Пока не нашла вариантов ровно за ${maxPrice} грн 💜`
            : `Пока не нашла вариантов до ${maxPrice} грн 💜`,
        );
      }

      return;
    }

    const hasGreeting = hasWord(aiDictionary.common.slice(0, 9));

    if (hasGreeting) {
      setAiFilteredProductIds([]);
      setSelectedCategory("Все");
      setSelectedSubcategory(null);

      setAiAnswer(
        "Привет 💜 Я KONA AI. Расскажи, что тебе нужно — могу помочь подобрать товар, образ, подарок или что-нибудь для конкретного случая.",
      );

      return;
    }

    if (productType) {
      const keywords = aiDictionary.products[productType];

      let filtered = products.filter((product) => {
        const name = product.name.toLowerCase();
        const description = (product.description || "").toLowerCase();

        return keywords.some(
          (keyword) =>
            name.includes(keyword.toLowerCase()) ||
            description.includes(keyword.toLowerCase()),
        );
      });

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );
      setSelectedSubcategory(null);

      if (filtered.length > 0) {
        setSelectedCategory(filtered[0].category);
      } else if (category !== "Все") {
        setSelectedCategory(category);
      } else {
        setSelectedCategory("Все");
      }

      if (filtered.length > 0) {
        setAiAnswer(
          isExactPrice
            ? `Нашла ${filtered.length} ${
                filtered.length === 1 ? "товар" : "товара"
              } ровно за ${maxPrice} грн 💜`
            : maxPrice !== null
              ? `Нашла ${filtered.length} ${
                  filtered.length === 1 ? "товар" : "товара"
                } до ${maxPrice} грн 💜`
              : `Нашла ${filtered.length} ${
                  filtered.length === 1 ? "товар" : "товара"
                } по твоему запросу 💜`,
        );
      } else {
        const productName =
          productType === "dresses"
            ? "платьев"
            : productType === "shirts"
              ? "рубашек и блузок"
              : productType === "skirts"
                ? "юбок"
                : productType === "jeans"
                  ? "джинсов"
                  : productType === "sneakers"
                    ? "кроссовок"
                    : productType === "shoes"
                      ? "обуви"
                      : productType === "bags"
                        ? "сумок"
                        : productType === "clutches"
                          ? "клатчей"
                          : productType === "wallets"
                            ? "кошельков"
                            : productType === "belts"
                              ? "ремней"
                              : productType === "jewelry"
                                ? "украшений"
                                : productType === "glasses"
                                  ? "очков"
                                  : productType === "scarves"
                                    ? "шарфов и платков"
                                    : productType === "cosmetics"
                                      ? "косметики"
                                      : "товаров";

        setAiAnswer(
          isExactPrice
            ? `Пока не нашла ${productName} ровно за ${maxPrice} грн 💜`
            : maxPrice !== null
              ? `Пока не нашла ${productName} до ${maxPrice} грн 💜`
              : `Пока не нашла подходящих ${productName} 💜`,
        );
      }

      return;
    }

    if (hasWord(aiDictionary.occasions.date)) {
      if (category === "Все") {
        category = "Одежда";
      }

      setSelectedCategory(category);
      setSelectedSubcategory(null);

      let filtered = products.filter(
        (product) => product.category === category,
      );

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setAiAnswer(
        filtered.length > 0
          ? isExactPrice
            ? `Для свидания нашла ${filtered.length} вариант(а) ровно за ${maxPrice} грн 💜`
            : maxPrice !== null
              ? `Для свидания нашла ${filtered.length} вариант(а) до ${maxPrice} грн 💜`
              : `Для свидания нашла ${filtered.length} подходящий вариант(а) 💜`
          : "Пока не нашла подходящих вариантов для свидания 💜",
      );

      return;
    }

    if (hasWord(aiDictionary.occasions.evening)) {
      if (category === "Все") {
        category = "Одежда";
      }

      setSelectedCategory(category);
      setSelectedSubcategory(null);

      let filtered = products.filter(
        (product) => product.category === category,
      );

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setAiAnswer(
        filtered.length > 0
          ? isExactPrice
            ? `Для вечера нашла ${filtered.length} вариант(а) ровно за ${maxPrice} грн ✨`
            : maxPrice !== null
              ? `Для вечера нашла ${filtered.length} вариант(а) до ${maxPrice} грн ✨`
              : `Для вечера нашла ${filtered.length} подходящий вариант(а) ✨`
          : "Для вечера пока не нашла подходящих вариантов.",
      );

      return;
    }

    if (hasWord(aiDictionary.occasions.work)) {
      if (category === "Все") {
        category = "Одежда";
      }

      setSelectedCategory(category);
      setSelectedSubcategory(null);

      let filtered = products.filter(
        (product) => product.category === category,
      );

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setAiAnswer(
        filtered.length > 0
          ? isExactPrice
            ? `Для работы нашла ${filtered.length} вариант(а) ровно за ${maxPrice} грн 👗`
            : maxPrice !== null
              ? `Для работы нашла ${filtered.length} вариант(а) до ${maxPrice} грн 👗`
              : `Для работы нашла ${filtered.length} подходящий вариант(а) 👗`
          : "Пока не нашла подходящих вариантов для работы.",
      );

      return;
    }

    if (hasWord(aiDictionary.occasions.vacation)) {
      let filtered =
        category === "Все"
          ? products
          : products.filter(
              (product) => product.category === category,
            );

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setSelectedCategory(category);
      setSelectedSubcategory(null);

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setAiAnswer(
        filtered.length > 0
          ? isExactPrice
            ? `Для отдыха нашла ${filtered.length} вариант(а) ровно за ${maxPrice} грн ☀️`
            : maxPrice !== null
              ? `Для отдыха нашла ${filtered.length} вариант(а) до ${maxPrice} грн ☀️`
              : `Для отдыха нашла ${filtered.length} подходящий вариант(а) ☀️`
          : "Пока не нашла подходящих вариантов для отдыха.",
      );

      return;
    }

    if (hasWord(aiDictionary.occasions.gift)) {
      if (category === "Все") {
        category = "Аксессуары";
      }

      let filtered = products.filter(
        (product) => product.category === category,
      );

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setSelectedCategory(category);
      setSelectedSubcategory(null);

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setAiAnswer(
        filtered.length > 0
          ? isExactPrice
            ? `Нашла ${filtered.length} вариант(а) для подарка ровно за ${maxPrice} грн 🎁`
            : maxPrice !== null
              ? `Нашла ${filtered.length} вариант(а) для подарка до ${maxPrice} грн 🎁`
              : `Нашла ${filtered.length} вариант(а) для подарка 🎁`
          : "Пока не нашла подходящих вариантов для подарка.",
      );

      return;
    }

    if (category !== "Все") {
      let filtered = products.filter(
        (product) => product.category === category,
      );

      if (maxPrice !== null) {
        filtered = isExactPrice
          ? filtered.filter(
              (product) => product.price_uah === maxPrice,
            )
          : filtered.filter(
              (product) => product.price_uah <= maxPrice,
            );
      }

      setSelectedCategory(category);
      setSelectedSubcategory(null);

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setAiAnswer(
        filtered.length > 0
          ? isExactPrice
            ? `Нашла ${filtered.length} товар(а) ровно за ${maxPrice} грн 💜`
            : maxPrice !== null
              ? `Нашла ${filtered.length} товар(а) до ${maxPrice} грн 💜`
              : `Показываю ${category.toLowerCase()} 💜`
          : isExactPrice
            ? `Пока нет товаров за ${maxPrice} грн.`
            : maxPrice !== null
              ? `Пока нет подходящих товаров до ${maxPrice} грн.`
              : `Пока нет товаров в категории «${category}».`,
      );

      return;
    }

    if (maxPrice !== null) {
      const filtered = products.filter((product) =>
        isExactPrice
          ? product.price_uah === maxPrice
          : product.price_uah <= maxPrice,
      );

      setSelectedCategory("Все");
      setSelectedSubcategory(null);

      setAiFilteredProductIds(
        filtered.map((product) => product.id),
      );

      setAiAnswer(
        filtered.length > 0
          ? isExactPrice
            ? `Нашла ${filtered.length} товар(а) ровно за ${maxPrice} грн 💜`
            : `Нашла ${filtered.length} товар(а) до ${maxPrice} грн 💜`
          : isExactPrice
            ? `Пока нет товаров ровно за ${maxPrice} грн.`
            : `Пока нет товаров до ${maxPrice} грн.`,
      );

      return;
    }

    setAiFilteredProductIds(null);
    setSelectedCategory("Все");
    setSelectedSubcategory(null);

    setAiAnswer(
      "Я пока не совсем поняла запрос 💜 Попробуй написать: «сумка до 2000 грн», «кроссовки до 1500», «кольцо», «серьги», «кошелёк», «клатч» или «нужен подарок».",
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] text-zinc-900">
      <header className="border-b border-purple-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 md:px-8">
          <div>
            <div className="text-2xl font-black tracking-tight text-purple-700">
              ✦ KONA LADY
            </div>

            <div className="text-xs text-zinc-500">
              Начни свой стиль с KONA
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="/" className="cursor-pointer">
              Главная
            </a>

            <button type="button">
              Магазины
            </button>

            <a
              href="/cart"
              className="cursor-pointer font-semibold text-purple-700 transition hover:text-purple-900"
            >
              🛒 Корзина
              {cartCount > 0 && (
                <span className="ml-1">
                  ({cartCount})
                </span>
              )}
            </a>

            <a href="/profile/orders" className="cursor-pointer">
              Заказы
            </a>

            <a href="/contacts" className="cursor-pointer">
              Контакты
            </a>

            <a href="/profile" className="cursor-pointer">
              Профиль
            </a>
          </div>

          <a
            href="/login"
            className="cursor-pointer rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700"
          >
            Войти
          </a>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:grid-cols-[220px_minmax(0,1fr)_280px] md:px-8">
        <aside className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 text-lg font-bold">
            Категории
          </div>

          <button
            type="button"
            onClick={() => {
              setAiFilteredProductIds(null);
              setSelectedCategory("Все");
              setSelectedSubcategory(null);
              setExpandedCategory(null);
            }}
            className={`mb-2 w-full cursor-pointer rounded-2xl px-4 py-3 text-left font-medium transition ${
              selectedCategory === "Все" &&
              selectedSubcategory === null &&
              aiFilteredProductIds === null
                ? "bg-purple-600 text-white"
                : "hover:bg-purple-50"
            }`}
          >
            ✦ Все товары
          </button>

          {categories.map((category) => {
            const isExpanded = expandedCategory === category;
            const isSelected =
              selectedCategory === category &&
              selectedSubcategory === null &&
              aiFilteredProductIds === null;

            return (
              <div key={category} className="mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setAiFilteredProductIds(null);
                    setSelectedCategory(category);
                    setSelectedSubcategory(null);
                    setExpandedCategory(
                      isExpanded ? null : category,
                    );
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-left font-medium transition ${
                    isSelected
                      ? "bg-purple-600 text-white"
                      : "hover:bg-purple-50"
                  }`}
                >
                  <span>{category}</span>

                  <span
                    className={`text-xs transition ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-1 space-y-1 pl-2">
                    {subcategories[category]?.map(
                      (subcategory) => {
                        const isSubcategorySelected =
                          selectedSubcategory ===
                            subcategory.value &&
                          selectedCategory === category &&
                          aiFilteredProductIds === null;

                        return (
                          <button
                            key={subcategory.value}
                            type="button"
                            onClick={() => {
                              setAiFilteredProductIds(null);
                              setSelectedCategory(category);
                              setSelectedSubcategory(
                                subcategory.value,
                              );
                            }}
                            className={`w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm transition ${
                              isSubcategorySelected
                                ? "bg-purple-100 font-bold text-purple-700"
                                : "text-zinc-600 hover:bg-purple-50 hover:text-purple-700"
                            }`}
                          >
                            {subcategory.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-6 rounded-2xl bg-purple-50 p-4">
            <div className="text-sm font-bold text-purple-700">
              KONA LADY
            </div>

            <div className="mt-1 text-xs leading-5 text-zinc-500">
              Начни свой стиль с KONA.
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="planet-banner relative min-h-[310px] overflow-hidden rounded-[32px] bg-[#16052d] p-7 text-white shadow-lg md:p-10">
            <div className="planet planet-one" />
            <div className="planet planet-two" />
            <div className="planet planet-three" />

            <div className="relative z-10 max-w-xl">
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-purple-300">
                KONA LADY
              </div>

              <h1 className="text-4xl font-black leading-tight md:text-6xl">
                Начни свой
                <br />
                стиль с KONA.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-6 text-purple-100 md:text-base">
                Одежда, обувь, косметика и аксессуары —
                всё для твоего образа.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-xl text-white">
                ✦
              </div>

              <div>
                <div className="font-bold">
                  KONA AI
                </div>

                <div className="text-xs text-zinc-500">
                  Поможет подобрать твой стиль
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={aiMessage}
                onChange={(event) =>
                  setAiMessage(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    askAI();
                  }
                }}
                placeholder="Например: платье на вечер до 3000 грн"
                className="min-h-12 flex-1 rounded-2xl border border-purple-100 bg-purple-50 px-4 outline-none focus:border-purple-400"
              />

              <button
                type="button"
                onClick={askAI}
                className="min-h-12 cursor-pointer rounded-2xl bg-purple-600 px-6 font-bold text-white transition hover:bg-purple-700"
              >
                Найти
              </button>
            </div>

            {aiAnswer && (
              <div className="mt-3 rounded-2xl bg-purple-50 px-4 py-3 text-sm text-purple-800">
                {aiAnswer}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-2xl font-black">
                  Новинки
                </div>

                <div className="text-sm text-zinc-500">
                  {selectedSubcategoryLabel
                    ? `${selectedCategory} → ${selectedSubcategoryLabel}`
                    : selectedCategory === "Все"
                      ? "Новые товары"
                      : selectedCategory}
                </div>
              </div>

              <div className="rounded-full bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700">
                {filteredProducts.length} товаров
              </div>
            </div>

            {favoriteMessage && (
              <div className="mb-4 rounded-2xl bg-purple-50 px-4 py-3 text-sm text-purple-800">
                {favoriteMessage}
              </div>
            )}

            {loadingProducts ? (
              <div className="rounded-3xl bg-purple-50 p-10 text-center text-sm text-zinc-500">
                Загружаем товары...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-3xl bg-purple-50 p-10 text-center">
                <div className="text-4xl">
                  🛍️
                </div>

                <div className="mt-3 font-bold">
                  В этой категории пока нет товаров
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const isFavorite = favoriteIds.includes(
                    String(product.id),
                  );

                  const isLoading =
                    favoriteLoading === String(product.id);

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-2xl border border-purple-100 bg-white transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <a
                        href={`/product/${product.id}`}
                        className="block cursor-pointer"
                      >
                        <div className="relative flex h-36 items-center justify-center bg-purple-50 text-6xl">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            productEmojis[product.id] || "🛍️"
                          )}
                        </div>

                        <div className="p-4 pb-2">
                          <div className="text-xs text-purple-600">
                            {product.category}
                          </div>

                          <h2 className="mt-1 font-bold">
                            {product.name}
                          </h2>

                          <div className="mt-3 font-black">
                            {product.price_uah.toLocaleString(
                              "uk-UA",
                            )}{" "}
                            грн
                          </div>
                        </div>
                      </a>

                      <div className="flex items-center justify-between px-4 pb-4">
                        <button
                          type="button"
                          onClick={() =>
                            toggleFavorite(product)
                          }
                          disabled={isLoading}
                          aria-label={
                            isFavorite
                              ? "Убрать из избранного"
                              : "Добавить в избранное"
                          }
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-purple-50 text-xl transition hover:scale-110 hover:bg-purple-100 disabled:cursor-wait disabled:opacity-50"
                        >
                          {isFavorite ? "❤️" : "♡"}
                        </button>

                        <a
                          href={`/product/${product.id}`}
                          className="cursor-pointer rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white"
                        >
                          Смотреть
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 text-lg font-bold">
              Популярное
            </div>

            <div className="space-y-3">
              {products.slice(0, 4).map((product, index) => (
                <a
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl bg-purple-50 p-3 transition hover:bg-purple-100 hover:shadow-sm"
                >
                  <div className="text-3xl">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      productEmojis[product.id] || "🛍️"
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {product.name}
                    </div>

                    <div className="text-xs text-zinc-500">
                      {product.price_uah.toLocaleString(
                        "uk-UA",
                      )}{" "}
                      грн
                    </div>
                  </div>

                  <div className="text-xs font-bold text-purple-600">
                    #{index + 1}
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-purple-700 to-fuchsia-600 p-6 text-white shadow-lg">
            <div className="text-sm font-semibold text-purple-200">
              KONA LADY
            </div>

            <div className="mt-2 text-2xl font-black">
              Начни свой стиль с KONA.
            </div>

            <p className="mt-3 text-sm leading-6 text-purple-100">
              Опиши, что тебе нужно — KONA AI поможет
              подобрать образ.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}