import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";

// We use an action because this is a POST request
export const action = async ({ request }: ActionFunctionArgs) => {
  // CORS Headers for safety
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop"); // Shopify App Proxy automatically appends this
    
    // Parse the JSON payload
    const body = await request.json();
    const { tableId, eventType, metadata } = body;

    if (!shop || !tableId || !eventType) {
      return json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    // Find the shop to get its internal ID
    const shopRecord = await db.shop.findUnique({
      where: { domain: shop },
    });

    if (!shopRecord) {
      return json({ error: "Shop not found" }, { status: 404, headers: corsHeaders });
    }

    // Log the event in AnalyticsEvent table
    await db.analyticsEvent.create({
      data: {
        shopId: shopRecord.id,
        tableId: tableId,
        eventType: eventType, // 'view' or 'click'
        metadata: metadata ? JSON.stringify(metadata) : null,
      }
    });

    // Increment the aggregate counters on the table itself
    if (eventType === 'view') {
      await db.comparisonTable.update({
        where: { id: tableId },
        data: { viewCount: { increment: 1 } }
      });
    } else if (eventType === 'click') {
      await db.comparisonTable.update({
        where: { id: tableId },
        data: { clickCount: { increment: 1 } }
      });
    }

    return json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
};
