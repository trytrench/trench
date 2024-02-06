import {
  hasFnType,
  type FnDef,
  type FnType,
  type NodeDef,
  hasType,
  type TSchema,
  type FnDefAny,
  type NodeDefAny,
  getFnTypeDef,
  nodeIdsFromDataPaths,
  type DataPathInfoGetter,
} from "event-processing";
import { create } from "zustand";
import { assert } from "../../../../../../packages/common/src";
import { persist, type PersistStorage } from "zustand/middleware";
import superjson from "superjson";
import { checkErrors, getSchemaAtPath } from "../../../../shared/publish";
import { createSelectors } from "../../../../lib/zustand";

type RawNode<T extends FnType = FnType> = Omit<NodeDef<T>, "fn"> & {
  fnId: string;
};

type NodeDefSetArgs<T extends FnType> = Omit<RawNode<T>, "dependsOn">;

type NodeDefWithFnSetArgs<T extends FnType> = Omit<NodeDef<T>, "dependsOn">;

type FnDefSetArgs<T extends FnType> = FnDef<T>;

export type Engine = {
  id: string;
  createdAt: Date;
};

export type EngineCompileStatus =
  | { status: "idle" }
  | { status: "compiling" }
  | { status: "success" }
  | { status: "error"; errors: Record<string, string> };

interface EditorState {
  engine: Engine | null;
  hasChanged: boolean;

  nodes: Record<string, RawNode>;
  fns: Record<string, FnDefAny>;

  status: EngineCompileStatus;

  initializeFromNodeDefs: (props: {
    engine: Engine;
    nodeDefs: NodeDef[];
    force?: boolean;
  }) => void;

  // Update status
  updateErrors: () => void;
  setStatus: (status: EngineCompileStatus) => void;

  setNodeDefWithFn: <T extends FnType>(
    fnType: T,
    nodeDef: NodeDefWithFnSetArgs<T>
  ) => Promise<NodeDef<T>>;

  setNodeDef: <T extends FnType>(
    nodeDef: NodeDefSetArgs<T>
  ) => Promise<NodeDef<T>>;

  setFnDef: <T extends FnType>(fnDef: FnDefSetArgs<T>) => Promise<FnDef<T>>;

  deleteNodeDef: (nodeId: string) => Promise<void>;

  getDataPathInfo: DataPathInfoGetter;
}

function fnDefIsValid(fnDef: FnDefAny): fnDef is FnDef {
  const fnType = getFnTypeDef(fnDef.type);
  assert(fnType, `Unknown fn type ${fnDef.type}`);
  const { configSchema } = fnType;

  // Validate config
  configSchema.parse(fnDef.config);
  return true;
}

function validateFnInput(
  fnType: FnType,
  inputs: object
): {
  dependsOn: Set<string>;
} {
  const type = getFnTypeDef(fnType);
  const { inputSchema, getDataPaths } = type;

  // Validate inputs
  inputSchema.parse(inputs);

  return {
    dependsOn: nodeIdsFromDataPaths(getDataPaths(inputs)),
  };
}

const storage: PersistStorage<EditorState> = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return superjson.parse(str);
  },
  setItem: (name, value) => {
    localStorage.setItem(name, superjson.stringify(value));
  },
  removeItem: (name) => localStorage.removeItem(name),
};

