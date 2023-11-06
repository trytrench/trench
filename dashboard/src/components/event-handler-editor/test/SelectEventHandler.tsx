import { formatDistance, formatRelative } from "date-fns";
import { api } from "../../../utils/api";
import { RenderCodeHash } from "../RenderCodeHash";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../../global-state/editor";
import { useProject } from "../../../hooks/useProject";
import { Fragment } from "react";
import { Panel } from "../../ui/custom/panel";
import { Separator } from "../../ui/separator";
import { cn } from "../../../lib/utils";

interface SelectEventHandlerProps {
  eventHandlerId?: string;
  onChange?: (backtestId: string) => void;
}

export function SelectEventHandler(props: SelectEventHandlerProps) {
  const { eventHandlerId, onChange } = props;

  const { data: project } = useProject();
  const { data: eventHandlers, refetch } = api.eventHandlers.list.useQuery(
    { projectId: project!.id },
    { enabled: !!project }
  );

  const [compileStatus] = useAtom(compileStatusAtom);

  if (compileStatus.status !== "success") {
    return null;
  }

  return (
    <div>
      <div className="h-4"></div>
      <div className="text-lg text-foreground p-4">Code Snapshots</div>
      {!eventHandlers ? (
        <div>Loading...</div>
      ) : eventHandlers.length === 0 ? (
        <div className="text-muted-foreground">No code snapshots yet</div>
      ) : (
        <div>
          {eventHandlers.map((handler, idx) => {
            return (
              <Fragment key={handler.id}>
                <Separator />
                <button
                  className={cn({
                    "w-full p-4 ": true,
                    "hover:bg-accent/50": eventHandlerId !== handler.id,
                    "bg-accent": eventHandlerId === handler.id,
                  })}
                  onClick={() => {
                    onChange?.(handler.id);
                  }}
                >
                  <div className="flex justify-between">
                    <span className="font-bold">{handler.description}</span>{" "}
                    <span className="italic text-muted-foreground">
                      {formatDistance(handler.createdAt, Date.now(), {
                        addSuffix: true,
                      })}{" "}
                    </span>
                  </div>
                  <div className="h-2"></div>
                  <div className="flex items-center">
                    {handler?.hash && (
                      <RenderCodeHash size="xs" hashHex={handler.hash} />
                    )}
                  </div>
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
