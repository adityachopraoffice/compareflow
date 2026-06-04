import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  
  if (formData.get("intent") === "delete") {
    const tableId = formData.get("tableId") as string;
    const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
    if (shopRecord) {
      await db.comparisonTable.delete({
        where: { id: tableId, shopId: shopRecord.id }
      });
    }
  }
  return null;
};

export default function TablesIndex() {
  const { tables } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(tables);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this table?")) {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("tableId", id);
      submit(formData, { method: "post" });
    }
  };

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
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="plain" onClick={() => navigate(`/app/tables/${id}`)}>Edit</Button>
            <Button variant="plain" tone="critical" onClick={() => handleDelete(id)}>Delete</Button>
          </div>
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
