import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const tableId = url.searchParams.get("tableId");

  if (!tableId) {
    return json({ error: "Missing tableId" }, { 
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const table = await db.comparisonTable.findUnique({
      where: { id: tableId },
      include: {
        products: { orderBy: { position: 'asc' } },
        attributes: { orderBy: { position: 'asc' }, where: { enabled: true } },
      }
    });

    if (!table) {
      return json({ error: "Table not found" }, { 
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    return json({ table }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60" // Cache for 60s
      }
    });
  } catch (error) {
    return json({ error: "Internal server error" }, { 
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};
