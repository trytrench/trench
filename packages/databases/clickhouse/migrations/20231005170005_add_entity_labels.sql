-- migrate:up

CREATE TABLE entity_labels (
    created_at DateTime,
    entity_id String,
    entity_type String,
    status Enum('ADDED' = 1, 'REMOVED' = 2),
    type String,
    label String
) ENGINE = MergeTree()
ORDER BY created_at;

-- migrate:down

