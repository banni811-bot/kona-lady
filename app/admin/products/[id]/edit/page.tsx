"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../../../lib/supabase";

const categories = [
  "Одежда",
  "Обувь",
  "Косметика",
  "Аксессуары",
];

const subcategories: Record<string, string[]> = {
  Одежда: ["dresses", "tops"],
  Обувь: ["sneakers"],
  Косметика: ["makeup"],
  Аксессуары: [
    "bags",
    "wallets",
    "clutches",
    "belts",
    "jewelry",
    "earrings",
    "rings",
    "bracelets",
    "necklaces",
    "glasses",
    "hats",
    "scarves",
  ],
};

type Product = {
  id: number;
  name: string;
  category: string | null;
  subcategory: string | null;
  price_uah: number | null;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

  const productId = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const [imageUrl, setImageUrl] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!productId || Number.isNaN(productId)) {
        setError("Неверный ID товара.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, category, subcategory, price_uah, description, image_url, is_available"
        )
        .eq("id", productId)
        .single();

      if (error) {
        console.error(error);
        setError(`Не удалось загрузить товар: ${error.message}`);
        setLoading(false);
        return;
      }

      const loadedProduct = data as Product;

      setProduct(loadedProduct);

      setName(loadedProduct.name || "");
      setPrice(
        loadedProduct.price_uah !== null
          ? String(loadedProduct.price_uah)
          : ""
      );
      setCategory(loadedProduct.category || "");
      setSubcategory(loadedProduct.subcategory || "");
      setDescription(loadedProduct.description || "");
      setImageUrl(loadedProduct.image_url || "");
      setIsAvailable(loadedProduct.is_available);

      setLoading(false);
    }

    loadProduct();
  }, [productId]);

  function handleCategoryChange(value: string) {
    setCategory(value);

    const availableSubcategories =
      subcategories[value] || [];

    if (!availableSubcategories.includes(subcategory)) {
      setSubcategory("");
    }
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;
    setNewImage(file);
  }

  async function uploadImage() {
    if (!newImage) {
      return imageUrl;
    }

    setUploading(true);

    const fileExtension =
      newImage.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `${productId}-${Date.now()}.${fileExtension}`;

    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, newImage, {
        upsert: true,
      });

    if (uploadError) {
      setUploading(false);
      throw new Error(
        `Не удалось загрузить фотографию: ${uploadError.message}`
      );
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    setUploading(false);

    return publicUrlData.publicUrl;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Введите название товара.");
      return;
    }

    if (!price.trim()) {
      setError("Введите цену товара.");
      return;
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError("Цена должна быть числом.");
      return;
    }

    setSaving(true);

    try {
      let finalImageUrl = imageUrl;

      if (newImage) {
        finalImageUrl = await uploadImage();
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          price_uah: numericPrice,
          category: category || null,
          subcategory: subcategory || null,
          description: description.trim() || null,
          image_url: finalImageUrl || null,
          is_available: isAvailable,
        })
        .eq("id", productId);

      if (updateError) {
        throw new Error(
          `Не удалось сохранить товар: ${updateError.message}`
        );
      }

      alert("Товар успешно сохранён.");

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Произошла ошибка при сохранении товара."
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f3ff",
          padding: "24px",
          color: "#241b35",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "30px",
            textAlign: "center",
          }}
        >
          Загружаем товар...
        </div>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f3ff",
          padding: "24px",
          color: "#241b35",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          <Link
            href="/admin/products"
            style={{
              color: "#7653a6",
              textDecoration: "none",
            }}
          >
            ← Назад к товарам
          </Link>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "30px",
              marginTop: "20px",
              color: "#b42318",
            }}
          >
            {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f3ff",
        padding: "24px",
        color: "#241b35",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/admin/products"
          style={{
            color: "#7653a6",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          ← Назад к товарам
        </Link>

        <div
          style={{
            fontSize: "14px",
            color: "#7b6b91",
            marginTop: "20px",
            marginBottom: "6px",
          }}
        >
          ✦ KONA LADY
        </div>

        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "32px",
          }}
        >
          Редактировать товар
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            color: "#75677f",
          }}
        >
          ID товара: {productId}
        </p>

        {error && (
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #f0caca",
              color: "#b42318",
              borderRadius: "14px",
              padding: "14px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              marginBottom: "20px",
              boxShadow:
                "0 8px 30px rgba(80, 50, 120, 0.08)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "20px",
              }}
            >
              Основная информация
            </h2>

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Название товара
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Например: Женская сумка"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "12px",
                border: "1px solid #dcd3e6",
                fontSize: "15px",
                marginBottom: "18px",
              }}
            />

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Цена, грн
            </label>

            <input
              type="number"
              min="0"
              value={price}
              onChange={(event) =>
                setPrice(event.target.value)
              }
              placeholder="1990"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "12px",
                border: "1px solid #dcd3e6",
                fontSize: "15px",
                marginBottom: "18px",
              }}
            />

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Категория
            </label>

            <select
              value={category}
              onChange={(event) =>
                handleCategoryChange(event.target.value)
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "12px",
                border: "1px solid #dcd3e6",
                fontSize: "15px",
                marginBottom: "18px",
                background: "#ffffff",
              }}
            >
              <option value="">
                Выберите категорию
              </option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Подкатегория
            </label>

            <select
              value={subcategory}
              onChange={(event) =>
                setSubcategory(event.target.value)
              }
              disabled={!category}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "12px",
                border: "1px solid #dcd3e6",
                fontSize: "15px",
                marginBottom: "18px",
                background: category
                  ? "#ffffff"
                  : "#f3f0f6",
              }}
            >
              <option value="">
                Выберите подкатегорию
              </option>

              {(subcategories[category] || []).map(
                (item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                )
              )}
            </select>

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Описание
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Описание товара..."
              rows={5}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "12px",
                border: "1px solid #dcd3e6",
                fontSize: "15px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              marginBottom: "20px",
              boxShadow:
                "0 8px 30px rgba(80, 50, 120, 0.08)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "20px",
              }}
            >
              Фотография
            </h2>

            {imageUrl && (
              <div
                style={{
                  marginBottom: "18px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "#f1ecf8",
                  maxWidth: "320px",
                }}
              >
                <img
                  src={imageUrl}
                  alt={name}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "280px",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Загрузить новую фотографию
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{
                width: "100%",
                fontSize: "14px",
              }}
            />

            {newImage && (
              <p
                style={{
                  color: "#75677f",
                  fontSize: "14px",
                  marginBottom: 0,
                }}
              >
                Новая фотография: {newImage.name}
              </p>
            )}
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              marginBottom: "20px",
              boxShadow:
                "0 8px 30px rgba(80, 50, 120, 0.08)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "20px",
              }}
            >
              Наличие
            </h2>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(event) =>
                  setIsAvailable(event.target.checked)
                }
                style={{
                  width: "20px",
                  height: "20px",
                }}
              />

              <span>
                {isAvailable
                  ? "🟢 Товар есть в наличии"
                  : "🔴 Товара нет в наличии"}
              </span>
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: "12px",
            }}
          >
            <Link
              href="/admin/products"
              style={{
                textAlign: "center",
                textDecoration: "none",
                padding: "15px",
                borderRadius: "14px",
                background: "#ffffff",
                border: "1px solid #ded5e8",
                color: "#241b35",
                fontWeight: 600,
              }}
            >
              Отмена
            </Link>

            <button
              type="submit"
              disabled={saving || uploading}
              style={{
                padding: "15px",
                borderRadius: "14px",
                border: "none",
                background:
                  saving || uploading
                    ? "#a89bb7"
                    : "#241b35",
                color: "#ffffff",
                cursor:
                  saving || uploading
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 600,
                fontSize: "15px",
              }}
            >
              {uploading
                ? "Загружаем фото..."
                : saving
                ? "Сохраняем..."
                : "💾 Сохранить изменения"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}