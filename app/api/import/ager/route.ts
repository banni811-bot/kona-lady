import { XMLParser } from "fast-xml-parser";

const AGER_XML_URL = "http://ager.ua/download/catalog_ua.xml";

export async function GET() {
  try {
    const response = await fetch(AGER_XML_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: `AGER XML вернул HTTP ${response.status}`,
        },
        { status: 500 }
      );
    }

    const xml = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      isArray: (name) =>
        name === "offer" ||
        name === "picture" ||
        name === "param",
    });

    const data = parser.parse(xml);

    const offers = data?.yml_catalog?.shop?.offers?.offer ?? [];

    const offer = offers.find(
      (item: any) => String(item["@_group_id"]) === "3537"
    );

    if (!offer) {
      return Response.json(
        {
          ok: false,
          error: "Товар group_id=3537 не найден",
        },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      groupId: offer["@_group_id"] ?? null,
      offerId: offer["@_id"] ?? null,
      vendorCode: offer.vendorCode ?? null,
      name: offer.name ?? null,
      description: offer.description ?? null,
    });
  } catch (error) {
    console.error("AGER measurements test error:", error);

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