const useEditorStoreBase = create<EditorState>()(
  persist<EditorState>(
    (set, get) => ({
      hasChanged: false,
      engine: null,

      nodes: {},
      fns: {},
      errors: {},
      status: { status: "idle" },

      updateErrors: () => {
        get().setStatus({ status: "compiling" });
        const allNodeDefs = selectors.getNodeDefs()(get());
        const errors = checkErrors(allNodeDefs);
        if (Object.keys(errors).length === 0) {
          get().setStatus({ status: "success" });
        } else {
          get().setStatus({ status: "error", errors });
        }
      },

      setStatus: (status) => {
        set({ status });
      },

      initializeFromNodeDefs: ({ engine, nodeDefs, force }) => {
        if (get().engine && !force) return;

        const fns: Record<string, FnDef> = {};
        const nodes: Record<string, RawNode> = {};

        nodeDefs.forEach((nodeDef) => {
          fns[nodeDef.fn.id] = nodeDef.fn;

          nodes[nodeDef.id] = {
            ...nodeDef,
            fnId: nodeDef.fn.id,
          };
        });

        set({
          nodes,
          fns,
          engine,
          hasChanged: false,
        });

        get().setStatus({ status: "idle" });
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      setNodeDefWithFn: async (fnType, nodeDef) => {
        const fn = nodeDef.fn;

        assert(hasType(fn, fnType), `Unknown fn type ${fnType}`);

        const { dependsOn } = validateFnInput(fn.type, nodeDef.inputs);
        assert(fnDefIsValid(fn), `Invalid fn def`);

        set((s) => ({
          nodes: {
            ...s.nodes,
            [nodeDef.id]: {
              ...nodeDef,
              dependsOn,
              fnId: fn.id,
            },
          },
          fns: {
            ...s.fns,
            [fn.id]: fn,
          },
          hasChanged: true,
        }));

        get().setStatus({ status: "idle" });

        return {
          ...nodeDef,
          dependsOn,
        };
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      setFnDef: async (fnDef) => {
        assert(fnDefIsValid(fnDef), `Invalid fn def`);

        set((s) => ({
          fns: {
            ...s.fns,
            [fnDef.id]: fnDef,
          },
          hasChanged: true,
        }));

        get().setStatus({ status: "idle" });

        return fnDef;
      },

      // eslint-disable-next-line @typescript-eslint/require-await
      setNodeDef: async (nodeDef) => {
        const oldNode = get().nodes[nodeDef.id];
        assert(oldNode, `Node ${nodeDef.id} not found`);

        const fn = get().fns[nodeDef.fnId];
        assert(fn, `Unknown fn ${nodeDef.fnId}`);

        const { dependsOn } = validateFnInput(fn.type, nodeDef.inputs);

        set((s) => ({
          nodes: {
            ...s.nodes,
            [nodeDef.id]: {
              ...nodeDef,
              dependsOn,
            },
          },
          hasChanged: true,
        }));

        get().setStatus({ status: "idle" });

        return {
          ...nodeDef,
          dependsOn,
          fn: fn as any,
        };
      },

      // eslint-disable-next-line @typescript-eslint/require-await
      deleteNodeDef: async (nodeId) => {
        set((s) => {
          const nodes = { ...s.nodes };
          delete nodes[nodeId];
          return { nodes, hasChanged: true };
        });
      },

      getDataPathInfo: (dataPath) => {
        const state = get();
        const nodeDef = selectors.getNodeDef(dataPath.nodeId)(state);

        let schema: TSchema | null = null;
        if (nodeDef) {
          schema = getSchemaAtPath(nodeDef.fn.returnSchema, dataPath.path);
        }
        return {
          schema,
        };
      },
    }),
    {
      name: "trench-editor",
      storage: storage,
    }
  )
);

export const useEditorStore = createSelectors(useEditorStoreBase);

export const selectors = {
  getNodeDef:
    <T extends FnType>(nodeId: string, fnType?: T) =>
    (store: EditorState) => {
      const node = store.nodes[nodeId];
      if (!node) return undefined;
      const fn = store.fns[node.fnId];
      if (!fn) return undefined;

      const nodeDef = { ...node, fn };
      assert(hasFnType(nodeDef, fnType), `Unknown fn type ${fnType}`);
      return nodeDef as NodeDef<T>;
    },
  getNodeDefs:
    <T extends FnType>(props?: { eventType?: string; fnType?: T }) =>
    (store: EditorState) => {
      let nodes = Object.values(store.nodes);

      if (props?.eventType) {
        nodes = nodes.filter((n) => n.eventType === props.eventType);
      }

      let nodeDefs: NodeDefAny[] = nodes.map((node) => {
        const fn = store.fns[node.fnId];
        assert(fn, `Unknown fn ${node.fnId}`);

        return { ...node, fn };
      });

      if (props?.fnType) {
        nodeDefs = nodeDefs.filter((n) => hasFnType(n, props.fnType));
      }

      return nodeDefs as T extends FnType ? NodeDef<T>[] : NodeDefAny[];
    },
  getNode: (nodeId: string) => (store: EditorState) => {
    return store.nodes[nodeId];
  },
  getNodes: (props: { eventType?: string }) => (store: EditorState) => {
    let allNodes = Object.values(store.nodes);
    if (props.eventType) {
      allNodes = allNodes.filter((n) => n.eventType === props.eventType);
    }
    return allNodes;
  },
  getFnDef:
    <T extends FnType>(fnId: string, fnType?: T) =>
    (store: EditorState) => {
      const fn = store.fns[fnId];
      if (!fn) return undefined;

      assert(hasType(fn, fnType), `Unknown fn type ${fnType}`);
      return fn;
    },
  getFnDefs:
    <T extends FnType>(props?: { fnType?: T }) =>
    (store: EditorState) => {
      let allFnDefs = Object.values(store.fns);
      if (props?.fnType) {
        allFnDefs = allFnDefs.filter((n) => n.type === props.fnType);
      }
      return allFnDefs as FnDef<T extends FnType ? T : FnType>[];
    },
};
