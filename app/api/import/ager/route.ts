import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { XMLParser } from "fast-xml-parser";

const XLS_URL =
  "http://ager.ua/download/ager_actual_price_and_stock.xls";

const XML_URL =
  "http://ager.ua/download/catalog_ua.xml";

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
  pictures: string[];
  description: string;
  brand: string;
  manufacturer: string;
  country: string;
  gender: string;
  material: string;
  composition: string;
  season: string;
  style: string;
  sizeGroup: string;
  sleeve: string;
  length: string;
  neckline: string;
  closure: string;
  fit: string;
  fabricFeatures: string;
  measurements: Measurement[];
  variants: VariantPreview[];
};

function text(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalize(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/ъ/g, "ь")
    .replace(/[^a-zа-яіїєґ0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Приводим украинские и русские названия
 * цветов к одному значению.
 */
function normalizeColor(value: unknown): string {
  let result = normalize(value);

  const replacements: Array<[RegExp, string]> = [
    [/червоний/g, "красный"],
    [/червона/g, "красный"],
    [/червоне/g, "красный"],
    [/червоні/g, "красный"],

    [/білий/g, "белый"],
    [/біле/g, "белый"],
    [/біла/g, "белый"],
    [/білі/g, "белый"],

    [/чорний/g, "черный"],
    [/чорне/g, "черный"],
    [/чорна/g, "черный"],
    [/чорні/g, "черный"],

    [/жовтий/g, "желтый"],
    [/жовте/g, "желтый"],
    [/жовта/g, "желтый"],
    [/жовті/g, "желтый"],

    [/зелений/g, "зеленый"],
    [/зелене/g, "зеленый"],
    [/зелена/g, "зеленый"],
    [/зелені/g, "зеленый"],

    [/бежевий/g, "бежевый"],
    [/бежева/g, "бежевый"],
    [/бежеве/g, "бежевый"],

    [/рожевий/g, "розовый"],
    [/рожеве/g, "розовый"],
    [/рожева/g, "розовый"],

    [/сірий/g, "серый"],
    [/сіра/g, "серый"],
    [/сіре/g, "серый"],

    [/синій/g, "синий"],
    [/синє/g, "синий"],
    [/синя/g, "синий"],

    [/фіолетовий/g, "фиолетовый"],
    [/фіолетове/g, "фиолетовый"],
    [/фіолетова/g, "фиолетовый"],

    [/помаранчевий/g, "оранжевый"],
    [/помаранчеве/g, "оранжевый"],
    [/помаранчева/g, "оранжевый"],

    [/коричневий/g, "коричневый"],
    [/коричневе/g, "коричневый"],
    [/коричнева/g, "коричневый"],

    [/блакитний/g, "голубой"],
    [/блакитне/g, "голубой"],
    [/блакитна/g, "голубой"],

    [/пудровий/g, "пудровый"],
    [/пудрове/g, "пудровый"],
    [/пудрова/g, "пудровый"],

    [/молочний/g, "молочный"],
    [/молочне/g, "молочный"],
    [/молочна/g, "молочный"],

    [/хакі/g, "хаки"],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSize(value: unknown): string {
  return normalize(value)
    .replace(/\bрозмір\b/g, "")
    .replace(/\bразмер\b/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Например:
 *
 * Cвитер мужской новогодний 214R21302_Джинс
 *
 * превращается в:
 *
 * 214r21302
 */
function baseArticle(value: unknown): string {
  const valueText = text(value);

  if (!valueText) {
    return "";
  }

  const firstPart = valueText
    .split("_")[0]
    .trim();

  const articleMatch = firstPart.match(
    /([a-zа-яіїєґ0-9]+)$/i
  );

  if (!articleMatch) {
    return normalize(firstPart);
  }

  return normalize(articleMatch[1]);
}

function ceilKonaPrice(value: unknown): number {
  const price = Number(value);

  if (!Number.isFinite(price)) {
    return 0;
  }

  return Math.ceil(price * 1.25);
}

function asArray<T>(
  value: T | T[] | undefined | null
): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}

function getRowsFromSheet(
  sheet: XLSX.WorkSheet
): AnyRecord[] {
  const rows = XLSX.utils.sheet_to_json(
    sheet,
    {
      header: 1,
      defval: null,
      raw: false,
    }
  ) as unknown[][];

  if (rows.length < 4) {
    return [];
  }

  const headers = rows[3].map((value) =>
    text(value)
  );

  return rows
    .slice(4)
    .filter((row) =>
      row.some(
        (value) =>
          value !== null &&
          text(value) !== ""
      )
    )
    .map((row) => {
      const item: AnyRecord = {};

      headers.forEach(
        (header, index) => {
          if (header) {
            item[header] = row[index];
          }
        }
      );

      return item;
    });
}

function getParams(
  offer: AnyRecord
): AnyRecord[] {
  return asArray(offer.param);
}

function getParam(
  offer: AnyRecord,
  names: string[]
): string {
  const wanted = names.map(normalize);

  for (const param of getParams(offer)) {
    const name = normalize(
      param?.["@_name"] ??
        param?.name ??
        ""
    );

    if (!name) {
      continue;
    }

    if (wanted.includes(name)) {
      return text(
        param?.["#text"] ??
          param?.value ??
          ""
      );
    }
  }

  return "";
}

function getPictures(
  offer: AnyRecord
): string[] {
  const pictures = asArray(
    offer.picture ??
      offer.pictures
  );

  return pictures
    .map((picture) => {
      if (typeof picture === "string") {
        return picture.trim();
      }

      if (
        picture &&
        typeof picture === "object"
      ) {
        return text(
          picture["#text"] ??
            picture["@_url"] ??
            picture.url ??
            ""
        );
      }

      return "";
    })
    .filter(Boolean);
}

function getDescription(
  offer: AnyRecord
): string {
  return text(
    offer.description ?? ""
  );
}

function parseMeasurements(
  description: string
): Measurement[] {
  if (!description) {
    return [];
  }

  const result: Measurement[] = [];

  const normalizedHtml = description
    .replace(/&nbsp;/gi, " ")
    .replace(
      /<br\s*\/?>/gi,
      " "
    )
    .replace(
      /<\/tr>/gi,
      "</tr>\n"
    )
    .replace(
      /<\/td>/gi,
      "</td>\t"
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

  const rows = normalizedHtml
    .split(/\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  const toNumber = (
    value: string
  ): number | null => {
    const match = value.match(
      /-?\d+(?:[.,]\d+)?/
    );

    if (!match) {
      return null;
    }

    const parsed = Number(
      match[0].replace(",", ".")
    );

    return Number.isFinite(parsed)
      ? parsed
      : null;
  };

  for (const row of rows) {
    const cells = row
      .split(/\t+/)
      .map((cell) =>
        cell.trim()
      )
      .filter(Boolean);

    if (cells.length < 2) {
      continue;
    }

    const size =
      cells[0];

    const normalizedSize =
      normalizeSize(size);

    if (!normalizedSize) {
      continue;
    }

    const looksLikeSize =
      /^(xxs|xs|s|m|l|xl|xxl|xxxl|xxxxl|\d{1,3}(?:\/\d{1,3})?)$/i.test(
        normalizedSize
      );

    if (!looksLikeSize) {
      continue;
    }

    const values = cells
      .slice(1)
      .map(toNumber);

    result.push({
      size,
      length:
        values[0] ?? null,
      sleeve:
        values[1] ?? null,
      bust:
        values[2] ?? null,
      shoulder:
        values[3] ?? null,
      waist:
        values[4] ?? null,
      hips:
        values[5] ?? null,
    });
  }

  return result;
}

export async function GET() {
  const startedAt =
    Date.now();

  try {
    const [
      xlsResponse,
      xmlResponse,
    ] = await Promise.all([
      fetch(XLS_URL, {
        cache: "no-store",
      }),
      fetch(XML_URL, {
        cache: "no-store",
      }),
    ]);

    if (!xlsResponse.ok) {
      throw new Error(
        `AGER XLS request failed: ${xlsResponse.status}`
      );
    }

    if (!xmlResponse.ok) {
      throw new Error(
        `AGER XML request failed: ${xmlResponse.status}`
      );
    }

    const [
      xlsBuffer,
      xmlText,
    ] = await Promise.all([
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

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error(
        "AGER XLS has no sheets"
      );
    }

    const sheet =
      workbook.Sheets[
        firstSheetName
      ];

    const xlsRows =
      getRowsFromSheet(sheet);

    const parser =
      new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix:
          "@_",
        textNodeName:
          "#text",
        isArray: (
          name
        ) =>
          name === "offer" ||
          name === "param" ||
          name === "picture",
      });

    const xml =
      parser.parse(
        xmlText
      );

    const offers =
      asArray(
        xml?.yml_catalog
          ?.shop
          ?.offers
          ?.offer
      );

    /**
     * Индекс XML:
     *
     * article + normalized color + size
     */
    const xmlIndex =
      new Map<
        string,
        AnyRecord[]
      >();

    for (const offer of offers) {
      const vendorCode =
        text(
          offer.vendorCode ??
            offer["@_vendorCode"] ??
            ""
        );

      const article =
        normalize(
          vendorCode
        );

      const color =
        normalizeColor(
          getParam(
            offer,
            [
              "цвет",
              "колір",
              "color",
              "група кольорів",
              "группа цветов",
            ]
          )
        );

      const size =
        normalizeSize(
          getParam(
            offer,
            [
              "розмір",
              "размер",
              "size",
            ]
          )
        );

      if (
        !article ||
        !color ||
        !size
      ) {
        continue;
      }

      const key = [
        article,
        color,
        size,
      ].join("|");

      const current =
        xmlIndex.get(key) ??
        [];

      current.push(
        offer
      );

      xmlIndex.set(
        key,
        current
      );
    }

    const matchedRows:
      AnyRecord[] = [];

    const noMatchRows:
      AnyRecord[] = [];

    const multipleMatchRows:
      AnyRecord[] = [];

    const productGroups =
      new Map<
        string,
        ProductGroup
      >();

    for (const row of xlsRows) {
      const article =
        baseArticle(
          row[
            "Артикул1 *"
          ] ??
            row[
              "Артикул2 *"
            ] ??
            row[
              "Наименование"
            ]
        );

      const color =
        normalizeColor(
          row["Колір *"] ??
            row["Цвет *"] ??
            ""
        );

      const size =
        normalizeSize(
          row["Розмір *"] ??
            ""
        );

      const key = [
        article,
        color,
        size,
      ].join("|");

      const matches =
        xmlIndex.get(key) ??
        [];

      if (
        matches.length === 0
      ) {
        noMatchRows.push({
          code: text(
            row["Код"]
          ),
          article,
          color,
          size,
          article1: text(
            row[
              "Артикул1 *"
            ]
          ),
          article2: text(
            row[
              "Артикул2 *"
            ]
          ),
        });

        continue;
      }

      if (
        matches.length > 1
      ) {
        multipleMatchRows.push({
          code: text(
            row["Код"]
          ),
          article,
          color,
          size,
          matches:
            matches.map(
              (
                offer: AnyRecord
              ) =>
                text(
                  offer["@_id"] ??
                    offer.offerId ??
                    ""
                )
            ),
        });

        continue;
      }

      const offer =
        matches[0];

      const offerId =
        text(
          offer["@_id"] ??
            offer.offerId ??
            ""
        );

      const groupId =
        text(
          offer.group_id ??
            offer.groupId ??
            offer["@_group_id"] ??
            ""
        );

      const vendorCode =
        text(
          offer.vendorCode ??
            offer["@_vendorCode"] ??
            ""
        );

      const productName =
        text(
          offer.name ??
            ""
        );

      const offerColor =
        getParam(
          offer,
          [
            "цвет",
            "колір",
            "color",
            "група кольорів",
            "группа цветов",
          ]
        ) ||
        text(
          row["Цвет *"] ??
            row["Колір *"] ??
            ""
        );

      const offerSize =
        getParam(
          offer,
          [
            "розмір",
            "размер",
            "size",
          ]
        ) ||
        text(
          row["Розмір *"] ??
            ""
        );

      const stockQuantity =
        Number(
          offer.quantity ??
            offer["@_quantity"] ??
            row["Кількість *"] ??
            0
        ) || 0;

      const agerPrice =
        Number(
          row[
            "Ціна дропшиппінг"
          ] ??
            offer.price ??
            0
        ) || 0;

      const konaLadyPrice =
        ceilKonaPrice(
          agerPrice
        );

      const description =
        getDescription(
          offer
        );

      const measurements =
        parseMeasurements(
          description
        );

      const pictures =
        getPictures(
          offer
        );

      const brand =
        getParam(
          offer,
          [
            "бренд",
            "brand",
          ]
        );

      const manufacturer =
        getParam(
          offer,
          [
            "виробник",
            "производитель",
            "manufacturer",
          ]
        );

      const country =
        getParam(
          offer,
          [
            "країна виробника",
            "страна производителя",
            "country",
          ]
        );

      const gender =
        getParam(
          offer,
          [
            "gender",
            "стать",
            "пол",
          ]
        );

      const material =
        getParam(
          offer,
          [
            "матеріал",
            "материал",
            "material",
          ]
        );

      const composition =
        getParam(
          offer,
          [
            "склад",
            "состав",
            "composition",
          ]
        );

      const season =
        getParam(
          offer,
          [
            "сезон",
            "сезонність",
            "сезонность",
            "season",
          ]
        );

      const style =
        getParam(
          offer,
          [
            "стиль",
            "style",
          ]
        );

      const sizeGroup =
        getParam(
          offer,
          [
            "розмірна група",
            "размерная группа",
            "size group",
          ]
        );

      const sleeve =
        getParam(
          offer,
          [
            "рукав",
            "sleeve",
          ]
        );

      const length =
        getParam(
          offer,
          [
            "довжина",
            "длина",
            "length",
          ]
        );

      const neckline =
        getParam(
          offer,
          [
            "виріз",
            "вырез",
            "neckline",
          ]
        );

      const closure =
        getParam(
          offer,
          [
            "застібка",
            "застежка",
            "closure",
          ]
        );

      const fit =
        getParam(
          offer,
          [
            "посадка",
            "fit",
          ]
        );

      const fabricFeatures =
        getParam(
          offer,
          [
            "особливості тканини",
            "особенности ткани",
            "fabric features",
          ]
        );

      matchedRows.push({
        code: text(
          row["Код"]
        ),
        article,
        color,
        size,
        offerId,
        groupId,
      });

      if (!groupId) {
        continue;
      }

      const variant: VariantPreview = {
        offerId,
        size: offerSize,
        color: offerColor,
        stockQuantity,
        agerPrice,
        konaLadyPrice,
      };

      const existing =
        productGroups.get(
          groupId
        );

      if (!existing) {
        productGroups.set(
          groupId,
          {
            groupId,
            name: productName,
            vendorCode,
            color: offerColor,
            agerPrice,
            konaLadyPrice,
            stockQuantity,
            pictures,
            description,
            brand,
            manufacturer,
            country,
            gender,
            material,
            composition,
            season,
            style,
            sizeGroup,
            sleeve,
            length,
            neckline,
            closure,
            fit,
            fabricFeatures,
            measurements,
            variants: [
              variant,
            ],
          }
        );

        continue;
      }

      existing.stockQuantity +=
        stockQuantity;

      existing.variants.push(
        variant
      );

      if (
        existing.pictures.length ===
          0 &&
        pictures.length > 0
      ) {
        existing.pictures =
          pictures;
      }

      if (
        existing.measurements
          .length === 0 &&
        measurements.length > 0
      ) {
        existing.measurements =
          measurements;
      }
    }

    const products =
      productGroups.size;

    const productList =
      Array.from(
        productGroups.values()
      );

    const variants =
      productList.reduce(
        (
          sum,
          product
        ) =>
          sum +
          product.variants
            .length,
        0
      );

    const totalStock =
      productList.reduce(
        (
          sum,
          product
        ) =>
          sum +
          product.stockQuantity,
        0
      );

    const productsWithStock =
      productList.filter(
        (product) =>
          product.stockQuantity >
          0
      ).length;

    const productsWithoutStock =
      productList.filter(
        (product) =>
          product.stockQuantity <=
          0
      ).length;

    const preview =
      productList
        .slice(0, 10)
        .map(
          (product) => ({
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
              product.variants,
            pictures:
              product.pictures
                .length,
            measurements:
              product.measurements,
          })
        );

    return NextResponse.json({
      ok: true,

      test:
        "AGER full catalog import preview",

      writeToSupabase:
        false,

      source: {
        xlsUrl: XLS_URL,
        xmlUrl: XML_URL,

        xlsFileSizeBytes:
          xlsBuffer.byteLength,

        xmlFileSizeBytes:
          new TextEncoder()
            .encode(
              xmlText
            ).byteLength,

        xlsSheetName:
          firstSheetName,

        xlsRows:
          xlsRows.length,

        xmlOffers:
          offers.length,
      },

      matching: {
        rule:
          "base article + normalized color + size",

        matchedRows:
          matchedRows.length,

        noMatchRows:
          noMatchRows.length,

        multipleMatchRows:
          multipleMatchRows.length,

        uniqueProducts:
          products,

        noMatchesSample:
          noMatchRows.slice(
            0,
            20
          ),

        multipleMatchesSample:
          multipleMatchRows.slice(
            0,
            20
          ),
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

        durationMs:
          Date.now() -
          startedAt,
      },
      {
        status: 500,
      }
    );
  }
}