import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { unauthenticated } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const tableId = url.searchParams.get("tableId");
  const shop = url.searchParams.get("shop"); // Provided automatically by App Proxy

  if (!tableId) {
    return json({ error: "Missing tableId" }, { 
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const table: any = await db.comparisonTable.findUnique({
      where: { id: tableId },
      include: {
        products: { orderBy: { position: 'asc' } },
        attributes: { orderBy: { position: 'asc' }, where: { enabled: true } },
      }
    });

    if (!table) {
      return json({ error: "Table not found" }, { 
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    // Fetch real product details if we have a shop parameter
    let shopifyProductsData: any[] = [];
    if (shop && table.products.length > 0) {
      try {
        const { admin } = await unauthenticated.admin(shop);
        const productIds = table.products.map((p: any) => 
          p.shopifyProductId.includes("gid://") ? p.shopifyProductId : `gid://shopify/Product/${p.shopifyProductId}`
        );

        const response = await admin.graphql(
          `query getProducts($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                title
                handle
                vendor
                productType
                description(truncateAt: 120)
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                featuredImage { url }
              }
            }
          }`,
          { variables: { ids: productIds } }
        );
        const data = await response.json();
        if (data.data?.nodes) {
          shopifyProductsData = data.data.nodes;
        }
      } catch (e) {
        console.error("Failed to fetch product data in App Proxy", e);
      }
    }

    // Enrich the products with the fetched data
    table.products = table.products.map((p: any) => {
      const shopifyId = p.shopifyProductId.includes("gid://") ? p.shopifyProductId : `gid://shopify/Product/${p.shopifyProductId}`;
      const pData = shopifyProductsData.find((n: any) => n && n.id === shopifyId);
      
      let formattedPrice = "-";
      if (pData?.priceRangeV2) {
        try {
          formattedPrice = new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: pData.priceRangeV2.minVariantPrice.currencyCode 
          }).format(parseFloat(pData.priceRangeV2.minVariantPrice.amount));
        } catch(e) {}
      }

      return {
        ...p,
        title: pData?.title || "Unknown Product",
        handle: pData?.handle || "",
        vendor: pData?.vendor || "-",
        productType: pData?.productType || "-",
        description: pData?.description || "-",
        price: formattedPrice,
        imageUrl: pData?.featuredImage?.url || ""
      };
    });

    return json({ table }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60" // Cache for 60s
      }
    });
  } catch (error) {
    console.error(error);
    return json({ error: "Internal server error" }, { 
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};
