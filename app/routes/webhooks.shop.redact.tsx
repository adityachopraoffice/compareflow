import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);
  
  if (shop) {
    try {
      await db.shop.deleteMany({ where: { domain: shop } });
    } catch (e) {
      // Shop might already be deleted by app/uninstalled webhook
    }
  }

  return new Response();
};
