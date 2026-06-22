# Manny Enterprise

Modern responsive website for a building-materials importer serving wholesale and retail customers.

## Features

- Supabase-backed product catalog and quote requests
- Stripe test-checkout integration through a Supabase Edge Function
- Responsive desktop and mobile layouts
- Secure client configuration using publishable keys only

## Local preview

Run `start-local.ps1` on Windows, then open `http://127.0.0.1:4187`.

Stripe checkout uses a server-side secret from an Edge Function environment variable or the encrypted Supabase Vault fallback documented in `STRIPE_SETUP.md`.

The deployed checkout source is versioned at `supabase/functions/create-checkout-session/index.ts`.
