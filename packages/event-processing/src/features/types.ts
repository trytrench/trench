import { type } from "os";
import { DataType, DataTypeValue, Entity } from "./dataTypes";
import { FeatureType } from "./featureTypes";

export type TrenchEvent = {
  id: string;
  type: string;
  timestamp: Date;
  data: object;
};

/**
 * Feature Config: JSON object that specifies the feature configuration.
 * - Feature Configs are stored in the database.
 * - Feature Configs are used to create Feature Instances.
 *
 * Feature Instance: In-memory object that defines the feature.
 * - The engine uses Feature Instances to compute feature values.
 * - Feature Instances are created from Feature Configs.
 * - Feature Instances are stored in the engine.
 */

/**
 * All possible feature types.
 *
 * Each feature type has:
 * - A unique ID
 * - A set of possible data types
 * - A config schema
 * - A getter function, based on the config
 */

export type StateUpdater = () => Promise<void>;

export type FeatureGetter = (options: {
  event: TrenchEvent;
  featureDeps: Record<string, DataTypeValue>;
}) => Promise<{
  value: any;
  assignedEntities: Array<Entity>;
  stateUpdaters: Array<StateUpdater>;
}>;

/**
 * Feature Instance: In-memory object that defines the feature.
 */
export interface FeatureInstance {
  featureId: string;
  dependsOn: Set<string>;
  dataType: DataType;
  getter: FeatureGetter;
}
