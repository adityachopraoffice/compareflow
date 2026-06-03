import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { Page, Card, Text, BlockStack, Button, InlineGrid } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop } = await authenticate.admin(request);
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
  return { plan: shopRecord?.plan || "Free" };
};

export default function Billing() {
  const { plan } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleUpgrade = (planName: string) => {
    // In reality, this would submit a form to action and trigger Shopify billing redirect
  };

  return (
    <Page title="Billing & Plans">
      <BlockStack gap="500">
        <InlineGrid columns={3} gap="400">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Free</Text>
              <Text as="p" variant="headingXl">$0/m</Text>
              <Button disabled={plan === "Free"}>Current Plan</Button>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Starter</Text>
              <Text as="p" variant="headingXl">$9/m</Text>
              <Button primary onClick={() => handleUpgrade("Starter")}>Upgrade</Button>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Pro</Text>
              <Text as="p" variant="headingXl">$19/m</Text>
              <Button primary onClick={() => handleUpgrade("Pro")}>Upgrade</Button>
            </BlockStack>
          </Card>
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
