import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, BlockStack, Button, InlineGrid, Badge } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { TEMPLATES } from "../lib/templates.config";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
  return { plan: shopRecord?.plan || "Free", templates: TEMPLATES };
};

export default function Templates() {
  const { plan, templates } = useLoaderData<typeof loader>();

  return (
    <Page title="Templates">
      <BlockStack gap="500">
        <InlineGrid columns={3} gap="400">
          {templates.map(template => (
            <Card key={template.id}>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">{template.name} <Badge>{template.minPlan}</Badge></Text>
                  <Text as="p" tone="subdued">{template.description}</Text>
                </BlockStack>
                <Button>Apply</Button>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
