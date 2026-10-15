
const { createClient } = require("@supabase/supabase-js");
const { XMLParser } = require("fast-xml-parser");

const BATCH_SIZE = 200;
const PRODUCT_BATCH_SIZE = 400;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Р В РЎСљР В Р’Вµ Р В Р вЂ¦Р В Р’В°Р В РІвЂћвЂ“Р В РўвЂР В Р’ВµР В Р вЂ¦Р В Р’В° Р В РЎвЂ”Р В Р’ВµР РЋР вЂљР В Р’ВµР В РЎВР В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В Р’В°Р РЋР РЏ ${name} Р В Р вЂ  .env.local`);
  return value;
}

function asText(value) {
  if (value == null) return "";
  if (typeof value === "object" && "#text" in value) {
    return String(value["#text"] ?? "").trim();
  }
  return String(value).trim();
}

function getParam(offer, names) {
  const params = Array.isArray(offer.param)
    ? offer.param
    : offer.param
      ? [offer.param]
      : [];

  for (const param of params) {
    const name = String(param?.["@_name"] ?? "").trim().toLowerCase();
    if (names.includes(name)) return asText(param);
  }

  return "";
}

function chunks(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function main() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = requiredEnv("SUPABASE_SECRET_KEY");
  const feedUrl = requiredEnv("AGER_XML_URL");

  const parsedUrl = new URL(feedUrl);
  if (
    parsedUrl.protocol !== "https:" ||
    !["ager.ua", "www.ager.ua"].includes(parsedUrl.hostname)
  ) {
    throw new Error("AGER_XML_URL Р В РўвЂР В РЎвЂўР В Р’В»Р В Р’В¶Р В Р’ВµР В Р вЂ¦ Р В Р’В±Р РЋРІР‚в„–Р РЋРІР‚С™Р РЋР Р‰ HTTPS-Р В Р’В°Р В РўвЂР РЋР вЂљР В Р’ВµР РЋР С“Р В РЎвЂўР В РЎВ ager.ua");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log("1/5. Р В РІР‚вЂќР В Р’В°Р В РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР В Р’В¶Р В Р’В°Р РЋР вЂ№ XML-Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’В°Р В Р’В»Р В РЎвЂўР В РЎвЂ“ AGER...");
  const response = await fetch(feedUrl, {
    signal: AbortSignal.timeout(180000),
  });

  if (!response.ok) {
    throw new Error(`AGER Р В Р вЂ Р В Р’ВµР РЋР вЂљР В Р вЂ¦Р РЋРЎвЂњР В Р’В» HTTP ${response.status}`);
  }

  const xml = await response.text();
  console.log(`XML Р В РЎвЂ”Р В РЎвЂўР В Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР В Р’ВµР В Р вЂ¦: ${(Buffer.byteLength(xml) / 1024 / 1024).toFixed(1)} Р В РЎС™Р В РІР‚В`);

  console.log("2/5. Р В Р’В Р В Р’В°Р В Р’В·Р В Р’В±Р В РЎвЂР РЋР вЂљР В Р’В°Р РЋР вЂ№ Р В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В Р’В°Р В Р’В»Р В РЎвЂўР В РЎвЂ“ Р В РЎвЂ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р’ВµР РЋР вЂљР РЋР РЏР РЋР вЂ№ Р В РЎвЂР В РўвЂР В Р’ВµР В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂР РЋРІР‚С›Р В РЎвЂР В РЎвЂќР В Р’В°Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР РЋРІР‚в„–...");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: true,
  });

  const document = parser.parse(xml);
  const shop = document?.yml_catalog?.shop;
  const rawOffers = shop?.offers?.offer;

  if (!rawOffers) {
    throw new Error("Р В РІР‚в„ў XML Р В Р вЂ¦Р В Р’Вµ Р В Р вЂ¦Р В Р’В°Р В РІвЂћвЂ“Р В РўвЂР В Р’ВµР В Р вЂ¦ Р РЋР С“Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂўР В РЎвЂќ offers");
  }

  const offers = Array.isArray(rawOffers) ? rawOffers : [rawOffers];
  const uniqueOffers = new Map();

  for (const offer of offers) {
    const id = asText(offer?.["@_id"]);
    const groupId = asText(offer?.["@_group_id"]);
    const rawStock = offer?.quantity_in_stock;

    if (!id || !groupId || rawStock == null || asText(rawStock) === "") {
      throw new Error(
        `Р В РЎвЂєР РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р’В»Р В Р’ВµР В Р вЂ¦Р В РЎвЂў Р В РўвЂР В РЎвЂў Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂ: Р РЋРЎвЂњ Р В Р вЂ Р В Р’В°Р РЋР вЂљР В РЎвЂР В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В Р’В° Р В Р вЂ¦Р В Р’Вµ Р РЋРІР‚В¦Р В Р вЂ Р В Р’В°Р РЋРІР‚С™Р В Р’В°Р В Р’ВµР РЋРІР‚С™ id, group_id Р В РЎвЂР В Р’В»Р В РЎвЂ quantity_in_stock. ID: ${id || "(Р В Р вЂ¦Р В Р’ВµР РЋРІР‚С™)"}`
      );
    }

    if (uniqueOffers.has(id)) {
      throw new Error(
        `Р В РЎвЂєР РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р’В»Р В Р’ВµР В Р вЂ¦Р В РЎвЂў Р В РўвЂР В РЎвЂў Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂ: Р В РЎвЂ”Р В РЎвЂўР В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР РЋР РЏР В Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋР РЏ offer_id ${id}`
      );
    }

    const stock = Number(asText(rawStock).replace(",", "."));
    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error(`Р В РЎСљР В Р’ВµР В РЎвЂќР В РЎвЂўР РЋР вЂљР РЋР вЂљР В Р’ВµР В РЎвЂќР РЋРІР‚С™Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В Р’В°Р РЋРІР‚С™Р В РЎвЂўР В РЎвЂќ Р РЋРЎвЂњ Р В Р вЂ Р В Р’В°Р РЋР вЂљР В РЎвЂР В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В Р’В° ${id}`);
    }

    uniqueOffers.set(id, {
      id,
      groupId,
      offer,
      stock: Math.floor(stock),
    });
  }

  const validOffers = [...uniqueOffers.values()];
  const groupIds = [...new Set(validOffers.map((item) => item.groupId))];

  console.log(`Р В РЎСџР РЋР вЂљР В Р’ВµР В РўвЂР В Р’В»Р В РЎвЂўР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В РІвЂћвЂ“ Р В Р вЂ  XML: ${offers.length}`);
  console.log(`Р В Р в‚¬Р В Р вЂ¦Р В РЎвЂР В РЎвЂќР В Р’В°Р В Р’В»Р РЋР Р‰Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦ Р В Р вЂ Р В Р’В°Р РЋР вЂљР В РЎвЂР В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ : ${validOffers.length}`);
  console.log(`Р В РІР‚СљР РЋР вЂљР РЋРЎвЂњР В РЎвЂ”Р В РЎвЂ” Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ Р В Р’В°Р РЋР вЂљР В РЎвЂўР В Р вЂ : ${groupIds.length}`);

  console.log("3/5. Р В Р Р‹Р В РЎвЂўР В РЎвЂ”Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ Р В Р’В»Р РЋР РЏР РЋР вЂ№ Р В Р вЂ Р В Р’В°Р РЋР вЂљР В РЎвЂР В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р РЋРІР‚в„– Р РЋР С“ Р В РЎвЂќР В Р’В°Р РЋР вЂљР РЋРІР‚С™Р В РЎвЂўР РЋРІР‚РЋР В РЎвЂќР В Р’В°Р В РЎВР В РЎвЂ Р В Р вЂ  Р В Р’В±Р В Р’В°Р В Р’В·Р В Р’Вµ...");
  const productByGroup = new Map();

  for (const group of chunks(groupIds, PRODUCT_BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("products")
      .select("id,ager_group_id")
      .in("ager_group_id", group);

    if (error) throw new Error(`Р В РЎвЂєР РЋРІвЂљВ¬Р В РЎвЂР В Р’В±Р В РЎвЂќР В Р’В° Р РЋРІР‚РЋР РЋРІР‚С™Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ Р В РЎвЂќР В Р’В°Р РЋР вЂљР РЋРІР‚С™Р В РЎвЂўР РЋРІР‚РЋР В Р’ВµР В РЎвЂќ: ${error.message}`);

    for (const product of data ?? []) {
      const key = asText(product.ager_group_id);
      if (key) productByGroup.set(key, product.id);
    }
  }

  const rows = [];
  let skippedNoProduct = 0;

  for (const item of validOffers) {
    const productId = productByGroup.get(item.groupId);

    if (productId == null) {
      skippedNoProduct++;
      continue;
    }

    rows.push({
      product_id: productId,
      ager_offer_id: item.id,
      ager_group_id: item.groupId,
      ager_sku: asText(item.offer.sku) || null,
      ager_vendor_code: asText(item.offer.vendorCode) || null,
      size: getParam(item.offer, [
        "size",
        "\u0440\u043e\u0437\u043c\u0456\u0440",
        "\u0440\u0430\u0437\u043c\u0435\u0440",
      ]) || null,
      color: getParam(item.offer, [
        "color",
        "\u043a\u043e\u043b\u0456\u0440",
        "\u0446\u0432\u0435\u0442",
      ]) || null,
      stock_quantity: item.stock,
      is_available: false,
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`Р В РІР‚в„ўР В Р’В°Р РЋР вЂљР В РЎвЂР В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ  Р В РўвЂР В Р’В»Р РЋР РЏ Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂ: ${rows.length}`);
  console.log(`Р В РІР‚ВР В Р’ВµР В Р’В· Р В РЎвЂќР В Р’В°Р РЋР вЂљР РЋРІР‚С™Р В РЎвЂўР РЋРІР‚РЋР В РЎвЂќР В РЎвЂ Р В Р вЂ  Р В Р’В±Р В Р’В°Р В Р’В·Р В Р’Вµ: ${skippedNoProduct}`);

  if (rows.length === 0) {
    throw new Error("Р В РЎСљР В Р’ВµР РЋРІР‚С™ Р В Р вЂ Р В Р’В°Р РЋР вЂљР В РЎвЂР В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ , Р РЋР С“Р В РЎвЂўР В РЎвЂ”Р В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В Р’В°Р В Р вЂ Р В Р’В»Р В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦ Р РЋР С“ Р В РЎвЂќР В Р’В°Р РЋР вЂљР РЋРІР‚С™Р В РЎвЂўР РЋРІР‚РЋР В РЎвЂќР В Р’В°Р В РЎВР В РЎвЂ. Р В РІР‚вЂќР В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р РЋР Р‰ Р В РЎвЂўР РЋРІР‚С™Р В РЎВР В Р’ВµР В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В Р’В°.");
  }

  if (process.argv.includes("--dry-run")) {
    console.log("DRY RUN: Р В·Р В°Р С—Р С‘РЎРѓРЎРЉ Р Р† Р В±Р В°Р В·РЎС“ Р С—РЎР‚Р С•Р С—РЎС“РЎвЂ°Р ВµР Р…Р В°.");
    console.log({
      totalOffers: offers.length,
      uniqueOffers: validOffers.length,
      totalGroups: groupIds.length,
      matchedVariants: rows.length,
      variantsWithSize: rows.filter((r) => r.size).length,
      variantsWithColor: rows.filter((r) => r.color).length,
      skippedNoProduct,
      variantsWritten: 0,
      cardsActivated: 0,
      variantsActivated: 0,
    });
    return;
  }
  console.log("4/5. Р В РІР‚вЂќР В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р РЋР вЂ№ Р В Р вЂ Р В Р’В°Р РЋР вЂљР В РЎвЂР В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р РЋРІР‚в„– Р В РЎвЂ”Р В РЎвЂўР РЋР вЂљР РЋРІР‚В Р В РЎвЂР РЋР РЏР В РЎВР В РЎвЂ...");
  let written = 0;
  const batches = chunks(rows, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const { error } = await supabase
      .from("product_variants")
      .upsert(batches[i], { onConflict: "ager_offer_id" });

    if (error) {
      throw new Error(
        `Р В РЎвЂєР РЋРІвЂљВ¬Р В РЎвЂР В Р’В±Р В РЎвЂќР В Р’В° Р В Р вЂ  Р В РЎвЂ”Р В РЎвЂўР РЋР вЂљР РЋРІР‚В Р В РЎвЂР В РЎвЂ ${i + 1}/${batches.length}, Р В Р’В·Р В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В Р’В°Р В Р вЂ¦Р В РЎвЂў Р В РЎвЂ”Р В РЎвЂўР РЋР вЂљР РЋРІР‚В Р В РЎвЂР В РІвЂћвЂ“: ${i}. ` +
        `Р В РЎСџР В РЎвЂўР В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р В Р’В·Р В Р’В°Р В РЎвЂ”Р РЋРЎвЂњР РЋР С“Р В РЎвЂќ Р В Р’В±Р В Р’ВµР В Р’В·Р В РЎвЂўР В РЎвЂ”Р В Р’В°Р РЋР С“Р В Р’ВµР В Р вЂ¦ Р В РЎвЂ”Р В РЎвЂў ager_offer_id. ${error.message}`
      );
    }

    written += batches[i].length;

    if ((i + 1) % 5 === 0 || i + 1 === batches.length) {
      console.log(`Р В РІР‚вЂќР В Р’В°Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В Р’В°Р В Р вЂ¦Р В РЎвЂў ${written} Р В РЎвЂР В Р’В· ${rows.length} Р В Р вЂ Р В Р’В°Р РЋР вЂљР В РЎвЂР В Р’В°Р В Р вЂ¦Р РЋРІР‚С™Р В РЎвЂўР В Р вЂ `);
    }
  }

  console.log("5/5. Р В Р’ВР В РЎВР В РЎвЂ”Р В РЎвЂўР РЋР вЂљР РЋРІР‚С™ Р В Р’В·Р В Р’В°Р В Р вЂ Р В Р’ВµР РЋР вЂљР РЋРІвЂљВ¬Р РЋРІР‚ВР В Р вЂ¦.");
  console.log({
    totalOffers: offers.length,
    uniqueOffers: validOffers.length,
    matchedVariants: rows.length,
    skippedNoProduct,
    variantsWritten: written,
    cardsActivated: 0,
    variantsActivated: 0,
  });
}

main().catch((error) => {
  console.error("Р В Р’ВР В РЎС™Р В РЎСџР В РЎвЂєР В Р’В Р В РЎС› Р В РЎСљР В РІР‚Сћ Р В РІР‚вЂќР В РЎвЂ™Р В РІР‚в„ўР В РІР‚СћР В Р’В Р В Р РѓР В Р С“Р В РЎСљ:", error.message);
  process.exitCode = 1;
});

