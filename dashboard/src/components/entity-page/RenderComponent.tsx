import { COMPONENT_REGISTRY } from "./components";
import { useComponentConfig } from "./useComponentConfig";

export function RenderComponent(props: { id: string }) {
  const [config, setConfig] = useComponentConfig(props.id);
  const Component = COMPONENT_REGISTRY[config.type].component;

  return <Component config={config.config as any} id={props.id} />;
}
