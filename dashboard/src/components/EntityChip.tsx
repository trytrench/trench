import * as HoverCard from "@radix-ui/react-hover-card";
import clsx from "clsx";
import { BoxIcon } from "lucide-react";
import { useState } from "react";
import { api, type RouterOutputs } from "~/utils/api";
import { Badge } from "./ui/badge";
import { Panel } from "./ui/custom/panel";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  href: string;
  datasetId: string;
}

export const EntityChip = ({ entity, href, datasetId }: Props) => {
  const [open, setOpen] = useState(false);

  const { data: entityData } = api.entities.get.useQuery(
    { id: entity.id, datasetId },
    { enabled: !!entity.id && open }
  );

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
                {/* {entityLabels.length > 0 ? (
                  entityLabels.map((label) => {
                    return (
                      <Badge key={label} className="cursor-pointer">
                        {label}
                      </Badge>
                    );
                  })
                ) : (
                  <></>
                )} */}
              </div>
            </div>
            <div className="h-1"></div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-4 mt-2">
              {entityData ? (
                entityData.features.map((feature, idx) => (
                  <div key={feature.name}>
                    <div className="font-semibold text-xs">{feature.name}</div>

                    {feature.dataType === "entity" && feature.value ? (
                      <div className="truncate text-xs">
                        {feature.entityName}: {feature.entityType}
                      </div>
                    ) : (
                      <div className="truncate text-xs">
                        {feature.value === 0
                          ? "0"
                          : feature.value === true
                          ? "True"
                          : feature.value === false
                          ? "False"
                          : (feature.value as string) || "-"}
                      </div>
                    )}
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
