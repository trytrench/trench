import { redis } from "./../../databases/src/redis";
import { assert } from "common";
import {
  NODE_TYPE_REGISTRY,
  NodeDef,
  NodeDefsMap,
  NodeType,
  NodeTypeContextMap,
  NodeTypeDef,
  Resolver,
  StateUpdater,
  TrenchEvent,
} from "./node-type-defs";
import { printNodeDef } from "./node-type-defs/lib/print";
import { db } from "databases";
import { TSchema, createDataType } from "./data-types";
import { StoreRow, StoreTable } from "./node-type-defs/lib/store";
import { getUnixTime } from "date-fns";
import { get } from "lodash";
/**
 * Execution Engine
 *
 * The execution engine is responsible for computing node values.
 * It is initialized with a set of node instances, which are in-memory objects that define how to compute a
 * node's value.
 */

const MAP_NODE_TYPE_TO_CONTEXT: NodeTypeContextMap = {
  [NodeType.Computed]: {},
  [NodeType.Counter]: { redis },
  [NodeType.UniqueCounter]: { redis },
  [NodeType.GetEntityFeature]: { redis },
  [NodeType.EntityAppearance]: {},
  [NodeType.LogEntityFeature]: {},
  [NodeType.CacheEntityFeature]: { redis },
  [NodeType.Rule]: {},
  [NodeType.Event]: {},
};

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
  [TNodeType in NodeType]: {
    nodeDef: NodeDefsMap[TNodeType];
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

  nodeInstances: Record<string, NodeInstance[NodeType]> = {};

  state: ExecutionState | null = null;

  constructor(props: {
    nodeDefs: Array<NodeDef>;
    engineId: string;
    getContext: () => any;
  }) {
    const { nodeDefs, engineId } = props;

    this.engineId = engineId;

    const nodeInstances: NodeInstance[NodeType][] = nodeDefs.map((nodeDef) => {
      const nodeType = nodeDef.type;
      const nodeTypeDef = NODE_TYPE_REGISTRY[nodeType] as NodeTypeDef;

      const resolver = nodeTypeDef.createResolver({
        nodeDef,
        context: MAP_NODE_TYPE_TO_CONTEXT[nodeDef.type],
      });

      return {
        nodeDef,
        resolver,
      } as NodeInstance[NodeType];
    });

    nodeInstances.forEach((instance) => {
      this.nodeInstances[instance.nodeDef.id] = instance;
    });

    validateNodeInstanceMap(this.nodeInstances);
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

  private getNodeInstance(nodeId: string) {
    const instance = this.nodeInstances[nodeId];
    assert(instance, `No node instance for id: ${nodeId}`);
    return instance;
  }

  public async evaluateNode(nodeId: string): Promise<NodeResult> {
    assert(this.state, "Must call initState with a TrenchEvent first");

    const { event, nodePromises } = this.state;

    // If node processing has not started, start it
    if (!nodePromises[nodeId]) {
      const processNode = async () => {
        assert(this.state, "No state");

        // Get dependencies
        const instance = this.getNodeInstance(nodeId);
        const { nodeDef, resolver } = instance;

        // Run getter
        const resolvedOutput = await resolver({
          event,
          engineId: this.engineId,
          getDependency: async ({ dataPath, expectedSchema }) => {
            const depNodeDef = this.getNodeInstance(dataPath.nodeId).nodeDef;
            const result = await this.evaluateNode(nodeId);
            if (result.type === "error") {
              throw new Error(
                `Node ${printNodeDef(nodeDef)} depends on node ${printNodeDef(
                  depNodeDef
                )}, which failed with error: ${result.output.message}`
              );
            } else {
              const resolvedValue = get(result.output.data, dataPath.path);
              if (expectedSchema) {
                const type = createDataType(expectedSchema);
                try {
                  type.parse(resolvedValue);
                } catch (e: any) {
                  throw new Error(
                    `Node ${printNodeDef(
                      nodeDef
                    )} expects dependency ${printNodeDef(
                      depNodeDef
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

        const dataType = createDataType(instance.nodeDef.returnSchema);
        dataType.parse(resolvedOutput.data);

        // Register state updaters
        this.state.stateUpdaters.push(...(resolvedOutput.stateUpdaters ?? []));

        // Register saved store rows
        this.state.savedStoreRows.push(
          ...(resolvedOutput.savedStoreRows ?? [])
        );

        return createSuccess(resolvedOutput);
      };

      const promise = processNode().catch((e) => {
        // console.error(e);
        return createError(e.message);
      });
      nodePromises[nodeId] = promise;
    }

    const nodePromise = nodePromises[nodeId];
    assert(nodePromise, "No node promise... this should never happen");
    return await nodePromise;
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
      this.evaluateNode(instance.nodeDef.id);
    }

    // Await all promises
    const engineResults: Record<string, EngineResult> = {};
    for (const instance of allInstances) {
      const { nodeDef } = instance;

      // if (!nodeDef.eventTypes.has(this.state.event.type)) {
      //   continue;
      // }

      const result = await this.evaluateNode(nodeDef.id);

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

function validateNodeInstanceMap(map: Record<string, NodeInstance[NodeType]>) {
  // Check dependencies are valid
  for (const node of Object.values(map)) {
    const def = node.nodeDef;
    for (const depNodeId of def.dependsOn) {
      const depNode = map[depNodeId];
      assert(
        depNode,
        `Node ${printNodeDef(
          def
        )} depends on node of ID ${depNodeId}, which is not included in the engine's node set.`
      );
    }
  }
}
