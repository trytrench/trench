import {
  Type,
  Symbol,
  SymbolFlags,
  Signature,
  Node,
  TypeFormatFlags,
} from "ts-morph";
import { TSchema, TypeName } from "../../data-types";

// From: https://gist.github.com/zaripych/963fa6584524e5b446b70548dbabbf65

function isPrimitive(type: Type) {
  if (type.isString()) {
    return true;
  }
  if (type.isStringLiteral()) {
    return true;
  }
  if (type.isUndefined()) {
    return true;
  }
  if (type.isNull()) {
    return true;
  }
  if (type.isUnknown()) {
    return true;
  }
  if (type.isAny()) {
    return true;
  }
  if (type.isNumber()) {
    return true;
  }
  if (type.isNumberLiteral()) {
    return true;
  }
  if (type.isBoolean()) {
    return true;
  }
  if (type.isBooleanLiteral()) {
    return true;
  }
  if (intrinsicNameOf(type) === "void") {
    // isVoid
    return true;
  }
  return false;
}

export function isPromise(type: Type) {
  const symbol = type.getSymbol();
  if (!type.isObject() || !symbol) {
    return false;
  }
  const args = type.getTypeArguments();
  return symbol.getName() === "Promise" && args.length === 1;
}

function isSimpleSignature(type: Type) {
  if (!type.isObject()) {
    return false;
  }
  const sigs = type.getCallSignatures();
  const props = type.getProperties();
  const args = type.getTypeArguments();
  const indexType = type.getNumberIndexType();
  const stringType = type.getStringIndexType();
  return (
    sigs.length === 1 &&
    props.length === 0 &&
    args.length === 0 &&
    !indexType &&
    !stringType
  );
}

function intrinsicNameOf(type: Type) {
  return (type.compilerType as unknown as { intrinsicName: string })
    .intrinsicName;
}

type FormatFlags =
  | false // <- to be able to pass down conditional flags
  | "remove-undefined-from-intersections";

export function footprintOfType(params: {
  type: Type;
  node: Node;
  overrides?: Record<string, string>;
  flags?: FormatFlags[];
  callStackLevel?: number;
}): TSchema | null {
  const { type, node, overrides, flags = [], callStackLevel = 0 } = params;

  if (callStackLevel > 9) {
    // too deep?
    return null;
  }

  const next = (nextType: Type, nextFlags: FormatFlags[] = []) => {
    return footprintOfType({
      type: nextType,
      node,
      overrides,
      flags: nextFlags,
      callStackLevel: callStackLevel + 1,
    });
  };

  const indent = (text: string, lvl: number = 1) =>
    text.replace(/^/gm, " ".repeat(lvl * 2));

  const defaultFormat = (): TSchema | null => {
    if (type.isString()) {
      return { type: TypeName.String };
    }
    if (type.isStringLiteral()) {
      return { type: TypeName.String };
    }
    if (type.isUndefined()) {
      return { type: TypeName.Undefined };
    }
    if (type.isNull()) {
      return { type: TypeName.Null };
    }
    if (type.isUnknown()) {
      return null;
    }
    if (type.isAny()) {
      return { type: TypeName.Any };
    }
    if (type.isNumber()) {
      return { type: TypeName.Float64 };
    }
    if (type.isNumberLiteral()) {
      return { type: TypeName.Float64 };
    }
    if (type.isBoolean()) {
      return { type: TypeName.Boolean };
    }
    if (type.isBooleanLiteral()) {
      return { type: TypeName.Boolean };
    }
    if (intrinsicNameOf(type) === "void") {
      // isVoid
      return null;
    }
    return null;
  };

  const symbol = type.getAliasSymbol();
  if (overrides && symbol) {
    const result = overrides[symbol.getName()];
    if (result) {
      // return result;
      return null;
    }
  }

  if (isPrimitive(type)) {
    return defaultFormat();
  }

  if (type.isArray()) {
    const subType = type.getArrayElementTypeOrThrow();
    const itemsSchema = next(subType);
    return {
      type: TypeName.Array,
      items: itemsSchema ?? { type: TypeName.Any },
    };
  }

  if (type.isTuple()) {
    const types = type.getTupleElements();

    return {
      type: TypeName.Tuple,
      items: types.map((type) => next(type) ?? { type: TypeName.Any }),
    };
  }

  if (type.isObject() && isPromise(type)) {
    const first = type.getTypeArguments()[0];
    if (!first) {
      throw new Error("This should not have happened");
    }
    return {
      type: TypeName.Any,
    };
  }

  if (type.isObject() && isSimpleSignature(type)) {
    // return signatures(type.getCallSignatures(), "type", next);
    return {
      type: TypeName.Any,
    };
  }

  if (type.isObject()) {
    const props = type.getProperties();
    const sigs = type.getCallSignatures();
    const numIndex = type.getNumberIndexType();
    const stringIndex = type.getStringIndexType();
    if (props.length === 0 && sigs.length === 0 && !numIndex && !stringIndex) {
      return {
        type: TypeName.Object,
        properties: {},
      };
    }

    return {
      type: TypeName.Object,
      properties: Object.fromEntries(
        props.map((prop) => {
          const propertyName = prop.getName();

          const propertySchema = footprintOfType({
            type: prop.getTypeAtLocation(node),
            node,
            overrides,
            flags,
            callStackLevel: callStackLevel + 1,
          });

          const finalSchema: TSchema | null = propertySchema
            ? prop.hasFlags(SymbolFlags.Optional)
              ? {
                  type: TypeName.Union,
                  unionTypes: [propertySchema, { type: TypeName.Undefined }],
                }
              : propertySchema
            : null;

          return [propertyName, finalSchema ?? { type: TypeName.Any }];
        })
      ),
    };
    // const sigsText = signatures(sigs, "declaration", next);
    // const propsText = properties(props, node, next);
    // const numIndexText = numIndex && `[index: number]: ${next(numIndex)};`;
    // const stringIndexText =
    //   stringIndex && `[index: string]: ${next(stringIndex)};`;
    // return [
    //   "{\n",
    //   numIndexText && indent(numIndexText),
    //   stringIndexText && indent(stringIndexText),
    //   sigs.length > 0 && indent(sigsText),
    //   props.length > 0 && indent(propsText),
    //   "\n}",
    // ]
    //   .filter(Boolean)
    //   .join("");
  }

  if (type.isUnion()) {
    const typeStrs = type
      .getUnionTypes()
      .filter((type) => {
        if (flags.includes("remove-undefined-from-intersections")) {
          return !type.isUndefined();
        }
        return true;
      })
      .map((type) => next(type));

    return {
      type: TypeName.Union,
      unionTypes: typeStrs.map((typeStr) => typeStr ?? { type: TypeName.Any }),
    };
  }

  if (type.isIntersection()) {
    return {
      type: TypeName.Any,
    };
    // return type
    //   .getIntersectionTypes()
    //   .map((type) => next(type))
    //   .join(" & ");
  }

  // when you encounter this, consider changing the function
  return {
    type: TypeName.Any,
  };
}

