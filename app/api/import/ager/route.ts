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
        name === "param" ||
        name === "category",
    });

    const data = parser.parse(xml);

    const offers =
      data?.yml_catalog?.shop?.offers?.offer ?? [];

    const groupOffers = offers.filter(
      (item: any) =>
        String(item["@_group_id"]) === "3537"
    );

    if (groupOffers.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "Товар group_id=3537 не найден",
        },
        { status: 404 }
      );
    }

    const firstOffer = groupOffers[0];

    const pictures = firstOffer.picture ?? [];

    return Response.json({
      ok: true,

      groupId: firstOffer["@_group_id"] ?? null,

      offerId: firstOffer["@_id"] ?? null,

      vendorCode: firstOffer.vendorCode ?? null,

      name: firstOffer.name ?? null,

      picturesCount: pictures.length,

      pictures,

      allOffers: groupOffers.map((offer: any) => ({
        offerId: offer["@_id"] ?? null,
        size:
          offer.param?.find(
            (param: any) =>
              param["@_name"] ===
              "Размер"
          )?.["#text"] ?? null,
        pictures: offer.picture ?? [],
      })),
    });
  } catch (error) {
    console.error("AGER pictures test error:", error);

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