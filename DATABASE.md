# Manny Enterprise database

The connected Supabase project now contains eight relational tables.

| Table | Purpose | Browser access |
|---|---|---|
| `categories` | Public catalog groupings | Read active rows |
| `products` | Materials, units and pricing | Read active rows; wholesale price hidden |
| `suppliers` | Supplier contacts and notes | Private |
| `product_suppliers` | Supplier SKUs, costs and lead times | Private |
| `inventory` | On-hand, reserved and reorder quantities | Private |
| `wholesale_accounts` | Trade customers, status and credit limits | Private |
| `quote_requests` | Website quote enquiries | Public insert only |
| `quote_request_items` | Itemized materials on each quote | Private |

All public-schema tables have Row Level Security enabled. Foreign-key columns used for catalog, supplier and quote lookups are indexed. The catalog contains three starter categories and nine starter products.

The browser uses only the publishable Supabase key in `supabase-config.js`. Administrative work must be performed through the Supabase dashboard or a secure backend; never put a secret or service-role key in website files.
