"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Product = {
  id: number;
  name: string | null;
  category: string | null;
  subcategory: string | null;
  price_uah: number | null;
  description: string | null;

  brand: string | null;
  material: string | null;
  color: string | null;
  season: string | null;
  style: string | null;
  gender: string | null;
  country: string | null;
  composition: string | null;
  size_group: string | null;
  sleeve: string | null;
  length: string | null;
  neckline: string | null;
  closure: string | null;
  fit: string | null;
  fabric_features: string | null;

  stock_quantity: number | null;
  is_available: boolean | null;
};

type MeasurementRow = {
  id?: number;
  size: string;
  bust_cm: string;
  waist_cm: string;
  hips_cm: string;
  length_cm: string;
  sleeve_cm: string;
};

type SelectedImage = {
  url: string;
  sortOrder: number;
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

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

  const productId = Number(params.id);

  const [loading, setLoading] = useState(true);
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

  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

  useEffect(() => {
    if (!productId || Number.isNaN(productId)) {
      alert("Неверный ID товара");
      router.push("/admin/products");
      return;
    }

    loadProduct();
  }, [productId]);

  async function loadProduct() {
    setLoading(true);

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.error(productError);
      alert("Не удалось загрузить товар");
      router.push("/admin/products");
      return;
    }

    const p = product as Product;

    setName(p.name ?? "");
    setPrice(p.price_uah !== null ? String(p.price_uah) : "");
    setCategory(p.category ?? "Аксессуары");

    const availableSubcategories =
      subcategories[p.category ?? "Аксессуары"] ?? [];

    setSubcategory(
      p.subcategory ||
        availableSubcategories[0] ||
        ""
    );

    setDescription(p.description ?? "");

    setBrand(p.brand ?? "");
    setMaterial(p.material ?? "");
    setColor(p.color ?? "");
    setSeason(p.season ?? "");
    setStyle(p.style ?? "");
    setGender(p.gender ?? "");
    setCountry(p.country ?? "");
    setComposition(p.composition ?? "");
    setSizeGroup(p.size_group ?? "");
    setSleeve(p.sleeve ?? "");
    setLength(p.length ?? "");
    setNeckline(p.neckline ?? "");
    setClosure(p.closure ?? "");
    setFit(p.fit ?? "");
    setFabricFeatures(p.fabric_features ?? "");

    setStockQuantity(
      p.stock_quantity !== null && p.stock_quantity !== undefined
        ? String(p.stock_quantity)
        : "0"
    );

    await loadMeasurements();
    await loadImages();

    setLoading(false);
  }

  async function loadMeasurements() {
    const { data, error } = await supabase
      .from("product_measurements")
      .select("*")
      .eq("product_id", productId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки замеров:", error);
      return;
    }

    const rows: MeasurementRow[] = (data ?? []).map((row) => ({
      id: row.id,
      size: row.size ?? "",
      bust_cm:
        row.bust_cm !== null && row.bust_cm !== undefined
          ? String(row.bust_cm)
          : "",
      waist_cm:
        row.waist_cm !== null && row.waist_cm !== undefined
          ? String(row.waist_cm)
          : "",
      hips_cm:
        row.hips_cm !== null && row.hips_cm !== undefined
          ? String(row.hips_cm)
          : "",
      length_cm:
        row.length_cm !== null && row.length_cm !== undefined
          ? String(row.length_cm)
          : "",
      sleeve_cm:
        row.sleeve_cm !== null && row.sleeve_cm !== undefined
          ? String(row.sleeve_cm)
          : "",
    }));

    setMeasurements(rows);
  }

  async function loadImages() {
    const { data, error } = await supabase
      .from("product_images")
      .select("id, image_url, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки фотографий:", error);
      return;
    }

    setSelectedImages(
      (data ?? []).map((image) => ({
        url: image.image_url,
        sortOrder: image.sort_order ?? 0,
      }))
    );
  }

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

  async function uploadImage(file: File): Promise<string | null> {
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
      alert(`Ошибка загрузки изображения: ${uploadError.message}`);
      return null;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) return;

    const uploaded: SelectedImage[] = [];

    for (const file of files) {
      const url = await uploadImage(file);

      if (url) {
        uploaded.push({
          url,
          sortOrder: selectedImages.length + uploaded.length,
        });
      }
    }

    if (uploaded.length) {
      setSelectedImages((current) => [
        ...current,
        ...uploaded,
      ]);
    }

    event.target.value = "";
  }

  function removeImage(index: number) {
    setSelectedImages((current) =>
      current
        .filter((_, i) => i !== index)
        .map((image, i) => ({
          ...image,
          sortOrder: i,
        }))
    );
  }

  async function saveImages() {
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);

    if (deleteError) {
      throw new Error(
        `Не удалось обновить фотографии: ${deleteError.message}`
      );
    }

    if (!selectedImages.length) {
      return;
    }

    const rows = selectedImages.map((image, index) => ({
      product_id: productId,
      image_url: image.url,
      sort_order: index,
    }));

    const { error: insertError } = await supabase
      .from("product_images")
      .insert(rows);

    if (insertError) {
      throw new Error(
        `Не удалось сохранить фотографии: ${insertError.message}`
      );
    }
  }

  async function saveMeasurements() {
    const { error: deleteError } = await supabase
      .from("product_measurements")
      .delete()
      .eq("product_id", productId);

    if (deleteError) {
      throw new Error(
        `Не удалось обновить замеры: ${deleteError.message}`
      );
    }

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

    const { error: insertError } = await supabase
      .from("product_measurements")
      .insert(validMeasurements);

    if (insertError) {
      throw new Error(
        `Не удалось сохранить замеры: ${insertError.message}`
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      alert("Количество на складе должно быть целым числом от 0");
      return;
    }

    setSaving(true);

    try {
      const mainImage =
        selectedImages.length > 0
          ? selectedImages[0].url
          : null;

      const { error: updateError } = await supabase
        .from("products")
        .update({
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
          fabric_features: fabricFeatures.trim() || null,

          stock_quantity: quantity,

          // Количество на складе становится главным показателем наличия.
          is_available: quantity > 0,

          image_url: mainImage,
        })
        .eq("id", productId);

      if (updateError) {
        throw new Error(
          `Не удалось обновить товар: ${updateError.message}`
        );
      }

      await saveImages();
      await saveMeasurements();

      alert("Товар успешно обновлён");

      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Произошла ошибка при сохранении товара"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f3ff] p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            Загрузка товара...
          </div>
        </div>
      </main>
    );
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
            Редактировать товар
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            ID товара: {productId}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
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
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  placeholder="Название товара"
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
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
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
                    handleCategoryChange(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
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
                    setSubcategory(e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-purple-500"
                >
                  {(subcategories[category] ?? []).map(
                    (item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Описание
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </section>

          {/* Характеристики */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold">
              Характеристики товара
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Бренд", brand, setBrand],
                ["Материал", material, setMaterial],
                ["Цвет", color, setColor],
                ["Сезон", season, setSeason],
                ["Стиль", style, setStyle],
                ["Пол", gender, setGender],
                ["Страна", country, setCountry],
                ["Состав", composition, setComposition],
                ["Размерная группа", sizeGroup, setSizeGroup],
                ["Рукав", sleeve, setSleeve],
                ["Длина", length, setLength],
                ["Вырез", neckline, setNeckline],
                ["Застёжка", closure, setClosure],
                ["Посадка", fit, setFit],
                [
                  "Особенности ткани",
                  fabricFeatures,
                  setFabricFeatures,
                ],
              ].map(([label, value, setter]) => (
                <div key={label as string}>
                  <label className="mb-2 block text-sm font-medium">
                    {label as string}
                  </label>

                  <input
                    value={value as string}
                    onChange={(e) =>
                      (setter as React.Dispatch<
                        React.SetStateAction<string>
                      >)(e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Замеры */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Замеры изделия
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Размеры можно добавлять и редактировать.
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
                {measurements.map((row, index) => (
                  <div
                    key={row.id ?? index}
                    className="rounded-2xl border border-gray-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-semibold">
                        Размер
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeMeasurement(index)
                        }
                        className="text-sm text-red-600 hover:underline"
                      >
                        Удалить
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                      {[
                        ["Размер", "size"],
                        ["Грудь", "bust_cm"],
                        ["Талия", "waist_cm"],
                        ["Бёдра", "hips_cm"],
                        ["Длина", "length_cm"],
                      ].map(([label, field]) => (
                        <div key={field}>
                          <label className="mb-1 block text-xs text-gray-500">
                            {label}
                          </label>

                          <input
                            value={
                              row[
                                field as keyof MeasurementRow
                              ] as string
                            }
                            onChange={(e) =>
                              updateMeasurement(
                                index,
                                field as keyof MeasurementRow,
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-purple-500"
                          />
                        </div>
                      ))}
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
                ))}
              </div>
            )}
          </section>

          {/* Фотографии */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold">
              Фотографии товара
            </h2>

            <p className="mb-5 text-sm text-gray-500">
              Можно оставить существующие фотографии или добавить новые.
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="mb-5 block w-full rounded-2xl border border-gray-200 p-3"
            />

            {selectedImages.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                Фотографий нет.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {selectedImages.map((image, index) => (
                  <div
                    key={`${image.url}-${index}`}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={image.url}
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
                ))}
              </div>
            )}
          </section>

          {/* Сохранение */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">
                  Товар #{productId}
                </div>

                <div className="text-sm text-gray-500">
                  Наличие автоматически определяется по количеству.
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
                    ? "Сохранение..."
                    : "Сохранить изменения"}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}