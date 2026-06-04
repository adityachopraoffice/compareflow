

import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import React, { useState, useCallback } from "react";
import { Page, Layout, Card, Text, BlockStack, Button, InlineGrid, Badge, Modal, DataTable, Icon } from "@shopify/polaris";
import { LockIcon } from "@shopify/polaris-icons";
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";
import { TEMPLATES } from "../lib/templates.config";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const { shop } = session;
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });

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

  return { plan, templates: TEMPLATES };
};

export default function Templates() {
  const { plan, templates } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  const closePreview = useCallback(() => setPreviewTemplate(null), []);

  const planWeights = { "Free": 0, "Starter": 1, "Pro": 2 };
  const getWeight = (p: string) => planWeights[p as keyof typeof planWeights] || 0;

  return (
    <Page title="Templates">
      <BlockStack gap="500">
        <InlineGrid columns={3} gap="400">
          {templates.map(template => {
            const isUnlocked = getWeight(plan) >= getWeight(template.minPlan);

            return (
              <Card key={template.id} padding="0">
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ height: '180px', overflow: 'hidden', borderBottom: '1px solid #eee', position: 'relative' }}>
                    <img 
                      src={`/images/${template.id}.png`} 
                      alt={`${template.name} preview`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    {!isUnlocked && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '4px 8px', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon source={LockIcon} tone="base" />
                        <Text as="span" variant="bodySm" fontWeight="bold">Locked</Text>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '20px', flex: 1 }}>
                    <BlockStack gap="400">
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingMd">{template.name} <Badge tone={isUnlocked ? "success" : "info"}>{template.minPlan}</Badge></Text>
                        <Text as="p" tone="subdued">{template.description}</Text>
                      </BlockStack>
                      <InlineGrid columns={2} gap="200">
                        <Button onClick={() => setPreviewTemplate(template)}>Live Preview</Button>
                        {isUnlocked ? (
                          <Button variant="primary">Apply</Button>
                        ) : (
                          <Button variant="primary" tone="success" onClick={() => navigate("/app/billing")}>Upgrade</Button>
                        )}
                      </InlineGrid>
                    </BlockStack>
                  </div>
                </div>
              </Card>
            );
          })}
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
                background: previewTemplate.id === 'dark' ? '#0f172a' : (previewTemplate.id === 'minimal' ? '#fff' : '#f8fafc'),
                color: previewTemplate.id === 'dark' ? '#f8fafc' : '#0f172a',
                padding: '30px',
                borderRadius: '12px',
                fontFamily: previewTemplate.id === 'premium' ? 'Georgia, serif' : 'Inter, sans-serif',
                border: previewTemplate.id === 'minimal' ? 'none' : '1px solid #e2e8f0',
                boxShadow: previewTemplate.id === 'modern' ? '0 10px 25px rgba(0,0,0,0.05)' : 'none'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: previewTemplate.id === 'minimal' ? '0' : '10px',
                  textAlign: 'center',
                  borderTop: previewTemplate.id === 'minimal' ? '2px solid #000' : 'none',
                  borderBottom: previewTemplate.id === 'minimal' ? '2px solid #000' : 'none',
                  border: previewTemplate.id === 'enterprise' ? '1px solid #cbd5e1' : undefined
                }}>
                  {/* Header Row */}
                  <div style={{ padding: '15px', fontWeight: 'bold', borderBottom: previewTemplate.id !== 'minimal' ? '2px solid ' + (previewTemplate.id === 'dark' ? '#334155' : '#e2e8f0') : 'none' }}>Features</div>
                  <div style={{ padding: '15px', fontWeight: 'bold', borderBottom: previewTemplate.id !== 'minimal' ? '2px solid ' + (previewTemplate.id === 'dark' ? '#334155' : '#e2e8f0') : 'none' }}>Basic Model</div>
                  <div style={{ padding: '15px', fontWeight: 'bold', borderBottom: previewTemplate.id !== 'minimal' ? '2px solid ' + (previewTemplate.id === 'dark' ? '#334155' : '#e2e8f0') : 'none', background: previewTemplate.id === 'dark' ? 'linear-gradient(180deg, rgba(56,189,248,0.1) 0%, transparent 100%)' : 'rgba(56,189,248,0.05)', color: previewTemplate.id === 'dark' ? '#38bdf8' : '#0ea5e9' }}>Pro Model <Badge tone="info">Best</Badge></div>
                  <div style={{ padding: '15px', fontWeight: 'bold', borderBottom: previewTemplate.id !== 'minimal' ? '2px solid ' + (previewTemplate.id === 'dark' ? '#334155' : '#e2e8f0') : 'none' }}>Elite Model</div>

                  {/* Data Rows */}
                  {[
                    ['Price', '$19.99', '$29.99', '$49.99'],
                    ['Rating', '★ 4.5/5', '★ 4.8/5', '★ 5.0/5'],
                    ['Material', 'Cotton', 'Polyester', 'Silk'],
                  ].map((row, i) => (
                    <React.Fragment key={i}>
                      <div style={{ padding: '15px', borderBottom: previewTemplate.id === 'enterprise' ? '1px solid #cbd5e1' : '1px solid ' + (previewTemplate.id === 'dark' ? '#1e293b' : '#f1f5f9'), textAlign: 'left', fontWeight: 'bold' }}>{row[0]}</div>
                      <div style={{ padding: '15px', borderBottom: previewTemplate.id === 'enterprise' ? '1px solid #cbd5e1' : '1px solid ' + (previewTemplate.id === 'dark' ? '#1e293b' : '#f1f5f9') }}>{row[1]}</div>
                      <div style={{ padding: '15px', borderBottom: previewTemplate.id === 'enterprise' ? '1px solid #cbd5e1' : '1px solid ' + (previewTemplate.id === 'dark' ? '#1e293b' : '#f1f5f9'), background: previewTemplate.id === 'dark' ? 'rgba(56,189,248,0.05)' : 'rgba(56,189,248,0.02)', fontWeight: 'bold' }}>{row[2]}</div>
                      <div style={{ padding: '15px', borderBottom: previewTemplate.id === 'enterprise' ? '1px solid #cbd5e1' : '1px solid ' + (previewTemplate.id === 'dark' ? '#1e293b' : '#f1f5f9') }}>{row[3]}</div>
                    </React.Fragment>
                  ))}
                  
                  {/* Footer Row */}
                  <div style={{ padding: '15px' }}></div>
                  <div style={{ padding: '15px' }}><Button variant="primary">Add to Cart</Button></div>
                  <div style={{ padding: '15px', background: previewTemplate.id === 'dark' ? 'rgba(56,189,248,0.05)' : 'rgba(56,189,248,0.02)' }}><Button variant="primary">Add to Cart</Button></div>
                  <div style={{ padding: '15px' }}><Button variant="primary">Add to Cart</Button></div>
                </div>
              </div>

            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
