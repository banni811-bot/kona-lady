import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";

const XLS_URL =
  "http://ager.ua/download/ager_actual_price_and_stock.xls";

const XML_URL =
  "http://ager.ua/download/catalog_ua.xml";

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getBaseArticle(value: unknown): string {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  // Пример:
  // Cвитер мужской новогодний 214R21302_Джинс
  // ↓
  // 214R21302
  const beforeColor = text.split("_")[0].trim();

  const parts = beforeColor.split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "";
  }

  // Ищем последний фрагмент, похожий на артикул:
  // содержит хотя бы одну цифру
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].trim();

    if (/\d/.test(part)) {
      return part;
    }
  }

  return "";
}

function getParam(
  offer: any,
  names: string[]
): string {
  const params = Array.isArray(offer?.param)
    ? offer.param
    : offer?.param
      ? [offer.param]
      : [];

  const normalizedNames = names.map(normalize);

  for (const param of params) {
    const name = normalize(param?.["@_name"]);

    if (normalizedNames.includes(name)) {
      return String(param?.["#text"] ?? param ?? "").trim();
    }
  }

  return "";
}

function getStock(offer: any): number | null {
  const value = offer?.quantity_in_stock;

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export async function GET() {
  try {
    // ---------------------------------------------------------
    // 1. Загружаем XLS
    // ---------------------------------------------------------

    const xlsResponse = await fetch(XLS_URL, {
      cache: "no-store",
    });

    if (!xlsResponse.ok) {
      throw new Error(
        `Не удалось скачать XLS: ${xlsResponse.status} ${xlsResponse.statusText}`
      );
    }

    const xlsBuffer = Buffer.from(
      await xlsResponse.arrayBuffer()
    );

    const workbook = XLSX.read(xlsBuffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("В XLS нет листов");
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: null,
    });

    // Заголовки находятся в строке 4 Excel,
    // то есть индекс 3.
    const headerRowIndex = 3;

    const headers = rows[headerRowIndex] || [];

    const article1Index = headers.findIndex(
      (value: any) =>
        String(value ?? "").trim() === "Артикул1 *"
    );

    const article2Index = headers.findIndex(
      (value: any) =>
        String(value ?? "").trim() === "Артикул2 *"
    );

    const sizeIndex = headers.findIndex(
      (value: any) =>
        String(value ?? "").trim() === "Розмір *"
    );

    const colorIndex = headers.findIndex(
      (value: any) =>
        String(value ?? "").trim() === "Колір *"
    );

    const barcodeIndex = headers.findIndex(
      (value: any) =>
        String(value ?? "").trim() === "Штрих-код"
    );

    const codeIndex = headers.findIndex(
      (value: any) =>
        String(value ?? "").trim() === "Код"
    );

    if (article1Index === -1) {
      throw new Error("В XLS не найден столбец Артикул1 *");
    }

    if (sizeIndex === -1) {
      throw new Error("В XLS не найден столбец Розмір *");
    }

    if (colorIndex === -1) {
      throw new Error("В XLS не найден столбец Колір *");
    }

    // Берём первые 10 товарных строк.
    const xlsRows = rows
      .slice(headerRowIndex + 1)
      .filter((row: any[]) => {
        return row && row.length > 0;
      })
      .slice(0, 10);

    const xlsProducts = xlsRows.map((row: any[], index: number) => {
      const article1 = String(
        row[article1Index] ?? ""
      ).trim();

      const article2 =
        article2Index !== -1
          ? String(row[article2Index] ?? "").trim()
          : "";

      const size = String(
        row[sizeIndex] ?? ""
      ).trim();

      const color = String(
        row[colorIndex] ?? ""
      ).trim();

      const barcode =
        barcodeIndex !== -1
          ? String(row[barcodeIndex] ?? "").trim()
          : "";

      const code =
        codeIndex !== -1
          ? String(row[codeIndex] ?? "").trim()
          : "";

      const baseArticle =
        getBaseArticle(article1) ||
        getBaseArticle(article2);

      return {
        xlsRow: index + headerRowIndex + 2,
        code,
        article1,
        article2,
        baseArticle,
        barcode,
        size,
        color,
      };
    });

    // ---------------------------------------------------------
    // 2. Загружаем XML
    // ---------------------------------------------------------

    const xmlResponse = await fetch(XML_URL, {
      cache: "no-store",
    });

    if (!xmlResponse.ok) {
      throw new Error(
        `Не удалось скачать XML: ${xmlResponse.status} ${xmlResponse.statusText}`
      );
    }

    const xmlText = await xmlResponse.text();

    // ---------------------------------------------------------
    // 3. Парсим XML
    // ---------------------------------------------------------

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseTagValue: false,
      trimValues: true,
    });

    const parsed = parser.parse(xmlText);

    const offersRaw =
      parsed?.yml_catalog?.shop?.offers?.offer;

    const offers = Array.isArray(offersRaw)
      ? offersRaw
      : offersRaw
        ? [offersRaw]
        : [];

    // ---------------------------------------------------------
    // 4. Для каждого XLS варианта ищем XML offer
    //    по:
    //      vendorCode
    //      + color
    //      + size
    // ---------------------------------------------------------

    const results = xlsProducts.map((xlsItem) => {
      const baseArticle = normalize(
        xlsItem.baseArticle
      );

      const xlsColor = normalize(
        xlsItem.color
      );

      const xlsSize = normalize(
        xlsItem.size
      );

      const candidates = offers.filter((offer: any) => {
        const vendorCode = normalize(
          offer?.vendorCode
        );

        return (
          vendorCode &&
          baseArticle &&
          vendorCode === baseArticle
        );
      });

      const matchedOffers = candidates.filter(
        (offer: any) => {
          const xmlColor = normalize(
            getParam(offer, ["Колір", "Цвет", "Color"])
          );

          const xmlSize = normalize(
            getParam(offer, [
              "Розмір",
              "Международный размер",
              "Размеры мужских рубашек",
              "Размер",
              "Size",
            ])
          );

          const colorMatches =
            !xlsColor ||
            !xmlColor ||
            xmlColor === xlsColor;

          const sizeMatches =
            !xlsSize ||
            !xmlSize ||
            xmlSize === xlsSize;

          return colorMatches && sizeMatches;
        }
      );

      return {
        xls: xlsItem,

        baseArticle,

        vendorCodeCandidates: candidates.length,

        matchedVariants: matchedOffers.map(
          (offer: any) => ({
            offerId: offer?.["@_id"] ?? null,
            available:
              offer?.["@_available"] ?? null,

            groupId:
              offer?.["@_group_id"] ?? null,

            sku:
              offer?.sku ?? null,

            vendorCode:
              offer?.vendorCode ?? null,

            name:
              offer?.name ?? null,

            price:
              offer?.price ?? null,

            oldprice:
              offer?.oldprice ?? null,

            color: getParam(offer, [
              "Колір",
              "Цвет",
              "Color",
            ]),

            size: getParam(offer, [
              "Розмір",
              "Международный размер",
              "Размеры мужских рубашек",
              "Размер",
              "Size",
            ]),

            stock: getStock(offer),

            pictures: Array.isArray(
              offer?.picture
            )
              ? offer.picture
              : offer?.picture
                ? [offer.picture]
                : [],
          })
        ),
      };
    });

    // ---------------------------------------------------------
    // 5. Итоговая статистика
    // ---------------------------------------------------------

    const matched = results.filter(
      (item) => item.matchedVariants.length > 0
    );

    const uniqueMatches = results.filter(
      (item) => item.matchedVariants.length === 1
    );

    const multipleMatches = results.filter(
      (item) => item.matchedVariants.length > 1
    );

    const noMatches = results.filter(
      (item) => item.matchedVariants.length === 0
    );

    return Response.json({
      ok: true,

      test: "AGER XLS → XML by article + color + size",

      xls: {
        fileSizeBytes: xlsBuffer.length,
        sheetName,
        rowsCount: rows.length,
        testedRows: xlsProducts.length,
      },

      xml: {
        fileSizeBytes: Buffer.byteLength(
          xmlText,
          "utf8"
        ),
        offersCount: offers.length,
      },

      statistics: {
        tested: results.length,
        matched: matched.length,
        uniqueMatches: uniqueMatches.length,
        multipleMatches: multipleMatches.length,
        noMatches: noMatches.length,
      },

      results,
    });
  } catch (error: any) {
    console.error("AGER IMPORT TEST ERROR:", error);

    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          String(error),
      },
      {
        status: 500,
      }
    );
  }
}