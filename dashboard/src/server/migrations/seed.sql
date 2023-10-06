CREATE TABLE event_labels (
    created_at DateTime,
    event_id String,
    event_type String,
    status Enum('ADDED' = 1, 'REMOVED' = 2),
    type String,
    label String
) ENGINE = MergeTree()
ORDER BY
    created_at;

CREATE TABLE entity_labels (
    created_at DateTime,
    entity_id String,
    entity_type String,
    status Enum('ADDED' = 1, 'REMOVED' = 2),
    type String,
    label String
) ENGINE = MergeTree()
ORDER BY
    created_at;

CREATE TABLE event_entity (
    created_at DateTime,
    event_id String,
    event_type String,
    event_timestamp DateTime,
    event_data String,
    event_features String,
    entity_id String,
    entity_name String,
    entity_type String,
    entity_features String,
    entity_relation String
) ENGINE = MergeTree()
ORDER BY
    event_timestamp;

CREATE MATERIALIZED VIEW event_entity_entity_labels ENGINE = MergeTree()
ORDER BY
    event_timestamp AS
SELECT
    e.created_at,
    e.event_id,
    e.event_type,
    e.event_timestamp,
    e.event_data,
    e.event_features,
    e.entity_id,
    e.entity_name,
    e.entity_type,
    e.entity_features,
    e.entity_relation,
    l.status as label_status,
    nullIf(l.type, '') as label_type,
    nullIf(l.label, '') as label
FROM
    event_entity e
    LEFT JOIN entity_labels l ON e.entity_id = l.entity_id;

CREATE MATERIALIZED VIEW event_entity_event_labels ENGINE = MergeTree()
ORDER BY
    event_timestamp AS
SELECT
    e.created_at,
    e.event_id,
    e.event_type,
    e.event_timestamp,
    e.event_data,
    e.event_features,
    e.entity_id,
    e.entity_name,
    e.entity_type,
    e.entity_features,
    e.entity_relation,
    l.status as label_status,
    nullIf(l.type, '') as label_type,
    nullIf(l.label, '') as label
FROM
    event_entity e
    LEFT JOIN event_labels l ON e.event_id = l.event_id;