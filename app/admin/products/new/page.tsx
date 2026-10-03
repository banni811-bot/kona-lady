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

const categories = [
  "Одежда",
  "Обувь",
  "Косметика",
  "Аксессуары",
];

const subcategories: Record<string, string[]> = {
  Одежда: [
    "dresses",
    "tops",
    "shirts",
    "blouses",
    "skirts",
    "pants",
    "jeans",
    "jackets",
    "outerwear",
  ],
  Обувь: [
    "sneakers",
    "boots",
    "shoes",
    "sandals",
    "heels",
  ],
  Косметика: [
    "face",
    "eyes",
    "lips",
    "hair",
    "body",
  ],
  Аксессуары: [
    "bags",
    "belts",
    "jewelry",
    "watches",
    "sunglasses",
  ],
};

export default function NewProductPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Аксессуары");
  const [subcategory, setSubcategory] = useState("bags");
  const [description, setDescription] = useState("");

  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [style, setStyle] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [composition, setComposition] = useState("");
  const [sizeGroup, setSizeGroup] = useState("");
  const [sleeve, setSleeve] = useState("");
  const [length, setLength] = useState("");
  const [neckline, setNeckline] = useState("");
  const [closure, setClosure] = useState("");
  const [fit, setFit] = useState("");
  const [fabricFeatures, setFabricFeatures] = useState("");

  const [stockQuantity, setStockQuantity] = useState("0");

  const [measurements, setMeasurements] = useState<
    MeasurementRow[]
  >([]);

  const [selectedFiles, setSelectedFiles] = useState<
    SelectedFile[]
  >([]);

  function handleCategoryChange(value: string) {
    setCategory(value);

    const options = subcategories[value] ?? [];
    setSubcategory(options[0] ?? "");
  }

  function addMeasurement() {
    setMeasurements((current) => [
      ...current,
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
    setMeasurements((current) =>
      current.map((row, i) =>
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
    setMeasurements((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const newFiles: SelectedFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles((current) => [
      ...current,
      ...newFiles,
    ]);

    event.target.value = "";
  }

  function removeImage(index: number) {
    setSelectedFiles((current) => {
      const image = current[index];

      if (image) {
        URL.revokeObjectURL(image.preview);
      }

      return current.filter((_, i) => i !== index);
    });
  }

  async function uploadImage(
    productId: number,
    file: File
  ): Promise<string | null> {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `${productId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);

      throw new Error(
        `Ошибка загрузки изображения: ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function saveImages(productId: number) {
    if (!selectedFiles.length) {
      return null;
    }

    const uploadedImages: {
      url: string;
      sortOrder: number;
    }[] = [];

    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index].file;

      const url = await uploadImage(productId, file);

      if (url) {
        uploadedImages.push({
          url,
          sortOrder: index,
        });
      }
    }

    if (!uploadedImages.length) {
      return null;
    }

    const rows = uploadedImages.map((image) => ({
      product_id: productId,
      image_url: image.url,
      sort_order: image.sortOrder,
    }));

    const { error } = await supabase
      .from("product_images")
      .insert(rows);

    if (error) {
      throw new Error(
        `Не удалось сохранить фотографии: ${error.message}`
      );
    }

    return uploadedImages[0].url;
  }

  async function saveMeasurements(productId: number) {
    const validMeasurements = measurements
      .filter((row) => row.size.trim() !== "")
      .map((row) => ({
        product_id: productId,
        size: row.size.trim(),
        bust_cm: row.bust_cm
          ? Number(row.bust_cm)
          : null,
        waist_cm: row.waist_cm
          ? Number(row.waist_cm)
          : null,
        hips_cm: row.hips_cm
          ? Number(row.hips_cm)
          : null,
        length_cm: row.length_cm
          ? Number(row.length_cm)
          : null,
        sleeve_cm: row.sleeve_cm
          ? Number(row.sleeve_cm)
          : null,
      }));

    if (!validMeasurements.length) {
      return;
    }

    const { error } = await supabase
      .from("product_measurements")
      .insert(validMeasurements);

    if (error) {
      throw new Error(
        `Не удалось сохранить замеры: ${error.message}`
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Введите название товара");
      return;
    }

    if (!price || Number(price) < 0) {
      alert("Введите корректную цену");
      return;
    }

    const quantity = Number(stockQuantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      alert(
        "Количество на складе должно быть целым числом от 0"
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * СНАЧАЛА создаём сам товар.
       * После этого Supabase вернёт его новый ID.
       */
      const { data: product, error: productError } =
        await supabase
          .from("products")
          .insert({
            name: name.trim(),
            price_uah: Number(price),
            category,
            subcategory,
            description: description.trim() || null,

            brand: brand.trim() || null,
            material: material.trim() || null,
            color: color.trim() || null,
            season: season.trim() || null,
            style: style.trim() || null,
            gender: gender.trim() || null,
            country: country.trim() || null,
            composition: composition.trim() || null,
            size_group: sizeGroup.trim() || null,
            sleeve: sleeve.trim() || null,
            length: length.trim() || null,
            neckline: neckline.trim() || null,
            closure: closure.trim() || null,
            fit: fit.trim() || null,
            fabric_features:
              fabricFeatures.trim() || null,

            stock_quantity: quantity,

            is_available: quantity > 0,
            is_active: true,

            image_url: null,
          })
          .select("id")
          .single();

      if (productError || !product) {
        console.error(productError);

        throw new Error(
          productError?.message ||
            "Не удалось создать товар"
        );
      }

      const productId = product.id;

      /*
       * Теперь у товара есть ID.
       * Загружаем фотографии.
       */
      const mainImage = await saveImages(productId);

      /*
       * Если есть главное фото,
       * записываем его также в products.image_url.
       */
      if (mainImage) {
        const { error: imageUpdateError } =
          await supabase
            .from("products")
            .update({
              image_url: mainImage,
            })
            .eq("id", productId);

        if (imageUpdateError) {
          throw new Error(
            `Не удалось сохранить главное фото: ${imageUpdateError.message}`
          );
        }
      }

      /*
       * Сохраняем замеры.
       */
      await saveMeasurements(productId);

      /*
       * Освобождаем временные preview-ссылки.
       */
      selectedFiles.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });

      alert(
        `Товар успешно добавлен! ID товара: ${productId}`
      );

      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Произошла ошибка при добавлении товара"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3ff] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/products"
          className="mb-4 inline-block text-sm text-purple-700 hover:underline"
        >
          ← Назад к товарам
        </Link>

        <div className="mb-6">
          <div className="text-2xl font-bold text-purple-700">
            ✦ KONA LADY
          </div>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Добавить товар
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Создайте новый товар магазина.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* ОСНОВНАЯ ИНФОРМАЦИЯ */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold">
              Основная информация
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Название товара
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="Например: Платье женское классическое"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Цена, грн
                </label>

                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Количество на складе
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockQuantity}
                  onChange={(e) =>
                    setStockQuantity(e.target.value)
                  }
                  className="w-full rounded-2xl border-2 border-purple-300 bg-purple-50 px-4 py-3 text-lg font-bold outline-none focus:border-purple-600"
                />

                <p className="mt-2 text-xs text-gray-500">
                  0 = товара нет в наличии.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Категория
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    handleCategoryChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
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
                <label className="mb-2 block text-sm font-medium">
                  Подкатегория
                </label>

                <select
                  value={subcategory}
                  onChange={(e) =>
                    setSubcategory(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
                >
                  {(subcategories[category] ??
                    []).map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
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
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="Описание товара..."
                />
              </div>
            </div>
          </section>

          {/* ХАРАКТЕРИСТИКИ */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold">
              Характеристики товара
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Бренд
                </label>

                <input
                  value={brand}
                  onChange={(e) =>
                    setBrand(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Материал
                </label>

                <input
                  value={material}
                  onChange={(e) =>
                    setMaterial(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Цвет
                </label>

                <input
                  value={color}
                  onChange={(e) =>
                    setColor(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Сезон
                </label>

                <input
                  value={season}
                  onChange={(e) =>
                    setSeason(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Стиль
                </label>

                <input
                  value={style}
                  onChange={(e) =>
                    setStyle(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Пол
                </label>

                <input
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="Женский"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Страна
                </label>

                <input
                  value={country}
                  onChange={(e) =>
                    setCountry(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Состав
                </label>

                <input
                  value={composition}
                  onChange={(e) =>
                    setComposition(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Размерная группа
                </label>

                <input
                  value={sizeGroup}
                  onChange={(e) =>
                    setSizeGroup(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="XS–XL"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Рукав
                </label>

                <input
                  value={sleeve}
                  onChange={(e) =>
                    setSleeve(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Длина
                </label>

                <input
                  value={length}
                  onChange={(e) =>
                    setLength(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Вырез
                </label>

                <input
                  value={neckline}
                  onChange={(e) =>
                    setNeckline(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Застёжка
                </label>

                <input
                  value={closure}
                  onChange={(e) =>
                    setClosure(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Посадка
                </label>

                <input
                  value={fit}
                  onChange={(e) =>
                    setFit(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Особенности ткани
                </label>

                <input
                  value={fabricFeatures}
                  onChange={(e) =>
                    setFabricFeatures(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </section>

          {/* ЗАМЕРЫ */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Замеры изделия
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Размеры можно добавить для одежды.
                </p>
              </div>

              <button
                type="button"
                onClick={addMeasurement}
                className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700"
              >
                + Добавить размер
              </button>
            </div>

            {measurements.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                Замеров пока нет.
              </div>
            ) : (
              <div className="space-y-4">
                {measurements.map(
                  (row, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-gray-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="font-semibold">
                          Размер
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeMeasurement(
                              index
                            )
                          }
                          className="text-sm text-red-600 hover:underline"
                        >
                          Удалить
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-5">
                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Размер
                          </label>

                          <input
                            value={row.size}
                            onChange={(e) =>
                              updateMeasurement(
                                index,
                                "size",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Грудь
                          </label>

                          <input
                            value={row.bust_cm}
                            onChange={(e) =>
                              updateMeasurement(
                                index,
                                "bust_cm",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Талия
                          </label>

                          <input
                            value={row.waist_cm}
                            onChange={(e) =>
                              updateMeasurement(
                                index,
                                "waist_cm",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Бёдра
                          </label>

                          <input
                            value={row.hips_cm}
                            onChange={(e) =>
                              updateMeasurement(
                                index,
                                "hips_cm",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Длина
                          </label>

                          <input
                            value={row.length_cm}
                            onChange={(e) =>
                              updateMeasurement(
                                index,
                                "length_cm",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="mt-3 max-w-xs">
                        <label className="mb-1 block text-xs text-gray-500">
                          Рукав
                        </label>

                        <input
                          value={row.sleeve_cm}
                          onChange={(e) =>
                            updateMeasurement(
                              index,
                              "sleeve_cm",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* ФОТОГРАФИИ */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold">
              Фотографии товара
            </h2>

            <p className="mb-5 text-sm text-gray-500">
              Можно выбрать несколько фотографий.
              Первое фото станет главным.
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="mb-5 block w-full rounded-2xl border border-gray-200 p-3"
            />

            {selectedFiles.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                Фотографии пока не выбраны.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {selectedFiles.map(
                  (image, index) => (
                    <div
                      key={`${image.preview}-${index}`}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
                    >
                      <img
                        src={image.preview}
                        alt={`Фото ${index + 1}`}
                        className="aspect-square w-full object-cover"
                      />

                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="text-xs text-gray-500">
                          Фото {index + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeImage(index)
                          }
                          className="text-xs text-red-600 hover:underline"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* СОХРАНЕНИЕ */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">
                  Новый товар
                </div>

                <div className="text-sm text-gray-500">
                  Наличие автоматически определяется
                  по количеству.
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/admin/products"
                  className="rounded-2xl border border-gray-200 px-5 py-3 font-semibold hover:bg-gray-50"
                >
                  Отмена
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Добавление..."
                    : "Добавить товар"}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}