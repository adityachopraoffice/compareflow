import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Layout, Card, Text, BlockStack, InlineGrid, IndexTable, Badge } from "@shopify/polaris";
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const { shop } = session;
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
  
  if (!shopRecord) throw new Response("Shop not found", { status: 404 });

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

  // Date Logic for Last 7 Days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const events = await db.analyticsEvent.findMany({
    where: { shopId: shopRecord.id, createdAt: { gte: sevenDaysAgo } },
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = Array.from({length: 7}).map((_, i) => {
     const d = new Date();
     d.setDate(d.getDate() - (6 - i));
     return {
       dateString: d.toLocaleDateString(),
       name: days[d.getDay()],
       views: 0,
       clicks: 0
     };
  });

  let totalViews = 0;
  let totalClicks = 0;

  events.forEach(e => {
     const d = new Date(e.createdAt);
     const name = days[d.getDay()];
     // Find exactly the day that matches (this could bug if same day name next week, but fine for 7 days span)
     const dayObj = chartData.find(c => c.name === name);
     if (dayObj) {
        if (e.eventType === 'view') {
           dayObj.views++;
           totalViews++;
        }
        if (e.eventType === 'click' || e.eventType === 'link_click') {
           dayObj.clicks++;
           totalClicks++;
        }
     }
  });

  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) + '%' : '0.0%';

  const topTables = await db.comparisonTable.findMany({
    where: { shopId: shopRecord.id },
    orderBy: { clickCount: 'desc' },
    take: 5
  });

  return { plan, chartData, totalViews, totalClicks, ctr, topTables };
};

export default function Analytics() {
  const { plan, chartData, totalViews, totalClicks, ctr, topTables } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page title="Analytics Overview">
      <BlockStack gap="500">
        
        {/* Top Metric Cards */}
        <InlineGrid columns={3} gap="400">
          <div className="premium-card bg-gradient-1" style={{ padding: '24px' }}>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">Total Views</Text>
              <Text as="p" variant="heading3xl">{totalViews}</Text>
              <Text as="p" tone="subdued">Last 7 days</Text>
            </BlockStack>
          </div>
          <div className="premium-card bg-gradient-2" style={{ padding: '24px' }}>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">Total Clicks</Text>
              <Text as="p" variant="heading3xl">{totalClicks}</Text>
              <Text as="p" tone="subdued">Last 7 days</Text>
            </BlockStack>
          </div>
          <div className="premium-card bg-pro" style={{ padding: '24px' }}>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">Avg CTR</Text>
              <Text as="p" variant="heading3xl">{ctr}</Text>
              <Text as="p" tone="subdued">Last 7 days</Text>
            </BlockStack>
          </div>
        </InlineGrid>

        {/* Charts */}
        <Layout>
          <Layout.Section variant="oneHalf">
            <div className="premium-card" style={{ padding: '24px', background: '#fff' }}>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Views Trend</Text>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </BlockStack>
            </div>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <div className="premium-card" style={{ padding: '24px', background: '#fff' }}>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Clicks Breakdown</Text>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <Bar dataKey="clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>

        {/* Top Tables */}
        <Layout>
          <Layout.Section>
            <div className="premium-card" style={{ padding: '24px', background: '#fff', overflow: 'hidden' }}>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Top Performing Tables</Text>
                {topTables.length === 0 ? (
                  <Text as="p" tone="subdued">No active tables found. Create one to see performance!</Text>
                ) : (
                  <IndexTable
                    resourceName={{ singular: 'table', plural: 'tables' }}
                    itemCount={topTables.length}
                    headings={[
                      { title: 'Table Name' },
                      { title: 'Status' },
                      { title: 'Template' },
                      { title: 'Total Views' },
                      { title: 'Total Clicks' },
                    ]}
                    selectable={false}
                  >
                    {topTables.map((table, index) => (
                      <IndexTable.Row id={table.id} key={table.id} position={index}>
                        <IndexTable.Cell>
                          <Text variant="bodyMd" fontWeight="bold" as="span">
                            {table.name}
                          </Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Badge tone={table.status === 'published' ? 'success' : 'info'}>{table.status}</Badge>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text as="span" tone="subdued">{table.template}</Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>{table.viewCount}</IndexTable.Cell>
                        <IndexTable.Cell>{table.clickCount}</IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                )}
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>

      </BlockStack>
    </Page>
  );
}
