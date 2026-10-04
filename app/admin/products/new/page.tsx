"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type MeasurementRow = {
  size: string;
  bust_cm: string;
  waist_cm: string;
  hips_cm: string;
  length_cm: string;
  sleeve_cm: string;
};

type SelectedFile = {
  file: File;
  preview: string;
};

type SubcategoryOption = {
  value: string;
  label: string;
};

const categories = [
  "Одежда",
  "Обувь",
  "Косметика",
  "Аксессуары",
];

const subcategories: Record<string, SubcategoryOption[]> = {
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
    {
      value: "sweaters-hoodies",
      label: "Свитера, кофты и худи",
    },
    { value: "sportswear", label: "Спортивная одежда" },
    { value: "tops", label: "Топы" },
    { value: "tunics", label: "Туники" },
    { value: "t-shirts", label: "Футболки" },
    { value: "shorts", label: "Шорты" },
    { value: "skirts", label: "Юбки" },
    {
      value: "outerwear",
      label: "Куртки и верхняя одежда",
    },
    { value: "underwear", label: "Бельё" },
  ],

  Обувь: [
    { value: "uggs", label: "Угги" },
    { value: "loafers", label: "Лоферы" },
    {
      value: "clogs-slippers",
      label: "Сабо и шлёпанцы",
    },
    {
      value: "flip-flops",
      label: "Вьетнамки и сланцы",
    },
    { value: "sandals", label: "Босоножки" },
    {
      value: "boots",
      label: "Ботинки и ботильоны",
    },
    {
      value: "sneakers",
      label: "Кеды и кроссовки",
    },
    { value: "slippers", label: "Тапочки" },
  ],

  Косметика: [
    {
      value: "makeup",
      label: "Макияж",
    },
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
    {
      value: "hats",
      label: "Головные уборы",
    },
    {
      value: "scarves",
      label: "Шарфы и платки",
    },
  ],
};

