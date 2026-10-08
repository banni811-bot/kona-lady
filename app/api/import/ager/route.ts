import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { XMLParser } from "fast-xml-parser";

const XLS_URL =
  "http://ager.ua/download/ager_actual_price_and_stock.xls";

const XML_URL =
  "http://ager.ua/download/catalog_ua.xml";

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/і/g, "и")
    .replace(/ї/g, "и")
    .replace(/є/g, "е")
    .replace(/ґ/g, "г")
    .replace(/['"`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSize(value: unknown): string {
  return normalize(value);
}

function normalizeColor(value: unknown): string {
  return normalize(value);
}

/**
 * Из:
 * "Cвитер мужской новогодний 214R21302_Джинс"
 * получаем:
 * "214r21302"
 *
 * Это важно, потому что XML использует vendorCode:
 * "214R21302"
 */
function baseArticle(value: unknown): string {
  const valueText = text(value);

  if (!valueText) return "";

  const parts = valueText.split("_");
  const firstPart = parts[0].trim();

  const articleMatch = firstPart.match(
    /([a-zа-яіїєґ0-9]+)$/i
  );

  if (!articleMatch) {
    return normalize(firstPart);
  }

  return normalize(articleMatch[1]);
}

function colorFromArticle(value: unknown): string {
  const valueText = text(value);

  if (!valueText) return "";

  const parts = valueText.split("_");

  if (parts.length < 2) return "";

  return normalizeColor(parts.slice(1).join("_"));
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const match = String(value ?? "").match(/-?[\d.,]+/);

  if (!match) return null;

  const parsed = Number(
    match[0]
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function konaPrice(agerPrice: number): number {
  return Math.ceil(agerPrice * 1.25);
}

function cleanHtmlText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getParam(
  offer: any,
  names: string[]
): string | null {
  const params = toArray(offer?.param);

  for (const param of params) {
    const name = normalize(param?.["@_name"]);

    for (const wanted of names) {
      if (name.includes(normalize(wanted))) {
        return cleanHtmlText(
          param?.["#text"] ??
            param?.value ??
            param
        );
      }
    }
  }

  return null;
}

function extractPictures(offer: any): string[] {
  return toArray(offer?.picture)
    .map((picture: any) => text(picture))
    .filter(Boolean);
}

function extractMeasurements(description: string) {
  const result: Record<
    string,
    {
      length: number | null;
      sleeve: number | null;
      bust: number | null;
      shoulder: number | null;
      waist: number | null;
      hips: number | null;
    }
  > = {};

  const sizeRowMatch = description.match(
    /<tr[^>]*>[\s\S]*?<td[^>]*>Розмір<\/td>([\s\S]*?)<\/tr>/i
  );

  if (!sizeRowMatch) {
    return [];
  }

  const sizes = [
    ...sizeRowMatch[1].matchAll(
      /<td[^>]*>([\s\S]*?)<\/td>/gi
    ),
  ].map((match) => cleanHtmlText(match[1]));

  if (!sizes.length) {
    return [];
  }

  const rows = [
    {
      key: "length",
      labels: ["Довжина виробу"],
    },
    {
      key: "sleeve",
      labels: ["Довжина рукава"],
    },
    {
      key: "bust",
      labels: ["Напівобхват грудей"],
    },
    {
      key: "shoulder",
      labels: ["Ширина плечей"],
    },
    {
      key: "waist",
      labels: [
        "Напівобхват пояса",
        "Напівобхват талії",
      ],
    },
    {
      key: "hips",
      labels: ["Напівобхват стегон"],
    },
  ] as const;

  for (const row of rows) {
    let rowMatch: RegExpMatchArray | null = null;

    for (const label of row.labels) {
      rowMatch = description.match(
        new RegExp(
          `<tr[^>]*>[\\s\\S]*?<td[^>]*>${label}[\\s\\S]*?<\\/td>([\\s\\S]*?)<\\/tr>`,
          "i"
        )
      );

      if (rowMatch) break;
    }

    if (!rowMatch) continue;

    const cells = [
      ...rowMatch[1].matchAll(
        /<td[^>]*>([\s\S]*?)<\/td>/gi
      ),
    ].map((match) =>
      parseNumber(cleanHtmlText(match[1]))
    );

    sizes.forEach((size, index) => {
      if (!result[size]) {
        result[size] = {
          length: null,
          sleeve: null,
          bust: null,
          shoulder: null,
          waist: null,
          hips: null,
        };
      }

      result[size][row.key] =
        cells[index] ?? null;
    });
  }

  return Object.entries(result).map(
    ([size, values]) => ({
      size,
      ...values,
    })
  );
}

function getXlsRows(buffer: ArrayBuffer) {
  const workbook = XLSX.read(
    Buffer.from(buffer),
    {
      type: "buffer",
      cellDates: false,
    }
  );

  const sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<any[]>(
    sheet,
    {
      header: 1,
      defval: null,
      raw: true,
    }
  );

  const headerIndex = rows.findIndex(
    (row) =>
      Array.isArray(row) &&
      row.some(
        (cell) =>
          text(cell).trim() ===
          "Артикул1 *"
      )
  );

  if (headerIndex === -1) {
    throw new Error(
      "Не найден заголовок Артикул1 * в XLS"
    );
  }

  const headers = rows[headerIndex].map(
    (header: unknown) =>
      text(header)
  );

  const index = (name: string) =>
    headers.findIndex(
      (header) => header === name
    );

  const indexes = {
    code: index("Код"),
    name: index("Наименование"),
    article1: index("Артикул1 *"),
    article2: index("Артикул2 *"),
    barcode: index("Штрих-код"),
    nameUa: index("Назва*"),
    nameRu: index("Назва* (рос.)"),
    product: index("Товар *"),
    brand: index("Бренд *"),
    type: index("Вид *"),
    size: index("Розмір *"),
    colorUa: index("Колір *"),
    colorRu: index("Цвет *"),
    country: index("Країна виробника"),
    gender: index("Gender"),
    season: index("Сезонність"),
    composition: index("Склад"),
    measurements: index(
      "Виміри вироба, см"
    ),
    quantity: index("Кількість *"),
    dropshipPrice: index(
      "Ціна дропшиппінг"
    ),
    retailPrice: index(
      "Ціна роздрібна"
    ),
    wholesalePrice: index(
      "Ціна оптова"
    ),
    photo1: index("Фото #1"),
    photo2: index("Фото #2"),
    photo3: index("Фото #3"),
    photo4: index("Фото #4"),
    photo5: index("Фото #5"),
    photo6: index("Фото #6"),
    photo7: index("Фото #7"),
  };

  const dataRows = rows.slice(
    headerIndex + 1
  );

  const result = dataRows
    .map((row) => ({
      code:
        indexes.code >= 0
          ? text(row[indexes.code])
          : "",

      name:
        indexes.name >= 0
          ? text(row[indexes.name])
          : "",

      article1:
        indexes.article1 >= 0
          ? text(row[indexes.article1])
          : "",

      article2:
        indexes.article2 >= 0
          ? text(row[indexes.article2])
          : "",

      barcode:
        indexes.barcode >= 0
          ? text(row[indexes.barcode])
          : "",

      nameUa:
        indexes.nameUa >= 0
          ? text(row[indexes.nameUa])
          : "",

      nameRu:
        indexes.nameRu >= 0
          ? text(row[indexes.nameRu])
          : "",

      product:
        indexes.product >= 0
          ? text(row[indexes.product])
          : "",

      brand:
        indexes.brand >= 0
          ? text(row[indexes.brand])
          : "",

      type:
        indexes.type >= 0
          ? text(row[indexes.type])
          : "",

      size:
        indexes.size >= 0
          ? text(row[indexes.size])
          : "",

      colorUa:
        indexes.colorUa >= 0
          ? text(row[indexes.colorUa])
          : "",

      colorRu:
        indexes.colorRu >= 0
          ? text(row[indexes.colorRu])
          : "",

      country:
        indexes.country >= 0
          ? text(row[indexes.country])
          : "",

      gender:
        indexes.gender >= 0
          ? text(row[indexes.gender])
          : "",

      season:
        indexes.season >= 0
          ? text(row[indexes.season])
          : "",

      composition:
        indexes.composition >= 0
          ? text(row[indexes.composition])
          : "",

      measurements:
        indexes.measurements >= 0
          ? text(row[indexes.measurements])
          : "",

      quantity:
        indexes.quantity >= 0
          ? parseNumber(
              row[indexes.quantity]
            ) ?? 0
          : 0,

      dropshipPrice:
        indexes.dropshipPrice >= 0
          ? parseNumber(
              row[indexes.dropshipPrice]
            )
          : null,

      retailPrice:
        indexes.retailPrice >= 0
          ? parseNumber(
              row[indexes.retailPrice]
            )
          : null,

      wholesalePrice:
        indexes.wholesalePrice >= 0
          ? parseNumber(
              row[indexes.wholesalePrice]
            )
          : null,

      photos: [
        indexes.photo1 >= 0
          ? text(row[indexes.photo1])
          : "",

        indexes.photo2 >= 0
          ? text(row[indexes.photo2])
          : "",

        indexes.photo3 >= 0
          ? text(row[indexes.photo3])
          : "",

        indexes.photo4 >= 0
          ? text(row[indexes.photo4])
          : "",

        indexes.photo5 >= 0
          ? text(row[indexes.photo5])
          : "",

        indexes.photo6 >= 0
          ? text(row[indexes.photo6])
          : "",

        indexes.photo7 >= 0
          ? text(row[indexes.photo7])
          : "",
      ].filter(Boolean),
    }))
    .filter(
      (row) =>
        row.article1 ||
        row.article2 ||
        row.code
    );

  return {
    sheetName,
    rowsCount: result.length,
    headers,
    rows: result,
  };
}

export async function GET() {
  try {
    const startedAt = Date.now();

    const [xlsResponse, xmlResponse] =
      await Promise.all([
        fetch(XLS_URL, {
          cache: "no-store",
        }),

        fetch(XML_URL, {
          cache: "no-store",
        }),
      ]);

    if (!xlsResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `AGER XLS HTTP ${xlsResponse.status}`,
        },
        { status: 500 }
      );
    }

    if (!xmlResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `AGER XML HTTP ${xmlResponse.status}`,
        },
        { status: 500 }
      );
    }

    const [xlsBuffer, xml] =
      await Promise.all([
        xlsResponse.arrayBuffer(),
        xmlResponse.text(),
      ]);

    const xls = getXlsRows(xlsBuffer);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseTagValue: true,
      trimValues: true,
    });

    const parsed = parser.parse(xml);

    const offers = toArray(
      parsed?.yml_catalog?.shop?.offers?.offer
    );

    const xmlIndex = new Map<string, any[]>();

    for (const offer of offers) {
      const vendorCode =
        text(offer?.vendorCode);

      const color =
        getParam(offer, [
          "колір",
          "цвет",
        ]);

      const size =
        getParam(offer, [
          "розмір",
          "размер",
          "размер международный",
        ]);

      const key = [
        normalize(vendorCode),
        normalizeColor(color),
        normalizeSize(size),
      ].join("|");

      if (!xmlIndex.has(key)) {
        xmlIndex.set(key, []);
      }

      xmlIndex.get(key)!.push(offer);
    }

    let matchedRows = 0;
    let noMatchRows = 0;
    let multipleMatchRows = 0;

    const productGroups = new Map<
      string,
      {
        groupId: string;
        offer: any;
        variants: any[];
        xlsRows: any[];
      }
    >();

    const noMatches: any[] = [];
    const multipleMatches: any[] = [];

    for (const row of xls.rows) {
      const article =
        baseArticle(
          row.article1 ||
            row.article2
        );

      const color =
        normalizeColor(
          row.colorUa ||
            row.colorRu ||
            colorFromArticle(
              row.article1
            )
        );

      const size =
        normalizeSize(row.size);

      if (!article || !size) {
        noMatchRows++;

        if (noMatches.length < 20) {
          noMatches.push({
            code: row.code,
            article1: row.article1,
            article2: row.article2,
            color:
              row.colorUa ||
              row.colorRu,
            size: row.size,
            reason:
              "Не удалось определить article/color/size",
          });
        }

        continue;
      }

      const key = [
        article,
        color,
        size,
      ].join("|");

      const matches =
        xmlIndex.get(key) ?? [];

      if (matches.length === 0) {
        noMatchRows++;

        if (noMatches.length < 20) {
          noMatches.push({
            code: row.code,
            article,
            color,
            size,
            article1: row.article1,
            article2: row.article2,
          });
        }

        continue;
      }

      if (matches.length > 1) {
        multipleMatchRows++;

        if (
          multipleMatches.length < 20
        ) {
          multipleMatches.push({
            code: row.code,
            article,
            color,
            size,
            matches: matches.map(
              (offer) => ({
                offerId:
                  offer?.["@_id"] ??
                  null,

                groupId:
                  offer?.["@_group_id"] ??
                  null,

                vendorCode:
                  offer?.vendorCode ??
                  null,
              })
            ),
          });
        }

        continue;
      }

      matchedRows++;

      const offer = matches[0];

      const groupId =
        text(offer?.["@_group_id"]);

      if (!groupId) {
        continue;
      }

      if (!productGroups.has(groupId)) {
        productGroups.set(groupId, {
          groupId,
          offer,
          variants: [],
          xlsRows: [],
        });
      }

      const product =
        productGroups.get(groupId)!;

      const agerPrice =
        parseNumber(
          row.dropshipPrice ??
            offer?.price
        ) ??
        parseNumber(offer?.price) ??
        0;

      const stock =
        Math.max(
          0,
          Math.floor(
            Number(
              row.quantity ?? 0
            )
          )
        );

      product.variants.push({
        offerId:
          text(offer?.["@_id"]),

        sku:
          text(offer?.sku),

        vendorCode:
          text(offer?.vendorCode),

        size:
          text(row.size) ||
          getParam(offer, [
            "розмір",
            "размер",
          ]),

        color:
          text(row.colorUa) ||
          text(row.colorRu) ||
          getParam(offer, [
            "колір",
            "цвет",
          ]),

        stockQuantity: stock,

        isAvailable:
          stock > 0 &&
          String(
            offer?.["@_available"] ??
              ""
          ).toLowerCase() ===
            "true",

        agerPrice,

        konaLadyPrice:
          konaPrice(agerPrice),

        oldPrice:
          parseNumber(
            offer?.oldprice
          ),
      });

      product.xlsRows.push(row);
    }

    const products = Array.from(
      productGroups.values()
    ).map((product) => {
      const offer = product.offer;

      const description =
        text(offer?.description);

      const measurements =
        extractMeasurements(
          description
        );

      const firstXls =
        product.xlsRows[0];

      const agerPrice =
        parseNumber(
          firstXls?.dropshipPrice
        ) ??
        parseNumber(offer?.price) ??
        0;

      const stockQuantity =
        product.variants.reduce(
          (sum, variant) =>
            sum +
            Number(
              variant.stockQuantity || 0
            ),
          0
        );

      const pictures =
        extractPictures(offer);

      return {
        groupId:
          product.groupId,

        sku:
          text(offer?.sku),

        vendorCode:
          text(offer?.vendorCode),

        name:
          text(offer?.name) ||
          firstXls?.name ||
          null,

        url:
          text(offer?.url) ||
          null,

        categoryId:
          text(offer?.categoryId) ||
          null,

        categoryName:
          getParam(offer, [
            "категория",
          ]),

        description,

        brand:
          getParam(offer, [
            "бренд",
            "торговая марка",
          ]) ||
          firstXls?.brand ||
          null,

        manufacturer:
          getParam(offer, [
            "виробник",
            "производитель",
          ]),

        country:
          getParam(offer, [
            "країна виробник",
            "страна производитель",
          ]) ||
          firstXls?.country ||
          null,

        gender:
          getParam(offer, [
            "стать",
            "пол",
          ]) ||
          firstXls?.gender ||
          null,

        material:
          getParam(offer, [
            "матеріал",
            "материал",
          ]),

        composition:
          getParam(offer, [
            "склад",
            "состав",
          ]) ||
          firstXls?.composition ||
          null,

        season:
          getParam(offer, [
            "сезон",
            "сезонність",
          ]) ||
          firstXls?.season ||
          null,

        style:
          getParam(offer, [
            "стиль",
          ]),

        color:
          getParam(offer, [
            "колір",
            "цвет",
          ]) ||
          firstXls?.colorUa ||
          firstXls?.colorRu ||
          null,

        sizeGroup:
          getParam(offer, [
            "розмірна група",
            "размерная группа",
          ]),

        sleeve:
          getParam(offer, [
            "довжина рукава",
            "длина рукава",
          ]),

        length:
          getParam(offer, [
            "довжина",
            "длина",
          ]),

        neckline:
          getParam(offer, [
            "виріз",
            "горловина",
          ]),

        closure:
          getParam(offer, [
            "застібка",
            "застежка",
          ]),

        fit:
          getParam(offer, [
            "особливості крою",
            "особенности кроя",
          ]),

        fabricFeatures:
          getParam(offer, [
            "особливості матеріалу",
            "особенности материала",
          ]),

        pictures,

        agerPrice,

        konaLadyPrice:
          konaPrice(agerPrice),

        stockQuantity,

        variants:
          product.variants,

        measurements,

        xlsPhotoCount:
          firstXls?.photos?.length ?? 0,

        xmlPhotoCount:
          pictures.length,
      };
    });

    const productsWithStock =
      products.filter(
        (product) =>
          product.stockQuantity > 0
      ).length;

    const productsWithoutStock =
      products.filter(
        (product) =>
          product.stockQuantity === 0
      ).length;

    const variants =
      products.reduce(
        (sum, product) =>
          sum + product.variants.length,
        0
      );

    const totalStock =
      products.reduce(
        (sum, product) =>
          sum +
          product.stockQuantity,
        0
      );

    return NextResponse.json({
      ok: true,

      test:
        "AGER full catalog import preview",

      writeToSupabase: false,

      source: {
        xlsUrl: XLS_URL,
        xmlUrl: XML_URL,

        xlsFileSizeBytes:
          xlsBuffer.byteLength,

        xmlFileSizeBytes:
          Buffer.byteLength(
            xml,
            "utf8"
          ),

        xlsSheetName:
          xls.sheetName,

        xlsRows:
          xls.rowsCount,

        xmlOffers:
          offers.length,
      },

      matching: {
        rule:
          "base article + color + size",

        matchedRows,

        noMatchRows,

        multipleMatchRows,

        uniqueProducts:
          productGroups.size,

        noMatchesSample:
          noMatches,

        multipleMatchesSample:
          multipleMatches,
      },

      totals: {
        products:
          products.length,

        productsWithStock,

        productsWithoutStock,

        variants,

        totalStock,
      },

      priceRule:
        "KONA LADY = ceil(AGER dropship price × 1.25)",

      preview: products
        .slice(0, 10)
        .map((product) => ({
          groupId:
            product.groupId,

          name:
            product.name,

          vendorCode:
            product.vendorCode,

          color:
            product.color,

          agerPrice:
            product.agerPrice,

          konaLadyPrice:
            product.konaLadyPrice,

          stockQuantity:
            product.stockQuantity,

          variants:
            product.variants.map(
              (variant) => ({
                offerId:
                  variant.offerId,

                size:
                  variant.size,

                color:
                  variant.color,

                stockQuantity:
                  variant.stockQuantity,

                agerPrice:
                  variant.agerPrice,

                konaLadyPrice:
                  variant.konaLadyPrice,
              })
            ),

          pictures:
            product.pictures.length,

          measurements:
            product.measurements,
        })),

      durationMs:
        Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      "AGER full catalog preview error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}