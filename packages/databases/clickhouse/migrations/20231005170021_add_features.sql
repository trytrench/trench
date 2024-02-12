-- migrate:up
CREATE TABLE features (
    engine_id LowCardinality(String),
    created_at DateTime,
    event_type String,
    event_id String,
    event_timestamp DateTime,
    feature_type LowCardinality(String),
    feature_id LowCardinality(String),
    entity_type LowCardinality(String),
    entity_id String,
    data_type LowCardinality(Nullable(String)),
    value Nullable(String),
    value_Int64 Nullable(UInt64),
    value_Float64 Nullable(Float64),
    value_String Nullable(String),
    value_Bool Nullable(Bool),
    error Nullable(String),
    is_deleted UInt8
) ENGINE = ReplacingMergeTree(created_at, is_deleted)
ORDER BY (event_id, feature_id);

-- migrate:down