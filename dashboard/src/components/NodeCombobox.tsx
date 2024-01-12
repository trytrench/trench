import { FeatureDef, NodeDef, NodeDefsMap, NodeType } from "event-processing";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
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

interface Props {
  onSelectNode: (node: NodeDef) => void;
  onSelectFeature: (node: NodeDef, feature: FeatureDef) => void;
  selectedFeatureIds: string[];
  selectedNodeIds: string[];
  children: React.ReactNode;
  nodes: NodeDef[];
  features: FeatureDef[];
  entityNode?: NodeDefsMap[NodeType.EntityAppearance];
  onSelectEntityNode?: (node: NodeDefsMap[NodeType.EntityAppearance]) => void;
}

export default function NodeCombobox({
  onSelectFeature,
  onSelectNode,
  selectedFeatureIds,
  selectedNodeIds,
  children,
  nodes,
  features,
  entityNode: initialEntityNode,
  onSelectEntityNode,
}: Props) {
  const [entityNode, setEntityNode] = useState<
    NodeDefsMap[NodeType.EntityAppearance] | null
  >(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (initialEntityNode) setEntityNode(initialEntityNode);
  }, [initialEntityNode]);

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
                .filter(
                  (feature) =>
                    feature.entityTypeId ===
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
                .filter((node) => node.type === NodeType.EntityAppearance)
                .map((node) => (
                  <CommandItem
                    value={node.name}
                    key={node.id}
                    onSelect={() => {
                      if (onSelectEntityNode) {
                        setOpen(false);
                        return onSelectEntityNode(
                          node as NodeDefsMap[NodeType.EntityAppearance]
                        );
                      }

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
                .filter((node) => node.type === NodeType.Computed)
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
