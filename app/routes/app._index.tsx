import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Button,
  Icon,
  List,
  Box,
} from "@shopify/polaris";
import { PlusIcon, ImportIcon, ChartVerticalIcon, ColorIcon } from "@shopify/polaris-icons";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });

  const totalTables = await db.comparisonTable.count({ where: { shopId: shopRecord?.id } });
  const publishedTables = await db.comparisonTable.count({ where: { shopId: shopRecord?.id, status: "published" } });
  const productsCompared = await db.comparisonProduct.count({ where: { table: { shopId: shopRecord?.id } } });
  
  const events = await db.analyticsEvent.findMany({
    where: { shopId: shopRecord?.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { table: true }
  });

  return { totalTables, publishedTables, productsCompared, clicks: 0, events };
};

export default function Dashboard() {
  const { totalTables, publishedTables, productsCompared, clicks, events } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page title="CompareFlow Dashboard">
      <BlockStack gap="500">
        
        {/* Row 1: Metric Cards */}
        <InlineGrid columns={4} gap="400">
          <div className="premium-card bg-gradient-1" style={{ padding: '20px' }}>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Total Tables</Text>
              <Text as="p" variant="headingXl">{totalTables}</Text>
            </BlockStack>
          </div>
          <div className="premium-card bg-gradient-2" style={{ padding: '20px' }}>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Published Tables</Text>
              <Text as="p" variant="headingXl">{publishedTables}</Text>
            </BlockStack>
          </div>
          <div className="premium-card bg-gradient-3" style={{ padding: '20px' }}>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Products Compared</Text>
              <Text as="p" variant="headingXl">{productsCompared}</Text>
            </BlockStack>
          </div>
          <div className="premium-card bg-pro" style={{ padding: '20px' }}>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Compare Clicks (30d)</Text>
              <Text as="p" variant="headingXl">{clicks}</Text>
            </BlockStack>
          </div>
        </InlineGrid>

        {/* Row 2: Quick Actions */}
        <Layout>
          <Layout.Section>
            <div className="premium-card" style={{ padding: '24px', background: '#fff' }}>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Quick Actions</Text>
                <InlineGrid columns={4} gap="400">
                  <div className="bento-tile" onClick={() => navigate("/app/tables/new")}>
                    <Icon source={PlusIcon} tone="success" />
                    <Text as="span" fontWeight="semibold">Create New Table</Text>
                  </div>
                  <div className="bento-tile">
                    <Icon source={ImportIcon} tone="success" />
                    <Text as="span" fontWeight="semibold">Import Products</Text>
                  </div>
                  <div className="bento-tile" onClick={() => navigate("/app/analytics")}>
                    <Icon source={ChartVerticalIcon} tone="success" />
                    <Text as="span" fontWeight="semibold">View Analytics</Text>
                  </div>
                  <div className="bento-tile" onClick={() => navigate("/app/templates")}>
                    <Icon source={ColorIcon} tone="success" />
                    <Text as="span" fontWeight="semibold">Manage Templates</Text>
                  </div>
                </InlineGrid>
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>

        {/* Row 3: Charts */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">Views (30d)</Text>
                <Box minHeight="150px">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{v: 10},{v: 20},{v: 15},{v: 30},{v: 25}]} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                      <Line type="monotone" dataKey="v" stroke="#8884d8" strokeWidth={2} dot={false} />
                      <Tooltip />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">Top Tables</Text>
                <Box minHeight="150px">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{n: 'T1', v: 40},{n: 'T2', v: 30},{n: 'T3', v: 20}]} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                      <Bar dataKey="v" fill="#82ca9d" />
                      <Tooltip />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">CTR Trend</Text>
                <Box minHeight="150px">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{v: 2},{v: 5},{v: 4},{v: 8},{v: 7}]} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                      <Line type="monotone" dataKey="v" stroke="#ffc658" strokeWidth={2} dot={false} />
                      <Tooltip />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Row 4: Recent Activity */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Recent Activity</Text>
                {events.length === 0 ? (
                  <Text as="p" tone="subdued">No recent activity found.</Text>
                ) : (
                  <List>
                    {events.map((event) => (
                      <List.Item key={event.id}>
                        <Text as="span" fontWeight="semibold">{event.eventType}</Text> on {event.table?.name || "a table"} - {new Date(event.createdAt).toLocaleDateString()}
                      </List.Item>
                    ))}
                  </List>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

      </BlockStack>
    </Page>
  );
}
