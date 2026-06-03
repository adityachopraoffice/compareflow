

import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useCallback } from "react";
import { Page, Layout, Card, Text, BlockStack, Button, InlineGrid, Badge, Modal, DataTable } from "@shopify/polaris";
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
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  const closePreview = useCallback(() => setPreviewTemplate(null), []);

  const dummyData = [
    ['Price', '$19.99', '$29.99', '$49.99'],
    ['Rating', '4.5/5', '4.8/5', '5.0/5'],
    ['Material', 'Cotton', 'Polyester', 'Silk'],
  ];

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
                <InlineGrid columns={2} gap="200">
                  <Button onClick={() => setPreviewTemplate(template)}>Live Preview</Button>
                  <Button variant="primary">Apply</Button>
                </InlineGrid>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>
      </BlockStack>

      {previewTemplate && (
        <Modal
          open={!!previewTemplate}
          onClose={closePreview}
          title={`Preview: ${previewTemplate.name}`}
          large
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p">This is a simulated preview of how the <b>{previewTemplate.name}</b> template looks.</Text>
              <Card>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text']}
                  headings={['Features', 'Basic Model', 'Pro Model', 'Elite Model']}
                  rows={dummyData}
                />
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
