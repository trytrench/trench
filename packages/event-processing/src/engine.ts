import { redis } from "./../../databases/src/redis";
import { DataType, TypedDataMap, validateTypedData } from "./dataTypes";
import { assert } from "common";
import {
  NODE_TYPE_DEFS,
  NodeDef,
  NodeDefsMap,
  NodeType,
  NodeTypeContextMap,
  NodeTypeDef,
  NodeTypeDefsMap,
  Resolver,
  StateUpdater,
  TrenchEvent,
} from "./node-type-defs";
import { printNodeDef } from "./node-type-defs/lib/print";
import { db } from "databases";
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
  [NodeType.LogEntityFeature]: { clickhouse: db },
  [NodeType.GetEntityFeature]: { clickhouse: db },
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

type ResolverPromise = ReturnType<Resolver<DataType>>;
type ResolverOutput = Awaited<ResolverPromise>;

type ExecutionState = {
  nodePromises: Record<string, Promise<NodeResult>>;
  stateUpdaters: Array<StateUpdater>;
  event: TrenchEvent;
};

type NodeInstance = {
  [TNodeType in NodeType]: {
    nodeDef: NodeDefsMap[TNodeType];
    resolver: Resolver<NodeTypeDefsMap[TNodeType]["allowedDataTypes"][number]>;
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
      const nodeTypeDef = NODE_TYPE_DEFS[nodeType] as NodeTypeDef;

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

    // const instance = this.getNodeInstance(nodeId);
    // if (instance.nodeDef.eventTypes.has(event.type) === false) {
    //   return createError(
    //     `Node '${nodeId}' does not support event type '${event.type}'`
    //   );
    // }

    // If node processing has not started, start it
    if (!nodePromises[nodeId]) {
      const processNode = async () => {
        assert(this.state, "No state");

        // Get dependencies
        const instance = this.getNodeInstance(nodeId);
        const { nodeDef, resolver } = instance;

        const dependsOnValues: Record<string, TypedDataMap[DataType]> = {};
        for (const depNodeId of nodeDef.dependsOn) {
          const output = await this.evaluateNode(depNodeId);
          const depNodeDef = this.getNodeInstance(depNodeId).nodeDef;
          if (output.type === "error") {
            throw new Error(
              `Node ${printNodeDef(nodeDef)} depends on ${printNodeDef(
                depNodeDef
              )}, but it errored with message: ${output.output.message}`
            );
          }
          dependsOnValues[depNodeId] = output.output.data;
        }

        // Run getter
        const resolvedNode = await resolver({
          event,

          getDependency: ({ nodeId, expectedDataTypes }) => {
            const depNodeDef = this.getNodeInstance(nodeId).nodeDef;

            const value = dependsOnValues[nodeId];
            assert(
              value,
              `Node ${printNodeDef(nodeDef)} depends on ${printNodeDef(
                depNodeDef
              )}, but no value was found.`
            );

            if (expectedDataTypes) {
              assert(
                expectedDataTypes.includes(value.type as any),
                `Node ${printNodeDef(
                  nodeDef
                )} expects dependency ${printNodeDef(
                  depNodeDef
                )} to be of type ${expectedDataTypes.join(
                  ", "
                )}, but it is of type ${value.type}`
              );
            }

            return value as any;
          },
        });

        validateTypedData(resolvedNode.data);

        // Register state updaters
        this.state.stateUpdaters.push(...resolvedNode.stateUpdaters);

        return createSuccess(resolvedNode);
      };

      const promise = processNode().catch((e) => {
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

      // Check that dependency's event types is a superset of this node's event types
      const depNodeDef = depNode.nodeDef;
      const depNodeEventTypes = depNodeDef.eventTypes;
      const nodeEventTypes = def.eventTypes;
      for (const eventType of nodeEventTypes) {
        assert(
          depNodeEventTypes.has(eventType),
          `Node ${printNodeDef(
            def
          )} supports event type '${eventType}', but depends on node ${printNodeDef(
            depNodeDef
          )} which doesn't.`
        );
      }
    }
  }
}
