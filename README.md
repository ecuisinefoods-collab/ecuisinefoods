# eCuisinefoods

A custom e-commerce storefront for eCuisinefoods, built with Next.js, TypeScript, Tailwind CSS and Supabase.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and confirm the Supabase URL and publishable key.
3. Install dependencies with `npm install`.
4. Start the development server with `npm run dev`.
5. Visit `http://localhost:3000`.

## Current foundation

- Responsive branded homepage and product catalog section
- Supabase browser client using a publishable key
- Product list reads active products and variants from Supabase when configured
- Placeholder presentation when the product catalog is empty

## Not ready for production checkout

Cart persistence, secure order creation, customer authentication, admin tools, payment integration, delivery pricing, and order notifications still need to be implemented and tested. Never add a Supabase service-role key to a `NEXT_PUBLIC_*` variable or browser code.
