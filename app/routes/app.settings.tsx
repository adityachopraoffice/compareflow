import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, Layout, Card, Text, BlockStack, FormLayout, TextField } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Settings() {
  return (
    <Page title="Settings">
      <Layout>
        <Layout.AnnotatedSection
          title="General"
          description="Manage your default preferences for CompareFlow."
        >
          <Card>
            <FormLayout>
              <TextField label="Display Name" autoComplete="off" />
            </FormLayout>
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </Page>
  );
}
