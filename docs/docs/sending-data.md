---
title: Sending data to Trench
sidebar_position: 2
---

### Event Endpoint

Trench accepts event data sent to the `/api/events` endpoint via `POST` request. The event `JSON` should be in the following format:

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

### Data Fields

Trench expects the following fields in each event:

- **`type`**: Specifies the event type (e.g. `payment`, `login`, `signup`, etc.)
- **`data`**: Contains the event data. This can be any `JSON` object.
- **`timestamp`**: (Optional) Specifies the event time. If not provided, Trench will use the current time.
