---
title: Dashboard configuration
sidebar_position: 6
---

### Mapping Event Data

To populate the Trench dashboard, use the following functions:

- **`addEventFeature(name: string, value: string)`**: For attaching extra data to events that are displayed in the dashboard.
- **`addFeature(entity: Entity, name: string, value: string)`**: For attaching extra data to entities that are displayed in the dashboard.

### Reserved Fields

Trench uses the following reserved fields to throughout the dashboard:

- **`$name`**: Specifies the event name.
- **`$description`**: Briefly describes the event.

For Entities:

- **`$name`**: Specifies the entity name.
