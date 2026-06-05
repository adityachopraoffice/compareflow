import { Page } from "@shopify/polaris";
import { PrivacyPolicyContent } from "../components/PrivacyPolicyContent";

export default function EmbeddedPrivacyPolicy() {
  return (
    <Page title="Privacy Policy" backAction={{ content: "Settings", url: "/app/settings" }}>
      <PrivacyPolicyContent />
    </Page>
  );
}
