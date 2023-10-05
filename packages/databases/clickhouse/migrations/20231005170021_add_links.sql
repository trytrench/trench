-- migrate:up
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
ORDER BY event_timestamp;

-- migrate:down

