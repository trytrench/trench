import {
  FN_TYPE_REGISTRY,
  hasFnType,
  type FnDef,
  type FnType,
  type NodeDef,
  hasType,
} from "event-processing";
import { type StoreApi, type UseBoundStore, create } from "zustand";
import { assert, generateNanoId } from "../../../../../../packages/common/src";
import { persist, createJSONStorage } from "zustand/middleware";

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

type RawNode<T extends FnType = FnType> = Omit<NodeDef<T>, "fn"> & {
  fnId: string;
};

type NodeDefSetArgs<T extends FnType> = Omit<RawNode<T>, "dependsOn">;

type NodeDefWithFnSetArgs<T extends FnType> = Omit<NodeDef<T>, "dependsOn">;

type FnDefSetArgs<T extends FnType> = FnDef<T>;

interface EditorState {
  nodes: Record<string, RawNode>;
  fns: Record<string, FnDef>;
  initialized: boolean;

  initializeFromNodeDefs: (nodeDefs: NodeDef[], force?: boolean) => void;

  setNodeDefWithFn: <T extends FnType>(
    fnType: T,
    nodeDef: NodeDefWithFnSetArgs<T>
  ) => Promise<NodeDef<T>>;

  setNodeDef: <T extends FnType>(
    nodeDef: NodeDefSetArgs<T>
  ) => Promise<NodeDef<T>>;

  setFnDef: <T extends FnType>(
    fnId: string,
    fnDef: FnDefSetArgs<T>
  ) => Promise<FnDef<T>>;
}

function fnDefIsValid(fnDef: FnDef): fnDef is FnDef {
  const fnType = FN_TYPE_REGISTRY[fnDef.type];
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
  const type = FN_TYPE_REGISTRY[fnType];
  const { inputSchema, getDependencies } = type;

  // Validate inputs
  inputSchema.parse(inputs);

  return {
    dependsOn: getDependencies(inputs),
  };
}

const useEditorStoreBase = create<EditorState>()(
  persist<EditorState>(
    (set, get) => ({
      nodes: {},
      fns: {},
      initialized: false,

      initializeFromNodeDefs: (nodeDefs, force) => {
        if (get().initialized && !force) return;

        const fns: Record<string, FnDef> = {};
        const nodes: Record<string, RawNode> = {};

        nodeDefs.forEach((nodeDef) => {
          fns[nodeDef.fn.id] = nodeDef.fn;

          nodes[nodeDef.id] = {
            ...nodeDef,
            fnId: nodeDef.fn.id,
          };
        });

        set({ nodes, fns, initialized: true });
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
        }));

        return {
          ...nodeDef,
          dependsOn,
        };
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      setFnDef: async (fnId, fnDef) => {
        assert(fnDefIsValid(fnDef), `Invalid fn def`);

        set((s) => ({
          fns: {
            ...s.fns,
            [fnId]: fnDef,
          },
        }));

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
        }));

        return {
          ...nodeDef,
          dependsOn,
          fn: fn as any,
        };
      },
    }),
    {
      name: "trench-editor",
      storage: createJSONStorage(() => localStorage),
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
  getNodeDefs: (props?: { eventType?: string }) => (store: EditorState) => {
    let nodes = Object.values(store.nodes);

    console.log(store);
    if (props?.eventType) {
      nodes = nodes.filter((n) => n.eventType === props.eventType);
    }

    const nodeDefs = nodes.map((node) => {
      const fn = store.fns[node.fnId];
      assert(fn, `Unknown fn ${node.fnId}`);

      return { ...node, fn };
    });

    return nodeDefs;
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
    <T extends FnType = FnType>(props?: { fnType?: T }) =>
    (store: EditorState) => {
      let allFnDefs = Object.values(store.fns);
      if (props?.fnType) {
        allFnDefs = allFnDefs.filter((n) => n.type === props.fnType);
      }
      return allFnDefs as FnDef<T extends FnType ? T : FnType>[];
    },
};
