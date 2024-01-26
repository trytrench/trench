import {
  FN_TYPE_REGISTRY,
  type FnDef,
  type FnDefsMap,
  type FnType,
  type NodeDef,
  type NodeDefsMap,
} from "event-processing";
import { type StoreApi, type UseBoundStore, create } from "zustand";
import { customAlphabet } from "nanoid";
import { assert } from "../../../../../../packages/common/src";

function generateNanoId(
  size = 21,
  alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
) {
  const nanoId = customAlphabet(alphabet, size);
  return nanoId();
}

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

type RawNode = Omit<NodeDefsMap[FnType], "fn"> & {
  fnId: string;
};

type NodeCreateArgs = Omit<RawNode, "id" | "dependsOn">;

type FnCreateArgs = Omit<FnDef, "id">;

interface EditorState {
  nodes: Record<string, RawNode>;
  fns: Record<string, FnDefsMap[FnType]>;

  getNodeDefs: (props: { eventType?: string }) => NodeDefsMap[FnType][];
  getNodeDef: (nodeId: string) => NodeDefsMap[FnType] | undefined;
  createNode: (nodeDef: NodeCreateArgs) => void;
  deleteNode: (nodeId: string) => void;
  updateNode: (nodeId: string, nodeDef: Partial<NodeCreateArgs>) => void;

  getFnDefs: () => FnDefsMap[FnType][];
  getFnDef: (fnId: string) => FnDef | undefined;
  createFnDef: (fnDef: FnCreateArgs) => void;
  deleteFnDef: (fnId: string) => void;
  updateFnDef: (fnId: string, fnDef: Partial<FnCreateArgs>) => void;
}

function fnDefIsValid(fnDef: FnDef): fnDef is FnDefsMap[FnType] {
  const fnType = FN_TYPE_REGISTRY[fnDef.type];
  assert(fnType, `Unknown fn type ${fnDef.type}`);
  const { inputSchema } = fnType;

  // Validate inputs
  const { success } = inputSchema.safeParse(fnDef.config);

  return success;
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
  const { success } = inputSchema.safeParse(inputs);
  assert(success, `Invalid input for ${fnType}: ${JSON.stringify(inputs)}`);

  return {
    dependsOn: getDependencies(inputs),
  };
}

const useEditorStoreBase = create<EditorState>()((set, get) => ({
  nodes: {},
  fns: {},

  getNodeDefs: (props) => {
    let nodes = Object.values(get().nodes);
    if (props.eventType) {
      nodes = nodes.filter((n) => n.eventType === props.eventType);
    }

    const nodeDefs = nodes.map((node) => {
      const fn = get().fns[node.fnId];
      assert(fn, `Unknown fn ${node.fnId}`);

      return { ...node, fn };
    }) satisfies NodeDef[] as NodeDefsMap[FnType][];

    return nodeDefs;
  },
  getNodeDef: (nodeId: string) => {
    const node = get().nodes[nodeId];
    if (!node) return undefined;
    const fn = get().fns[node.fnId];
    if (!fn) return undefined;
    return { ...node, fn } satisfies NodeDef as NodeDefsMap[FnType];
  },
  createNode: (nodeDef) => {
    const id = generateNanoId();

    const fn = get().fns[nodeDef.fnId];
    assert(fn, `Unknown fn ${nodeDef.fnId}`);

    const { dependsOn } = validateFnInput(fn.type, nodeDef.inputs);

    set((s) => ({
      nodes: {
        ...s.nodes,
        [id]: {
          ...nodeDef,
          id,
          dependsOn,
        },
      },
    }));
  },
  deleteNode: (nodeId: string) => {
    set((s) => {
      const nodes = { ...s.nodes };
      delete nodes[nodeId];
      return { nodes };
    });
  },
  updateNode: (nodeId: string, node: Partial<NodeDef>) => {
    const oldNode = get().nodes[nodeId];
    assert(oldNode, `Node ${nodeId} not found`);

    const fn = get().fns[oldNode.fnId];
    assert(fn, `Unknown fn ${oldNode.fnId}`);

    const { dependsOn } = validateFnInput(fn.type, {
      ...oldNode.inputs,
      ...node.inputs,
    });

    set((s) => ({
      nodes: { ...s.nodes, [nodeId]: { ...oldNode, ...node, dependsOn } },
    }));
  },

  getFnDefs: () => {
    const allFnDefs = Object.values(get().fns);
    return allFnDefs;
  },
  getFnDef: (fnId: string) => {
    return get().fns[fnId];
  },
  createFnDef: (createArgs) => {
    const id = generateNanoId();

    const newDef = { ...createArgs, id };
    assert(fnDefIsValid(newDef), `Invalid fn def`);

    set((s) => ({
      fns: {
        ...s.fns,
        [id]: newDef,
      },
    }));
  },
  deleteFnDef: (fnId: string) => {
    set((s) => {
      const fns = { ...s.fns };
      delete fns[fnId];
      return { fns };
    });
  },
  updateFnDef: (fnId: string, fnDef: Partial<FnDef>) => {
    const oldFn = get().fns[fnId];
    assert(oldFn, `Fn ${fnId} not found`);

    const newFnDef = { ...oldFn, ...fnDef } satisfies FnDef;

    assert(fnDefIsValid(newFnDef), `Invalid fn def`);

    set((s) => ({
      fns: { ...s.fns, [fnId]: newFnDef },
    }));
  },
}));

export const useEditorStore = createSelectors(useEditorStoreBase);
