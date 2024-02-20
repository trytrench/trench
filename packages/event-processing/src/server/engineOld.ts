import { createRedisService } from "databases/src/redis";
import { assert } from "common";
import {
  FnType,
  FnTypeContextMap,
  NodeDef,
  Resolver,
  StateUpdater,
  TrenchEvent,
  getFnTypeDef,
} from "../function-type-defs";
import { printNodeDef } from "../function-type-defs/lib/print";
import { createDataType } from "../data-types";
import { StoreRow, StoreTable } from "../function-type-defs/lib/store";
import { getUnixTime } from "date-fns";
import { get } from "lodash";
import { getFnTypeResolver } from "../function-type-defs/resolvers";

/**
 * Execution Engine
 *
 * The execution engine is responsible for computing node values.
 * It is initialized with a set of node instances, which are in-memory objects that define how to compute a
 * node's value.
 */

type TrenchError = {
  message: string;
};

function createError(message: string): NodeResult {
  return {
    type: "error",
    output: {
      message,
    },
  };
}

function createSuccess(output: ResolverOutput): NodeResult {
  return {
    type: "success",
    output,
  };
}

type NodeResult =
  | { type: "error"; output: TrenchError }
  | { type: "success"; output: ResolverOutput };

type ResolverPromise = ReturnType<Resolver>;
type ResolverOutput = Awaited<ResolverPromise>;

type ExecutionState = {
  nodePromises: Record<string, Promise<NodeResult>>;
  stateUpdaters: Array<StateUpdater>;
  savedStoreRows: StoreRow[];
  event: TrenchEvent;
};

type NodeInstance = {
  [TFnType in FnType]: {
    nodeDef: NodeDef<FnType>;
    resolver: Resolver;
  };
};

export type EngineResult = {
  nodeResult: NodeResult;
  nodeDef: NodeDef;
  event: TrenchEvent;
  engineId: string;
};
export class ExecutionEngine {
  engineId: string;

  nodeInstances: Record<string, NodeInstance[FnType]> = {};

  state: ExecutionState | null = null;

  context: FnTypeContextMap | null = null;
  constructor(props: {
    nodeDefs: Array<NodeDef>;
    engineId: string;
    getContext: () => any;
  }) {
    const { nodeDefs, engineId } = props;

    this.engineId = engineId;

    const redis = createRedisService();

    this.context = {
      [FnType.Computed]: {},
      [FnType.Counter]: { redis },
      [FnType.UniqueCounter]: { redis },
      [FnType.GetEntityFeature]: { redis },
      [FnType.EntityAppearance]: {},
      [FnType.LogEntityFeature]: {},
      [FnType.CacheEntityFeature]: { redis },
      [FnType.Event]: {},
      [FnType.Decision]: {},
      [FnType.Blocklist]: {},
    };

    const nodeInstances: NodeInstance[FnType][] = nodeDefs.map((nodeDef) => {
      const fnType = nodeDef.fn.type;

      if (!this.context) {
        throw new Error("No engine context");
      }

      const fnTypeResolver = getFnTypeResolver(fnType);
      const resolver = fnTypeResolver.createResolver({
        fnDef: nodeDef.fn,
        input: nodeDef.inputs,
        context: this.context[fnType],
      });

      return {
        nodeDef,
        resolver,
      } as NodeInstance[FnType];
    });

    nodeInstances.forEach((instance) => {
      this.nodeInstances[instance.nodeDef.id] = instance;
    });

    validateFnInstanceMap(this.nodeInstances);
  }

  public initState(event: TrenchEvent) {
    this.state = {
      event,
      nodePromises: {},
      stateUpdaters: [],
      savedStoreRows: [
        {
          table: StoreTable.Events,
          row: {
            id: event.id,
            type: event.type,
            timestamp: getUnixTime(event.timestamp),
            data: event.data,
          },
        },
      ],
    };
  }

  private getFnInstance(nodeId: string) {
    const instance = this.nodeInstances[nodeId];
    assert(instance, `No node instance for id: ${nodeId}`);
    return instance;
  }

