import { XMLParser } from "fast-xml-parser";

const XML_URL =
  "http://ager.ua/download/catalog_ua.xml";

const TEST_GROUP_ID = "138845";

function getParam(
  offer: any,
  names: string[]
): string {
  const params = Array.isArray(offer?.param)
    ? offer.param
    : offer?.param
      ? [offer.param]
      : [];

  for (const param of params) {
    const name = String(param?.["@_name"] ?? "")
      .trim()
      .toLowerCase();

    for (const target of names) {
      if (name === target.trim().toLowerCase()) {
        return String(
          param?.["#text"] ?? param ?? ""
        ).trim();
      }
    }
  }

  return "";
}

function getPictures(offer: any): string[] {
  if (Array.isArray(offer?.picture)) {
    return offer.picture
      .map((item: any) => String(item).trim())
      .filter(Boolean);
  }

  if (offer?.picture) {
    return [String(offer.picture).trim()];
  }

  return [];
}

function getStock(offer: any): number {
  const value = Number(
    offer?.quantity_in_stock ?? 0
  );

  return Number.isFinite(value) ? value : 0;
}

function getDescription(offer: any): string {
  return String(
    offer?.description ?? ""
  ).trim();
}

function getCategoryId(offer: any): string {
  return String(
    offer?.categoryId ?? ""
  ).trim();
}

