import { db } from ".";

async function runMigrations() {
  // Create tables
  await db.command({
    query: `
        CREATE TABLE IF NOT EXISTS features (
            engine_id LowCardinality(String) CODEC(ZSTD(1)),
            created_at DateTime64 CODEC(Delta(8), ZSTD(1)),
            event_type LowCardinality(String) CODEC(ZSTD(1)),
            event_id String CODEC(ZSTD(1)),
            event_timestamp DateTime64 CODEC(Delta(8), ZSTD(1)),
            feature_type LowCardinality(String),
            feature_id LowCardinality(String),
            entity_type LowCardinality(String),
            entity_id String CODEC(ZSTD(1)),
            unique_entity_id String CODEC(ZSTD(1)),
            data_type LowCardinality(Nullable(String)),
            value Nullable(String),
            value_Int64 Nullable(Int64),
            value_Float64 Nullable(Float64),
            value_String Nullable(String),
            value_Bool Nullable(Bool),
            error Nullable(String),
            is_deleted UInt8
        ) ENGINE = ReplacingMergeTree(created_at, is_deleted)
        ORDER BY (event_id, feature_id);
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  await db.command({
    query: `
        CREATE TABLE IF NOT EXISTS events (
            id String CODEC(ZSTD(1)),
            timestamp DateTime64 CODEC(Delta(8), ZSTD(1)),
            type String CODEC(ZSTD(1)),
            data String
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (id);
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  // Materialized view: entity links (e1, e2 seen together in the same event)
  await db.command({
    query: `
        CREATE TABLE IF NOT EXISTS entity_links_mv_table (
            unique_entity_id_1 String,
            entity_type_1 LowCardinality(String),
            entity_id_1 String,
            unique_entity_id_2 String,
            entity_type_2 LowCardinality(String),
            entity_id_2 String,
            times_seen_together AggregateFunction(count, UInt64),
            event_type LowCardinality(String),
            INDEX unique_entity_id_2_index(unique_entity_id_2) TYPE bloom_filter(0.01) GRANULARITY 1
        )
        ENGINE = AggregatingMergeTree()
        ORDER BY (unique_entity_id_1, unique_entity_id_2, entity_type_1, entity_id_1, entity_type_2, entity_id_2, event_type);
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  await db.command({
    query: `
        CREATE MATERIALIZED VIEW entity_links_mv
        TO entity_links_mv_table AS (
            SELECT
                f1.unique_entity_id AS unique_entity_id_1,
                f1.entity_type AS entity_type_1,
                f1.entity_id AS entity_id_1,
                f2.unique_entity_id AS unique_entity_id_2,
                f2.entity_type AS entity_type_2,
                f2.entity_id AS entity_id_2,
                countState() AS times_seen_together,
                event_type
            FROM
                features f1
            INNER JOIN
                features f2
                ON f1.event_type = f2.event_type
                AND f1.event_id = f2.event_id
            WHERE
                f1.feature_type = 'EntityAppearance'
                AND f2.feature_type = 'EntityAppearance'
                AND f1.unique_entity_id != f2.unique_entity_id
            GROUP BY
            GROUPING SETS (
              (unique_entity_id_1, unique_entity_id_2, entity_type_1, entity_id_1, entity_type_2, entity_id_2, event_type),
              (unique_entity_id_1, unique_entity_id_2, entity_type_1, entity_id_1, entity_type_2, entity_id_2)
            )
        );
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  await db.command({
    query: `
        CREATE OR REPLACE VIEW entity_links_view AS (
            SELECT
                unique_entity_id_1,
                entity_type_1 AS entity_type_1,
                entity_id_1 AS entity_id_1,
                unique_entity_id_2,
                entity_type_2 AS entity_type_2,
                entity_id_2 AS entity_id_2,
                event_type,
                countMerge(times_seen_together) AS times_seen_together
            FROM entity_links_mv_table
            GROUP BY unique_entity_id_1, unique_entity_id_2, entity_type_1, entity_id_1, entity_type_2, entity_id_2, event_type
        );
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  // Materialized view: entities seen (first/last time seen in an event)
  await db.command({
    query: `
        CREATE TABLE IF NOT EXISTS entities_seen_mv_table (
            unique_entity_id String CODEC(ZSTD(1)),
            event_type LowCardinality(String) CODEC(ZSTD(1)),
            entity_id String CODEC(ZSTD(1)),
            entity_type LowCardinality(String) CODEC(ZSTD(1)),
            first_seen SimpleAggregateFunction(min, DateTime64),
            last_seen SimpleAggregateFunction(max, DateTime64)
        )
        ENGINE = AggregatingMergeTree()
        PRIMARY KEY (event_type, entity_type)
        ORDER BY (event_type, entity_type, unique_entity_id);
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  await db.command({
    query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS entities_seen_mv
        TO entities_seen_mv_table AS (
            SELECT
                unique_entity_id,
                event_type,
                any(entity_id) as entity_id,
                any(entity_type) as entity_type,
                minSimpleState(event_timestamp) AS first_seen,
                maxSimpleState(event_timestamp) AS last_seen
            FROM features
            GROUP BY
                unique_entity_id, event_type
            WITH ROLLUP
        );
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  // Materialized view: latest entity features

  await db.command({
    query: `
        CREATE TABLE IF NOT EXISTS latest_entity_features_mv_table (
            feature_id String,
            unique_entity_id String,
            entity_type String,
            entity_id String,
            data_type String,
            value AggregateFunction(argMax, String, String),
            value_Int64 AggregateFunction(argMax, Nullable(Int64), String),
            value_Float64 AggregateFunction(argMax, Nullable(Float64), String),
            value_String AggregateFunction(argMax, Nullable(String), String),
            value_Bool AggregateFunction(argMax, Nullable(Bool), String),
            INDEX feature_id_index(feature_id) TYPE bloom_filter(0.01) GRANULARITY 1,
            INDEX unique_entity_id_index(unique_entity_id) TYPE bloom_filter(0.01) GRANULARITY 1,
            INDEX data_type_index(data_type) TYPE bloom_filter(0.01) GRANULARITY 1
        )
        ENGINE = AggregatingMergeTree()
        ORDER BY (entity_type, unique_entity_id, data_type, feature_id);
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  await db.command({
    query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS latest_entity_features_mv
        TO latest_entity_features_mv_table AS (
            SELECT
                entity_type,
                feature_id,
                data_type,
                unique_entity_id,
                any(entity_id) as entity_id,
                argMaxState(ifNull(value, ''), event_id) as value,
                argMaxState(value_Int64, event_id) as value_Int64,
                argMaxState(value_Float64, event_id) as value_Float64,
                argMaxState(value_String, event_id) as value_String,
                argMaxState(value_Bool, event_id) as value_Bool
            FROM features
            WHERE features.value IS NOT NULL
            GROUP BY
                entity_type,
                unique_entity_id,
                feature_id,
                data_type
        );
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  await db.command({
    query: `
        CREATE OR REPLACE VIEW latest_entity_features_view AS (
            SELECT
                entity_type,
                unique_entity_id,
                feature_id,
                data_type,
                any(entity_id) as entity_id,
                argMaxMerge(value) as value,
                argMaxMerge(value_Int64) as value_Int64,
                argMaxMerge(value_Float64) as value_Float64,
                argMaxMerge(value_String) as value_String,
                argMaxMerge(value_Bool) as value_Bool
            FROM latest_entity_features_mv_table
            GROUP BY entity_type, unique_entity_id, feature_id, data_type
        );
    `,
    clickhouse_settings: {
      wait_end_of_query: 1,
    },
  });

  // Boilerplate

  // await db.command({
  //   query: `

  //   `,
  //   clickhouse_settings: {
  //     wait_end_of_query: 1,
  //   },
  // });
}

runMigrations()
  .then(() => {
    console.log("Migrations finished");
  })
  .catch((e) => {
    console.error("Migrations failed", e);
  });
