import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const XML_URL = "http://ager.ua/download/catalog_ua.xml";

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: unknown): number | null {
  const match = String(value ?? "").match(/[\d.,]+/);

  if (!match) return null;

  const number = Number(
    match[0]
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(number) ? number : null;
}

function normalizeSize(value: unknown): string {
  return cleanText(value).toUpperCase();
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

  const sizeCells = [
    ...sizeRowMatch[1].matchAll(
      /<td[^>]*>([\s\S]*?)<\/td>/gi
    ),
  ].map((match) => cleanText(match[1]));

  if (sizeCells.length === 0) {
    return [];
  }

  const sizes = sizeCells.map(normalizeSize);

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
      labels: ["Напівобхват пояса", "Напівобхват талії"],
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
    ].map((match) => parseNumber(cleanText(match[1])));

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

      result[size][row.key] = cells[index] ?? null;
    });
  }

  return Object.entries(result).map(([size, values]) => ({
    size,
    ...values,
  }));
}

export async function GET() {
  try {
    const response = await fetch(XML_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `AGER XML HTTP ${response.status}`,
        },
        { status: 500 }
      );
    }

    const xml = await response.text();

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

    const groupId = "138845";

    const groupOffers = offers.filter(
      (offer: any) =>
        String(offer?.["@_group_id"] ?? "") === groupId
    );

    if (groupOffers.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Group ${groupId} not found`,
        },
        { status: 404 }
      );
    }

    const firstOffer = groupOffers[0];

    const description = String(
      firstOffer?.description ?? ""
    );

    const measurements = extractMeasurements(description);

    return NextResponse.json({
      ok: true,
      test: "AGER XML measurements parser",

      groupId,

      source: {
        xmlUrl: XML_URL,
        fileSizeBytes: Buffer.byteLength(xml, "utf8"),
        offersCount: offers.length,
      },

      product: {
        name: firstOffer?.name ?? null,
        vendorCode: firstOffer?.vendorCode ?? null,
        color:
          firstOffer?.param?.find?.(
            (param: any) =>
              String(param?.["@_name"] ?? "")
                .toLowerCase()
                .includes("колір")
          )?.["#text"] ?? null,
      },

      measurements,

      checks: {
        variantsFound: groupOffers.length,
        measurementsFound: measurements.length,
        sizes: measurements.map((item) => item.size),
        parserWorks: measurements.length > 0,
      },
    });
  } catch (error) {
    console.error("AGER measurements test error:", error);

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