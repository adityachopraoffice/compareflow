import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  List,
} from "@shopify/polaris";

export default function PrivacyPolicy() {
  return (
    <Page title="Privacy Policy" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Introduction</Text>
                <Text as="p">
                  Welcome to CompareFlow. We are committed to protecting your personal information and your right to privacy. 
                  If you have any questions or concerns about this privacy notice or our practices with regard to your personal information, please contact us.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Information We Collect</Text>
                <Text as="p">
                  When you install and use the CompareFlow app, we automatically access certain types of information from your Shopify account:
                </Text>
                <List>
                  <List.Item><b>Store Information:</b> We collect basic information about your store, such as your store URL, email address, and installed plan.</List.Item>
                  <List.Item><b>Product Data:</b> We access your product details (titles, handles, images, prices, variants, and descriptions) solely for the purpose of generating your comparison tables.</List.Item>
                  <List.Item><b>Analytics:</b> We may collect anonymous usage data (like view counts and click counts on your comparison tables) to help you understand how your customers interact with your store.</List.Item>
                </List>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">How We Use Your Information</Text>
                <Text as="p">We use the information we collect or receive to:</Text>
                <List>
                  <List.Item>Generate and display accurate product comparison tables on your storefront.</List.Item>
                  <List.Item>Ensure the app functions correctly within your Shopify environment.</List.Item>
                  <List.Item>Respond to customer service requests and provide support.</List.Item>
                </List>
                <Text as="p">
                  We <b>do not</b> sell, rent, or share your personal or store information with any third parties for marketing purposes.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Data Retention</Text>
                <Text as="p">
                  We will only keep your information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law. 
                  When you uninstall the app, you may request the deletion of your data from our servers.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Contact Us</Text>
                <Text as="p">
                  If you have questions or comments about this notice, you may email us at support@compareflow.com.
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
