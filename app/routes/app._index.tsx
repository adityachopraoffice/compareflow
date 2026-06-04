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
  Banner,
} from "@shopify/polaris";
import { PlusIcon, ImportIcon, ChartVerticalIcon, ColorIcon } from "@shopify/polaris-icons";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const { shop } = session;
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });

  const billingCheck = await billing.check({
    // @ts-ignore
    plans: [STARTER_PLAN, PRO_PLAN],
    isTest: true,
  });

  const hasPro = billingCheck.appSubscriptions.some(sub => sub.name === PRO_PLAN);
  const hasStarter = billingCheck.appSubscriptions.some(sub => sub.name === STARTER_PLAN);
  let plan = "Free";
  if (hasPro) plan = "Pro";
  else if (hasStarter) plan = "Starter";

  // Sync to db
  if (shopRecord) {
    await db.shop.update({ where: { domain: shop }, data: { plan: plan === "Free" ? "Free" : `${plan} Plan` }});
  }

  const totalTables = await db.comparisonTable.count({ where: { shopId: shopRecord?.id } });
  const publishedTables = await db.comparisonTable.count({ where: { shopId: shopRecord?.id, status: "published" } });
  const productsCompared = await db.comparisonProduct.count({ where: { table: { shopId: shopRecord?.id } } });
  
  const totalClicksAgg = await db.comparisonTable.aggregate({
    where: { shopId: shopRecord?.id },
    _sum: { clickCount: true }
  });
  const clicks = totalClicksAgg._sum.clickCount || 0;

  const events = await db.analyticsEvent.findMany({
    where: { shopId: shopRecord?.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { table: true }
  });

  // Fetch data for charts
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEvents = await db.analyticsEvent.findMany({
    where: { 
      shopId: shopRecord?.id,
      createdAt: { gte: thirtyDaysAgo }
    },
    select: { eventType: true, createdAt: true }
  });

  const dailyStats: Record<string, { views: number, clicks: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyStats[dateStr] = { views: 0, clicks: 0 };
  }

  recentEvents.forEach(e => {
    const d = new Date(e.createdAt);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    if (dailyStats[dateStr]) {
      if (e.eventType === 'view') dailyStats[dateStr].views++;
      if (e.eventType === 'click') dailyStats[dateStr].clicks++;
    }
  });

  const viewsChart = Object.keys(dailyStats).map(date => ({ date, v: dailyStats[date].views }));
  const ctrChart = Object.keys(dailyStats).map(date => {
    const v = dailyStats[date].views;
    const c = dailyStats[date].clicks;
    return { date, v: v > 0 ? Number(((c / v) * 100).toFixed(1)) : 0 };
  });

  const topTablesData = await db.comparisonTable.findMany({
    where: { shopId: shopRecord?.id },
    orderBy: { viewCount: 'desc' },
    take: 4,
    select: { name: true, viewCount: true }
  });
  const topTablesChart = topTablesData.map(t => ({ n: (t.name.length > 10 ? t.name.substring(0, 10) + '...' : t.name), v: t.viewCount }));

  return { totalTables, publishedTables, productsCompared, clicks, events, plan, viewsChart, ctrChart, topTablesChart };
};

export default function Dashboard() {
  const { totalTables, publishedTables, productsCompared, clicks, events, plan, viewsChart, ctrChart, topTablesChart } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page title="CompareFlow Dashboard">
      <BlockStack gap="500">
        
        <Layout>
          <Layout.Section>
            <Banner
              title={`Current Plan: ${plan}`}
              tone={plan === "Pro" ? "success" : "info"}
            >
              {plan === "Free" && <Text as="p">Upgrade to Starter or Pro to unlock premium templates and advanced analytics.</Text>}
              {plan === "Starter" && <Text as="p">You have access to premium templates. Upgrade to Pro for Custom CSS!</Text>}
              {plan === "Pro" && <Text as="p">You are on the highest tier! Enjoy all features.</Text>}
            </Banner>
          </Layout.Section>
        </Layout>

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
                    <LineChart data={viewsChart} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
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
                    <BarChart data={topTablesChart} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                      <Bar dataKey="v" fill="#82ca9d" />
                      <XAxis dataKey="n" hide />
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
                <Text as="h3" variant="headingMd">CTR Trend (%)</Text>
                <Box minHeight="150px">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ctrChart} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
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
