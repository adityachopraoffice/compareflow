import { useState, useCallback, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useSubmit, useNavigate, useActionData, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  ProgressBar,
  Button,
  InlineStack,
  Text,
  PageActions,
  EmptyState,
  List,
  Checkbox,
  FormLayout,
  TextField,
  Banner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopRecord = await db.shop.findUnique({ where: { domain: session.shop } });
  return { plan: shopRecord?.plan || "Free" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
  if (!shopRecord) return { error: "Shop not found" };

  try {
    const name = formData.get("name") as string || "New Comparison Table";
    const selectedProducts = JSON.parse(formData.get("products") as string);
    const selectedAttributes = JSON.parse(formData.get("attributes") as string);
    const template = formData.get("template") as string || "modern";

    const table = await db.comparisonTable.create({
      data: {
        shopId: shopRecord.id,
        name,
        template,
        status: "published",
        designConfig: "{}",
        publishOptions: "{}",
      }
    });

    // Save products
    for (let i = 0; i < selectedProducts.length; i++) {
      await db.comparisonProduct.create({
        data: {
          tableId: table.id,
          shopifyProductId: selectedProducts[i].id,
          position: i,
        }
      });
    }

    // Save attributes
    for (let i = 0; i < selectedAttributes.length; i++) {
      await db.comparisonAttribute.create({
        data: {
          tableId: table.id,
          key: selectedAttributes[i],
          label: selectedAttributes[i].charAt(0).toUpperCase() + selectedAttributes[i].slice(1),
          enabled: true,
          position: i,
          isCustom: false,
        }
      });
    }
    
    return { success: true, tableId: table.id };
  } catch (error: any) {
    console.error("Table creation failed:", error);
    return { error: error.message || "Failed to create table" };
  }
};

export default function CreateTableWizard() {
  const { plan } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const actionData = useActionData<typeof action>();
  const [step, setStep] = useState(1);
  const [tableName, setTableName] = useState("New Comparison Table");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [attributes, setAttributes] = useState([
    { key: "price", label: "Price", selected: true },
    { key: "vendor", label: "Vendor", selected: true },
    { key: "type", label: "Product Type", selected: true },
    { key: "description", label: "Description", selected: false },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      navigate(`/app/tables`);
    }
  }, [actionData, navigate]);

  const selectProducts = async () => {
    // @ts-ignore
    const selected = await shopify.resourcePicker({
      type: 'product',
      multiple: true,
      action: 'select',
    });
    if (selected) {
      setSelectedProducts(selected);
    }
  };

  const toggleAttribute = (key: string) => {
    setAttributes(attributes.map(attr => 
      attr.key === key ? { ...attr, selected: !attr.selected } : attr
    ));
  };

  const handleNext = useCallback(() => {
    if (step === 1 && selectedProducts.length === 0) {
      // Must select at least 1 product
      // @ts-ignore
      shopify.toast.show("Please select at least one product");
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  }, [step, selectedProducts]);

  const handleBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  
  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("name", tableName);
    formData.append("products", JSON.stringify(selectedProducts));
    formData.append("attributes", JSON.stringify(attributes.filter(a => a.selected).map(a => a.key)));
    formData.append("template", selectedTemplate);
    submit(formData, { method: "post" });
  }, [submit, tableName, selectedProducts, attributes, selectedTemplate]);

  const progress = (step / 4) * 100;

  return (
    <Page
      title="Create Comparison Table"
      backAction={{ content: "Tables", onAction: () => navigate("/app/tables") }}
    >
      <BlockStack gap="500">
        {actionData && "error" in actionData && actionData.error && (
          <Banner tone="critical" title="Failed to save table">
            {actionData.error}
          </Banner>
        )}
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

        <Card>
          <BlockStack gap="400">
            {step === 1 && (
              <BlockStack gap="400">
                <Text as="p">Choose the products you want to compare side-by-side.</Text>
                {selectedProducts.length === 0 ? (
                  <EmptyState
                    heading="No products selected"
                    action={{content: 'Select products', onAction: selectProducts}}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Select the products you want your customers to compare.</p>
                  </EmptyState>
                ) : (
                  <BlockStack gap="400">
                    <List>
                      {selectedProducts.map((p, i) => (
                        <List.Item key={i}>{p.title}</List.Item>
                      ))}
                    </List>
                    <InlineStack>
                      <Button onClick={selectProducts}>Change Products</Button>
                    </InlineStack>
                  </BlockStack>
                )}
              </BlockStack>
            )}

            {step === 2 && (
              <BlockStack gap="400">
                <Text as="p">Select which attributes you want to show in the comparison table.</Text>
                <FormLayout>
                  {attributes.map((attr) => (
                    <Checkbox
                      key={attr.key}
                      label={attr.label}
                      checked={attr.selected}
                      onChange={() => toggleAttribute(attr.key)}
                    />
                  ))}
                </FormLayout>
              </BlockStack>
            )}

            {step === 3 && (
              <BlockStack gap="400">
                <Text as="p">Choose a template for your comparison table.</Text>
                <InlineStack gap="400">
                  {[
                    { id: 'modern', name: 'Modern', plan: 'Free' },
                    { id: 'minimal', name: 'Minimal', plan: 'Starter' },
                    { id: 'dark', name: 'Dark', plan: 'Starter' },
                    { id: 'premium', name: 'Premium', plan: 'Starter' },
                    { id: 'enterprise', name: 'Enterprise', plan: 'Pro' }
                  ].filter(t => {
                    const userPlan = (plan as string) || "Free";
                    if (userPlan.includes("Pro")) return true;
                    if (userPlan.includes("Starter")) return t.plan !== 'Pro';
                    return t.plan === 'Free';
                  }).map(tpl => (
                    <Card key={tpl.id} background={selectedTemplate === tpl.id ? "bg-surface-active" : "bg-surface"}>
                      <BlockStack gap="300" align="center">
                        <Text as="h3" variant="headingSm">{tpl.name}</Text>
                        <Button 
                          variant={selectedTemplate === tpl.id ? "primary" : "secondary"}
                          onClick={() => setSelectedTemplate(tpl.id)}
                        >
                          {selectedTemplate === tpl.id ? "Selected" : "Select"}
                        </Button>
                      </BlockStack>
                    </Card>
                  ))}
                </InlineStack>
              </BlockStack>
            )}

            {step === 4 && (
              <BlockStack gap="400">
                <Text as="p">Give your table a name so you can identify it later.</Text>
                <FormLayout>
                  <TextField 
                    label="Table Name" 
                    value={tableName} 
                    onChange={setTableName} 
                    autoComplete="off" 
                  />
                </FormLayout>
                <Banner tone="info">
                  Once saved, you can add this table to your storefront using the Theme Editor!
                </Banner>
              </BlockStack>
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
