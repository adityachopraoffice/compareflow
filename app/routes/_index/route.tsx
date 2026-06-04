import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.heading}>Create Stunning Product Comparisons in Seconds</h1>
          <p className={styles.text}>
            CompareFlow helps Shopify merchants build beautiful, high-converting product comparison tables without writing a single line of code. Increase your average order value by helping customers make confident decisions.
          </p>
        </div>

        {showForm && (
          <div className={styles.formContainer}>
            <Form className={styles.form} method="post" action="/auth/login">
              <label className={styles.label}>
                <span>Install CompareFlow on your store</span>
                <input 
                  className={styles.input} 
                  type="text" 
                  name="shop" 
                  placeholder="e.g. my-shop-domain.myshopify.com" 
                />
                <span className={styles.hint}>Enter your myshopify.com domain to get started</span>
              </label>
              <button className={styles.button} type="submit">
                Get Started
              </button>
            </Form>
          </div>
        )}

        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>✨</div>
            <h3 className={styles.featureTitle}>Beautiful Templates</h3>
            <p className={styles.featureDesc}>
              Choose from a library of premium, conversion-optimized templates including Modern, Minimal, and Dark mode. Completely responsive and beautiful on any device.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📈</div>
            <h3 className={styles.featureTitle}>Live Analytics</h3>
            <p className={styles.featureDesc}>
              Track exactly how your tables are performing. Get detailed insights on views, clicks, and click-through rates directly in your Shopify dashboard.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡️</div>
            <h3 className={styles.featureTitle}>Seamless Integration</h3>
            <p className={styles.featureDesc}>
              Syncs instantly with your Shopify inventory. Update a product price or image once, and it automatically updates across all your comparison tables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