function properties(
  props: Symbol[],
  node: Node,
  next: (type: Type, flags: FormatFlags[]) => string
) {
  return props.map((value) => property(value, node, next)).join("\n");
}

function property(
  prop: Symbol,
  node: Node,
  next: (type: Type, flags: FormatFlags[]) => string
): string {
  const type = prop.getTypeAtLocation(node);
  const sigs = type.getCallSignatures();
  const firstSig = sigs?.[0];
  if (
    isSimpleSignature(type) &&
    !prop.hasFlags(SymbolFlags.Optional) &&
    firstSig
  ) {
    return signature(firstSig, "declaration", next, prop.getName()) + ";";
  }
  const isOptional = prop.hasFlags(SymbolFlags.Optional);
  return [
    prop.getName(),
    isOptional ? "?" : "",
    ": ",
    next(type, [isOptional && "remove-undefined-from-intersections"]),
    ";",
  ].join("");
}

function signatures(
  sigs: Signature[],
  variant: "type" | "declaration",
  next: (type: Type, flags: FormatFlags[]) => string
) {
  return sigs.map((sig) => signature(sig, variant, next)).join("\n");
}

function signature(
  sig: Signature,
  variant: "type" | "declaration",
  next: (type: Type, flags: FormatFlags[]) => string,
  methodName?: string
): string {
  const name = sig.getDeclaration().getSymbol()?.getName();
  const nameToUse =
    methodName ?? (["__type", "__call"].includes(name ?? "") ? "" : name);
  const params = sig.getParameters();
  return [
    variant === "declaration" ? nameToUse : "",
    "(",
    params
      .map((param) =>
        [
          param.getName(),
          param.hasFlags(SymbolFlags.Optional) ? "?" : "",
          ": ",
          param
            .getDeclarations()
            .map((decl) => next(decl.getType(), []))
            .join(","),
        ].join("")
      )
      .join(", "),
    ")",
    variant === "declaration" ? ": " : " => ",
    next(sig.getReturnType(), []),
  ].join("");
}