export default function NewProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Аксессуары");
  const [subcategory, setSubcategory] = useState("bags");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [storeName, setStoreName] = useState("");

  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [style, setStyle] = useState("");
  const [gender, setGender] = useState("Женский");
  const [country, setCountry] = useState("");
  const [composition, setComposition] = useState("");
  const [sizeGroup, setSizeGroup] = useState("");
  const [sleeve, setSleeve] = useState("");
  const [length, setLength] = useState("");
  const [neckline, setNeckline] = useState("");
  const [closure, setClosure] = useState("");
  const [fit, setFit] = useState("");
  const [fabricFeatures, setFabricFeatures] = useState("");

  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [measurements, setMeasurements] = useState<
    MeasurementRow[]
  >([]);

  const [isAvailable, setIsAvailable] = useState(true);
  const [quantity, setQuantity] = useState("1");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentSubcategories =
    subcategories[category] ?? [];

  function handleCategoryChange(value: string) {
    setCategory(value);

    const firstSubcategory =
      subcategories[value]?.[0]?.value ?? "";

    setSubcategory(firstSubcategory);
  }

  function handleFilesChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected = Array.from(
      event.target.files ?? []
    );

    const newFiles: SelectedFile[] = selected.map(
      (file) => ({
        file,
        preview: URL.createObjectURL(file),
      })
    );

    setFiles((prev) => [...prev, ...newFiles]);

    event.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const removed = prev[index];

      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  function addMeasurement() {
    setMeasurements((prev) => [
      ...prev,
      {
        size: "",
        bust_cm: "",
        waist_cm: "",
        hips_cm: "",
        length_cm: "",
        sleeve_cm: "",
      },
    ]);
  }

  function updateMeasurement(
    index: number,
    field: keyof MeasurementRow,
    value: string
  ) {
    setMeasurements((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function removeMeasurement(index: number) {
    setMeasurements((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  async function uploadProductImage(
    file: File,
    productId: number,
    index: number
  ) {
    const extension =
      file.name.split(".").pop() || "jpg";

    const fileName = `${productId}-${Date.now()}-${index}.${extension}`;

    const filePath = `products/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!name.trim()) {
        throw new Error(
          "Введите название товара."
        );
      }

      if (!price.trim()) {
        throw new Error(
          "Введите цену товара."
        );
      }

      const priceNumber = Number(
        price.replace(",", ".")
      );

      if (
        Number.isNaN(priceNumber) ||
        priceNumber < 0
      ) {
        throw new Error(
          "Цена указана некорректно."
        );
      }

      const quantityNumber = Math.max(
        0,
        Number.parseInt(quantity, 10) || 0
      );

      const { data: product, error: productError } =
        await supabase
          .from("products")
          .insert({
            name: name.trim(),
            category,
            subcategory,
            price_uah: priceNumber,
            description:
              description.trim() || null,
            store_name:
              storeName.trim() || null,
            brand: brand.trim() || null,
            material: material.trim() || null,
            color: color.trim() || null,
            season: season.trim() || null,
            style: style.trim() || null,
            gender: gender.trim() || null,
            country: country.trim() || null,
            composition:
              composition.trim() || null,
            size_group:
              sizeGroup.trim() || null,
            sleeve: sleeve.trim() || null,
            length: length.trim() || null,
            neckline:
              neckline.trim() || null,
            closure: closure.trim() || null,
            fit: fit.trim() || null,
            fabric_features:
              fabricFeatures.trim() || null,
            is_available:
              isAvailable && quantityNumber > 0,
          })
          .select()
          .single();

      if (productError) {
        throw productError;
      }

      if (!product) {
        throw new Error(
          "Товар не был создан."
        );
      }

      if (files.length > 0) {
        for (
          let index = 0;
          index < files.length;
          index++
        ) {
          const imageUrl =
            await uploadProductImage(
              files[index].file,
              product.id,
              index
            );

          const { error: imageError } =
            await supabase
              .from("product_images")
              .insert({
                product_id: product.id,
                image_url: imageUrl,
                sort_order: index,
              });

          if (imageError) {
            throw imageError;
          }

          if (index === 0) {
            const { error: updateError } =
              await supabase
                .from("products")
                .update({
                  image_url: imageUrl,
                })
                .eq("id", product.id);

            if (updateError) {
              throw updateError;
            }
          }
        }
      }

      const validMeasurements =
        measurements.filter(
          (row) => row.size.trim()
        );

      if (validMeasurements.length > 0) {
        const rows =
          validMeasurements.map((row) => ({
            product_id: product.id,
            size: row.size.trim(),
            bust_cm:
              row.bust_cm.trim()
                ? Number(row.bust_cm)
                : null,
            waist_cm:
              row.waist_cm.trim()
                ? Number(row.waist_cm)
                : null,
            hips_cm:
              row.hips_cm.trim()
                ? Number(row.hips_cm)
                : null,
            length_cm:
              row.length_cm.trim()
                ? Number(row.length_cm)
                : null,
            sleeve_cm:
              row.sleeve_cm.trim()
                ? Number(row.sleeve_cm)
                : null,
          }));

        const { error: measurementsError } =
          await supabase
            .from("product_measurements")
            .insert(rows);

        if (measurementsError) {
          throw measurementsError;
        }
      }

      setMessage(
        "Товар успешно добавлен!"
      );

      setTimeout(() => {
        router.push("/admin/products");
      }, 800);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не удалось добавить товар."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-purple-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-purple-950">
              Добавить товар
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Создание нового товара KONA LADY
            </p>
          </div>

          <Link
            href="/admin/products"
            className="rounded-xl bg-white px-4 py-2 font-medium text-purple-700 shadow-sm hover:bg-purple-100"
          >
            ← К товарам
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-purple-950">
              Основная информация
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Название товара *
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="Например: Платье женское классическое"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Категория *
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    handleCategoryChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500"
                >
                  {categories.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Подкатегория *
                </label>

                <select
                  value={subcategory}
                  onChange={(e) =>
                    setSubcategory(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500"
                >
                  {currentSubcategories.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Цена, грн *
                </label>

                <input
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                  inputMode="decimal"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="1200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Магазин / поставщик
                </label>

                <input
                  value={storeName}
                  onChange={(e) =>
                    setStoreName(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="AGER"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Описание
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  rows={5}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="Описание товара..."
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-purple-950">
              Фотографии
            </h2>

            <label
              htmlFor="product-images"
              className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 px-5 py-7 text-center transition hover:bg-purple-100"
            >
              <span>
                <span className="block text-lg font-bold text-purple-800">
                  📷 Добавить фото
                </span>

                <span className="mt-1 block text-sm text-gray-500">
                  Можно выбрать несколько фотографий
                </span>
              </span>
            </label>

            <input
              id="product-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="hidden"
            />

            {files.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {files.map((item, index) => (
                  <div
                    key={`${item.file.name}-${index}`}
                    className="relative overflow-hidden rounded-xl border bg-gray-50"
                  >
                    <img
                      src={item.preview}
                      alt={`Фото ${index + 1}`}
                      className="h-40 w-full object-cover"
                    />

                    {index === 0 && (
                      <div className="absolute left-2 top-2 rounded-lg bg-purple-700 px-2 py-1 text-xs font-semibold text-white">
                        Главное
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        removeFile(index)
                      }
                      className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-sm font-bold text-red-600 shadow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-purple-950">
              Характеристики
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Бренд
                </label>

                <input
                  value={brand}
                  onChange={(e) =>
                    setBrand(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="AGER"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Материал
                </label>

                <input
                  value={material}
                  onChange={(e) =>
                    setMaterial(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Полиэстер"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Цвет
                </label>

                <input
                  value={color}
                  onChange={(e) =>
                    setColor(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Черный"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Сезон
                </label>

                <input
                  value={season}
                  onChange={(e) =>
                    setSeason(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Демисезон"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Стиль
                </label>

                <input
                  value={style}
                  onChange={(e) =>
                    setStyle(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Классический"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Пол
                </label>

                <input
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Женский"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Страна
                </label>

                <input
                  value={country}
                  onChange={(e) =>
                    setCountry(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Украина"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Состав
                </label>

                <input
                  value={composition}
                  onChange={(e) =>
                    setComposition(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="100% полиэстер"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Размерная группа
                </label>

                <input
                  value={sizeGroup}
                  onChange={(e) =>
                    setSizeGroup(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="S-M"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Рукав
                </label>

                <input
                  value={sleeve}
                  onChange={(e) =>
                    setSleeve(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Длинный"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Длина
                </label>

                <input
                  value={length}
                  onChange={(e) =>
                    setLength(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Средняя"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Вырез
                </label>

                <input
                  value={neckline}
                  onChange={(e) =>
                    setNeckline(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Круглый"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Застежка
                </label>

                <input
                  value={closure}
                  onChange={(e) =>
                    setClosure(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Молния"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Посадка
                </label>

                <input
                  value={fit}
                  onChange={(e) =>
                    setFit(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Свободная"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Особенности ткани
                </label>

                <input
                  value={fabricFeatures}
                  onChange={(e) =>
                    setFabricFeatures(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  placeholder="Эластичная"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-purple-950">
                  Замеры изделия
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Добавь размеры, если они есть у товара.
                </p>
              </div>

              <button
                type="button"
                onClick={addMeasurement}
                className="rounded-xl bg-purple-100 px-4 py-2 font-medium text-purple-800 hover:bg-purple-200"
              >
                + Добавить размер
              </button>
            </div>

            {measurements.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                Замеры пока не добавлены.
              </p>
            ) : (
              <div className="space-y-4">
                {measurements.map(
                  (row, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-semibold text-purple-900">
                          Размер {index + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeMeasurement(
                              index
                            )
                          }
                          className="text-sm font-medium text-red-600"
                        >
                          Удалить
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        <input
                          value={row.size}
                          onChange={(e) =>
                            updateMeasurement(
                              index,
                              "size",
                              e.target.value
                            )
                          }
                          placeholder="Размер"
                          className="rounded-xl border border-gray-300 px-3 py-2"
                        />

                        <input
                          value={row.bust_cm}
                          onChange={(e) =>
                            updateMeasurement(
                              index,
                              "bust_cm",
                              e.target.value
                            )
                          }
                          placeholder="Грудь, см"
                          className="rounded-xl border border-gray-300 px-3 py-2"
                        />

                        <input
                          value={row.waist_cm}
                          onChange={(e) =>
                            updateMeasurement(
                              index,
                              "waist_cm",
                              e.target.value
                            )
                          }
                          placeholder="Талия, см"
                          className="rounded-xl border border-gray-300 px-3 py-2"
                        />

                        <input
                          value={row.hips_cm}
                          onChange={(e) =>
                            updateMeasurement(
                              index,
                              "hips_cm",
                              e.target.value
                            )
                          }
                          placeholder="Бёдра, см"
                          className="rounded-xl border border-gray-300 px-3 py-2"
                        />

                        <input
                          value={row.length_cm}
                          onChange={(e) =>
                            updateMeasurement(
                              index,
                              "length_cm",
                              e.target.value
                            )
                          }
                          placeholder="Длина, см"
                          className="rounded-xl border border-gray-300 px-3 py-2"
                        />

                        <input
                          value={row.sleeve_cm}
                          onChange={(e) =>
                            updateMeasurement(
                              index,
                              "sleeve_cm",
                              e.target.value
                            )
                          }
                          placeholder="Рукав, см"
                          className="rounded-xl border border-gray-300 px-3 py-2"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-purple-950">
              Наличие
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Количество
                </label>

                <input
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value)
                  }
                  type="number"
                  min="0"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) =>
                    setIsAvailable(
                      e.target.checked
                    )
                  }
                  className="h-5 w-5"
                />

                <span>
                  <span className="block font-medium">
                    Товар доступен для покупки
                  </span>

                  <span className="text-sm text-gray-500">
                    Если выключить, товар будет
                    отображаться как недоступный.
                  </span>
                </span>
              </label>
            </div>
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-purple-700 px-5 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Добавляем товар..."
              : "Добавить товар"}
          </button>
        </form>
      </div>
    </main>
  );
}