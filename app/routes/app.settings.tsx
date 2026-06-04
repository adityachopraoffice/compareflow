import { useState, useCallback, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useSubmit, useActionData } from "@remix-run/react";
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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  
  // Here we would normally save to db.shop.update(...)
  // Mocking success for now
  return { success: true, timestamp: Date.now() };
};

export default function Settings() {
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();

  const [namePattern, setNamePattern] = useState("Comparison - {{date}}");
  const [language, setLanguage] = useState("en");
  const [accentColor, setAccentColor] = useState("#008060");
  const [template, setTemplate] = useState("modern");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [customCSS, setCustomCSS] = useState("");

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
    <Page title="Settings">
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
                    { label: "Minimal", value: "minimal" },
                    { label: "Premium (Starter Plan)", value: "premium" },
                    { label: "Dark (Pro Plan)", value: "dark" },
                    { label: "Enterprise (Pro Plan)", value: "enterprise" },
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
                  label="Enable Internal Analytics Tracking"
                  helpText="Track clicks and views for your comparison tables."
                  checked={analyticsEnabled}
                  onChange={setAnalyticsEnabled}
                />
                <TextField
                  label="Global Custom CSS"
                  value={customCSS}
                  onChange={setCustomCSS}
                  multiline={4}
                  autoComplete="off"
                  helpText="Inject CSS to override default table styling. Applies to all tables."
                />
              </FormLayout>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>

        <PageActions
          primaryAction={{
            content: "Save Settings",
            onAction: handleSave,
          }}
        />
      </BlockStack>
    </Page>
  );
}
