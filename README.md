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
    <a href="https://trench.mintlify.app" target="_blank">Docs</a>
</p>

## Getting started

Trench is a tool for monitoring and preventing fraud and abuse. It helps you collect data on users, identify bad actors, and take action on them (e.g. blocking a payment).

[Live demo](https://play.trytrench.com)

## Documentation
Check out the full documentation [here](https://trench.mintlify.app).

## Deploying Trench

- Install Docker Engine and Docker Compose
- Clone the repository: `git clone https://github.com/trytrench/trench.git && cd trench`
- Run Trench: `docker-compose up`

## Sending data to Trench

You can send user events to Trench via the REST API or using the Javascript SDK.

```
curl \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  'YOUR_TRENCH_URL/api/event' \
  -d '
{
  "type": "payment",
  "data": {
    "card": {
        "fingerprint": "f2xvb823k",
        "brand": "visa",
        "country": "US",
        "last4": "4242",
    },
    "user": {
      "id": "45912",
      "name": "John Doe",
      "email": "john@email.com"
    },
    ...
  }
```

## Design Philosophy

- **Full customization.** You know your product and user interactions better than anyone else. To be effective, you should have full control over the data you collect and integrate.
- **Full access to your data.** You shouldn’t be limited to dashboards and reports. Full access to your data is needed to properly understand your fraud.

## Local development

1. Clone the repository: `git clone https://github.com/trytrench/trench.git && cd trench`
2. Install dependencies: `pnpm install`
3. Run the development server: `pnpm dev`

## Join our community

Join the Trench community in [Discord](https://discord.gg/cSYC47MXTR) if you need support or have anything you'd like to ask. We'd love to chat!


