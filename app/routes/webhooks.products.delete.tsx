import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // Delete product from all comparison tables
  const productId = payload.id.toString();
  await db.comparisonProduct.deleteMany({
    where: {
      shopifyProductId: productId,
    }
  });

  return new Response();
};
