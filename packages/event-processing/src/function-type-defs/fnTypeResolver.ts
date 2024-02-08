import { ZodType, ZodObject, z } from "zod";
import { FnType } from "./enum";
import { InferSchemaType, TSchema, TypeName, tSchemaZod } from "../data-types";
import { StoreRow } from "./lib/store";
import { DataPath, DataPathInfoGetter } from "../data-path";
import { FnDef, FnTypeDef } from ".";

export type TrenchEvent = {
  id: string;
  type: string;
  timestamp: Date;
  data: object;
};

export type StateUpdater = () => Promise<void>;

export type Resolver<TReturn extends TSchema = TSchema> = (input: {
  event: TrenchEvent;
  engineId: string;
  getDependency<TR extends TSchema>(props: {
    dataPath: DataPath;
    expectedSchema?: TR;
  }): Promise<InferSchemaType<TR>>;
}) => Promise<{
  stateUpdaters?: readonly StateUpdater[];
  savedStoreRows?: StoreRow[];
  data: InferSchemaType<TReturn>;
}>;

export type FnTypeResolver<
  TFnType extends FnType = FnType,
  TReturn extends TSchema = TSchema,
  TConfigSchema extends ZodType = ZodType,
  TInputSchema extends ZodType = ZodType,
  TContext = any,
> = {
  fnTypeDef: FnTypeDef<TFnType, TReturn, TConfigSchema, TInputSchema, TContext>;
  createResolver: (options: {
    fnDef: FnDef<TFnType, TReturn, z.infer<TConfigSchema>>;
    input: z.infer<TInputSchema>;
    context: TContext;
  }) => Resolver<TReturn>;
};
