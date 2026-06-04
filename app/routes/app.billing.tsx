import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { Page, Card, Text, BlockStack, Button, InlineGrid, List } from "@shopify/polaris";
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const { shop } = session;
  
  const billingCheck = await billing.check({
    // @ts-ignore
    plans: [STARTER_PLAN, PRO_PLAN],
    isTest: true,
  });

  const hasPro = billingCheck.appSubscriptions.some(sub => sub.name === PRO_PLAN);
  const hasStarter = billingCheck.appSubscriptions.some(sub => sub.name === STARTER_PLAN);
  
  let plan = "Free";
  if (hasPro) plan = "Pro";
  else if (hasStarter) plan = "Starter";

  // Sync back to db just in case webhook was missed
  await db.shop.upsert({
    where: { domain: shop },
    update: { plan: plan === "Free" ? "Free" : `${plan} Plan` },
    create: { domain: shop, accessToken: "", plan: plan === "Free" ? "Free" : `${plan} Plan` }
  });

  return { plan };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan") as string;
  const action = formData.get("action") as string;

  if (action === "upgrade") {
    const targetPlan = plan === "Starter" ? STARTER_PLAN : PRO_PLAN;
    const billingCheck = await billing.require({
      // @ts-ignore
      plans: [targetPlan],
      isTest: true,
      onFailure: async () => billing.request({
        // @ts-ignore
        plan: targetPlan,
        isTest: true,
        returnUrl: `https://admin.shopify.com/store/${session.shop.split('.')[0]}/apps/compareflow/app/billing`,
      }),
    });
  } else if (action === "cancel") {
    const billingCheck = await billing.require({
      // @ts-ignore
      plans: [STARTER_PLAN, PRO_PLAN],
      isTest: true,
      onFailure: async () => {
        return new Response(null, { status: 200 }); // Handle already free
      }
    });

    if (billingCheck?.appSubscriptions?.length > 0) {
      const subscription = billingCheck.appSubscriptions[0];
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,
        prorate: true,
      });
    }
  }

  return null;
};

export default function Billing() {
  const { plan } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleUpgrade = (planName: string) => {
    const formData = new FormData();
    formData.append("action", "upgrade");
    formData.append("plan", planName);
    submit(formData, { method: "post" });
  };

  const handleDowngradeToFree = () => {
    const formData = new FormData();
    formData.append("action", "cancel");
    submit(formData, { method: "post" });
  };

  return (
    <Page title="Billing & Plans">
      <BlockStack gap="500">
        <InlineGrid columns={3} gap="400">
          <div className="premium-card" style={{ padding: '24px', background: '#fff' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Free</Text>
              <Text as="p" variant="headingXl">$0/m</Text>
              <List>
                <List.Item>1 Comparison Table</List.Item>
                <List.Item>Modern Template only</List.Item>
                <List.Item>No analytics</List.Item>
                <List.Item>Basic Support</List.Item>
              </List>
              {plan === "Free" ? (
                <Button disabled>Current Plan</Button>
              ) : (
                <Button onClick={handleDowngradeToFree}>Downgrade to Free</Button>
              )}
            </BlockStack>
          </div>
          
          <div className="premium-card" style={{ padding: '24px', background: '#fff' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Starter</Text>
              <Text as="p" variant="headingXl">$69/m</Text>
              <List>
                <List.Item>Unlimited Comparison Tables</List.Item>
                <List.Item>3 Premium Templates</List.Item>
                <List.Item>Basic analytics</List.Item>
                <List.Item>Priority Support</List.Item>
              </List>
              {plan === "Starter" ? (
                <Button disabled>Current Plan</Button>
              ) : (
                <Button variant="primary" onClick={() => handleUpgrade("Starter")}>
                  {plan === "Pro" ? "Downgrade" : "Upgrade"}
                </Button>
              )}
            </BlockStack>
          </div>

          <div className="premium-card pro-plan-card" style={{ padding: '24px' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Pro</Text>
              <Text as="p" variant="headingXl">$129/m</Text>
              <List>
                <List.Item>Unlimited Comparison Tables</List.Item>
                <List.Item>All Premium Templates</List.Item>
                <List.Item>Custom CSS Editor</List.Item>
                <List.Item>Advanced analytics</List.Item>
              </List>
              {plan === "Pro" ? (
                <Button disabled>Current Plan</Button>
              ) : (
                <Button variant="primary" onClick={() => handleUpgrade("Pro")}>Upgrade</Button>
              )}
            </BlockStack>
          </div>
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
