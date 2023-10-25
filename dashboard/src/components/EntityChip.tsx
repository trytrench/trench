import * as HoverCard from "@radix-ui/react-hover-card";
import clsx from "clsx";
import { BoxIcon } from "lucide-react";
import { useState } from "react";
import { type RouterOutputs } from "~/utils/api";
import { Badge } from "./ui/badge";
import { Panel } from "./ui/custom/panel";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  href: string;
}

export const EntityChip = ({ entity, href }: Props) => {
  const entityFeatures = Object.entries(entity.features ?? {});
  const hasFeatures = entityFeatures.length > 0;
  const entityLabels = entity.labels.filter((v) => v !== "") ?? [];

  const [open, setOpen] = useState(false);

  return (
    <HoverCard.Root
      openDelay={100}
      closeDelay={0}
      onOpenChange={setOpen}
      open={open}
    >
      <HoverCard.Trigger asChild>
        <a
          className={clsx({
            "rounded-full p-1 px-3 flex gap-2 border bg-white hover:bg-gray-50 active:bg-gray-100 drop-shadow-sm max-w-[16rem] cursor-pointer":
              true,
          })}
          key={entity.id}
          href={href}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <BoxIcon className="my-auto text-gray-500 shrink-0" size={18} />
          <div className="grow min-w-0">
            <div className="truncate font-semibold">
              {entity.type}: {entity.name}
            </div>
          </div>
        </a>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          className="pointer-events-none"
          align="start"
          side="bottom"
          sideOffset={0}
          arrowPadding={10}
        >
          <Panel className="w-[24rem] shadow-none drop-shadow-lg bg-white p-4 mr-4">
            <div className="">
              <div className="font-semibold text-black">{entity.name}</div>
              <div className="text-xs">Last seen {"--"}</div>
              <div className="mt-1">
                {entityLabels.length > 0 ? (
                  entityLabels.map((label) => {
                    return (
                      <Badge key={label} className="cursor-pointer">
                        {label}
                      </Badge>
                    );
                  })
                ) : (
                  <></>
                )}
              </div>
            </div>
            <div className="h-1"></div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-4 mt-2">
              {hasFeatures ? (
                entityFeatures.map(([key, value], idx) => (
                  <div key={key}>
                    <div className="font-semibold text-xs">{key}</div>
                    <div className="truncate text-xs">
                      {value === 0
                        ? "0"
                        : value === true
                        ? "True"
                        : value === false
                        ? "False"
                        : (value as string) || "-"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 italic">No features</div>
              )}
            </div>
          </Panel>
          <HoverCard.Arrow asChild>
            {/* Triangle svg */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 12 6"
              fill="white"
              stroke="currentColor"
              className="w-[12px] h-[6px] text-gray-200 z-100"
              fillRule="evenodd"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M0 0l6 6L12 0"
              />
            </svg>
          </HoverCard.Arrow>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};
