import * as HoverCard from "@radix-ui/react-hover-card";
import clsx from "clsx";
import { BoxIcon } from "lucide-react";
import { useState } from "react";
import { type RouterOutputs } from "~/utils/api";
import { Badge } from "./ui/badge";
import { Panel } from "./ui/custom/panel";
import { LabelList } from "./ui/custom/label-list";
import { FeatureGrid } from "./ui/custom/feature-grid";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  href: string;
}

export const EntityChip = ({ entity, href }: Props) => {
  const entityFeatures = Object.entries(entity.features ?? {});
  const hasFeatures = entityFeatures.length > 0;
  const entityLabels = entity.labels?.filter((v) => v !== "") ?? [];

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
            "rounded-full p-1 px-3 flex gap-2 border bg-card hover:bg-muted active:bg-accent drop-shadow-sm max-w-[16rem] cursor-pointer":
              true,
          })}
          key={entity.id}
          href={href}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <BoxIcon
            className="my-auto text-muted-foreground shrink-0"
            size={18}
          />
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
          sideOffset={2}
          arrowPadding={10}
        >
          <Panel className="w-[24rem] shadow-none drop-shadow-lg bg-card p-4 mr-4">
            <div className="">
              <div className="font-semibold text-emphasis-foreground">
                {entity.name}
              </div>
              <div className="text-xs">Last seen {"--"}</div>

              <LabelList labels={entity.labels} className="mt-2" />
            </div>
            <div className="h-3"></div>
            <FeatureGrid
              features={entity.features}
              className="text-xs gap-x-4"
              cols={3}
            />
          </Panel>
          <HoverCard.Arrow asChild>
            {/* Triangle svg */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 12 6"
              stroke="currentColor"
              className="w-[12px] h-[6px] fill-card text-border z-100 my-[-1px]"
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
