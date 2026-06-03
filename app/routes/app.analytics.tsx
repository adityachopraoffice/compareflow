import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, BlockStack, Box, InlineGrid } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
  
  if (!shopRecord) return { plan: "Free", data: [] };

  // Generate some dummy data for now to show the charts
  const data = [
    { name: 'Mon', views: 400, clicks: 240 },
    { name: 'Tue', views: 300, clicks: 139 },
    { name: 'Wed', views: 200, clicks: 980 },
    { name: 'Thu', views: 278, clicks: 390 },
    { name: 'Fri', views: 189, clicks: 480 },
    { name: 'Sat', views: 239, clicks: 380 },
    { name: 'Sun', views: 349, clicks: 430 },
  ];

  return { plan: shopRecord.plan, data };
};

export default function Analytics() {
  const { plan, data } = useLoaderData<typeof loader>();

  return (
    <Page title="Analytics">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <InlineGrid columns={2} gap="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Views (Last 7 Days)</Text>
                  <Box minHeight="300px">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
                        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Clicks (Last 7 Days)</Text>
                  <Box minHeight="300px">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <Bar dataKey="clicks" fill="#82ca9d" />
                        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </BlockStack>
              </Card>
            </InlineGrid>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
