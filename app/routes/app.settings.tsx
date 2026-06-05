import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useSubmit, useActionData, useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  PageActions,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await db.shop.findUnique({ where: { domain: session.shop } });
  
  if (!shop) {
    throw new Error("Shop not found");
  }

  return json({
    namePattern: shop.namePattern || "Comparison - {{date}}",
    language: shop.language || "en",
    accentColor: shop.accentColor || "#008060",
    template: shop.defaultTemplate || "modern",
    analyticsEnabled: shop.analyticsEnabled ?? true,
    customCSS: shop.customCSS || "",
    plan: shop.plan || "Free",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  await db.shop.update({
    where: { domain: session.shop },
    data: {
      namePattern: formData.get("namePattern")?.toString() || "Comparison - {{date}}",
      language: formData.get("language")?.toString() || "en",
      accentColor: formData.get("accentColor")?.toString() || "#008060",
      defaultTemplate: formData.get("template")?.toString() || "modern",
      analyticsEnabled: formData.get("analyticsEnabled")?.toString() === "true",
      customCSS: formData.get("customCSS")?.toString() || "",
    }
  });

  return json({ success: true, timestamp: Date.now() });
};

export default function Settings() {
  const initialData = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();

  const [namePattern, setNamePattern] = useState(initialData.namePattern);
  const [language, setLanguage] = useState(initialData.language);
  const [accentColor, setAccentColor] = useState(initialData.accentColor);
  const [template, setTemplate] = useState(initialData.template);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(initialData.analyticsEnabled);
  const [customCSS, setCustomCSS] = useState(initialData.customCSS);

  const isFree = initialData.plan === "Free";
  const isStarter = initialData.plan === "Starter";
  const isPro = initialData.plan === "Pro" || initialData.plan === "Enterprise";

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("namePattern", namePattern);
    formData.append("language", language);
    formData.append("accentColor", accentColor);
    formData.append("template", template);
    formData.append("analyticsEnabled", analyticsEnabled.toString());
    formData.append("customCSS", customCSS);
    submit(formData, { method: "post" });
  }, [namePattern, language, accentColor, template, analyticsEnabled, customCSS, submit]);

  useEffect(() => {
    if (actionData?.success) {
      // @ts-ignore
      shopify.toast.show("Settings saved successfully!");
    }
  }, [actionData]);

  return (
    <Page>
      <ui-title-bar title="Settings">
        <button variant="primary" onClick={handleSave}>Save Settings</button>
      </ui-title-bar>
      
      <BlockStack gap="500">
        <Layout>
          {/* General Preferences */}
          <Layout.AnnotatedSection
            title="General Preferences"
            description="Manage your default naming conventions and localization settings."
          >
            <Card>
              <FormLayout>
                <TextField
                  label="Default Table Name Pattern"
                  value={namePattern}
                  onChange={setNamePattern}
                  autoComplete="off"
                  helpText="Use {{date}} to automatically insert today's date."
                />
                <Select
                  label="Default Language"
                  options={[
                    { label: "English", value: "en" },
                    { label: "Spanish", value: "es" },
                    { label: "French", value: "fr" },
                    { label: "German", value: "de" },
                  ]}
                  value={language}
                  onChange={setLanguage}
                />
              </FormLayout>
            </Card>
          </Layout.AnnotatedSection>

          {/* Design Defaults */}
          <Layout.AnnotatedSection
            title="Design Defaults"
            description="Set the default aesthetic for all newly created comparison tables."
          >
            <Card>
              <FormLayout>
                <TextField
                  label="Primary Accent Color"
                  value={accentColor}
                  onChange={setAccentColor}
                  autoComplete="off"
                  helpText="Enter a valid HEX code (e.g. #008060)."
                />
                <Select
                  label="Default Template"
                  options={[
                    { label: "Modern", value: "modern" },
                    { label: "Minimal (Starter Plan)", value: "minimal", disabled: isFree },
                    { label: "Premium (Starter Plan)", value: "premium", disabled: isFree },
                    { label: "Dark (Pro Plan)", value: "dark", disabled: !isPro },
                    { label: "Enterprise (Pro Plan)", value: "enterprise", disabled: !isPro },
                  ]}
                  value={template}
                  onChange={setTemplate}
                />
              </FormLayout>
            </Card>
          </Layout.AnnotatedSection>

          {/* Advanced Configuration */}
          <Layout.AnnotatedSection
            title="Advanced Configuration"
            description="Manage analytics tracking and inject custom global CSS (Pro users only)."
          >
            <Card>
              <FormLayout>
                <Checkbox
                  label={`Enable Internal Analytics Tracking${isFree ? " (Starter Plan)" : ""}`}
                  helpText="Track clicks and views for your comparison tables."
                  checked={analyticsEnabled}
                  onChange={setAnalyticsEnabled}
                  disabled={isFree}
                />
                <TextField
                  label={`Global Custom CSS${!isPro ? " (Pro Plan)" : ""}`}
                  value={customCSS}
                  onChange={setCustomCSS}
                  multiline={4}
                  autoComplete="off"
                  helpText="Inject CSS to override default table styling. Applies to all tables."
                  disabled={!isPro}
                />
              </FormLayout>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>

        <Layout.Section>
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--p-color-text-subdued)" }}>
            <Text as="p" variant="bodySm">
              Need more information about how we handle your data? <Link to="/app/privacy" style={{ color: "var(--p-color-text-brand)" }}>Read our Privacy Policy</Link>
            </Text>
          </div>
        </Layout.Section>
      </BlockStack>
    </Page>
  );
}
