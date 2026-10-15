import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type XmlObject = Record<string, unknown>;

type OfferData = {
  offer: XmlObject;
  offerId: string;
  groupId: string;
  name: string;
  vendorCode: string;
  sku: string;
  price: number;
  retailPrice: number;
  available: boolean;
  stock: number | null;
  image: string | null;
  size: string | null;
  color: string | null;
  category: string;
  description: string;
};

function text(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as XmlObject;

    return text(
      obj["#text"] ?? obj["__cdata"] ?? obj["__text"]
    );
  }

  return "";
}

function numberValue(value: unknown): number | null {
  const raw = text(value).replace(",", ".");
  if (!raw) return null;

  const result = Number(raw);

  return Number.isFinite(result) && result >= 0
    ? result
    : null;
}

function list(value: unknown): XmlObject[] {
  if (!value) return [];

  const values = Array.isArray(value) ? value : [value];

  return values.filter(
    (item): item is XmlObject =>
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item)
  );
}

function getOffers(parsed: unknown): XmlObject[] {
  const root = parsed as XmlObject;
  const catalog = root["yml_catalog"] as XmlObject | undefined;
  const shop = catalog?.["shop"] as XmlObject | undefined;
  const offers = shop?.["offers"] as XmlObject | undefined;

  return list(offers?.["offer"]);
}

function getParam(
  offer: XmlObject,
  names: string[]
): string | null {
  const params = list(offer["param"]);

  for (const param of params) {
    const name = text(param["@_name"]).toLowerCase();
    const value = text(param);

    if (value && names.some((candidate) => name.includes(candidate.toLowerCase()))) {
      return value;
    }
  }

  return null;
}

function getStock(offer: XmlObject): number | null {
  const value = numberValue(offer["quantity_in_stock"]);

  return value === null ? null : Math.max(0, Math.floor(value));
}

function getAvailable(offer: XmlObject): boolean {
  const value = text(offer["@_available"]).toLowerCase();

  return value === "true" || value === "1";
}

function getPictures(offer: XmlObject): string | null {
  const pictures = offer["picture"];
  const first = Array.isArray(pictures)
    ? pictures[0]
    : pictures;

  const result = text(first);

  return result || null;
}

function categoryMap(parsed: unknown): Map<string, string> {
  const result = new Map<string, string>();

  const root = parsed as XmlObject;
  const catalog = root["yml_catalog"] as XmlObject | undefined;
  const shop = catalog?.["shop"] as XmlObject | undefined;
  const categories = shop?.["categories"] as XmlObject | undefined;

  for (const category of list(categories?.["category"])) {
    const id = text(category["@_id"]);
    const name = text(category);

    if (id && name) result.set(id, name);
  }

  return result;
}

function toOfferData(
  offer: XmlObject,
  categories: Map<string, string>
): OfferData | null {
  const offerId = text(offer["@_id"]);
  const groupId = text(offer["@_group_id"]);
  const name = text(offer["name"]);
  const sourcePrice = numberValue(offer["price"]);

  if (!offerId || !groupId || !name || sourcePrice === null) {
    return null;
  }

   // AGER confirms quantity_in_stock as the authoritative stock field.
  const rawStock = getStock(offer);
  const stock = rawStock;
  const available = stock !== null && stock > 0;

  const categoryId = text(offer["categoryId"]);
  const category =
    categories.get(categoryId) ||
    text(offer["category"]) ||
    "AGER";

  return {
    offer,
    offerId,
    groupId,
    name,
    vendorCode: text(offer["vendorCode"]),
    sku: text(offer["sku"]),
    price: sourcePrice,
    retailPrice: Math.ceil(sourcePrice * 1.25),
    available,
    stock,
    image: getPictures(offer),
    size: getParam(offer, [
      "размер",
      "size",
      "розмір",
    ]),
    color: getParam(offer, [
      "цвет",
      "колір",
      "color",
    ]),
    category,
    description:
      text(offer["description"]) ||
      text(offer["model"]) ||
      "",
  };
}

async function adminClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !anonKey || !secretKey) {
    return {
      client: null,
      error: NextResponse.json(
        {
          ok: false,
          error: "Не настроены переменные Supabase.",
        },
        { status: 500 }
      ),
    };
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      client: null,
      error: NextResponse.json(
        {
          ok: false,
          error: "Требуется авторизация администратора.",
        },
        { status: 401 }
      ),
    };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return {
      client: null,
      error: NextResponse.json(
        { ok: false, error: "Пустой токен авторизации." },
        { status: 401 }
      ),
    };
  }

  const authClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return {
      client: null,
      error: NextResponse.json(
        { ok: false, error: "Не удалось подтвердить пользователя." },
        { status: 401 }
      ),
    };
  }

  const client = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("AGER: role check failed", profileError);

    return {
      client: null,
      error: NextResponse.json(
        {
          ok: false,
          error: "Не удалось проверить роль пользователя.",
        },
        { status: 500 }
      ),
    };
  }

  if (profile?.role !== "admin") {
    return {
      client: null,
      error: NextResponse.json(
        {
          ok: false,
          error: "Доступ разрешён только администратору.",
        },
        { status: 403 }
      ),
    };
  }

  return { client, error: null };
}

