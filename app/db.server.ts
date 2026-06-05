import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  // Enforce a strict connection limit in serverless environments (Vercel) to prevent connection pool exhaustion
  let url = process.env.DATABASE_URL || "";
  if (url && !url.includes("connection_limit")) {
    url = url.includes("?") ? `${url}&connection_limit=1` : `${url}?connection_limit=1`;
  }
  
  prisma = new PrismaClient({
    datasources: { db: { url } },
  });
} else {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
  prisma = global.prismaGlobal;
}

export default prisma;
