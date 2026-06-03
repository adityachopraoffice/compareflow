import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
  Badge,
  Button,
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });

  const tables = await db.comparisonTable.findMany({
    where: { shopId: shopRecord?.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { products: true } } }
  });

  return { tables };
};

export default function TablesIndex() {
  const { tables } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(tables);

  const rowMarkup = tables.map(
    ({ id, name, status, viewCount, clickCount, createdAt, updatedAt, _count }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {name}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{_count.products}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={status === "published" ? "success" : "info"}>
            {status}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>{viewCount}</IndexTable.Cell>
        <IndexTable.Cell>{clickCount}</IndexTable.Cell>
        <IndexTable.Cell>{new Date(createdAt).toLocaleDateString()}</IndexTable.Cell>
        <IndexTable.Cell>{new Date(updatedAt).toLocaleDateString()}</IndexTable.Cell>
        <IndexTable.Cell>
          <Button variant="plain" onClick={() => navigate(`/app/tables/${id}`)}>Edit</Button>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  return (
    <Page
      title="Comparison Tables"
      primaryAction={{
        content: "Create Table",
        icon: PlusIcon,
        onAction: () => navigate("/app/tables/new"),
      }}
    >
      <Card padding="0">
        <IndexTable
          resourceName={{ singular: "table", plural: "tables" }}
          itemCount={tables.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Name" },
            { title: "Products" },
            { title: "Status" },
            { title: "Views" },
            { title: "Clicks" },
            { title: "Created" },
            { title: "Updated" },
            { title: "Actions" },
          ]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}
