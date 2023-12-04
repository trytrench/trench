import { DataType, TypedData, validateTypedData } from "./dataTypes";
import {
  FEATURE_TYPE_DEFS,
  FeatureDefs,
  FeatureTypeDefs,
} from "./feature-type-defs";
import {
  FeatureDef,
  FeatureTypeDef,
  Resolver,
  StateUpdater,
  TrenchEvent,
} from "./feature-type-defs/featureTypeDef";
import { FeatureType } from "./feature-type-defs/types/_enum";
import { assert } from "./utils";

/**
 * Execution Engine
 *
 * The execution engine is responsible for computing feature values.
 * It is initialized with a set of feature instances, which are in-memory objects that define how to compute a
 * feature's value.
 */

type ResolverOutput = ReturnType<Resolver<DataType>>;

type ExecutionState = {
  featurePromises: Record<string, ResolverOutput>;
  stateUpdaters: Array<StateUpdater>;
  event: TrenchEvent;
};

type FeatureInstance = {
  [TFeatureType in FeatureType]: {
    featureDef: FeatureDefs[TFeatureType];
    resolver: Resolver<
      FeatureTypeDefs[TFeatureType]["allowedDataTypes"][number]
    >;
  };
};

export type EngineResult = {
  featureResult: Awaited<ResolverOutput>;
  featureDef: FeatureDef;
  event: TrenchEvent;
};
export class ExecutionEngine {
  engineId: string;

  featureInstances: Record<string, FeatureInstance[FeatureType]> = {};

  state: ExecutionState | null = null;

  constructor(props: {
    featureDefs: Array<FeatureDefs[FeatureType]>;
    engineId: string;
  }) {
    const { featureDefs, engineId } = props;

    this.engineId = engineId;

    const featureInstances: FeatureInstance[FeatureType][] = featureDefs.map(
      (featureDef) => {
        const featureType = featureDef.featureType;
        const featureTypeDef = FEATURE_TYPE_DEFS[featureType] as FeatureTypeDef;

        const resolver = featureTypeDef.createResolver({
          featureDef,
          context: featureTypeDef.context,
        });

        return {
          featureDef,
          resolver,
        } as FeatureInstance[FeatureType];
      }
    );

    featureInstances.forEach((instance) => {
      this.featureInstances[instance.featureDef.featureId] = instance;
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

  public async evaluateFeature(
    featureId: string
  ): ReturnType<Resolver<DataType>> {
    assert(this.state, "Must call initState with a TrenchEvent first");

    const { event, featurePromises } = this.state;

    // If feature processing has not started, start it
    if (!featurePromises[featureId]) {
      const processFeature = async () => {
        assert(this.state, "No state");

        // Get dependencies
        const instance = this.getFeatureInstance(featureId);
        const { featureDef, resolver } = instance;

        const dependsOnValues: Record<string, TypedData[DataType]> = {};
        for (const depFeatureId of featureDef.dependsOn) {
          const resolverResult = await this.evaluateFeature(depFeatureId);
          dependsOnValues[depFeatureId] = resolverResult.data;
        }

        // Run getter
        const resolvedFeature = await resolver({
          event,
          dependencies: dependsOnValues,
        });

        validateTypedData(resolvedFeature.data);

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
      this.evaluateFeature(instance.featureDef.featureId);
    }

    // Await all promises
    const engineResults: Record<string, EngineResult> = {};
    for (const instance of allInstances) {
      const { featureDef } = instance;
      const featureResult = await this.evaluateFeature(featureDef.featureId);
      engineResults[featureDef.featureId] = {
        featureResult: featureResult,
        featureDef: instance.featureDef,
        event: this.state.event,
      };
    }

    return engineResults;
  }
}

function validateFeatureInstanceMap(
  map: Record<string, FeatureInstance[FeatureType]>
) {
  // Check dependencies are valid
  for (const feature of Object.values(map)) {
    const def = feature.featureDef;
    for (const depFeatureId of def.dependsOn) {
      assert(
        depFeatureId in map,
        `Feature '${def.featureId}' depends on '${depFeatureId}', but '${depFeatureId}' does not exist`
      );
    }
  }
}
