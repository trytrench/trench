-- migrate:up

CREATE TABLE events (
    id String,
    timestamp DateTime,
    type String,
    data String
) ENGINE = MergeTree()
ORDER BY (id, timestamp, type);

-- migrate:down