async function loadXml() {
  const xmlUrl = process.env.AGER_XML_URL;

  if (!xmlUrl) {
    throw new Error("Не задана переменная AGER_XML_URL.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(xmlUrl);
  } catch {
    throw new Error("Некорректный адрес XML AGER.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    !["ager.ua", "www.ager.ua"].includes(
      parsedUrl.hostname.toLowerCase()
    )
  ) {
    throw new Error("Разрешён только HTTPS-адрес ager.ua.");
  }

  const response = await fetch(xmlUrl, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
    headers: {
      "User-Agent": "KONA-LADY-AGER-SYNC/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`AGER вернул HTTP ${response.status}.`);
  }

  const xml = await response.text();

  if (!xml.trim()) {
    throw new Error("XML AGER пустой.");
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    cdataPropName: "__cdata",
    parseTagValue: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  const offers = getOffers(parsed);

  if (!offers.length) {
    throw new Error("В XML AGER не найдены предложения.");
  }

  const categories = categoryMap(parsed);
  const valid: OfferData[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const offer of offers) {
    const item = toOfferData(offer, categories);

    if (!item) {
      invalid.push(text(offer["@_id"]) || "(без offer_id)");
      continue;
    }

    if (seen.has(item.offerId)) {
      duplicates.push(item.offerId);
      continue;
    }

    seen.add(item.offerId);
    valid.push(item);
  }

  return { offers, valid, invalid, duplicates };
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

async function getExistingRows(
  client: any,
  table: string,
  column: string,
  values: string[]
) {
  const result: any[] = [];

  for (const part of chunks([...new Set(values)], 400)) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .in(column, part);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    result.push(...(data || []));
  }

  return result;
}

async function runImport(request: Request, sync: boolean) {
  const { client, error } = await adminClient(request);

  if (error || !client) return error;

  const { offers, valid, invalid, duplicates } = await loadXml();

  if (duplicates.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "В XML найдены повторяющиеся offer_id. Запись отменена.",
        duplicateCount: duplicates.length,
        duplicateSamples: duplicates.slice(0, 20),
      },
      { status: 422 }
    );
  }

  if (!valid.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Нет корректных предложений для импорта.",
        totalOffers: offers.length,
        invalidCount: invalid.length,
      },
      { status: 422 }
    );
  }

  const groups = new Map<string, OfferData[]>();

  for (const item of valid) {
    const group = groups.get(item.groupId) || [];
    group.push(item);
    groups.set(item.groupId, group);
  }

  const report = {
    ok: true,
    mode: sync ? "sync" : "preview",
    databaseChanged: false,
    totalXmlOffers: offers.length,
    validOffers: valid.length,
    invalidOffers: invalid.length,
    uniqueGroups: groups.size,
    missingStockInXml: valid.filter(
      (item) => item.stock === null
    ).length,
    markupPercent: 25,
    productsInserted: 0,
    productsUpdated: 0,
    variantsUpserted: 0,
    stockValuesUnknown: 0,
  };

  if (!sync) {
    return NextResponse.json({
      ...report,
      sample: [...groups.entries()].slice(0, 10).map(
        ([groupId, items]) => ({
          groupId,
          name: items[0].name,
          category: items[0].category,
          variantCount: items.length,
          variants: items.slice(0, 5).map((item) => ({
            offerId: item.offerId,
            size: item.size,
            color: item.color,
            sourcePrice: item.price,
            retailPrice: item.retailPrice,
            availableInXml: item.available,
            stockInXml: item.stock,
          })),
        })
      ),
      nextStep:
        "Предварительный просмотр завершён. Для записи требуется отдельный POST-запрос с confirmSync=true.",
    });
  }
  // Защита: не изменяем базу, если остатки AGER не распознаны.
  const missingStock = valid.filter((item) => item.stock === null);

  if (missingStock.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        mode: "sync",
        databaseChanged: false,
        error:
          "Синхронизация остановлена: у части предложений отсутствует числовое поле quantity_in_stock. База данных не изменена.",
        missingStockCount: missingStock.length,
        missingStockSamples: missingStock.slice(0, 20).map((item) => ({
          offerId: item.offerId,
          groupId: item.groupId,
        })),
      },
      { status: 422 }
    );
  }
  // Загружаем существующие товары и варианты.
  const existingProducts = await getExistingRows(
    client,
    "products",
    "ager_group_id",
    [...groups.keys()]
  );

  const productMap = new Map<string, any>();

  for (const product of existingProducts) {
    const groupId = text(product.ager_group_id);

    if (!groupId) continue;

    if (productMap.has(groupId)) {
      throw new Error(
        `В products несколько карточек с ager_group_id=${groupId}. Синхронизация остановлена для защиты от дублей.`
      );
    }

    productMap.set(groupId, product);
  }

  const existingVariants = await getExistingRows(
    client,
    "product_variants",
    "ager_offer_id",
    valid.map((item) => item.offerId)
  );

  const variantMap = new Map<string, any>();

  for (const variant of existingVariants) {
    variantMap.set(text(variant.ager_offer_id), variant);
  }

  // Новые карточки создаются скрытыми.
  const newProducts: any[] = [];

  for (const [groupId, items] of groups) {
    if (productMap.has(groupId)) continue;

    const first = items[0];

    newProducts.push({
      name: first.name,
      category: first.category,
      subcategory: null,
      price_uah: Math.min(
        ...items.map((item) => item.retailPrice)
      ),
      image_url: first.image,
      description: first.description || null,
      store_name: "AGER",
      is_active: false,
      is_available: false,
      stock_quantity: 0,
      ager_group_id: groupId,
      ager_offer_id: null,
      updated_at: new Date().toISOString(),
    });
  }

  for (const part of chunks(newProducts, 200)) {
    const { data, error: insertError } = await client
      .from("products")
      .insert(part)
      .select("*");

    if (insertError) {
      throw new Error(
        `Не удалось создать карточки товаров: ${insertError.message}`
      );
    }

    for (const product of data || []) {
      productMap.set(text(product.ager_group_id), product);
      report.productsInserted++;
    }
  }

  // Обновляем существующие карточки, не включая их публикацию.
  for (const [groupId, items] of groups) {
    const product = productMap.get(groupId);

    if (!product) {
      throw new Error(
        `Не удалось получить карточку для группы ${groupId}.`
      );
    }

    const first = items[0];

    const totalStock = items.reduce((sum, item) => {
      const previous = variantMap.get(item.offerId);
      const stock =
        item.stock !== null
          ? item.stock
          : Number(previous?.stock_quantity || 0);

      return sum + stock;
    }, 0);

    const update: Record<string, unknown> = {
      name: first.name,
      category: first.category,
      price_uah: Math.min(
        ...items.map((item) => item.retailPrice)
      ),
      image_url: first.image || product.image_url,
      description: first.description || product.description,
      stock_quantity: totalStock,
      updated_at: new Date().toISOString(),
    };

    // Не включаем товар автоматически.
    // Если остаток стал нулевым, снимаем доступность.
    if (totalStock <= 0) {
      update.is_available = false;
    }

    const { data: updated, error: updateError } = await client
      .from("products")
      .update(update)
      .eq("id", product.id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        `Не удалось обновить группу ${groupId}: ${updateError.message}`
      );
    }

    productMap.set(groupId, updated);
    report.productsUpdated++;
  }

  // Каждое предложение AGER становится отдельным вариантом.
  const variantRows: any[] = [];

  for (const item of valid) {
    const product = productMap.get(item.groupId);

    if (!product) {
      throw new Error(
        `Не найдена карточка для offer_id=${item.offerId}.`
      );
    }

    const previous = variantMap.get(item.offerId);

    let stock = item.stock;

    if (stock === null) {
      stock = Number(previous?.stock_quantity || 0);
      report.stockValuesUnknown++;
    }

    const available = stock > 0;

    variantRows.push({
      product_id: product.id,
      ager_offer_id: item.offerId,
      ager_group_id: item.groupId,
      ager_sku: item.sku || previous?.ager_sku || null,
      ager_vendor_code:
        item.vendorCode || previous?.ager_vendor_code || null,
      size: item.size || previous?.size || null,
      color: item.color || previous?.color || null,
      stock_quantity: stock,
      is_available: available,
      updated_at: new Date().toISOString(),
    });
  }

  for (const part of chunks(variantRows, 300)) {
    const { error: variantError } = await client
      .from("product_variants")
      .upsert(part, {
        onConflict: "ager_offer_id",
      });

    if (variantError) {
      throw new Error(
        `Ошибка записи вариантов: ${variantError.message}`
      );
    }

    report.variantsUpserted += part.length;
  }

  report.databaseChanged = true;

  return NextResponse.json({
    ...report,
    productsPublished: false,
    warning:
      report.stockValuesUnknown > 0
        ? "Часть предложений не содержит распознанного числового остатка. Для них сохранён прежний остаток, а для новых вариантов без остатка установлено 0. Проверьте источник количественных остатков AGER."
        : "Синхронизация завершена. Новые карточки остались скрытыми.",
  });
}

export async function GET(request: Request) {
  try {
    return await runImport(request, false);
  } catch (error) {
    console.error("AGER preview failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Ошибка предварительной проверки AGER.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: { confirmSync?: boolean };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Ожидается JSON с confirmSync=true.",
        },
        { status: 400 }
      );
    }

    if (body.confirmSync !== true) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Запись не разрешена. Передайте confirmSync=true после проверки preview.",
        },
        { status: 400 }
      );
    }

    return await runImport(request, true);
  } catch (error) {
    console.error("AGER sync failed:", error);

    return NextResponse.json(
      {
        ok: false,
        databaseChanged: "Возможно, частично",
        error:
          error instanceof Error
            ? error.message
            : "Ошибка синхронизации AGER.",
      },
      { status: 500 }
    );
  }
}