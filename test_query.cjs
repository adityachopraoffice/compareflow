const { PrismaClient } = require('@prisma/client');
async function main() {
  const prisma = new PrismaClient();
  const session = await prisma.session.findFirst({where: {shop: 'aditya-store-w9qlxcyh.myshopify.com'}});
  if(!session) return console.log('no session');
  
  const q = '(handle:"Example Perfume") OR (title:"Example Perfume")';
  const query = `query { products(first: 10, query: "${q.replace(/"/g, '\\"')}") { nodes { id title handle } } }`;
  console.log(query);
  
  const res = await fetch('https://' + session.shop + '/admin/api/2024-04/graphql.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': session.accessToken
    },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
main();
