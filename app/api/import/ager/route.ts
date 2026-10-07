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

    const shop = data?.yml_catalog?.shop;

    const categories = shop?.categories?.category ?? [];

    const offers = shop?.offers?.offer ?? [];

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

    const categoryId = String(offer.categoryId ?? "");

    const category = categories.find(
      (item: any) => String(item["@_id"]) === categoryId
    );

    return Response.json({
      ok: true,

      product: {
        groupId: offer["@_group_id"] ?? null,
        offerId: offer["@_id"] ?? null,
        name: offer.name ?? null,
        categoryId: offer.categoryId ?? null,
        categoryName: category?.["#text"] ?? null,
        categoryParentId: category?.["@_parentId"] ?? null,
      },

      categoriesCount: categories.length,

      matchedCategory: category ?? null,

      firstCategories: categories.slice(0, 30),
    });
  } catch (error) {
    console.error("AGER categories test error:", error);

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