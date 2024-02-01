import { getComponent } from "./components";
import { selectors, useEditorStore } from "./state";
import { type SetStateAction } from "react";

export function RenderComponent(props: {
  id: string;
  entity: {
    id: string;
    type: string;
  };
}) {
  const { id, entity } = props;

  const setComponent = useEditorStore.use.setComponent();
  const component = useEditorStore(selectors.getComponent(id));

  if (!component) return null;

  const Component = getComponent(component.type).component;

  const handleSetConfig = (arg: SetStateAction<object>) => {
    setComponent(id, (prev) => {
      if (!prev) {
        throw new Error("Component not found. This should never happen.");
      }

      const config = typeof arg === "function" ? arg(prev.config) : arg;

      return { type: component.type, config };
    });
  };

  return (
    <Component
      config={component?.config}
      setConfig={handleSetConfig}
      id={id}
      entity={entity}
    />
  );
}
