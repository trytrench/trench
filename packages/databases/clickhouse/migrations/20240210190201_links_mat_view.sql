-- migrate:up

CREATE MATERIALIZED VIEW entity_appearance_view
ENGINE = MergeTree()
ORDER BY (entity_type_1, entity_id_1, entity_type_2, entity_id_2) AS
SELECT DISTINCT
  f1.unique_entity_id AS unique_entity_id_1,
  f1.entity_type AS entity_type_1,
  f1.entity_id AS entity_id_1,
  f2.unique_entity_id AS unique_entity_id_2,
  f2.entity_type AS entity_type_2,
  f2.entity_id AS entity_id_2
FROM
  features f1
INNER JOIN
  features f2 ON f1.event_type = f2.event_type
               AND f1.event_id = f2.event_id
WHERE
  f1.feature_type = 'EntityAppearance' AND
  f2.feature_type = 'EntityAppearance' AND
  NOT (f1.unique_entity_id = f2.unique_entity_id);

-- migrate:down

