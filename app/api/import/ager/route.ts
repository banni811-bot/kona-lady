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
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
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
      return String(item["#text"] ?? item ?? "").trim();
    }
  }

  return null;
}

function getText(value: unknown): string {
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

export async function GET() {
  try {
    // ------------------------------------------------------------
    // 1. Загружаем XLS
    // ------------------------------------------------------------

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

    // Строка 4 в Excel = индекс 3
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

    // Берём первые 10 реальных товарных строк.
    const xlsRows = rows
      .slice(4)
      .filter((row) => {
        const code = xlsValue(row, "Код");
        const article = xlsValue(row, "Артикул1 *");

        return Boolean(code || article);
      })
      .slice(0, 10);

    // ------------------------------------------------------------
    // 2. Загружаем XML
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // 3. Для каждого XLS варианта ищем XML offer
    // ------------------------------------------------------------

    const results = xlsRows.map((row) => {
      const code = xlsValue(row, "Код");
      const article1 = xlsValue(row, "Артикул1 *");
      const article2 = xlsValue(row, "Артикул2 *");
      const barcode = xlsValue(row, "Штрих-код");
      const size = xlsValue(row, "Розмір *");
      const color = xlsValue(row, "Колір *");

      // Возможные способы поиска.
      const normalizedCode = normalize(code);
      const normalizedArticle1 = normalize(article1);
      const normalizedArticle2 = normalize(article2);
      const normalizedBarcode = normalize(barcode);

      let matchedOffer: XmlOffer | null = null;
      let matchedBy: string | null = null;

      for (const offer of offers) {
        const offerId = normalize(offer["@_id"]);
        const vendorCode = normalize(offer.vendorCode);
        const sku = normalize(offer.sku);

        const offerParams = asArray(offer.param as any);

        const xmlBarcode = normalize(
          getParamValue(offerParams, [
            "Штрих-код",
            "Штрихкод",
            "Barcode",
            "Баркод",
          ])
        );

        const xmlSize = normalize(
          getParamValue(offerParams, [
            "Размер",
            "Международный размер",
            "Размеры мужских рубашек",
            "Розмір",
          ])
        );

        const xmlColor = normalize(
          getParamValue(offerParams, [
            "Цвет",
            "Колір",
            "Цвет товара",
          ])
        );

        if (normalizedBarcode && normalizedBarcode === xmlBarcode) {
          matchedOffer = offer;
          matchedBy = "barcode";
          break;
        }

        if (
          normalizedArticle1 &&
          normalizedArticle1 === vendorCode
        ) {
          matchedOffer = offer;
          matchedBy = "article1 = vendorCode";
          break;
        }

        if (
          normalizedArticle2 &&
          normalizedArticle2 === vendorCode
        ) {
          matchedOffer = offer;
          matchedBy = "article2 = vendorCode";
          break;
        }

        if (
          normalizedCode &&
          normalizedCode === sku &&
          normalize(size) === xmlSize &&
          normalize(color) === xmlColor
        ) {
          matchedOffer = offer;
          matchedBy = "code = sku + size + color";
          break;
        }

        if (
          normalizedCode &&
          normalizedCode === offerId &&
          normalize(size) === xmlSize &&
          normalize(color) === xmlColor
        ) {
          matchedOffer = offer;
          matchedBy = "code = offer_id + size + color";
          break;
        }
      }

      return {
        xls: {
          code,
          article1,
          article2,
          barcode,
          name: xlsValue(row, "Назва*"),
          nameRu: xlsValue(row, "Назва* (рос.)"),
          size,
          color,
          quantity: xlsValue(row, "Кількість *"),
          dropshipPrice: xlsValue(row, "Ціна дропшиппінг"),
        },

        xmlMatch: matchedOffer
          ? {
              matched: true,
              matchedBy,
              offerId: matchedOffer["@_id"] ?? null,
              available: matchedOffer["@_available"] ?? null,
              groupId: getText(matchedOffer.group_id),
              sku: getText(matchedOffer.sku),
              vendorCode: getText(matchedOffer.vendorCode),
              name: getText(matchedOffer.name),
              price: getText(matchedOffer.price),
              size: getParamValue(
                matchedOffer.param,
                [
                  "Размер",
                  "Международный размер",
                  "Размеры мужских рубашек",
                  "Розмір",
                ]
              ),
              color: getParamValue(
                matchedOffer.param,
                [
                  "Цвет",
                  "Колір",
                  "Цвет товара",
                ]
              ),
            }
          : {
              matched: false,
              matchedBy: null,
              offerId: null,
              available: null,
              groupId: null,
              sku: null,
              vendorCode: null,
              name: null,
              price: null,
              size: null,
              color: null,
            },
      };
    });

    const matchedCount = results.filter(
      (item) => item.xmlMatch.matched
    ).length;

    return Response.json({
      ok: true,

      test: "AGER XLS ↔ XML matching",

      xls: {
        fileSizeBytes: xlsBuffer.byteLength,
        sheetName,
        rowsCount: rows.length,
        headers,
        testedRows: xlsRows.length,
      },

      xml: {
        fileSizeBytes: Buffer.byteLength(xmlText, "utf8"),
        offersCount: offers.length,
      },

      matching: {
        tested: results.length,
        matched: matchedCount,
        notMatched: results.length - matchedCount,
      },

      results,
    });
  } catch (error) {
    console.error("AGER XLS/XML matching test error:", error);

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