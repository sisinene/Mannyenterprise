import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

let db: ReturnType<typeof postgres> | undefined;

async function getStripeSecret() {
  // Prefer a managed Edge Function secret when one is configured.
  const environmentSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (environmentSecret) return environmentSecret;

  // Fallback to the encrypted Supabase Vault entry. This query runs only
  // inside the server-side function; the decrypted value never reaches clients.
  const connectionString = Deno.env.get("SUPABASE_DB_URL");
  if (!connectionString) return null;
  db ??= postgres(connectionString, { prepare: false, max: 1, idle_timeout: 5 });
  const rows = await db`
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'stripe_test_secret_key'
    limit 1
  `;
  return rows[0]?.decrypted_secret ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // Modern Supabase publishable keys are opaque rather than JWTs, so this
    // function performs its own key validation with gateway JWT checks disabled.
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const suppliedKey = req.headers.get("apikey") ?? "";
    if (!suppliedKey || !Object.values(publishableKeys).includes(suppliedKey)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const stripeSecret = await getStripeSecret();
    if (!stripeSecret) return json({ error: "Stripe is not configured" }, 503);

    const { product_id, quantity = 1, site_url } = await req.json();
    if (!/^[0-9a-f-]{36}$/i.test(product_id ?? "")) return json({ error: "Invalid product" }, 400);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return json({ error: "Quantity must be between 1 and 100" }, 400);
    }

    let siteUrl: URL;
    try {
      siteUrl = new URL(site_url);
      if (!["http:", "https:"].includes(siteUrl.protocol)) throw new Error();
    } catch {
      return json({ error: "Payments require an HTTP or HTTPS site URL" }, 400);
    }

    // Product identity and price are looked up server-side. The browser cannot
    // choose its own amount and submit a cheaper Stripe Checkout Session.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const supabaseSecret = secretKeys.default ?? Object.values(secretKeys)[0];
    if (!supabaseSecret) return json({ error: "Database service is not configured" }, 503);

    const productResponse = await fetch(
      `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(product_id)}&active=eq.true&select=id,name,description,retail_price,currency&limit=1`,
      { headers: { apikey: String(supabaseSecret), Accept: "application/json" } },
    );
    const products = await productResponse.json();
    const product = products?.[0];
    if (!product || product.retail_price == null) return json({ error: "Product is unavailable" }, 404);

    const unitAmount = Math.round(Number(product.retail_price) * 100);
    if (!Number.isSafeInteger(unitAmount) || unitAmount < 50) {
      return json({ error: "Product price is invalid" }, 400);
    }

    const baseUrl = siteUrl.origin;
    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}#products`,
      cancel_url: `${baseUrl}/?payment=cancelled#products`,
      "line_items[0][quantity]": String(quantity),
      "line_items[0][price_data][currency]": String(product.currency).toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(unitAmount),
      "line_items[0][price_data][product_data][name]": product.name,
      "line_items[0][price_data][product_data][description]": (product.description ?? "").slice(0, 500),
      client_reference_id: product.id,
      "metadata[product_id]": product.id,
      "metadata[quantity]": String(quantity),
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok) {
      // Log only Stripe's error classification—never the key or request headers.
      console.error("Stripe error", session?.error?.type, session?.error?.code);
      return json({ error: "Could not start checkout" }, 502);
    }

    return json({ url: session.url });
  } catch (error) {
    console.error("Checkout error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unexpected checkout error" }, 500);
  }
});
