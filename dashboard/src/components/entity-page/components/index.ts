import { ReactNode } from "react";
import { EntityComponent } from "./Entity";
import { MapComponent } from "./Map";
import { TitleComponent } from "./Title";
import { VerticalListComponent } from "./VerticalList";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import { FeatureComponent } from "./Feature";
import { ColorComponent } from "./Color";
import { FeatureGridComponent } from "./FeatureGrid";

type InferConfig<TComponent> = TComponent extends EntityPageComponent<
  infer TConfig
>
  ? TConfig
  : never;

type RegistryConfig<
  TType extends ComponentType = ComponentType,
  T extends EntityPageComponent<any> = EntityPageComponent<object>,
> = {
  type: TType;
  component: T;
  defaultConfig: InferConfig<T>;
  getChildrenIds: (config: InferConfig<T>) => string[];
};

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

function config<TT extends ComponentType, TC extends EntityPageComponent<any>>(
  defaultConfig: PartialBy<RegistryConfig<TT, TC>, "getChildrenIds">
): RegistryConfig<TT, TC> {
  return {
    getChildrenIds: () => [],
    ...defaultConfig,
  };
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
    getChildrenIds: (config) => config.items,
  }),
  [ComponentType.Feature]: config({
    type: ComponentType.Feature,
    component: FeatureComponent,
    defaultConfig: {
      featurePath: [],
    },
  }),
  [ComponentType.Color]: config({
    type: ComponentType.Color,
    component: ColorComponent,
    defaultConfig: {
      color: "white",
    },
  }),
  [ComponentType.FeatureGrid]: config({
    type: ComponentType.FeatureGrid,
    component: FeatureGridComponent,
    defaultConfig: {
      featureDraggableIds: [],
      title: "Feature Grid",
    },
    getChildrenIds: (config) => config.featureDraggableIds,
  }),
} satisfies {
  [K in ComponentType]: RegistryConfig<K, any>;
};

type Registry = typeof COMPONENT_REGISTRY;

export function getComponent<T extends ComponentType>(type: T) {
  return COMPONENT_REGISTRY[type] as unknown as ComponentType extends T
    ? RegistryConfig
    : Registry[T]["component"];
}

// infer the type of the component config from the registry
export type ComponentConfigSchemaMap = {
  [K in keyof Registry]: InferConfig<Registry[K]["component"]>;
};

export type ComponentConfig<T extends ComponentType = ComponentType> = {
  type: T;
  config: ComponentConfigSchemaMap[T];
};
