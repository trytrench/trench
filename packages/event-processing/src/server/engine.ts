import PQueue from "p-queue";
import { createRedisService } from "databases/src/redis";
import { assert } from "common";
import {
  BASE_CONTEXT,
  FnType,
  FnTypeContextMap,
  NodeDef,
  Resolver,
  StateUpdater,
  TrenchEvent,
  getFnTypeDef,
} from "../function-type-defs";
import { InferSchemaType, TSchema, createDataType } from "../data-types";
import { getUnixTime } from "date-fns";
import { get } from "lodash";
import { getFnTypeResolver } from "../function-type-defs/resolvers";
import { printNodeDef } from "../function-type-defs/lib/print";
import {
  QUEUE_TYPE_OPTIONS,
  getQueueId,
} from "../function-type-defs/lib/queueTypes";
import { StoreRow } from "../function-type-defs/lib/store";

type TrenchError = {
  message: string;
};
type ResolverPromise = ReturnType<Resolver>;
type ResolverOutput = Awaited<ResolverPromise>;
type NodeResult =
  | { type: "error"; output: TrenchError }
  | { type: "success"; output: ResolverOutput }; // Adjust the output type based on your ResolverOutput

export class ExecutionEngine {
  engineId: string;

  context: FnTypeContextMap | null = null;
  nodeDefs: Record<string, NodeDef<FnType>> = {};
  eventQueue: PQueue;
  functionQueues: Record<string, PQueue>;
  state: {
    events: Array<TrenchEvent>;
    savedStoreRows: StoreRow[];
  } | null = null; // Adjust the type as needed

  constructor(props: { nodeDefs: Array<NodeDef<FnType>>; engineId: string }) {
    const { nodeDefs, engineId } = props;
    this.engineId = engineId;
    this.context = this.initializeContext();
    this.eventQueue = new PQueue({ concurrency: 15 });
    this.functionQueues = {};

    // Create all function queues
    nodeDefs.forEach((nodeDef) => {
      const { getQueueOptions } = getFnTypeResolver(nodeDef.fn.type);
      const options = getQueueOptions({ fnDef: nodeDef.fn });
      const queueId = getQueueId(options);
      if (!this.functionQueues[queueId]) {
        const queueConfig = QUEUE_TYPE_OPTIONS[options.queueType];
        this.functionQueues[queueId] = new PQueue({
          concurrency: queueConfig.concurrency,
        });
      }

      this.nodeDefs[nodeDef.id] = nodeDef;
    });
  }

  private initializeContext(): FnTypeContextMap {
    const redis = createRedisService();
    return {
      ...BASE_CONTEXT,
      [FnType.Counter]: { redis },
      [FnType.UniqueCounter]: { redis },
      [FnType.GetEntityFeature]: { redis },
      [FnType.CacheEntityFeature]: { redis },
    };
  }

  private async executeEvent(event: TrenchEvent): Promise<void> {
    return this.eventQueue.add(async () => {
      const eventTypeNodes = Object.values(this.nodeDefs).filter(
        (nodeDef) => nodeDef.eventType === event.type
      );

      const nodePromisesMap: Map<
        string,
        Promise<NodeResult | void>
      > = new Map();

      const evaluateNode = async (nodeId: string): Promise<NodeResult> => {
        const nodeDefsMap = this.nodeDefs;
        const nodeDef = nodeDefsMap[nodeId];
        assert(nodeDef, `Node definition not found for ${nodeId}`);

        // If the node is already being evaluated, return the existing promise
        const existingNodePromise = nodePromisesMap.get(nodeDef.id);
        if (existingNodePromise) {
          const result = await existingNodePromise;
          return resolveResultOrVoid(result);
        }

        // Else create a new promise and add it to the map
        const { getQueueOptions, createResolver } = getFnTypeResolver(
          nodeDef.fn.type
        );
        const options = getQueueOptions({ fnDef: nodeDef.fn });
        const queueId = getQueueId(options);
        const fnQueue = this.functionQueues[queueId];
        assert(fnQueue, `Function queue not found for ${nodeDef.fn.id}`);

        const context = this.context?.[nodeDef.fn.type];
        assert(context, `Context is not defined.`);

        const nodePromise: Promise<NodeResult | void> = fnQueue
          .add(async () => {
            const resolver = createResolver({
              fnDef: nodeDef.fn,
              input: nodeDef.inputs,
              context: context,
            });

            const resolverResult = await resolver({
              event,
              engineId: this.engineId,
              getDependency: async function (props) {
                const { dataPath, expectedSchema } = props;

                // Evaluate data path
                const dataPathNodeDef = nodeDefsMap[dataPath.nodeId];
                assert(
                  dataPathNodeDef,
                  `Node definition not found for ${dataPath.nodeId}`
                );

                const result = await evaluateNode(dataPath.nodeId);
                if (result.type === "error") {
                  throw new Error(
                    `Fn ${printNodeDef(nodeDef)} depends on node ${printNodeDef(
                      dataPathNodeDef
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
                          dataPathNodeDef
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

            // Execute all state updates
            await Promise.all(
              resolverResult.stateUpdaters?.map((updater) => updater()) ?? []
            );

            // Append store rows to the state
            assert(this.state, "State is not defined.");
            if (resolverResult.savedStoreRows) {
              this.state.savedStoreRows.push(...resolverResult.savedStoreRows);
            }

            return {
              type: "success" as const,
              output: resolverResult,
            };
          })
          .catch((error) => {
            return {
              type: "error" as const,
              output: { message: error.message },
            };
          });

        nodePromisesMap.set(nodeDef.id, nodePromise);

        const result = await nodePromise;
        return resolveResultOrVoid(result);
      };

      await Promise.all(
        eventTypeNodes.map((nodeDef) => evaluateNode(nodeDef.id))
      );
    });
  }

  public initState(events: Array<TrenchEvent>): void {
    this.state = {
      events,
      savedStoreRows: [],
    };
    this.eventQueue.clear();
    for (const queue of Object.values(this.functionQueues)) {
      queue.clear();
    }
  }

  public async executeToCompletion(): Promise<{
    savedStoreRows: StoreRow[];
  }> {
    assert(this.state, "State is not defined.");
    this.state.events.forEach((event) => this.executeEvent(event));
    await this.eventQueue.onIdle();

    return {
      savedStoreRows: this.state.savedStoreRows,
    };
  }
}

function resolveResultOrVoid(resultOrVoid: NodeResult | void): NodeResult {
  if (resultOrVoid) {
    return resultOrVoid;
  }
  return {
    type: "error",
    output: { message: "Node failed for unknown reason" },
  };
}
