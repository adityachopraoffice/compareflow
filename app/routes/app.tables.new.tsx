import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  ProgressBar,
  Button,
  InlineStack,
  Text,
  PageActions,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.admin(request);
  const formData = await request.formData();
  
  // Basic saving logic
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
  if (!shopRecord) return null;

  const table = await db.comparisonTable.create({
    data: {
      shopId: shopRecord.id,
      name: "New Comparison Table",
      status: "published",
    }
  });
  
  return { success: true, tableId: table.id };
};

export default function CreateTableWizard() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const handleNext = useCallback(() => setStep((s) => Math.min(s + 1, 4)), []);
  const handleBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  
  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("action", "save");
    submit(formData, { method: "post" });
  }, [submit]);

  const progress = (step / 4) * 100;

  return (
    <Page
      title="Create Comparison Table"
      backAction={{ content: "Tables", onAction: () => navigate("/app/tables") }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Step {step} of 4</Text>
              <Text as="span" tone="subdued">
                {step === 1 && "Select Products"}
                {step === 2 && "Select Attributes"}
                {step === 3 && "Customize Design"}
                {step === 4 && "Publish"}
              </Text>
            </InlineStack>
            <ProgressBar progress={progress} size="small" tone="primary" />
          </BlockStack>
        </Card>

        {/* Wizard Steps Content Placeholder */}
        <Card>
          <BlockStack gap="400">
            {step === 1 && (
              <Text as="p">Product selection interface goes here. (GraphQL list, multi-select 2-10)</Text>
            )}
            {step === 2 && (
              <Text as="p">Attribute selection interface goes here. (Drag and drop reordering, toggles)</Text>
            )}
            {step === 3 && (
              <Text as="p">Design customization interface goes here. (Template picker, live preview)</Text>
            )}
            {step === 4 && (
              <Text as="p">Publishing options go here. (Block toggles, code snippets)</Text>
            )}
          </BlockStack>
        </Card>

        <PageActions
          primaryAction={{
            content: step === 4 ? "Save & Publish" : "Next",
            onAction: step === 4 ? handleSave : handleNext,
          }}
          secondaryActions={[
            {
              content: "Back",
              onAction: handleBack,
              disabled: step === 1,
            },
          ]}
        />
      </BlockStack>
    </Page>
  );
}
