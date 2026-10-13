
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

function getText(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return getText(obj["#text"] ?? obj["__cdata"] ?? obj["__text"]);
  }

  return "";
}

function getOffers(parsed: any): any[] {
  const offers = parsed?.yml_catalog?.shop?.offers?.offer;

  if (!offers) return [];

  return Array.isArray(offers) ? offers : [offers];
}

function getNumber(value: unknown): number | null {
  const raw = getText(value).replace(",", ".");
  if (!raw) return null;

  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getAvailable(offer: any): boolean | null {
  const value = getText(offer?.["@_available"]).toLowerCase();

  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  return null;
}

export async function GET(request: Request) {
  try {
    // 1. Проверяем обязательные серверные настройки.
    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        { ok: false, error: "Не настроены серверные переменные Supabase." },
        { status: 500 }
      );
    }

    // 2. Проверяем токен пользователя.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Требуется авторизация." },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Отсутствует токен авторизации." },
        { status: 401 }
      );
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Не удалось подтвердить пользователя." },
        { status: 401 }
      );
    }

    // 3. Проверяем роль через серверный клиент.
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("AGER preview profile check failed:", profileError);

      return NextResponse.json(
        { ok: false, error: "Не удалось проверить роль пользователя." },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Доступ разрешён только администратору." },
        { status: 403 }
      );
    }

    // 4. Получаем персональный адрес только из серверного окружения.
    const xmlUrl = process.env.AGER_XML_URL;

    if (!xmlUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Не задана серверная переменная AGER_XML_URL.",
        },
        { status: 500 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(xmlUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Некорректный адрес XML AGER." },
        { status: 500 }
      );
    }

    if (
      parsedUrl.protocol !== "https:" ||
      !["ager.ua", "www.ager.ua"].includes(parsedUrl.hostname)
    ) {
      return NextResponse.json(
        { ok: false, error: "Разрешён только HTTPS-адрес ager.ua." },
        { status: 500 }
      );
    }

    // 5. Загружаем XML. Никаких записей в базу не выполняется.
    const response = await fetch(xmlUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
      headers: {
        "User-Agent": "KONA-LADY-AGER-PREVIEW/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `AGER вернул HTTP ${response.status}.`,
        },
        { status: 502 }
      );
    }

    const xml = await response.text();

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
      return NextResponse.json(
        {
          ok: false,
          error: "В XML не найдены предложения. Импорт не выполнялся.",
        },
        { status: 422 }
      );
    }

    // 6. Формируем предварительный расчёт.
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();

    let missingIds = 0;
    let missingPrices = 0;
    let availableCount = 0;
    let unavailableCount = 0;

    const samples = offers.slice(0, 30).map((offer) => {
      const offerId = getText(offer?.["@_id"]);
      const groupId = getText(offer?.["@_group_id"]);
      const name = getText(offer?.name);
      const sourcePrice = getNumber(offer?.price);
      const available = getAvailable(offer);

      const stockCandidate =
        offer?.quantity ??
        offer?.stock_quantity ??
        offer?.stock ??
        offer?.qty;

      const sourceStock = getNumber(stockCandidate);

      if (!offerId) {
        missingIds++;
      } else if (seenIds.has(offerId)) {
        duplicateIds.add(offerId);
      } else {
        seenIds.add(offerId);
      }

      if (sourcePrice === null) {
        missingPrices++;
      }

      if (available === true) availableCount++;
      if (available === false) unavailableCount++;

      return {
        offerId: offerId || null,
        groupId: groupId || null,
        name: name || null,
        sourcePrice,
        suggestedPrice:
          sourcePrice === null
            ? null
            : Math.ceil(sourcePrice * 1.25),
        available,
        sourceStock,
      };
    });

    // Полный проход для счётчиков и проверки ID.
    // В базу ничего не записываем.
    seenIds.clear();
    duplicateIds.clear();
    missingIds = 0;
    missingPrices = 0;
    availableCount = 0;
    unavailableCount = 0;

    for (const offer of offers) {
      const offerId = getText(offer?.["@_id"]);
      const sourcePrice = getNumber(offer?.price);
      const available = getAvailable(offer);

      if (!offerId) {
        missingIds++;
      } else if (seenIds.has(offerId)) {
        duplicateIds.add(offerId);
      } else {
        seenIds.add(offerId);
      }

      if (sourcePrice === null) missingPrices++;
      if (available === true) availableCount++;
      if (available === false) unavailableCount++;
    }

    return NextResponse.json({
      ok: true,
      mode: "preview_only",
      databaseChanged: false,
      source: "personal_ager_xml",
      xmlSizeMB: Number((xml.length / 1024 / 1024).toFixed(2)),
      totalOffers: offers.length,
      uniqueOfferIds: seenIds.size,
      duplicateOfferIds: duplicateIds.size,
      missingOfferIds: missingIds,
      missingPrices,
      availableCount,
      unavailableCount,
      markupPercent: 25,
      samples,
      warnings: [
        "Это предварительный расчёт, а не импорт.",
        "Поле price проверено как предполагаемый источник цены; перед записью нужно подтвердить формат фида.",
        "Отсутствие поля остатка не означает, что остаток равен нулю.",
        "Публикация товаров и запись в базу не изменяются.",
      ],
    });
  } catch (error) {
    console.error("AGER preview error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Внутренняя ошибка предварительного просмотра.",
      },
      { status: 500 }
    );
  }
}
