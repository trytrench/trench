-- migrate:up
CREATE TABLE event_entity (
    created_at DateTime,
    dataset_id BigInt,
    event_id String,
    event_type String,
    event_timestamp DateTime,
    event_data String,
    features String,
    entity_id Nullable(String),
    entity_type Nullable(String),
) ENGINE = MergeTree()
ORDER BY
    event_timestamp;

-- migrate:down