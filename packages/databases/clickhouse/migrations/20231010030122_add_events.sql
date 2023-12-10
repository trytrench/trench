-- migrate:up

CREATE TABLE events (
    id String,
    timestamp DateTime,
    type String,
    data String
) ENGINE = ReplacingMergeTree()
ORDER BY (id);

-- migrate:down