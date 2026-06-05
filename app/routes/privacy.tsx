import { Page, AppProvider } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { PrivacyPolicyContent } from "../components/PrivacyPolicyContent";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export default function PublicPrivacyPolicy() {
  return (
    <AppProvider i18n={{}}>
      <Page title="Privacy Policy">
        <PrivacyPolicyContent />
      </Page>
    </AppProvider>
  );
}
