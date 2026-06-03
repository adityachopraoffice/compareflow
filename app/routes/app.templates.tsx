

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
            <div key={template.id} className="premium-card bg-gradient-1" style={{ padding: 0, background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '180px', overflow: 'hidden', borderBottom: '1px solid #eee' }}>
                <img 
                  src={`/images/${template.id}.png`} 
                  alt={`${template.name} preview`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div style={{ padding: '20px', flex: 1 }}>
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
              </div>
            </div>
          ))}
        </InlineGrid>
      </BlockStack>

      {previewTemplate && (
        <Modal
          open={!!previewTemplate}
          onClose={closePreview}
          title={`Preview: ${previewTemplate.name}`}
          size="large"
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p">This is a simulated preview of how the <b>{previewTemplate.name}</b> template looks.</Text>
              
              <div style={{
                background: previewTemplate.id === 'dark' ? '#111' : '#fff',
                color: previewTemplate.id === 'dark' ? '#fff' : '#000',
                padding: '20px',
                borderRadius: '8px',
                fontFamily: previewTemplate.id === 'premium' ? 'serif' : 'inherit',
                border: previewTemplate.id === 'minimal' ? 'none' : '1px solid #ddd'
              }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text']}
                  headings={['Features', 'Basic Model', 'Pro Model', 'Elite Model']}
                  rows={dummyData}
                />
              </div>

            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