  public async evaluateFn(nodeId: string): Promise<NodeResult> {
    assert(this.state, "Must call initState with a TrenchEvent first");

    const { event, nodePromises } = this.state;

    // If node processing has not started, start it
    if (!nodePromises[nodeId]) {
      const processFn = async () => {
        assert(this.state, "No state");

        // Get dependencies
        const instance = this.getFnInstance(nodeId);
        const { nodeDef, resolver } = instance;

        // Run getter
        const resolvedOutput = await resolver({
          event,
          engineId: this.engineId,
          getDependency: async ({ dataPath, expectedSchema }) => {
            const depFnDef = this.getFnInstance(dataPath.nodeId).nodeDef;
            const result = await this.evaluateFn(dataPath.nodeId);
            if (result.type === "error") {
              throw new Error(
                `Fn ${printNodeDef(nodeDef)} depends on node ${printNodeDef(
                  depFnDef
                )}, which failed with error: ${result.output.message}`
              );
            } else {
              const resolvedValue = dataPath.path.length
                ? get(result.output.data, dataPath.path)
                : result.output.data;

              if (expectedSchema) {
                const type = createDataType(expectedSchema);
                try {
                  type.parse(resolvedValue);
                } catch (e: any) {
                  throw new Error(
                    `Fn ${printNodeDef(
                      nodeDef
                    )} expects dependency ${printNodeDef(
                      depFnDef
                    )} to be of type ${JSON.stringify(
                      expectedSchema
                    )}, but parsing failed with error: ${e.message}`
                  );
                }
              }
              return resolvedValue;
            }
          },
        });

        // const dataType = createDataType(instance.nodeDef.returnSchema);
        // dataType.parse(resolvedOutput.data);

        // Register state updaters
        this.state.stateUpdaters.push(...(resolvedOutput.stateUpdaters ?? []));

        // Register saved store rows
        this.state.savedStoreRows.push(
          ...(resolvedOutput.savedStoreRows ?? [])
        );

        return createSuccess(resolvedOutput);
      };

      const promise = processFn().catch((e) => {
        // console.error(e);
        return createError(e.message);
      });
      nodePromises[nodeId] = promise;
    }

    const nodePromise = nodePromises[nodeId];
    assert(nodePromise, "No node promise... this should never happen");

    const result = await nodePromise;
    const instance = this.getFnInstance(nodeId);

    // if (instance.nodeDef.fn.type !== "Event" && result.type === "success") {
    //   console.log(
    //     `${instance.nodeDef.fn.type} node ${truncId(nodeId)}:`,
    //     JSON.stringify(result.output.data)
    //   );
    // }
    return result;
  }

  public async executeStateUpdates() {
    assert(this.state, "No running execution");
    const { stateUpdaters } = this.state;
    await Promise.all(stateUpdaters.map((updater) => updater()));
  }

  public async getAllEngineResults() {
    assert(this.state, "Must call initState with a TrenchEvent first");

    const allInstances = Object.values(this.nodeInstances);

    // Initialize all promises
    for (const instance of allInstances) {
      if (instance.nodeDef.eventType === this.state.event.type) {
        this.evaluateFn(instance.nodeDef.id);
      }
    }

    // Await all promises
    const engineResults: Record<string, EngineResult> = {};
    for (const instance of allInstances) {
      const { nodeDef } = instance;

      if (nodeDef.eventType !== this.state.event.type) {
        continue;
      }

      const result = await this.evaluateFn(nodeDef.id);

      engineResults[nodeDef.id] = {
        nodeResult: result,
        nodeDef: instance.nodeDef,
        event: this.state.event,
        engineId: this.engineId,
      };
    }

    return engineResults;
  }
}

function validateFnInstanceMap(map: Record<string, NodeInstance[FnType]>) {
  // Check dependencies are valid
  for (const node of Object.values(map)) {
    const def = node.nodeDef;

    // console.log("---");
    // console.log("id:\t", truncId(def.id));
    // console.log("name:\t", def.name);
    // console.log("fn_type:\t", def.fn.type);
    // console.log("fn_name:\t", def.fn.name);
    // console.log(
    //   "deps_on:\t",
    //   Array.from(def.dependsOn).map(truncId).join(", ")
    // );
    // console.log("---");

    for (const depFnId of def.dependsOn) {
      const depFn = map[depFnId];
      assert(
        depFn,
        `Fn ${printNodeDef(
          def
        )} depends on node of ID ${depFnId}, which is not included in the engine's node set.`
      );
    }
  }
}
