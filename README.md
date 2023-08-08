![logo](https://github.com/trytrench/trench/assets/9043913/14508389-2126-488a-8b22-303d43e9d923)

<p align="center">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/trytrench/trench?style=social">
    <a href="https://github.com/trytrench/trench/blob/main/LICENSE">
        <img alt="License: AGPL v3" src="https://img.shields.io/github/license/trytrench/trench" />
    </a>
</p>

<p align="center">
    <a href="https://discord.gg/cSYC47MXTR" target="_blank">Discord</a>
    -
    <a href="https://www.trytrench.com" target="_blank">Website</a>
    -
    <a href="https://docs.trytrench.com" target="_blank">Docs</a>
</p>

## Overview

Trench is an open source fraud prevention platform for marketplaces.

## Features

Trench lets marketplaces prevent buyer and seller fraud in one platform. With Trench, you can:
- Review sellers by KYC/KYB and by buyer history
- Set transaction limits for buyers and sellers
- Automatically assess payments based on buyer and seller data
- Integrate directly with Stripe Payments, Identity, and Connect
 
## Design Philosophy

- **Full customization.** You know your product and user interactions better than anyone else. To be effective, you should have full control over the data you collect and integrate.
- **Full access to your data.** You shouldn’t be limited to dashboards and reports. Full access to your data is needed to properly understand your fraud.

![screenshot](https://github.com/trytrench/trench/assets/9043913/e655c6dc-849f-406b-b528-a39b91a76cc6)

## Getting started

### Deploy with Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftrytrench%2Ftrench%2Ftree%2Fmain%2Fdashboard&repository-name=trench-demo&project-name=trench-demo&env=ADMIN_USERNAME,ADMIN_PASSWORD,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,API_KEY,JWT_SECRET&stores=[{"type":"postgres"}])

### Local development

1. Clone the repository
2. Go to dashboard project: `cd dashboard`
3. Install dependencies: `yarn` or `npm i`
4. Run the development server: `yarn dev` or `npm run dev`

#### Environment variables

- `STRIPE_SECRET_KEY` - Stripe key with read permissions on `PaymentIntent`, `PaymentMethod`, and `Customer`
- `STRIPE_WEBHOOK_SECRET` - used to verify Stripe webhooks
- `API_KEY` (optional, default is "secret") - used to authenticate requests from your backend
- `JWT_SECRET` (optional, default is "secret") - used to sign JWT tokens
- `SENTRY_DSN` (optional) - Sentry DSN for error reporting
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (optional) - Mapbox token for geocoding and maps

### Stripe integration

Integrate Trench into your payment flow by following our [Stripe Integration Guide](https://docs.trytrench.com/stripe-integration) or our [Stripe Example](https://github.com/trytrench/stripe-example) code.

## Join our community

Join the Trench community in [Discord](https://discord.gg/JPwzAumy) if you need support or have anything you'd like to ask. We'd love to chat!
