import { assert } from "./utils";
import {
  FeatureGetter,
  FeatureInstance,
  FeatureResult,
  StateUpdater,
  TrenchEvent,
} from "./features/types";
import { DataType, validateDataType } from "./features/dataTypes";
import { FeatureDef, FeatureType } from "./features/featureTypes";
import { FeatureFactory } from "./features/feature-types/FeatureFactory";
import { ComputedFeature } from "./features/feature-types/types/Computed";
import { CountFeature } from "./features/feature-types/types/Count";
import { UniqueCountFeature } from "./features/feature-types/types/UniqueCount";
import { MockRedisService } from "./features/services/redis";

/**
 * Execution Engine
 *
 * The execution engine is responsible for computing feature values.
 * It is initialized with a set of feature instances, which are in-memory objects that define how to compute a
 * feature's value.
 */

const redis = new MockRedisService();

const factories: Record<FeatureType, FeatureFactory<any>> = {
  [FeatureType.Count]: new CountFeature(redis),
  [FeatureType.UniqueCount]: new UniqueCountFeature(redis),
  [FeatureType.Computed]: new ComputedFeature(),
};

type ExecutionState = {
  featurePromises: Record<string, ReturnType<FeatureGetter>>;
  stateUpdaters: Array<StateUpdater>;
  event: TrenchEvent;
};

export type EngineResult = {
  event: TrenchEvent;
  featureResult: FeatureResult;
  featureDef: FeatureDef;
};

export class ExecutionEngine {
  engineId: string;
  featureInstances: Record<string, FeatureInstance> = {};
  featureDefs: Record<string, FeatureDef> = {};

  state: ExecutionState | null = null;

  constructor(props: { featureDefs: Array<FeatureDef>; engineId: string }) {
    const { featureDefs, engineId } = props;

    this.engineId = engineId;

    const featureInstances = featureDefs.map((featureDef) => {
      const factory = factories[featureDef.type];
      assert(factory, `Unknown feature type ${featureDef.type}`);
      return factory.createFeatureInstance({
        config: featureDef.config,
        dataType: featureDef.dataType,
        featureId: featureDef.id,
        dependsOn: new Set(featureDef.deps),
      });
    });

    featureInstances.forEach((feature) => {
      this.featureInstances[feature.featureId] = feature;
    });

    featureDefs.forEach((featureDef) => {
      this.featureDefs[featureDef.id] = featureDef;
    });

    validateFeatureInstanceMap(this.featureInstances);
  }

  public initState(event: TrenchEvent) {
    this.state = {
      event,
      featurePromises: {},
      stateUpdaters: [],
    };
  }

  private getFeatureInstance(featureId: string) {
    const instance = this.featureInstances[featureId];
    assert(instance, `No feature instance for id: ${featureId}`);
    return instance;
  }

  private getFeatureDef(featureId: string) {
    const def = this.featureDefs[featureId];
    assert(def, `No feature def for id: ${featureId}`);
    return def;
  }

  public async getFeature(featureId: string): Promise<FeatureResult> {
    assert(this.state, "Must call initState with a TrenchEvent first");

    const { event, featurePromises } = this.state;

    // If feature processing has not started, start it
    if (!featurePromises[featureId]) {
      const processFeature = async () => {
        assert(this.state, "No state");

        // Get dependencies
        const instance = this.getFeatureInstance(featureId);

        const dependsOnValues: Record<
          string,
          {
            data: any;
            type: DataType;
          }
        > = {};
        for (const depFeatureId of instance.dependsOn) {
          const depValue = await this.getFeature(depFeatureId);
          const depFeatureDef = this.getFeatureDef(depFeatureId);
          dependsOnValues[depFeatureId] = {
            data: depValue.value,
            type: depFeatureDef.dataType,
          };
        }

        // Run getter
        const resolvedFeature = await instance.getter({
          event,
          featureDeps: dependsOnValues,
        });

        validateDataType(resolvedFeature.value, instance.dataType);

        // Register state updaters
        this.state.stateUpdaters.push(...resolvedFeature.stateUpdaters);

        return resolvedFeature;
      };

      const promise = processFeature();
      featurePromises[featureId] = promise;
    }

    const featurePromise = featurePromises[featureId];
    assert(featurePromise, "No feature promise... this should never happen");

    return await featurePromise;
  }

  public async executeStateUpdates() {
    assert(this.state, "No running execution");
    const { stateUpdaters } = this.state;
    await Promise.all(stateUpdaters.map((cb) => cb()));
  }

  public async getAllEngineResults() {
    assert(this.state, "Must call initState with a TrenchEvent first");

    const allInstances = Object.values(this.featureInstances);

    // Initialize all promises
    for (const instance of allInstances) {
      this.getFeature(instance.featureId);
    }

    // Await all promises
    const engineResults: Record<string, EngineResult> = {};
    for (const instance of allInstances) {
      const featureResult = await this.getFeature(instance.featureId);
      const featureDef = this.getFeatureDef(instance.featureId);
      engineResults[instance.featureId] = {
        featureResult,
        featureDef,
        event: this.state.event,
      };
    }

    return engineResults;
  }
}

function validateFeatureInstanceMap(map: Record<string, FeatureInstance>) {
  // Check dependencies are valid
  for (const feature of Object.values(map)) {
    for (const depFeatureId of feature.dependsOn) {
      assert(
        depFeatureId in map,
        `Feature ${feature.featureId} depends on ${depFeatureId}, but ${depFeatureId} does not exist`
      );
    }
  }
}
