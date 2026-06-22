# Finish Stripe test checkout

The website, Supabase catalog, and `create-checkout-session` Edge Function are connected. The Stripe secret must be stored in Supabase before checkout can create sessions.

1. Rotate the Stripe secret that was pasted into chat.
2. Open [Supabase Edge Function Secrets](https://supabase.com/dashboard/project/icmyjsafstohqydliqqp/functions/secrets).
3. Add a secret named `STRIPE_SECRET_KEY` and paste the newly rotated **test secret key** as its value.
4. Save. The function reads the secret immediately; no redeployment is required.
5. Run `start-local.ps1` and use the `http://127.0.0.1:4187` page for checkout. Stripe Checkout cannot return safely to a raw `file://` page.

Only the Stripe publishable key is present in the website files. The secret key must remain server-side in Supabase.