export async function GET() {
  try {
    // ---------------------------------------------------------
    // 1. Загружаем XML
    // ---------------------------------------------------------

    const response = await fetch(XML_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Ошибка загрузки XML: ${response.status} ${response.statusText}`
      );
    }

    const xmlText = await response.text();

    // ---------------------------------------------------------
    // 2. Парсим XML
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
    // 3. Находим один полноценный товар
    // ---------------------------------------------------------

    const productOffers = offers.filter(
      (offer: any) =>
        String(
          offer?.["@_group_id"] ?? ""
        ).trim() === TEST_GROUP_ID
    );

    if (!productOffers.length) {
      throw new Error(
        `group_id ${TEST_GROUP_ID} не найден`
      );
    }

    const firstOffer = productOffers[0];

    // ---------------------------------------------------------
    // 4. Собираем общую информацию о товаре
    // ---------------------------------------------------------

    const product = {
      groupId: TEST_GROUP_ID,

      name:
        firstOffer?.name ?? null,

      vendorCode:
        firstOffer?.vendorCode ?? null,

      sku:
        firstOffer?.sku ?? null,

      categoryId:
        getCategoryId(firstOffer),

      categoryName:
        firstOffer?.categoryName ?? null,

      categoryParentId:
        firstOffer?.categoryParentId ?? null,

      categoryParentName:
        firstOffer?.categoryParentName ?? null,

      url:
        firstOffer?.url ?? null,

      description:
        getDescription(firstOffer),

      brand:
        getParam(firstOffer, [
          "Бренд",
        ]),

      manufacturer:
        getParam(firstOffer, [
          "Виробник",
          "Производитель",
        ]),

      country:
        getParam(firstOffer, [
          "Країна виробник",
          "Страна производитель",
        ]),

      gender:
        getParam(firstOffer, [
          "Стать",
          "Пол",
          "Gender",
        ]),

      material:
        getParam(firstOffer, [
          "Матеріал",
          "Материал",
        ]),

      composition:
        getParam(firstOffer, [
          "Склад",
          "Состав",
        ]),

      season:
        getParam(firstOffer, [
          "Сезон",
          "Сезонність",
          "Сезонность",
        ]),

      style:
        getParam(firstOffer, [
          "Стиль",
        ]),

      sleeve:
        getParam(firstOffer, [
          "Довжина рукава",
          "Длина рукава",
        ]),

      length:
        getParam(firstOffer, [
          "Довжина",
          "Длина",
        ]),

      neckline:
        getParam(firstOffer, [
          "Виріз",
          "Вырез",
        ]),

      closure:
        getParam(firstOffer, [
          "Застібка",
          "Застежка",
        ]),

      fit:
        getParam(firstOffer, [
          "Особливості крою",
          "Особенности кроя",
        ]),

      fabricFeatures:
        getParam(firstOffer, [
          "Особливості тканини",
          "Особенности ткани",
        ]),

      color:
        getParam(firstOffer, [
          "Колір",
          "Цвет",
        ]),

      sizeGroup:
        getParam(firstOffer, [
          "Розмірна група",
          "Размерная группа",
        ]),

      pictures: getPictures(firstOffer),

      // Цена AGER и будущая цена KONA LADY
      agerPrice:
        Number(firstOffer?.price ?? 0),

      konaLadyPrice:
        Math.ceil(
          Number(firstOffer?.price ?? 0) * 1.25
        ),
    };

    // ---------------------------------------------------------
    // 5. Собираем ВСЕ варианты этого group_id
    // ---------------------------------------------------------

    const variants = productOffers.map(
      (offer: any) => ({
        offerId:
          offer?.["@_id"] ?? null,

        available:
          String(
            offer?.["@_available"] ?? ""
          ),

        groupId:
          offer?.["@_group_id"] ?? null,

        sku:
          offer?.sku ?? null,

        vendorCode:
          offer?.vendorCode ?? null,

        name:
          offer?.name ?? null,

        agerPrice:
          Number(offer?.price ?? 0),

        konaLadyPrice:
          Math.ceil(
            Number(offer?.price ?? 0) * 1.25
          ),

        oldPrice:
          Number(offer?.oldprice ?? 0),

        color:
          getParam(offer, [
            "Колір",
            "Цвет",
          ]),

        size:
          getParam(offer, [
            "Розмір",
            "Международный размер",
            "Размеры мужских рубашек",
            "Размер",
          ]),

        stockQuantity:
          getStock(offer),

        isAvailable:
          String(
            offer?.["@_available"] ?? ""
          ) === "true",

        pictures:
          getPictures(offer),
      })
    );

    // ---------------------------------------------------------
    // 6. Суммарный остаток
    // ---------------------------------------------------------

    const totalStock = variants.reduce(
      (sum: number, variant: any) =>
        sum + variant.stockQuantity,
      0
    );

    // ---------------------------------------------------------
    // 7. Измерения
    // ---------------------------------------------------------

    const measurements = variants
      .map((variant: any) => {
        const offer = productOffers.find(
          (item: any) =>
            String(
              item?.["@_id"] ?? ""
            ) ===
            String(
              variant.offerId ?? ""
            )
        );

        if (!offer) {
          return null;
        }

        const getMeasurement = (
          names: string[]
        ): string | null => {
          const value = getParam(
            offer,
            names
          );

          return value || null;
        };

        return {
          offerId: variant.offerId,

          size: variant.size,

          bust:
            getMeasurement([
              "Напівобхват грудей",
              "Полуобхват груди",
            ]),

          waist:
            getMeasurement([
              "Напівобхват пояса",
              "Полуобхват пояса",
            ]),

          hips:
            getMeasurement([
              "Напівобхват стегон",
              "Полуобхват бедер",
            ]),

          length:
            getMeasurement([
              "Довжина виробу",
              "Длина изделия",
            ]),

          sleeve:
            getMeasurement([
              "Довжина рукава",
              "Длина рукава",
            ]),

          shoulder:
            getMeasurement([
              "Ширина плечей",
              "Ширина плеч",
            ]),
        };
      })
      .filter(Boolean);

    // ---------------------------------------------------------
    // 8. Возвращаем полный диагностический результат
    // ---------------------------------------------------------

    return Response.json({
      ok: true,

      test:
        "AGER XML full product card",

      xml: {
        fileSizeBytes:
          Buffer.byteLength(
            xmlText,
            "utf8"
          ),

        offersCount:
          offers.length,
      },

      product,

      variants,

      totalStock,

      measurements,

      checks: {
        variantsCount:
          variants.length,

        picturesCount:
          product.pictures.length,

        hasDescription:
          Boolean(product.description),

        hasBrand:
          Boolean(product.brand),

        hasMaterial:
          Boolean(product.material),

        hasComposition:
          Boolean(product.composition),

        hasSeason:
          Boolean(product.season),

        hasGender:
          Boolean(product.gender),

        hasCategoryId:
          Boolean(product.categoryId),

        konaLadyPriceFormula:
          "ceil(AGER price × 1.25)",
      },
    });
  } catch (error: any) {
    console.error(
      "AGER FULL PRODUCT TEST ERROR:",
      error
    );

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