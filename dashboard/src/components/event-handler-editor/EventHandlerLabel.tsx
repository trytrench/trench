import { RenderCodeHash } from "./RenderCodeHash";
import { type EventHandler } from "./types";

export function EventHandlerLabel(props: { eventHandler: EventHandler }) {
  const { eventHandler } = props;

  return (
    <div className="flex whitespace-nowrap items-center">
      <RenderCodeHash hashHex={eventHandler.hash} size="xs" />
      <span className="text-sm ml-1 mb-0.5">{eventHandler.message}</span>
    </div>
  );
}
