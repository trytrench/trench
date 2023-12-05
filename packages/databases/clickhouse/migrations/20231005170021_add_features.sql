-- migrate:up
CREATE TABLE features (
    engine_id LowCardinality(String),
    created_at DateTime,
    event_type String,
    event_id String,
    event_timestamp DateTime,
    feature_type LowCardinality(String),
    feature_id LowCardinality(String),
    entity_type Array(LowCardinality(String)),
    entity_id Array(String),
    data_type LowCardinality(String),
    value String,
    value_Int64 Nullable(UInt64),
    value_Float64 Nullable(Float64),
    value_String Nullable(String),
    value_Bool Nullable(Bool)
) ENGINE = MergeTree()
ORDER BY (event_id, feature_id, entity_id);

-- migrate:down