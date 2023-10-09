-- migrate:up
CREATE TABLE event_entity (
    created_at DateTime,
    dataset_id String,
    event_id String,
    event_type String,
    event_timestamp DateTime,
    event_data String,
    event_features String,
    entity_id Nullable(String),
    entity_name Nullable(String),
    entity_type Nullable(String),
    entity_features Nullable(String),
    entity_relation Nullable(String)
) ENGINE = MergeTree()
ORDER BY event_timestamp;

-- migrate:down

