-- migrate:up

CREATE TABLE event_labels (
    created_at DateTime,
    dataset_id String,
    event_id String,
    event_type String,
    status Enum('ADDED' = 1, 'REMOVED' = 2),
    type String,
    label String
) ENGINE = MergeTree()
ORDER BY created_at;

-- migrate:down

