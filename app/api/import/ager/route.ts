import { XMLParser } from "fast-xml-parser";

export async function GET() {
  const parser = new XMLParser();

  return Response.json({
    ok: true,
    message: "AGER importer API работает",
    parserLoaded: !!parser,
  });
}