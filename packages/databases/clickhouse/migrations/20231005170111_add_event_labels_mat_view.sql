-- migrate:up

CREATE MATERIALIZED VIEW event_entity_event_labels ENGINE = MergeTree()
ORDER BY
    event_timestamp AS
SELECT
    e.created_at,
    e.dataset_id,
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
    l.status,
    l.type,
    l.label
FROM
    event_entity e
    LEFT JOIN event_labels l ON e.event_id = l.event_id;

-- migrate:down

