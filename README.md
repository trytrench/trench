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

## Getting started

Trench provides a core set of fraud prevention tools to help you collect data on users, identify bad actors, and take action on them (e.g. blocking a payment).

## Deploying Trench

You can deploy Trench in one click to [Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftrytrench%2Ftrench%2Ftree%2Fmain%2Fdashboard&repository-name=trench-demo&project-name=trench-demo&env=ADMIN_USERNAME,ADMIN_PASSWORD,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,API_KEY,JWT_SECRET&stores=[{"type":"postgres"}]) or any hosting service.

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

## Applying decisions

Trench lets you automatically apply decisions to events and objects in your events like users and IP addresses. We use a modified version of [SQRL](https://sqrl-lang.github.io/sqrl/), a rules language from Twitter, which lets you easily write rules with counts and aggregations that can be run on thousands of events per second with sub 100ms latency.

```sql
LET Card := entity('Card', jsonValue(EventData, '$.data.card.fingerprint'));
LET User := entity('User', jsonValue(EventData, '$.data.user.id'));

LET NumCards := countUnique(Card BY User LAST Week);

CREATE RULE UserUsedTooManyCards
  WHERE NumCards > 4
  WITH REASON "User ${User} used ${NumCards} in the last week";

WHEN UserUsedTooManyCards THEN
  addEventLabel('$BLOCK', 'too many cards'),
  addEntityLabel(User, '$BLOCKLIST', 'too many cards');
```

## Design Philosophy

- **Full customization.** You know your product and user interactions better than anyone else. To be effective, you should have full control over the data you collect and integrate.
- **Full access to your data.** You shouldn’t be limited to dashboards and reports. Full access to your data is needed to properly understand your fraud.

## Local development

1. Clone the repository
2. Go to dashboard project: `cd dashboard`
3. Install dependencies: `yarn` or `npm i`
4. Run the development server: `yarn dev` or `npm run dev`

## Join our community

Join the Trench community in [Discord](https://discord.gg/JPwzAumy) if you need support or have anything you'd like to ask. We'd love to chat!
