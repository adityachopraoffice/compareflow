import { useState, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useSubmit, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  DropZone,
  Banner,
  List,
  InlineStack,
  DataTable,
  Icon
} from "@shopify/polaris";
import { NoteIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  let templateHandles = ["example-product-1", "example-product-2"];
  try {
    const response = await admin.graphql(`query { products(first: 3) { nodes { handle } } }`);
    const responseJson = await response.json();
    const handles = responseJson.data?.products?.nodes?.map((n: any) => n.handle);
    if (handles && handles.length > 0) {
      templateHandles = handles;
    }
  } catch (error) {
    console.error("Failed to fetch template handles", error);
  }
  return json({ templateHandles });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopRecord = await db.shop.findUnique({ where: { domain: session.shop } });
  
  if (!shopRecord) {
    return json({ error: "Shop not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const handlesRaw = formData.get("handles");
  
  if (!handlesRaw || typeof handlesRaw !== "string") {
    return json({ error: "No product handles provided." }, { status: 400 });
  }

  const handles = JSON.parse(handlesRaw);
  if (!Array.isArray(handles) || handles.length === 0) {
    return json({ error: "No valid product handles found." }, { status: 400 });
  }

  // Construct GraphQL query to search by BOTH handle AND title
  // We must carefully strip double quotes from the user's input so it doesn't break the GraphQL string literal syntax.
  const queryStr = handles.map((h: string) => {
    const safeString = h.replace(/["\\]/g, '').trim();
    return `(handle:"${safeString}") OR (title:"${safeString}")`;
  }).join(' OR ');

  try {
    const response = await admin.graphql(
      `query getProductsByHandle($query: String!) {
        products(first: 100, query: $query) {
          nodes {
            id
            title
            handle
            featuredImage { url }
            vendor
            productType
            description(truncateAt: 120)
            variants(first: 1) { nodes { id } }
            priceRangeV2 { minVariantPrice { amount currencyCode } }
          }
        }
      }`,
      { variables: { query: queryStr } }
    );

    const responseJson = await response.json();
    const fetchedProducts = responseJson.data?.products?.nodes || [];

    if (fetchedProducts.length === 0) {
      return json({ error: "None of the handles matched any products in your Shopify store." }, { status: 400 });
    }

    // Create a new comparison table
    const newTable = await db.comparisonTable.create({
      data: {
        shopId: shopRecord.id,
        name: `Imported CSV - ${new Date().toLocaleDateString()}`,
        status: "draft",
        template: "modern"
      }
    });

    for (let i = 0; i < fetchedProducts.length; i++) {
      const p = fetchedProducts[i];
      await db.comparisonProduct.create({
        data: {
          tableId: newTable.id,
          shopifyProductId: p.id,
          position: i
        }
      });
    }

    // Save default attributes
    const defaultAttributes = ['price', 'vendor', 'type'];
    for (let i = 0; i < defaultAttributes.length; i++) {
      await db.comparisonAttribute.create({
        data: {
          tableId: newTable.id,
          key: defaultAttributes[i],
          label: defaultAttributes[i].charAt(0).toUpperCase() + defaultAttributes[i].slice(1),
          enabled: true,
          position: i,
          isCustom: false,
        }
      });
    }

    return redirect(`/app/tables/${newTable.id}`);
  } catch (error) {
    console.error("Import error:", error);
    return json({ error: "An error occurred while importing products." }, { status: 500 });
  }
};

export default function ImportProducts() {
  const { templateHandles } = useLoaderData<typeof loader>();
  const [file, setFile] = useState<File | null>(null);
  const [parsedHandles, setParsedHandles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isImporting = navigation.state === "submitting";

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;
      
      setFile(selectedFile);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          // Simple CSV parse: split by newline, get first col
          const lines = text.split(/\r?\n/);
          const handles: string[] = [];
          
          let handleColIndex = 0; // default to 0
          let headerFound = false;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Split line by comma or semicolon
            const cols = line.split(/[,;]/);
            
            // Detect header row
            if (!headerFound && i === 0) {
              const headers = cols.map(h => h.replace(/['"]/g, '').trim().toLowerCase());
              // Find which column contains "handle" (e.g. "URL handle", "Product Handle", "Handle")
              const foundIndex = headers.findIndex(h => h.includes('handle'));
              if (foundIndex !== -1) {
                handleColIndex = foundIndex;
                headerFound = true;
                continue; // Skip the header row
              } else if (headers.some(h => h.includes('title') || h.includes('product'))) {
                // It's a header but no handle column found. We'll just skip it and hope first column is good.
                headerFound = true;
                continue;
              }
            }
            
            // Extract the target column
            let targetCol = cols[handleColIndex]?.replace(/['"]/g, '').trim();
            if (!targetCol) continue;
            
            // Deduplicate handles
            if (!handles.includes(targetCol)) {
              handles.push(targetCol);
            }
          }
          
          if (handles.length > 100) {
            setError("You can only import up to 100 unique products at a time.");
            setParsedHandles([]);
          } else if (handles.length === 0) {
            setError("No valid handles found in the CSV.");
            setParsedHandles([]);
          } else {
            setParsedHandles(handles);
          }
        }
      };
      reader.readAsText(selectedFile);
    },
    [],
  );

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Product Handle\n" + templateHandles.join("\n") + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "compareflow_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = () => {
    if (parsedHandles.length === 0) return;
    
    const formData = new FormData();
    formData.append("handles", JSON.stringify(parsedHandles));
    
    submit(formData, { method: "post" });
  };

  const fileUpload = !file && (
    <DropZone.FileUpload actionHint="Accepts .csv" />
  );

  const uploadedFile = file && (
    <BlockStack gap="200" align="center" inlineAlign="center">
      <div style={{ textAlign: "center", padding: "20px" }}>
        <Icon source={NoteIcon} tone="base" />
        <Text variant="bodyMd" as="p" fontWeight="bold">
          {file.name}
        </Text>
        <Text variant="bodySm" as="p" tone="subdued">
          {file.size} bytes
        </Text>
      </div>
    </BlockStack>
  );

  return (
    <Page 
      title="Import Products via CSV" 
      backAction={{ content: "Dashboard", url: "/app" }}
      primaryAction={{
        content: "Download Template",
        onAction: downloadTemplate
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {error && (
              <Banner tone="critical" title="Upload Error">
                <p>{error}</p>
              </Banner>
            )}
            
            {actionData?.error && (
              <Banner tone="critical" title="Import Failed">
                <p>{actionData.error}</p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Upload Spreadsheet</Text>
                <Text as="p" tone="subdued">
                  Upload a CSV file containing the <b>Product Handles</b> you wish to compare. 
                  The app will fetch the live data from your store and instantly create a new Comparison Table containing those products.
                </Text>

                <DropZone 
                  accept=".csv, text/csv" 
                  type="file" 
                  onDrop={handleDropZoneDrop}
                  allowMultiple={false}
                >
                  {uploadedFile}
                  {fileUpload}
                </DropZone>
              </BlockStack>
            </Card>

            {parsedHandles.length > 0 && (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Ready to Import ({parsedHandles.length} Products)
                    </Text>
                    <Button 
                      variant="primary" 
                      onClick={handleImport} 
                      loading={isImporting}
                    >
                      Start Import
                    </Button>
                  </InlineStack>
                  
                  <DataTable
                    columnContentTypes={['text']}
                    headings={['Product Handle']}
                    rows={parsedHandles.map(h => [h])}
                  />
                </BlockStack>
              </Card>
            )}
            
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
