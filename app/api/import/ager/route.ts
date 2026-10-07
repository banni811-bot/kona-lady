import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";

const AGER_XML_URL = "http://ager.ua/download/catalog_ua.xml";
const AGER_XLS_URL =
  "http://ager.ua/download/ager_actual_price_and_stock.xls";

type XmlOffer = {
  "@_id"?: string;
  "@_available"?: string;
  name?: string;
  vendorCode?: string;
  price?: string | number;
  oldprice?: string | number;
  sku?: string | number;
  group_id?: string | number;
  param?: unknown;
  barcode?: string | number;
};

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj["#text"] ?? "").trim();
  }

  return "";
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getParamValue(
  params: unknown,
  wantedNames: string[]
): string | null {
  const wanted = new Set(wantedNames.map(normalize));

  for (const param of asArray(params as any)) {
    if (!param || typeof param !== "object") continue;

    const item = param as Record<string, unknown>;

    const name = normalize(item["@_name"]);

    if (wanted.has(name)) {
      return textValue(item["#text"] ?? item);
    }
  }

  return null;
}

export async function GET() {
  try {
    // ============================================================
    // 1. Загружаем XLS
    // ============================================================

    const xlsResponse = await fetch(AGER_XLS_URL, {
      cache: "no-store",
    });

    if (!xlsResponse.ok) {
      return Response.json(
        {
          ok: false,
          step: "xls",
          error: `AGER XLS вернул HTTP ${xlsResponse.status}`,
        },
        { status: 500 }
      );
    }

    const xlsBuffer = Buffer.from(await xlsResponse.arrayBuffer());

    const workbook = XLSX.read(xlsBuffer, {
      type: "buffer",
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return Response.json(
        {
          ok: false,
          step: "xls",
          error: "В XLS нет листов",
        },
        { status: 500 }
      );
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as unknown[][];

    // В XLS заголовки находятся в строке 4.
    const headers = rows[3] ?? [];

    const headerMap = new Map<string, number>();

    headers.forEach((header, index) => {
      if (header != null && String(header).trim() !== "") {
        headerMap.set(String(header).trim(), index);
      }
    });

    function xlsValue(row: unknown[], header: string): string {
      const index = headerMap.get(header);

      if (index === undefined) {
        return "";
      }

      return String(row[index] ?? "").trim();
    }

    const xlsRows = rows
      .slice(4)
      .filter((row) => {
        return Boolean(
          xlsValue(row, "Код") ||
            xlsValue(row, "Артикул1 *") ||
            xlsValue(row, "Штрих-код")
        );
      })
      .slice(0, 10);

    // ============================================================
    // 2. Загружаем XML
    // ============================================================

    const xmlResponse = await fetch(AGER_XML_URL, {
      cache: "no-store",
    });

    if (!xmlResponse.ok) {
      return Response.json(
        {
          ok: false,
          step: "xml",
          error: `AGER XML вернул HTTP ${xmlResponse.status}`,
        },
        { status: 500 }
      );
    }

    const xmlText = await xmlResponse.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseTagValue: false,
      trimValues: true,
    });

    const parsed = parser.parse(xmlText);

    const offers = asArray(
      parsed?.yml_catalog?.shop?.offers?.offer
    ) as XmlOffer[];

    // ============================================================
    // 3. Для каждой XLS строки ищем XML по названию
    // ============================================================

    const results = xlsRows.map((row) => {
      const code = xlsValue(row, "Код");
      const article1 = xlsValue(row, "Артикул1 *");
      const article2 = xlsValue(row, "Артикул2 *");
      const barcode = xlsValue(row, "Штрих-код");
      const nameUa = xlsValue(row, "Назва*");
      const nameRu = xlsValue(row, "Назва* (рос.)");
      const size = xlsValue(row, "Розмір *");
      const colorUa = xlsValue(row, "Колір *");
      const colorRu = xlsValue(row, "Цвет *");
      const quantity = xlsValue(row, "Кількість *");
      const dropshipPrice = xlsValue(row, "Ціна дропшиппінг");

      const normalizedUa = normalize(nameUa);
      const normalizedRu = normalize(nameRu);

      // Ищем все XML offers, где название совпадает
      // с украинским или русским названием из XLS.
      const nameMatches = offers.filter((offer) => {
        const xmlName = normalize(textValue(offer.name));

        return (
          (normalizedUa && xmlName === normalizedUa) ||
          (normalizedRu && xmlName === normalizedRu)
        );
      });

      const detailedMatches = nameMatches.map((offer) => {
        const params = offer.param;

        return {
          offerId: offer["@_id"] ?? null,
          available: offer["@_available"] ?? null,

          groupId: textValue(offer.group_id) || null,
          sku: textValue(offer.sku) || null,
          vendorCode: textValue(offer.vendorCode) || null,

          name: textValue(offer.name) || null,

          price: textValue(offer.price) || null,
          oldprice: textValue(offer.oldprice) || null,

          barcode:
            textValue(offer.barcode) ||
            getParamValue(params, [
              "Штрих-код",
              "Штрихкод",
              "Barcode",
              "Баркод",
            ]) ||
            null,

          size:
            getParamValue(params, [
              "Размер",
              "Международный размер",
              "Размеры мужских рубашек",
              "Розмір",
            ]) || null,

          color:
            getParamValue(params, [
              "Цвет",
              "Колір",
              "Цвет товара",
            ]) || null,

          paramsCount: asArray(params as any).length,
        };
      });

      // Дополнительно ищем среди совпадений по названию
      // вариант с тем же размером и цветом.
      const exactVariantMatches = detailedMatches.filter((match) => {
        const xmlSize = normalize(match.size);
        const xmlColor = normalize(match.color);

        const wantedSize = normalize(size);
        const wantedColors = [
          normalize(colorUa),
          normalize(colorRu),
        ].filter(Boolean);

        const sizeOk =
          !wantedSize ||
          !xmlSize ||
          xmlSize === wantedSize;

        const colorOk =
          wantedColors.length === 0 ||
          !xmlColor ||
          wantedColors.includes(xmlColor);

        return sizeOk && colorOk;
      });

      return {
        xls: {
          code,
          article1,
          article2,
          barcode,
          nameUa,
          nameRu,
          size,
          colorUa,
          colorRu,
          quantity,
          dropshipPrice,
        },

        xml: {
          nameMatchesCount: detailedMatches.length,
          exactVariantMatchesCount: exactVariantMatches.length,

          nameMatches: detailedMatches.slice(0, 10),

          exactVariantMatches: exactVariantMatches.slice(0, 10),
        },
      };
    });

    const totalNameMatches = results.reduce(
      (sum, item) => sum + item.xml.nameMatchesCount,
      0
    );

    const totalExactVariantMatches = results.reduce(
      (sum, item) => sum + item.xml.exactVariantMatchesCount,
      0
    );

    return Response.json({
      ok: true,

      test: "AGER XLS → XML search by product name",

      xls: {
        fileSizeBytes: xlsBuffer.byteLength,
        sheetName,
        rowsCount: rows.length,
        testedRows: xlsRows.length,
      },

      xml: {
        fileSizeBytes: Buffer.byteLength(xmlText, "utf8"),
        offersCount: offers.length,
      },

      matching: {
        testedRows: results.length,
        totalNameMatches,
        totalExactVariantMatches,
      },

      results,
    });
  } catch (error) {
    console.error("AGER XLS/XML name matching test error:", error);

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Неизвестная ошибка",
      },
      { status: 500 }
    );
  }
}