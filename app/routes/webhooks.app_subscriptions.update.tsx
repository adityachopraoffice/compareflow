import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const subscriptionStatus = payload.app_subscription?.status;
  const subscriptionName = payload.app_subscription?.name;

  if (subscriptionStatus && subscriptionName) {
    const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
    if (shopRecord) {
       await db.shop.update({
         where: { domain: shop },
         data: { plan: subscriptionStatus === 'ACTIVE' ? subscriptionName : 'Free' }
       });
    }
  }

  return new Response();
};
