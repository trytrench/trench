# Trench Dashboard

### Deploy with Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftrytrench%2Ftrench%2Ftree%2Fmain%2Fdashboard&repository-name=trench-demo&project-name=trench-demo&env=ADMIN_USERNAME,ADMIN_PASSWORD,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,API_KEY,JWT_SECRET&stores=[{"type":"postgres"}])

### Local development

After creating a `.env` file in this directory with environment variables, follow these steps to develop locally:

1. Install dependencies: `yarn` or `npm i`
2. Run the development server: `yarn dev` or `npm run dev`

#### Environment variables

- `STRIPE_SECRET_KEY` - Stripe key with read permissions on `PaymentIntent`, `PaymentMethod`, and `Customer`
- `STRIPE_WEBHOOK_SECRET` - used to verify Stripe webhooks
- `API_KEY` (optional, default is "secret") - used to authenticate requests from your backend
- `JWT_SECRET` (optional, default is "secret") - used to sign JWT tokens
- `SENTRY_DSN` (optional) - Sentry DSN for error reporting
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (optional) - Mapbox token for geocoding and maps
