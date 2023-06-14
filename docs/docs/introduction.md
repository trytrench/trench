---
title: Introduction
sidebar_position: 1
slug: /
---

Trench is an open-source payment fraud prevention platform. This includes an SDK for data collection, a data platform for aggregating and enriching fraud data, and a UI for fraud workflows. Trench is built for customization, with a plugin system for getting the data you need, to adapt to your use case.

## Getting started

### Deploy with Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftrytrench%2Ftrench%2Ftree%2Fmain%2Fdashboard&repository-name=trench-demo&project-name=trench-demo&env=ADMIN_USERNAME,ADMIN_PASSWORD,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,API_KEY,JWT_SECRET&stores=[{"type":"postgres"}])

#### Environment variables

- `API_KEY` - used to authenticate requests from your backend
- `STRIPE_SECRET_KEY` - Stripe key with read permissions on `PaymentIntent`, `PaymentMethod`, and `Customer`
- `STRIPE_WEBHOOK_SECRET` - used to verify Stripe webhooks
- `JWT_SECRET` - used to sign JWT tokens
- `SENTRY_DSN` **(optional)** - Sentry DSN for error reporting
- `NEXT_PUBLIC_MAPBOX_TOKEN` **(optional)** - Mapbox token for geocoding and maps

### Stripe Integration

Create a [Stripe](https://dashboard.stripe.com/webhooks) webhook endpoint with the URL `<TRENCH URL>/api/webhook`. Select the `Charge`, `Radar`, and `Payment Intent` events to listen to.

Integrate Trench into your payment flow by following our [Stripe Integration Guide](/stripe-integration) or our [Stripe Example](https://github.com/trytrench/stripe-example) code.
