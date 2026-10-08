import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { XMLParser } from "fast-xml-parser";

type AnyRecord = Record<string, any>;

type Measurement = {
  size: string;
  length: number | null;
  sleeve: number | null;
  bust: number | null;
  shoulder: number | null;
  waist: number | null;
  hips: number | null;
};

type VariantPreview = {
  offerId: string;
  size: string;
  color: string;
  stockQuantity: number;
  agerPrice: number;
  konaLadyPrice: number;
};

type ProductGroup = {
  groupId: string;
  name: string;
  vendorCode: string;
  color: string;
  agerPrice: number;
  konaLadyPrice: number;
  stockQuantity: number;
  variants: VariantPreview[];
  pictures: string[];
  measurements: Measurement[];
};

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalize(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/і/g, "и")
    .replace(/ї/g, "и")
    .replace(/є/g, "е")
    .replace(/ґ/g, "г")
    .replace(/["'`]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeColor(value: unknown): string {
  let result = normalize(value);

  const replacements: Array<[RegExp, string]> = [
    [/бірюзовий/g, "бирюзовый"],
    [/бірюзова/g, "бирюзовый"],
    [/бірюзове/g, "бирюзовый"],
    [/бірюзові/g, "бирюзовый"],

    [/фуксія/g, "фуксия"],
    [/фуксиею/g, "фуксия"],

    [/чорний/g, "черный"],
    [/чорна/g, "черный"],
    [/чорне/g, "черный"],
    [/чорні/g, "черный"],

    [/білий/g, "белый"],
    [/біла/g, "белый"],
    [/біле/g, "белый"],
    [/білі/g, "белый"],

    [/червоний/g, "красный"],
    [/червона/g, "красный"],
    [/червоне/g, "красный"],
    [/червоні/g, "красный"],

    [/синій/g, "синий"],
    [/синя/g, "синий"],
    [/синє/g, "синий"],
    [/сині/g, "синий"],

    [/зелений/g, "зеленый"],
    [/зелена/g, "зеленый"],
    [/зелене/g, "зеленый"],
    [/зелені/g, "зеленый"],

    [/жовтий/g, "желтый"],
    [/жовта/g, "желтый"],
    [/жовте/g, "желтый"],
    [/жовті/g, "желтый"],

    [/коричневий/g, "коричневый"],
    [/коричнева/g, "коричневый"],
    [/коричневе/g, "коричневый"],
    [/коричневі/g, "коричневый"],

    [/бежевий/g, "бежевый"],

    [/рожевий/g, "розовый"],
    [/рожева/g, "розовый"],
    [/рожеве/g, "розовый"],
    [/рожеві/g, "розовый"],

    [/фіолетовий/g, "фиолетовый"],
    [/фіолетова/g, "фиолетовый"],
    [/фіолетове/g, "фиолетовый"],
    [/фіолетові/g, "фиолетовый"],

    [/помаранчевий/g, "оранжевый"],
    [/помаранчева/g, "оранжевый"],
    [/помаранчеве/g, "оранжевый"],
    [/помаранчеві/g, "оранжевый"],

    [/сірий/g, "серый"],
    [/сіра/g, "серый"],
    [/сіре/g, "серый"],
    [/сірі/g, "серый"],

    [/молочний/g, "молочный"],
    [/молочна/g, "молочный"],
    [/молочне/g, "молочный"],
    [/молочні/g, "молочный"],

    [/джинсовий/g, "джинс"],

    [/темно-/g, "темный-"],
    [/світло-/g, "светлый-"],
    [/світло /g, "светлый "],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSize(value: unknown): string {
  return normalize(value)
    .replace(/\s+/g, "")
    .replace(/розмір/g, "")
    .replace(/размер/g, "");
}

function extractArticleFromField(value: unknown): string {
  const raw = text(value);

  if (!raw) return "";

  const beforeColor = raw.split("_")[0].trim();

  const cleaned = beforeColor
    .replace(/\s*-\s*уценка\s*$/i, "")
    .replace(/\s+уценка\s*$/i, "")
    .trim();

  const articleMatches = cleaned.match(
    /[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]+(?:-[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]+)*/g
  );

  if (!articleMatches || articleMatches.length === 0) {
    return "";
  }

  const candidates = articleMatches
    .map((item) => item.trim())
    .filter((item) => {
      const hasLetter =
        /[A-Za-zА-Яа-яІіЇїЄєҐґ]/.test(item);

      const hasNumber = /[0-9]/.test(item);

      return hasLetter && hasNumber;
    });

  if (candidates.length === 0) {
    return "";
  }

  return normalize(
    candidates[candidates.length - 1]
  );
}

function baseArticle(
  article1: unknown,
  article2?: unknown
): string {
  const first = extractArticleFromField(article1);

  if (first) return first;

  return extractArticleFromField(article2);
}

function ceilKonaPrice(value: unknown): number {
  const price = Number(value);

  if (!Number.isFinite(price)) return 0;

  return Math.ceil(price * 1.25);
}

function asNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const raw = String(value).trim();

  if (!raw) return null;

  const normalized = raw
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!normalized) return null;

  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;
}

function parseXlsRows(
  workbook: XLSX.WorkBook
): AnyRecord[] {
  const sheet =
    workbook.Sheets["TDSheet"] ??
    workbook.Sheets[
      workbook.SheetNames[0]
    ];

  if (!sheet) {
    throw new Error(
      "Лист TDSheet не найден"
    );
  }

  const rows =
    XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as unknown[][];

  const headerIndex =
    rows.findIndex((row) =>
      row.some(
        (cell) =>
          text(cell) === "Код"
      )
    );

  if (headerIndex === -1) {
    throw new Error(
      "Не найдена строка заголовков XLS"
    );
  }

  const headers =
    rows[headerIndex].map((item) =>
      text(item)
    );

  return rows
    .slice(headerIndex + 1)
    .filter((row) =>
      row.some((cell) =>
        text(cell)
      )
    )
    .map((row) => {
      const result: AnyRecord = {};

      headers.forEach(
        (header, index) => {
          if (header) {
            result[header] =
              row[index] ?? null;
          }
        }
      );

      return result;
    });
}

function xmlArray<T>(
  value:
    | T
    | T[]
    | undefined
    | null
): T[] {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}

function getXmlParam(
  offer: AnyRecord,
  names: string[]
): string {
  const params =
    xmlArray(offer.param);

  for (const param of params) {
    const name = normalize(
      param?.["@_name"]
    );

    if (
      names.some(
        (item) =>
          name === normalize(item)
      )
    ) {
      return text(
        param?.["#text"] ??
          param
      );
    }
  }

  return "";
}

function getPictures(
  offer: AnyRecord
): string[] {
  return xmlArray(offer.picture)
    .map((item) => text(item))
    .filter(Boolean);
}

function getDescription(
  offer: AnyRecord
): string {
  return text(
    offer.description ??
      offer["description_ua"] ??
      offer["description-ua"]
  );
}

function stripHtml(
  value: string
): string {
  return value
    .replace(
      /<br\s*\/?>/gi,
      "\n"
    )
    .replace(
      /<\/(p|div|tr|li|h[1-6])>/gi,
      "\n"
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/**
 * AGER хранит замеры не по строкам размеров,
 * а транспонированной таблицей:
 *
 * Розмір             | M  | L  | XL
 * Довжина виробу     | 66 | 67 | 68
 * Довжина рукава     | 60 | 61 | 62
 * Напівобхват грудей | 48 | 50 | 52
 * Ширина плечей      | 46 | 47 | 48
 *
 * Поэтому сначала получаем список размеров
 * из строки "Розмір", а потом собираем
 * значения каждой характеристики по индексам.
 */
function parseMeasurements(
  description: string
): Measurement[] {
  if (!description) return [];

  const rows: string[][] = [];

  const rowRegex =
    /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of description.matchAll(
    rowRegex
  )) {
    const rowHtml = rowMatch[1];

    const cells = Array.from(
      rowHtml.matchAll(
        /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      )
    ).map((match) =>
      stripHtml(match[1])
    );

    if (cells.length >= 2) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const normalizedFirstCells =
    rows.map((row) =>
      normalize(row[0])
    );

  const sizeHeaderIndex =
    normalizedFirstCells.findIndex(
      (value) =>
        value === "розмір" ||
        value === "размер" ||
        value === "size"
    );

  if (
    sizeHeaderIndex === -1
  ) {
    return [];
  }

  const sizeRow =
    rows[sizeHeaderIndex];

  const sizes =
    sizeRow
      .slice(1)
      .map((value) =>
        normalizeSize(value)
      )
      .filter(Boolean);

  if (sizes.length === 0) {
    return [];
  }

  const result: Measurement[] =
    sizes.map((size) => ({
      size,
      length: null,
      sleeve: null,
      bust: null,
      shoulder: null,
      waist: null,
      hips: null,
    }));

  function setField(
    field:
      | "length"
      | "sleeve"
      | "bust"
      | "shoulder"
      | "waist"
      | "hips",
    values: string[]
  ) {
    for (
      let index = 0;
      index < result.length;
      index++
    ) {
      const value =
        values[index] ?? "";

      result[index][field] =
        asNumber(value);
    }
  }

  for (
    let rowIndex = 0;
    rowIndex < rows.length;
    rowIndex++
  ) {
    if (
      rowIndex ===
      sizeHeaderIndex
    ) {
      continue;
    }

    const row =
      rows[rowIndex];

    const label =
      normalize(row[0]);

    const values =
      row.slice(1);

    if (
      label.includes(
        "довжина виробу"
      ) ||
      label.includes(
        "длина изделия"
      )
    ) {
      setField(
        "length",
        values
      );
      continue;
    }

    if (
      label.includes(
        "довжина рукава"
      ) ||
      label.includes(
        "длина рукава"
      )
    ) {
      setField(
        "sleeve",
        values
      );
      continue;
    }

    if (
      label.includes(
        "напівобхват грудей"
      ) ||
      label.includes(
        "полуобхват груди"
      ) ||
      label.includes(
        "напівобхват грудної клітини"
      )
    ) {
      setField(
        "bust",
        values
      );
      continue;
    }

    if (
      label.includes(
        "ширина плечей"
      ) ||
      label.includes(
        "ширина плеч"
      )
    ) {
      setField(
        "shoulder",
        values
      );
      continue;
    }

    if (
      label.includes(
        "обхват талії"
      ) ||
      label.includes(
        "обхват талии"
      ) ||
      label.includes(
        "напівобхват талії"
      ) ||
      label.includes(
        "полуобхват талии"
      )
    ) {
      setField(
        "waist",
        values
      );
      continue;
    }

    if (
      label.includes(
        "обхват стегон"
      ) ||
      label.includes(
        "обхват бедер"
      ) ||
      label.includes(
        "напівобхват стегон"
      ) ||
      label.includes(
        "полуобхват бедер"
      )
    ) {
      setField(
        "hips",
        values
      );
      continue;
    }
  }

  return result.filter(
    (item) =>
      item.length !== null ||
      item.sleeve !== null ||
      item.bust !== null ||
      item.shoulder !== null ||
      item.waist !== null ||
      item.hips !== null
  );
}

function buildXmlIndex(
  offers: AnyRecord[]
) {
  const index =
    new Map<
      string,
      AnyRecord[]
    >();

  for (const offer of offers) {
    const vendorCode =
      text(
        offer.vendorCode
      );

    const color =
      getXmlParam(
        offer,
        [
          "Цвет",
          "Колір",
        ]
      ) ||
      text(
        offer.color
      );

    const size =
      getXmlParam(
        offer,
        [
          "Размер",
          "Розмір",
        ]
      ) ||
      text(
        offer.size
      );

    const key = [
      normalize(
        vendorCode
      ),
      normalizeColor(
        color
      ),
      normalizeSize(
        size
      ),
    ].join("|");

    if (
      !vendorCode ||
      !color ||
      !size
    ) {
      continue;
    }

    const existing =
      index.get(key) ??
      [];

    existing.push(
      offer
    );

    index.set(
      key,
      existing
    );
  }

  return index;
}

export async function GET() {
  const startedAt =
    Date.now();

  try {
    const xlsUrl =
      "http://ager.ua/download/ager_actual_price_and_stock.xls";

    const xmlUrl =
      "http://ager.ua/download/catalog_ua.xml";

    const [
      xlsResponse,
      xmlResponse,
    ] =
      await Promise.all([
        fetch(xlsUrl, {
          cache:
            "no-store",
        }),
        fetch(xmlUrl, {
          cache:
            "no-store",
        }),
      ]);

    if (!xlsResponse.ok) {
      throw new Error(
        `AGER XLS HTTP ${xlsResponse.status}`
      );
    }

    if (!xmlResponse.ok) {
      throw new Error(
        `AGER XML HTTP ${xmlResponse.status}`
      );
    }

    const [
      xlsBuffer,
      xmlText,
    ] =
      await Promise.all([
        xlsResponse.arrayBuffer(),
        xmlResponse.text(),
      ]);

    const workbook =
      XLSX.read(
        xlsBuffer,
        {
          type: "array",
        }
      );

    const xlsRows =
      parseXlsRows(
        workbook
      );

    const parser =
      new XMLParser({
        ignoreAttributes:
          false,
        attributeNamePrefix:
          "@_",
        textNodeName:
          "#text",
        isArray:
          (name) =>
            [
              "offer",
              "picture",
              "param",
            ].includes(name),
      });

    const xml =
      parser.parse(
        xmlText
      );

    const offers =
      xml?.yml_catalog
        ?.shop?.offers
        ?.offer;

    if (!offers) {
      throw new Error(
        "В XML не найден раздел offers"
      );
    }

    const xmlOffers =
      xmlArray(
        offers
      ) as AnyRecord[];

    const xmlIndex =
      buildXmlIndex(
        xmlOffers
      );

    const productMap =
      new Map<
        string,
        ProductGroup
      >();

    let matchedRows = 0;
    let noMatchRows = 0;
    let multipleMatchRows = 0;

    const noMatchesSample:
      AnyRecord[] = [];

    const multipleMatchesSample:
      AnyRecord[] = [];

    for (const row of xlsRows) {
      const article1 =
        text(
          row["Артикул1 *"]
        );

      const article2 =
        text(
          row["Артикул2 *"]
        );

      const article =
        baseArticle(
          article1,
          article2
        );

      const color =
        text(
          row["Цвет *"]
        ) ||
        text(
          row["Колір *"]
        );

      const size =
        text(
          row["Розмір *"]
        ) ||
        text(
          row["Размер *"]
        );

      const normalizedArticle =
        normalize(
          article
        );

      const normalizedColor =
        normalizeColor(
          color
        );

      const normalizedSize =
        normalizeSize(
          size
        );

      const key = [
        normalizedArticle,
        normalizedColor,
        normalizedSize,
      ].join("|");

      const matches =
        xmlIndex.get(key) ??
        [];

      if (
        matches.length ===
        0
      ) {
        noMatchRows++;

        if (
          noMatchesSample.length <
          20
        ) {
          noMatchesSample.push({
            code: text(
              row["Код"]
            ),
            article,
            color:
              normalizedColor,
            size:
              normalizedSize,
            article1,
            article2,
          });
        }

        continue;
      }

      if (
        matches.length >
        1
      ) {
        multipleMatchRows++;

        if (
          multipleMatchesSample.length <
          20
        ) {
          multipleMatchesSample.push({
            code: text(
              row["Код"]
            ),
            article,
            color:
              normalizedColor,
            size:
              normalizedSize,
            matches:
              matches.map(
                (offer) =>
                  `${text(
                    offer.group_id
                  )}_${text(
                    offer["@_id"]
                  )}`
              ),
          });
        }

        continue;
      }

      matchedRows++;

      const offer =
        matches[0];

      const groupId =
        text(
          offer.group_id
        ) ||
        text(
          offer.groupId
        ) ||
        text(
          offer["@_group_id"]
        );

      const offerId =
        text(
          offer["@_id"]
        ) ||
        text(
          offer.offerId
        );

      const vendorCode =
        text(
          offer.vendorCode
        );

      const name =
        text(
          offer.name
        ) ||
        text(
          row["Наименование"]
        );

      const xmlColor =
        getXmlParam(
          offer,
          [
            "Цвет",
            "Колір",
          ]
        ) ||
        color;

      const xmlSize =
        getXmlParam(
          offer,
          [
            "Размер",
            "Розмір",
          ]
        ) ||
        size;

      const agerPrice =
        asNumber(
          row[
            "Ціна дропшиппінг"
          ]
        ) ??
        asNumber(
          offer.price
        ) ??
        0;

      const konaLadyPrice =
        ceilKonaPrice(
          agerPrice
        );

      const stockQuantity =
        asNumber(
          row[
            "Кількість *"
          ]
        ) ?? 0;

      const pictures =
        getPictures(
          offer
        );

      const description =
        getDescription(
          offer
        );

      const measurements =
        parseMeasurements(
          description
        );

      const existing =
        productMap.get(
          groupId
        );

      const variant:
        VariantPreview =
        {
          offerId,
          size:
            xmlSize,
          color:
            xmlColor,
          stockQuantity,
          agerPrice,
          konaLadyPrice,
        };

      if (!existing) {
        productMap.set(
          groupId,
          {
            groupId,
            name,
            vendorCode,
            color:
              xmlColor,
            agerPrice,
            konaLadyPrice,
            stockQuantity,
            variants: [
              variant,
            ],
            pictures,
            measurements,
          }
        );
      } else {
        existing.variants.push(
          variant
        );

        existing.stockQuantity +=
          stockQuantity;

        if (
          existing.measurements
            .length ===
            0 &&
          measurements.length >
            0
        ) {
          existing.measurements =
            measurements;
        }

        if (
          existing.pictures
            .length ===
            0 &&
          pictures.length >
            0
        ) {
          existing.pictures =
            pictures;
        }
      }
    }

    const preview =
      Array.from(
        productMap.values()
      ).slice(
        0,
        10
      );

    const products =
      productMap.size;

    const variants =
      Array.from(
        productMap.values()
      ).reduce(
        (
          sum,
          product
        ) =>
          sum +
          product
            .variants
            .length,
        0
      );

    const totalStock =
      Array.from(
        productMap.values()
      ).reduce(
        (
          sum,
          product
        ) =>
          sum +
          product.stockQuantity,
        0
      );

    const productsWithStock =
      Array.from(
        productMap.values()
      ).filter(
        (
          product
        ) =>
          product.stockQuantity >
          0
      ).length;

    const productsWithoutStock =
      products -
      productsWithStock;

    return NextResponse.json({
      ok: true,

      test:
        "AGER full catalog import preview",

      writeToSupabase:
        false,

      source: {
        xlsUrl,
        xmlUrl,
        xlsFileSizeBytes:
          xlsBuffer.byteLength,
        xmlFileSizeBytes:
          Buffer.byteLength(
            xmlText,
            "utf8"
          ),
        xlsSheetName:
          workbook.SheetNames[0],
        xlsRows:
          xlsRows.length,
        xmlOffers:
          xmlOffers.length,
      },

      matching: {
        rule:
          "article from Артикул1/Артикул2 + normalized color + size",

        matchedRows,
        noMatchRows,
        multipleMatchRows,

        uniqueProducts:
          products,

        noMatchesSample,

        multipleMatchesSample,
      },

      totals: {
        products,
        productsWithStock,
        productsWithoutStock,
        variants,
        totalStock,
      },

      priceRule:
        "KONA LADY = ceil(AGER dropship price × 1.25)",

      preview,

      durationMs:
        Date.now() -
        startedAt,
    });
  } catch (error) {
    console.error(
      "AGER import preview error:",
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
      {
        status: 500,
      }
    );
  }
}