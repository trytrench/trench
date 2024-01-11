import { Feature } from "@prisma/client";
import { NodeDef, NodeDefsMap, NodeType } from "event-processing";
import { Check } from "lucide-react";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { api } from "~/utils/api";

interface Props {
  eventTypeId: string;
  onSelectNode: (node: NodeDef) => void;
  onSelectFeature: (node: NodeDef, feature: Feature) => void;
  selectedFeatureIds: string[];
  selectedNodeIds: string[];
  children: React.ReactNode;
}

export default function NodeCombobox({
  eventTypeId,
  onSelectFeature,
  onSelectNode,
  selectedFeatureIds,
  selectedNodeIds,
  children,
}: Props) {
  const { data: features } = api.features.list.useQuery();
  const { data: nodes } = api.nodeDefs.list.useQuery({ eventTypeId });

  const [entityNode, setEntityNode] = useState<
    NodeDefsMap[NodeType.EntityAppearance] | null
  >();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) setEntityNode(null);
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[16rem] p-0">
        {entityNode ? (
          <Command>
            <CommandInput placeholder="Search properties..." />
            <CommandEmpty>No properties found.</CommandEmpty>
            <CommandGroup>
              {features
                ?.filter(
                  (feature) =>
                    feature.belongsTo[0]?.entityTypeId ===
                    entityNode?.returnSchema?.entityType
                )
                .map((feature) => (
                  <CommandItem
                    value={feature.name}
                    key={feature.id}
                    onSelect={() => {
                      setOpen(false);
                      onSelectFeature(entityNode, feature);
                      setEntityNode(null);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedFeatureIds.includes(feature.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {feature.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </Command>
        ) : (
          <Command>
            <CommandInput placeholder="Search nodes..." />
            <CommandEmpty>No entities found.</CommandEmpty>

            <CommandGroup>
              {nodes
                ?.filter((node) => node.type === NodeType.EntityAppearance)
                .map((node) => (
                  <CommandItem
                    value={node.name}
                    key={node.id}
                    onSelect={() => {
                      setEntityNode(
                        node as NodeDefsMap[NodeType.EntityAppearance]
                      );
                    }}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {node.name}
                  </CommandItem>
                ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup>
              {nodes
                ?.filter((node) => node.type === NodeType.Computed)
                .map((node) => (
                  <CommandItem
                    value={node.name}
                    key={node.id}
                    onSelect={() => {
                      setOpen(false);
                      onSelectNode(node);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedNodeIds.includes(node.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {node.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
