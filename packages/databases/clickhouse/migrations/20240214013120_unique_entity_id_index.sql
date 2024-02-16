-- migrate:up

ALTER TABLE features ADD INDEX unique_entity_id_index(unique_entity_id) TYPE bloom_filter(0.01) GRANULARITY 1;

-- migrate:down

