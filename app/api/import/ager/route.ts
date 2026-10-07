import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";

const XLS_URL =
  "http://ager.ua/download/ager_actual_price_and_stock.xls";

const XML_URL =
  "http://ager.ua/download/catalog_ua.xml";

export async function GET() {
  try {
    // =========================
    // 1. Загружаем XLS
    // =========================
    const xlsResponse = await fetch(XLS_URL, {
      cache: "no-store",
    });

    if (!xlsResponse.ok) {
      throw new Error(
        `Не удалось загрузить XLS: ${xlsResponse.status}`
      );
    }

    const xlsBuffer = Buffer.from(
      await xlsResponse.arrayBuffer()
    );

    const workbook = XLSX.read(xlsBuffer, {
      type: "buffer",
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("В XLS нет листов");
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: null,
    });

    // В AGER заголовки находятся в строке Excel №4
    // => индекс 3
    const headerRowIndex = 3;

    const headers = rows[headerRowIndex] || [];

    const codeIndex = headers.findIndex(
      (value: any) => String(value ?? "").trim() === "Код"
    );

    if (codeIndex === -1) {
      throw new Error('Колонка "Код" не найдена в XLS');
    }

    // Берём первые 10 уникальных кодов
    const codes: string[] = [];

    for (
      let rowIndex = headerRowIndex + 1;
      rowIndex < rows.length;
      rowIndex++
    ) {
      const row = rows[rowIndex];

      if (!row) continue;

      const code = String(row[codeIndex] ?? "").trim();

      if (!code) continue;

      if (!codes.includes(code)) {
        codes.push(code);
      }

      if (codes.length >= 10) break;
    }

    // =========================
    // 2. Загружаем XML как RAW TEXT
    // =========================
    const xmlResponse = await fetch(XML_URL, {
      cache: "no-store",
    });

    if (!xmlResponse.ok) {
      throw new Error(
        `Не удалось загрузить XML: ${xmlResponse.status}`
      );
    }

    const xmlText = await xmlResponse.text();

    // =========================
    // 3. Ищем каждый Код
    // =========================
    const results = codes.map((code) => {
      const index = xmlText.indexOf(code);

      if (index === -1) {
        return {
          code,
          foundInRawXml: false,
          rawXmlIndex: -1,
          rawXmlPreview: null,
        };
      }

      const previewStart = Math.max(0, index - 1500);
      const previewEnd = Math.min(
        xmlText.length,
        index + code.length + 1500
      );

      return {
        code,
        foundInRawXml: true,
        rawXmlIndex: index,
        rawXmlPreview: xmlText.slice(
          previewStart,
          previewEnd
        ),
      };
    });

    // =========================
    // 4. Для найденных кодов
    //    дополнительно пытаемся
    //    показать XML offer
    // =========================
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      trimValues: true,
      parseTagValue: false,
    });

    const parsed = parser.parse(xmlText);

    const offersRaw =
      parsed?.yml_catalog?.shop?.offers?.offer;

    const offers = Array.isArray(offersRaw)
      ? offersRaw
      : offersRaw
        ? [offersRaw]
        : [];

    const offerMatches = results.map((result) => {
      if (!result.foundInRawXml) {
        return {
          code: result.code,
          matchesCount: 0,
          matches: [],
        };
      }

      const matches = offers
        .filter((offer: any) => {
          const offerText = JSON.stringify(offer);

          return offerText.includes(result.code);
        })
        .slice(0, 10)
        .map((offer: any) => ({
          offerId: offer?.["@_id"] ?? null,
          groupId: offer?.group_id ?? null,
          sku: offer?.sku ?? null,
          vendorCode: offer?.vendorCode ?? null,
          name:
            typeof offer?.name === "string"
              ? offer.name
              : null,
          price: offer?.price ?? null,
          oldprice: offer?.oldprice ?? null,
          offer,
        }));

      return {
        code: result.code,
        matchesCount: matches.length,
        matches,
      };
    });

    return Response.json({
      ok: true,
      test: "AGER XLS → XML search by Код",
      xls: {
        fileSizeBytes: xlsBuffer.length,
        sheetName,
        rowsCount: rows.length,
        headers,
        codeColumnIndex: codeIndex,
        testedCodes: codes,
      },
      xml: {
        fileSizeBytes: Buffer.byteLength(xmlText, "utf8"),
        offersCount: offers.length,
      },
      rawXmlSearch: {
        tested: results.length,
        found: results.filter(
          (item) => item.foundInRawXml
        ).length,
        results,
      },
      offerSearch: {
        tested: offerMatches.length,
        matchedRows: offerMatches.filter(
          (item) => item.matchesCount > 0
        ).length,
        notMatchedRows: offerMatches.filter(
          (item) => item.matchesCount === 0
        ).length,
        results: offerMatches,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          String(error),
        stack:
          process.env.NODE_ENV === "development"
            ? error?.stack
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}