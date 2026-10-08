import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const XML_URL = "http://ager.ua/download/catalog_ua.xml";

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if ("#text" in obj) {
      return text(obj["#text"]);
    }

    if ("__text" in obj) {
      return text(obj["__text"]);
    }
  }

  return "";
}

function getOffers(root: unknown): any[] {
  const data = root as any;

  const shop = data?.yml_catalog?.shop;
  const offers = shop?.offers?.offer;

  if (!offers) return [];

  return Array.isArray(offers) ? offers : [offers];
}

function findDescriptionValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if ("#text" in obj) {
      return text(obj["#text"]);
    }

    if ("__cdata" in obj) {
      return text(obj["__cdata"]);
    }

    if ("__text" in obj) {
      return text(obj["__text"]);
    }
  }

  return "";
}

function getDescription(offer: any): string {
  const possible = [
    offer.description,
    offer["description"],
    offer["description_html"],
    offer["descriptionHtml"],
  ];

  for (const value of possible) {
    const result = findDescriptionValue(value);

    if (result) {
      return result;
    }
  }

  return "";
}

function getGroupId(offer: any): string {
  return (
    text(offer.group_id) ||
    text(offer.groupId) ||
    text(offer["@_group_id"])
  );
}

function getVendorCode(offer: any): string {
  return (
    text(offer.vendorCode) ||
    text(offer.vendor_code) ||
    text(offer["@_vendorCode"])
  );
}

function getName(offer: any): string {
  return text(offer.name) || text(offer["@_name"]);
}

function extractTables(html: string) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];

  return tables.map((table, index) => {
    const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

    return {
      index,
      htmlLength: table.length,
      rows: rows.map((row) => {
        const cells =
          row.match(/<(?:td|th)\b[\s\S]*?<\/(?:td|th)>/gi) || [];

        return cells.map((cell) => {
          return cell
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<\/p>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&quot;/gi, '"')
            .replace(/&amp;/gi, "&")
            .replace(/\s+/g, " ")
            .trim();
        });
      }),
    };
  });
}

export async function GET() {
  try {
    const response = await fetch(XML_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "KONA-LADY-AGER-IMPORT/1.0",
      },
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
      cdataPropName: "__cdata",
      parseTagValue: false,
      trimValues: false,
    });

    const parsed = parser.parse(xml);
    const offers = getOffers(parsed);

    const targetOffers = offers.filter(
      (offer) => getGroupId(offer) === "138845"
    );

    if (!targetOffers.length) {
      return NextResponse.json({
        ok: false,
        error: "Группа 138845 не найдена",
        offersCount: offers.length,
      });
    }

    const first = targetOffers[0];
    const description = getDescription(first);

    return NextResponse.json({
      ok: true,
      test: "AGER XML description/table diagnostic",
      groupId: getGroupId(first),
      vendorCode: getVendorCode(first),
      name: getName(first),
      targetOffers: targetOffers.length,
      description: {
        exists: Boolean(description),
        length: description.length,
        first2000: description.slice(0, 2000),
      },
      tables: extractTables(description),
      rawDescriptionKeys: Object.keys(first).filter((key) =>
        key.toLowerCase().includes("description")
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}