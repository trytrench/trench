---
title: Writing rules
sidebar_position: 4
---

We write rules using a modified version of SQRL, a SQL-like language that allows you to write rules in a declarative way. You can learn more about SQRL [here](https://sqrl-lang.github.io/sqrl/).

## Entities

Use `entity(name: string, id: string, relation?: string)` to define an entity. Entities are objects that we might want to label, count, or track in our events. For example, a user or a credit card.

Your event might have two of the same entity, but with different IDs. For example, a payment event might have two users: the buyer and the seller. In this case, you can use the `relation` parameter to distinguish between the two entities.

### Labeling Events

Use **`addActionLabel(type: string, value: string)`** to add labels to events. We support special types:

- **`$BLOCK`**: Indicates the event should be blocked.
- **`$APPROVE`**: Marks the event as approved.

### Labeling Entities

Use **`addLabel(entity: Entity, type: string, value: string)`** for entities within events. Special labels include:

- **`$BLOCKLIST`**: Adds the entity to a blocklist.
- **`$ALLOWLIST`**: Adds the entity to an allowlist.

### Custom Functions

You can define your own custom JavaScript functions and use them in your rules. For example, you can define a function that checks if an email is in a blocklist.

### Data Persistence

You can use **`get(key: string)`** and **`set(key: string, value: string)`** to persist data across events. This can be useful for retrieving data from previous events.
