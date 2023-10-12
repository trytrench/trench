-- migrate:up

CREATE MATERIALIZED VIEW entity_entity
    ENGINE = MergeTree()
ORDER BY entity_id_1
AS
SELECT
    ifNull(e1.entity_id, '') as entity_id_1,
    e1.entity_name as entity_name_1,
    e1.entity_type as entity_type_1,
    e2.entity_id as entity_id_2,
    e2.entity_name as entity_name_2,
    e2.entity_type as entity_type_2,
    e1.dataset_id as dataset_id
FROM
    event_entity e1
    INNER JOIN event_entity e2 ON e1.event_id = e2.event_id
WHERE
    e1.dataset_id = e2.dataset_id
    AND NOT (e1.entity_id = e2.entity_id)
    AND e1.entity_id IS NOT NULL
    AND e2.entity_id IS NOT NULL
GROUP BY
    e1.entity_id, e1.entity_name, e1.entity_type, e2.entity_id, e2.entity_name, e2.entity_type, e1.dataset_id

-- migrate:down

