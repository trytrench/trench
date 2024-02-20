import { ZodType, ZodNull, ZodObject, ZodUndefined, z } from "zod";
import {
  AnyFnTypeDef,
  FnDef,
  FnTypeDef,
  InputValidator,
  Resolver,
} from "./functionTypeDef";
import { FnType } from "./enum";
import { TSchema, TypeName } from "../data-types";
import { FnTypeResolver } from "./fnTypeResolver";
import { QueueOptions, QueueType } from "./lib/queueTypes";

type InferBuilderFromDef<T extends AnyFnTypeDef> = T extends FnTypeDef<
  infer TFT,
  infer TRS,
  infer TCS,
  infer TIS,
  infer TC
>
  ? FnTypeResolverBuilder<TFT, TRS, TCS, TIS, TC>
  : never;

export interface FnTypeResolverBuilder<
  TFnType extends FnType = FnType,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends ZodType = ZodType,
  TInputSchema extends ZodType = ZodType,
  TContext = unknown,
> {
  _partialResolver: Partial<
    FnTypeResolver<
      TFnType,
      TReturnSchema,
      TConfigSchema,
      TInputSchema,
      TContext
    >
  >;
  setFnTypeDef<TFTD extends AnyFnTypeDef>(
    fnTypeDef: TFTD
  ): InferBuilderFromDef<TFTD>;
  setGetQueueOptions(
    getQueueOptions: (props: {
      fnDef: FnDef<TFnType, TReturnSchema, z.infer<TConfigSchema>>;
    }) => QueueOptions
  ): FnTypeResolverBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setCreateResolver(
    createResolver: (options: {
      fnDef: FnDef<TFnType, TReturnSchema, z.infer<TConfigSchema>>;
      input: z.infer<TInputSchema>;
      context: TContext;
    }) => Resolver<TReturnSchema>
  ): FnTypeResolverBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  build(): FnTypeResolver<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
}

// createFnTypeResolverBuilder function
export function createFnTypeResolverBuilder<
  TFnType extends FnType = FnType,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends ZodType = ZodType,
  TInputSchema extends ZodType = ZodType,
  TContext = unknown,
>(
  def?: Partial<FnTypeResolver>
): FnTypeResolverBuilder<
  TFnType,
  TReturnSchema,
  TConfigSchema,
  TInputSchema,
  TContext
> {
  const partialResolver = {
    getQueueOptions({ fnDef }) {
      return {
        uniqueId: fnDef.id,
        queueType: QueueType.PureFunctionQueue,
      };
    },
    ...def,
  } satisfies Partial<FnTypeResolver>;

  return {
    _partialResolver: partialResolver as any,
    setFnTypeDef<T extends FnTypeDef>(fnTypeDef: T) {
      return createNewFnTypeResolverBuilder(partialResolver, {
        fnTypeDef,
      }) as InferBuilderFromDef<T>;
    },
    setCreateResolver(createResolver) {
      return createNewFnTypeResolverBuilder(partialResolver, {
        createResolver,
      });
    },
    setGetQueueOptions(getQueueOptions) {
      return createNewFnTypeResolverBuilder(partialResolver, {
        getQueueOptions,
      });
    },
    build() {
      if (
        // These fields have to be set via the builder
        !partialResolver.fnTypeDef ||
        !partialResolver.createResolver
      ) {
        throw new Error("Missing required properties to build FnTypeResolver");
      }

      return partialResolver as unknown as FnTypeResolver<
        TFnType,
        TReturnSchema,
        TConfigSchema,
        TInputSchema,
        TContext
      >;
    },
  };
}

// createNewFnTypeResolverBuilder function
function createNewFnTypeResolverBuilder<
  TFnType extends FnType,
  TReturnSchema extends TSchema,
  TConfigSchema extends ZodType,
  TInputSchema extends ZodType,
  TContext = unknown,
>(
  prevResolver: Partial<FnTypeResolver>,
  newResolver: Partial<
    FnTypeResolver<
      TFnType,
      TReturnSchema,
      TConfigSchema,
      TInputSchema,
      TContext
    >
  >
): FnTypeResolverBuilder<
  TFnType,
  TReturnSchema,
  TConfigSchema,
  TInputSchema,
  TContext
> {
  return createFnTypeResolverBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >({
    ...prevResolver,
    ...newResolver,
  } as any);
}
