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
      isArray: (name) => name === "offer" || name === "picture" || name === "param",
    });

    const data = parser.parse(xml);

    const offers = data?.yml_catalog?.shop?.offers?.offer ?? [];

    const firstOffers = offers.slice(0, 5).map((offer: any) => ({
      id: offer["@_id"] ?? null,
      available: offer["@_available"] ?? null,
      group_id: offer["@_group_id"] ?? null,
      sku: offer.sku ?? null,
      name: offer.name ?? null,
      vendorCode: offer.vendorCode ?? null,
      price: offer.price ?? null,
      oldprice: offer.oldprice ?? null,
      categoryId: offer.categoryId ?? null,
      quantity_in_stock: offer.quantity_in_stock ?? null,
      pictures: offer.picture ?? [],
    }));

    return Response.json({
      ok: true,
      source: AGER_XML_URL,
      xmlSize: xml.length,
      offersCount: offers.length,
      firstOffers,
    });
  } catch (error) {
    console.error("AGER XML import test error:", error);

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