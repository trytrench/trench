---
title: Applying decisions
sidebar_position: 3
---

Decisions can be applied to events as well as to specific objects within your events like users and IP addresses. We do this with labels, which are key-value pairs that are attached to events and entities.

For example, you can label an event with `$BLOCK` to indicate that it should be blocked, or you can label a user with `$BLOCKLIST` to indicate that they should be blocked from all future events.

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

The `/event` endpoint will return the labels that were applied:

```
curl \
  -u YOUR_SMYTE_API_KEY:YOUR_SMYTE_SECRET_KEY \
  -H 'Content-Type: application/json' \
  'https://api.smyte.com/v2/action/classify' \
  -d '{...action goes here...}'
{
  "statusCode": 200,
  "labels": [
    {
        "type": "$BLOCK",
        "label": "too many cards",
        "cause": {
            "firedRules": [
                {
                    "name": "UserUsedTooManyCards",
                    "reason": "User used 5 cards in the last week"
                }
            ]
        },
        ...
    },
    ...
  ]
}
```
