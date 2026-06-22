# Stripe test checkout

The website, Supabase catalog, Stripe, and the `create-checkout-session` Edge Function are connected.

The Stripe test secret is encrypted in Supabase Vault under `stripe_test_secret_key`. The Edge Function reads it through a direct server-side Postgres connection. It never enters the browser, local website files, logs, or API responses.

Run `start-local.ps1` and use `http://127.0.0.1:4187` for checkout. Stripe Checkout cannot return safely to a raw `file://` page.

Only the Stripe publishable key is present in the website files. Rotate the test secret after exposing it in chat, then update the named Vault secret with the replacement value.
