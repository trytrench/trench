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
import { printFDef } from "./feature-type-defs/lib/print";
import { FeatureType } from "./feature-type-defs/types/_enum";
import { assert } from "./utils";

/**
 * Execution Engine
 *
 * The execution engine is responsible for computing feature values.
 * It is initialized with a set of feature instances, which are in-memory objects that define how to compute a
 * feature's value.
 */

type TrenchError = {
  message: string;
};

function createError(message: string): FeatureResult {
  return {
    type: "error",
    output: {
      message,
    },
  };
}

function createSuccess(output: ResolverOutput): FeatureResult {
  return {
    type: "success",
    output,
  };
}

type FeatureResult =
  | { type: "error"; output: TrenchError }
  | { type: "success"; output: ResolverOutput };

type ResolverPromise = ReturnType<Resolver<DataType>>;
type ResolverOutput = Awaited<ResolverPromise>;

type ExecutionState = {
  featurePromises: Record<string, Promise<FeatureResult>>;
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
  featureResult: FeatureResult;
  featureDef: FeatureDef;
  event: TrenchEvent;
  engineId: string;
};
export class ExecutionEngine {
  engineId: string;

  featureInstances: Record<string, FeatureInstance[FeatureType]> = {};

  state: ExecutionState | null = null;

  constructor(props: { featureDefs: Array<FeatureDef>; engineId: string }) {
    const { featureDefs, engineId } = props;

    this.engineId = engineId;

    const featureInstances: FeatureInstance[FeatureType][] = featureDefs.map(
      (featureDef) => {
        const featureType = featureDef.featureType;
        const featureTypeDef = FEATURE_TYPE_DEFS[featureType] as FeatureTypeDef;

        const resolver = featureTypeDef.createResolver({
          featureDef,
          context: featureTypeDef.getContext?.(),
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

  public async evaluateFeature(featureId: string): Promise<FeatureResult> {
    assert(this.state, "Must call initState with a TrenchEvent first");

    const { event, featurePromises } = this.state;

    // const instance = this.getFeatureInstance(featureId);
    // if (instance.featureDef.eventTypes.has(event.type) === false) {
    //   return createError(
    //     `Feature '${featureId}' does not support event type '${event.type}'`
    //   );
    // }

    // If feature processing has not started, start it
    if (!featurePromises[featureId]) {
      const processFeature = async () => {
        assert(this.state, "No state");

        // Get dependencies
        const instance = this.getFeatureInstance(featureId);
        const { featureDef, resolver } = instance;

        const dependsOnValues: Record<string, TypedData[DataType]> = {};
        for (const depFeatureId of featureDef.dependsOn) {
          const output = await this.evaluateFeature(depFeatureId);
          const depFeatureDef =
            this.getFeatureInstance(depFeatureId).featureDef;
          if (output.type === "error") {
            throw new Error(
              `Feature ${printFDef(featureDef)} depends on ${printFDef(
                depFeatureDef
              )}, but it errored with message: ${output.output.message}`
            );
          }
          dependsOnValues[depFeatureId] = output.output.data;
        }

        // Run getter
        const resolvedFeature = await resolver({
          event,

          getDependency: ({ featureId, expectedDataTypes }) => {
            const depFeatureDef = this.getFeatureInstance(featureId).featureDef;

            const value = dependsOnValues[featureId];
            assert(
              value,
              `Feature ${printFDef(featureDef)} depends on ${printFDef(
                depFeatureDef
              )}, but no value was found.`
            );

            if (expectedDataTypes) {
              assert(
                expectedDataTypes.includes(value.type as any),
                `Feature ${printFDef(
                  featureDef
                )} expects dependency ${printFDef(
                  depFeatureDef
                )} to be of type ${expectedDataTypes.join(
                  ", "
                )}, but it is of type ${value.type}`
              );
            }

            return value as any;
          },
        });

        validateTypedData(resolvedFeature.data);

        // Register state updaters
        this.state.stateUpdaters.push(...resolvedFeature.stateUpdaters);

        return createSuccess(resolvedFeature);
      };

      const promise = processFeature().catch((e) => {
        return createError(e.message);
      });
      featurePromises[featureId] = promise;
    }

    const featurePromise = featurePromises[featureId];
    assert(featurePromise, "No feature promise... this should never happen");
    return await featurePromise;
  }

  public async executeStateUpdates() {
    assert(this.state, "No running execution");
    const { stateUpdaters } = this.state;
    await Promise.all(stateUpdaters.map((updater) => updater()));
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

      // if (!featureDef.eventTypes.has(this.state.event.type)) {
      //   continue;
      // }

      const result = await this.evaluateFeature(featureDef.featureId);

      engineResults[featureDef.featureId] = {
        featureResult: result,
        featureDef: instance.featureDef,
        event: this.state.event,
        engineId: this.engineId,
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
      const depFeature = map[depFeatureId];
      assert(
        depFeature,
        `Feature ${printFDef(
          def
        )} depends on feature of ID ${depFeatureId}, which is not included in the engine's feature set.`
      );

      // Check that dependency's event types is a superset of this feature's event types
      const depFeatureDef = depFeature.featureDef;
      const depFeatureEventTypes = depFeatureDef.eventTypes;
      const featureEventTypes = def.eventTypes;
      for (const eventType of featureEventTypes) {
        assert(
          depFeatureEventTypes.has(eventType),
          `Feature ${printFDef(
            def
          )} supports event type '${eventType}', but depends on feature ${printFDef(
            depFeatureDef
          )} which doesn't.`
        );
      }
    }
  }
}
