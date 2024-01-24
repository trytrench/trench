import { AnyZodObject, ZodNull, ZodObject, ZodUndefined, z } from "zod";
import { FnDef, FnTypeDef, Resolver } from "./functionTypeDef";
import { FnType } from "./types/_enum";
import { TSchema, TypeName } from "../data-types";

// FnTypeDefBuilder interface
export interface FnTypeDefBuilder<
  TFnType extends FnType = any,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends AnyZodObject = ZodObject<{}>,
  TInputSchema extends AnyZodObject = ZodObject<{}>,
  TContext = unknown,
> {
  _partialDef: Partial<
    FnTypeDef<TFnType, TReturnSchema, TConfigSchema, TInputSchema, TContext>
  >;
  setFnType<TFT extends FnType>(
    fnType: TFT
  ): FnTypeDefBuilder<
    TFT,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setConfigSchema<TCS extends AnyZodObject>(
    configSchema: TCS
  ): FnTypeDefBuilder<TFnType, TReturnSchema, TCS, TInputSchema, TContext>;
  setInputSchema<TIS extends AnyZodObject>(
    inputSchema: TIS
  ): FnTypeDefBuilder<TFnType, TReturnSchema, TConfigSchema, TIS, TContext>;
  setReturnSchema<T extends TypeName>(
    returnType: T
  ): FnTypeDefBuilder<
    TFnType,
    Extract<TSchema, { type: T }>,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setGetDependencies(
    getDependencies: (input: z.infer<TInputSchema>) => Set<string>
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setCreateResolver<
    TCR extends (options: {
      fnDef: FnDef<TFnType, TReturnSchema, z.infer<TConfigSchema>>;
      input: z.infer<TInputSchema>;
      context: TContext;
    }) => Resolver<TReturnSchema>,
  >(
    createResolver: TCR
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setContextType<TCtx>(): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TCtx
  >;
  build(): FnTypeDef<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
}

// createFnTypeDefBuilder function
export function createFnTypeDefBuilder<
  TFnType extends FnType = any,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends AnyZodObject = ZodObject<{}>,
  TInputSchema extends AnyZodObject = ZodObject<{}>,
  TContext = unknown,
>(
  def?: Partial<FnTypeDef>
): FnTypeDefBuilder<
  TFnType,
  TReturnSchema,
  TConfigSchema,
  TInputSchema,
  TContext
> {
  const partialDef = {
    configSchema: z.object({}),
    inputSchema: z.object({}),
    ...def,
  } satisfies Partial<FnTypeDef>;

  return {
    _partialDef: partialDef as any,
    setFnType(fnType) {
      return createNewFnTypeDefBuilder(partialDef, { fnType });
    },
    setConfigSchema(configSchema) {
      return createNewFnTypeDefBuilder(partialDef, { configSchema });
    },
    setGetDependencies(getDependencies) {
      return createNewFnTypeDefBuilder(partialDef, { getDependencies });
    },
    setInputSchema(inputSchema) {
      return createNewFnTypeDefBuilder(partialDef, { inputSchema });
    },
    setReturnSchema(returnSchema) {
      return createNewFnTypeDefBuilder(partialDef, {});
    },
    setContextType<TC>() {
      return createNewFnTypeDefBuilder<
        TFnType,
        TReturnSchema,
        TConfigSchema,
        TInputSchema,
        TC
      >(partialDef, {});
    },
    setCreateResolver(createResolver) {
      return createNewFnTypeDefBuilder(partialDef, { createResolver });
    },
    build() {
      if (
        !partialDef.fnType ||
        !partialDef.configSchema ||
        !partialDef.createResolver
      ) {
        throw new Error("Missing required properties to build FnTypeDef");
      }
      return partialDef as FnTypeDef<
        TFnType,
        TReturnSchema,
        TConfigSchema,
        TInputSchema,
        TContext
      >;
    },
  };
}

// createNewFnTypeDefBuilder function
function createNewFnTypeDefBuilder<
  TFnType extends FnType,
  TReturnSchema extends TSchema,
  TConfigSchema extends AnyZodObject,
  TInputSchema extends AnyZodObject,
  TContext = unknown,
>(
  prevDef: Partial<FnTypeDef>,
  newDef: Partial<
    FnTypeDef<TFnType, TReturnSchema, TConfigSchema, TInputSchema, TContext>
  >
): FnTypeDefBuilder<
  TFnType,
  TReturnSchema,
  TConfigSchema,
  TInputSchema,
  TContext
> {
  return createFnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >({
    ...prevDef,
    ...newDef,
  } as any);
}
