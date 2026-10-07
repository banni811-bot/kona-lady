import * as XLSX from "xlsx";

const AGER_XLS_URL =
  "http://ager.ua/download/ager_actual_price_and_stock.xls";

export async function GET() {
  try {
    const response = await fetch(AGER_XLS_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: `AGER XLS вернул HTTP ${response.status}`,
        },
        { status: 500 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    const workbook = XLSX.read(Buffer.from(arrayBuffer), {
      type: "buffer",
      cellDates: true,
    });

    const sheetNames = workbook.SheetNames;

    const firstSheetName = sheetNames[0];

    if (!firstSheetName) {
      return Response.json(
        {
          ok: false,
          error: "В XLS нет листов",
        },
        { status: 500 }
      );
    }

    const worksheet = workbook.Sheets[firstSheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as unknown[][];

    const headers = rows[0] ?? [];

    const firstRows = rows.slice(0, 6);

    return Response.json({
      ok: true,

      fileSizeBytes: arrayBuffer.byteLength,

      sheetNames,

      firstSheet: firstSheetName,

      rowsCount: rows.length,

      columnsCount: headers.length,

      headers,

      firstRows,
    });
  } catch (error) {
    console.error("AGER XLS test error:", error);

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