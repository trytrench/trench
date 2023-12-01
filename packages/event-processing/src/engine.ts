import { assert } from "./utils";
import {
  FeatureGetter,
  FeatureInstance,
  StateUpdater,
  TrenchEvent,
} from "./features/types";
import { DataType, validateDataType } from "./features/dataTypes";

/**
 * Execution Engine
 *
 * The execution engine is responsible for computing feature values.
 * It is initialized with a set of feature instances, which are in-memory objects that define how to compute a
 * feature's value.
 */

type ExecutionState = {
  featurePromises: Record<string, ReturnType<FeatureGetter>>;
  stateUpdaters: Array<StateUpdater>;
  event: TrenchEvent;
};

export class ExecutionEngine {
  engineId: string;
  featureInstances: Record<string, FeatureInstance> = {};

  state: ExecutionState | null = null;

  constructor(props: {
    featureInstances: Array<FeatureInstance>;
    engineId: string;
  }) {
    const { featureInstances, engineId } = props;

    this.engineId = engineId;

    featureInstances.forEach((feature) => {
      this.featureInstances[feature.featureId] = feature;
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
    const feature = this.featureInstances[featureId];
    assert(feature, `No feature instance for id: ${featureId}`);
    return feature;
  }

  public async getFeature(featureId: string): Promise<DataType> {
    assert(this.state, "Must call initState with a TrenchEvent first");

    const { event, featurePromises } = this.state;

    // If feature processing has not started, start it
    if (!featurePromises[featureId]) {
      const processFeature = async () => {
        assert(this.state, "No state");

        // Get dependencies
        const instance = this.getFeatureInstance(featureId);

        const dependsOnValues: Record<string, any> = {};
        for (const depFeatureId of instance.dependsOn) {
          const depValue = await this.getFeature(depFeatureId);
          dependsOnValues[depFeatureId] = depValue;
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
    assert(
      featurePromise,
      "Feature promise not found... this should never happen"
    );

    const { value } = await featurePromise;
    return value;
  }

  public async executeStateUpdates() {
    assert(this.state, "No running execution");
    const { stateUpdaters } = this.state;
    await Promise.all(stateUpdaters.map((cb) => cb()));
  }

  public async getAllFeatures() {
    const allInstances = Object.values(this.featureInstances);

    // Initialize all promises
    for (const instance of allInstances) {
      this.getFeature(instance.featureId);
    }

    // Await all promises
    const result: Record<string, any> = {};
    for (const instance of allInstances) {
      result[instance.featureId] = await this.getFeature(instance.featureId);
    }

    return result;
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
