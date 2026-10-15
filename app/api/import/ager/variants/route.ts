
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type Obj = Record<string, any>;

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Obj;
    return text(obj["#text"] ?? obj["__cdata"] ?? obj["__text"]);
  }
  return "";
}

function list(value: unknown): Obj[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.filter(
    (item): item is Obj =>
      typeof item === "object" && item !== null && !Array.isArray(item)
  );
}

function numberValue(value: unknown): number | null {
  const raw = text(value).replace(",", ".");
  if (!raw) return null;
  const result = Number(raw);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

function getParam(offer: Obj, names: string[]): string | null {
  for (const param of list(offer["param"])) {
    const name = text(param["@_name"]).toLowerCase();
    const value = text(param);
    if (value && names.some((candidate) => name.includes(candidate.toLowerCase()))) {
      return value;
    }
  }
  return null;
}

async function adminClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !anonKey || !secretKey) {
    return { client: null, error: NextResponse.json(
      { ok: false, error: "Не настроены переменные Supabase." },
      { status: 500 }
    ) };
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { client: null, error: NextResponse.json(
      { ok: false, error: "Требуется авторизация администратора." },
      { status: 401 }
    ) };
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } =
    await authClient.auth.getUser(authorization.slice(7).trim());

  if (authError || !user) {
    return { client: null, error: NextResponse.json(
      { ok: false, error: "Не удалось подтвердить пользователя." },
      { status: 401 }
    ) };
  }

  const client = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("AGER variants role check failed:", profileError);
    return { client: null, error: NextResponse.json(
      { ok: false, error: "Не удалось проверить роль пользователя." },
      { status: 500 }
    ) };
  }

  if (profile?.role !== "admin") {
    return { client: null, error: NextResponse.json(
      { ok: false, error: "Доступ разрешён только администратору." },
      { status: 403 }
    ) };
  }

  return { client, error: null };
}

async function loadOffers() {
  const xmlUrl = process.env.AGER_XML_URL;
  if (!xmlUrl) throw new Error("Не задана переменная AGER_XML_URL.");

  const parsedUrl = new URL(xmlUrl);
  if (
    parsedUrl.protocol !== "https:" ||
    !["ager.ua", "www.ager.ua"].includes(parsedUrl.hostname.toLowerCase())
  ) {
    throw new Error("Разрешён только HTTPS-адрес ager.ua.");
  }

  const response = await fetch(xmlUrl, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
    headers: { "User-Agent": "KONA-LADY-AGER-VARIANTS/1.0" },
  });

  if (!response.ok) throw new Error(`AGER вернул HTTP ${response.status}.`);

  const xml = await response.text();
  if (!xml.trim()) throw new Error("XML AGER пустой.");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    cdataPropName: "__cdata",
    parseTagValue: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml) as Obj;
  const offers = list(parsed?.yml_catalog?.shop?.offers?.offer);
  if (!offers.length) throw new Error("В XML AGER не найдены предложения.");

  return offers;
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "AGER variants import",
    instructions: "POST with Authorization: Bearer <admin access token> and JSON {\"confirm\":true}",
    writesDatabase: true,
  });
}

export async function POST(request: Request) {
  try {
    const { client, error } = await adminClient(request);
    if (error || !client) return error;

    let body: Obj;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Ожидается JSON-тело запроса." },
        { status: 400 }
      );
    }

    if (body.confirm !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: "Импорт не запущен. Для подтверждения передайте confirm:true.",
          databaseChanged: false,
        },
        { status: 400 }
      );
    }

    const offers = await loadOffers();
    const unique = new Map<string, Obj>();
    const duplicateIds: string[] = [];

    for (const offer of offers) {
      const offerId = text(offer["@_id"]);
      const groupId = text(offer["@_group_id"]);
      const stock = numberValue(offer["quantity_in_stock"]);

      if (!offerId || !groupId || stock === null) continue;
      if (unique.has(offerId)) {
        duplicateIds.push(offerId);
        continue;
      }
      unique.set(offerId, offer);
    }

    if (duplicateIds.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "В XML обнаружены повторяющиеся offer_id. Запись отменена.",
          duplicateCount: duplicateIds.length,
          duplicateSamples: duplicateIds.slice(0, 10),
          databaseChanged: false,
        },
        { status: 422 }
      );
    }

    const validOffers = [...unique.values()];
    const groupIds = [...new Set(validOffers.map((offer) => text(offer["@_group_id"])))];

    const productMap = new Map<string, number>();

    for (const group of chunks(groupIds, 400)) {
      const { data, error: queryError } = await client
        .from("products")
        .select("id,ager_group_id")
        .in("ager_group_id", group);

      if (queryError) throw new Error(`Ошибка чтения карточек: ${queryError.message}`);

      for (const product of data || []) {
        if (product.ager_group_id && product.id !== null) {
          productMap.set(String(product.ager_group_id), Number(product.id));
        }
      }
    }

    const variantRows: Obj[] = [];
    let skippedNoProduct = 0;

    for (const offer of validOffers) {
      const offerId = text(offer["@_id"]);
      const groupId = text(offer["@_group_id"]);
      const productId = productMap.get(groupId);

      if (productId === undefined) {
        skippedNoProduct++;
        continue;
      }

      const rawStock = numberValue(offer["quantity_in_stock"]);
      if (rawStock === null) continue;

      const stock = Math.max(0, Math.floor(rawStock));

      variantRows.push({
        product_id: productId,
        ager_offer_id: offerId,
        ager_group_id: groupId,
        ager_sku: text(offer["sku"]) || null,
        ager_vendor_code: text(offer["vendorCode"]) || null,
        size: getParam(offer, ["размер", "розмір", "size"]),
        color: getParam(offer, ["цвет", "колір", "color"]),
        stock_quantity: stock,
        is_available: false,
        updated_at: new Date().toISOString(),
      });
    }

    let upserted = 0;

    for (const part of chunks(variantRows, 200)) {
      const { error: writeError } = await client
        .from("product_variants")
        .upsert(part, { onConflict: "ager_offer_id" });

      if (writeError) {
        throw new Error(
          `Ошибка записи вариантов после ${upserted} записей: ${writeError.message}`
        );
      }

      upserted += part.length;
    }

    return NextResponse.json({
      ok: true,
      databaseChanged: upserted > 0,
      totalOffers: offers.length,
      validOffers: validOffers.length,
      matchedProducts: productMap.size,
      variantsWritten: upserted,
      skippedNoProduct,
      duplicateCount: duplicateIds.length,
      productsActivated: 0,
      note: "Карточки и варианты оставлены неактивными.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("AGER variants import failed:", message);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        databaseChanged: "Возможно, частично",
      },
      { status: 500 }
    );
  }
}
