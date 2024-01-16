import { ReactNode } from "react";
import { EntityComponent } from "./Entity";
import { MapComponent } from "./Map";
import { TitleComponent } from "./Title";
import { VerticalListComponent } from "./VerticalList";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import { FeatureComponent } from "./Feature";

// Utility type to extract the 'config' type from a component's props
type InferConfig<TComponent> = TComponent extends EntityPageComponent<
  infer TConfig
>
  ? TConfig
  : never;

type RegistryConfig<TType, T> = {
  type: TType;
  component: T;
  defaultConfig: InferConfig<T>;
};

function config<TT, TC>(defaultConfig: RegistryConfig<TT, TC>) {
  return defaultConfig;
}

export const COMPONENT_REGISTRY = {
  [ComponentType.Entity]: config({
    type: ComponentType.Entity,
    component: EntityComponent,
    defaultConfig: {
      entityFeaturePath: [],
    },
  }),
  [ComponentType.Map]: config({
    type: ComponentType.Map,
    component: MapComponent,
    defaultConfig: {
      locationFeaturePath: [],
    },
  }),
  [ComponentType.Title]: config({
    type: ComponentType.Title,
    component: TitleComponent,
    defaultConfig: {
      title: "HELLO WORLD",
    },
  }),
  [ComponentType.VerticalList]: config({
    type: ComponentType.VerticalList,
    component: VerticalListComponent,
    defaultConfig: {
      items: [],
    },
  }),
  [ComponentType.Feature]: config({
    type: ComponentType.Feature,
    component: FeatureComponent,
    defaultConfig: {
      featureId: null,
    },
  }),
} satisfies {
  [K in ComponentType]: RegistryConfig<K, any>;
};

type Registry = typeof COMPONENT_REGISTRY;

// infer the type of the component config from the registry
export type ComponentConfigSchemaMap = {
  [K in keyof Registry]: InferConfig<Registry[K]["component"]>;
};

export type ComponentConfigMap = {
  [K in ComponentType]: {
    type: K;
    config: ComponentConfigSchemaMap[K];
  };
};

export type ComponentConfig = ComponentConfigMap[keyof ComponentConfigMap];
