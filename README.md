![logo](https://github.com/trytrench/trench/assets/9043913/14508389-2126-488a-8b22-303d43e9d923)

<p align="center">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/trytrench/trench?style=social">
    <a href="https://discord.gg/JPwzAumy">
        <img src="https://img.shields.io/badge/Discord-Join%20us-%237289da?logo=discord" alt="discord">
    </a>
    <a href="https://github.com/trytrench/trench/blob/main/LICENSE">
        <img alt="License: AGPL v3" src="https://img.shields.io/github/license/trytrench/trench" />
    </a>
</p>

Trench is an open-source payment fraud prevention platform, built for engineers.

## Features

- Set up in 10 minutes!
- Fully customizable to meet your business needs
- Collect rich data through our SDK
- Respond to fraud in real time in our dashboard
- Integrate complex custom data into your rule engine
- Write rules in TypeScript

![screenshot](https://github.com/trytrench/trench/assets/9043913/c11fc56b-b33b-4cb4-bbfc-032aa47a3712)

## Getting started

### Deploy with Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftrytrench%2Ftrench%2Ftree%2Fmain%2Fdashboard&repository-name=trench-demo&project-name=trench-demo&env=ADMIN_USERNAME,ADMIN_PASSWORD,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,API_KEY,JWT_SECRET&stores=[{"type":"postgres"}])

#### Environment variables

- `API_KEY` - used to authenticate requests from your backend
- `STRIPE_SECRET_KEY` - Stripe key with read permissions on `PaymentIntent`, `PaymentMethod`, and `Customer`
- `STRIPE_WEBHOOK_SECRET` - used to verify Stripe webhooks
- `JWT_SECRET` - used to sign JWT tokens
- `SENTRY_DSN` (optional) - Sentry DSN for error reporting
- `NEXT_PUBLIC_MAPBOX_TOKEN` (optional) - Mapbox token for geocoding and maps

### Stripe Integration

Create a [Stripe](https://dashboard.stripe.com/webhooks) webhook endpoint with the URL `<TRENCH URL>/api/webhook`. Select the `Charge`, `Radar`, and `Payment Intent` events to listen to.

Integrate Trench into your payment flow by following our [Stripe Integration Guide](/stripe-integration) or our [Stripe Example](https://github.com/trytrench/stripe-example) code.
