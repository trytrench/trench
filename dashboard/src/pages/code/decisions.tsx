import { ArrowRight, GripVertical, Loader2Icon, X } from "lucide-react";
import { useState } from "react";
import AppLayout from "~/components/AppLayout";
import { Badge } from "~/components/ui/badge";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Panel } from "~/components/ui/custom/panel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import type { NextPageWithLayout } from "~/pages/_app";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

const Page: NextPageWithLayout = () => {
  const allEvents = ["create-session", "payment-attempt", "payment-outcome"];
  const [selectedEvent, setSelectedEvent] = useState<string>("create-session");

  const temp = [
    {
      condition: "Sus",
      decision: "Block",
    },
    {
      condition: "Too many attempts",
      decision: "Block",
    },
    {
      condition: "Card > 4 users",
      decision: "Block",
    },
    {
      condition: "Bad person",
      decision: "Block",
    },
  ];

  const tempRules = [
    "Sus",
    "Too many attempts",
    "Card > 4 users",
    "Bad person",
  ];

  const [decisions, setDecisions] =
    useState<{ condition: string; decision: string }[]>(temp);

  const [finalDecision, setFinalDecision] = useState<string>("Approve");

  const decisionOpts = ["Block", "Approve", "Review", "Needs KYC"];

  // dnd kit

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragEnd(event) {
    const { active, over } = event;
    console.log(active, over);

    if (active.id !== over.id) {
      setDecisions((items) => {
        const oldIndex = items.findIndex((i) => i.condition === active.id);
        const newIndex = items.findIndex((i) => i.condition === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  // temp layout
  return (
    <div>
      <h1 className="p-8 border-b text-2xl text-emphasis-foreground w-full">
        Decisions (decision time)
      </h1>
      <div className="grid grid-cols-4 p-8 gap-8 w-[70rem] mx-auto">
        <div className="text-sm">
          {/* Event List */}
          <div className="font-semibold mb-2 mt-4">Event Type</div>

          <div className="">
            {allEvents ? (
              allEvents.map((type) => (
                <button
                  className={cn(
                    "px-4 py-1 active:bg-accent w-full text-left rounded-md transition flex justify-between items-center",
                    {
                      "bg-accent text-accent-foreground":
                        selectedEvent === type,
                      "hover:bg-muted": selectedEvent !== type,
                    }
                  )}
                  onClick={() => {
                    setSelectedEvent(type);
                  }}
                >
                  {type}
                </button>
              ))
            ) : (
              <Loader2Icon className="animate-spin w-4 h-4 text-muted-foreground mx-auto opacity-50" />
            )}
          </div>
        </div>
        <Panel className="flex flex-col col-span-3">
          <div className="p-1 text-sm">
            The following conditions will be applied to{" "}
            <span className="font-semibold">create-session</span> events. Higher
            conditions take precedence over lower ones.
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between p-1">
            <span className="flex-1 pl-8">If the rule fires...</span>
            <span className="w-60">Then...</span>
          </div>

          <div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext
                items={decisions.map((d) => d.condition ?? "else")}
                strategy={verticalListSortingStrategy}
              >
                {decisions.map((decision, index) => (
                  <Rule
                    key={decision.condition}
                    data={decision}
                    decisionOpts={decisionOpts}
                    onDecisionChange={(decision) => {
                      setDecisions(
                        decisions.map((d, i) =>
                          i === index ? { ...d, decision } : d
                        )
                      );
                    }}
                    onDelete={() => {
                      setDecisions(decisions.filter((_, i) => i !== index));
                    }}
                    active={decision.condition === activeId}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <AddCondition
            ruleOpts={tempRules.filter(
              (rule) => !decisions.map((d) => d.condition).includes(rule)
            )}
            onAdd={(rule) => {
              setDecisions([
                ...decisions,
                {
                  condition: rule,
                  decision: "",
                },
              ]);
            }}
          />

          <Rule
            data={{ condition: null, decision: finalDecision }}
            decisionOpts={decisionOpts}
            onDecisionChange={setFinalDecision}
          />
        </Panel>
      </div>
    </div>
  );
};

// dnd-kit sortable

interface RuleProps {
  data: {
    condition: string | null;
    decision: string;
  };
  decisionOpts: string[];
  onDecisionChange?: (decision: string) => void;
  onDelete?: () => void;
  active?: boolean;
}

function Rule({
  data,
  decisionOpts,
  onDecisionChange,
  onDelete,
  active,
}: RuleProps) {
  const isElse = !data.condition;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: data.condition ?? "else" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={cn("flex items-center relative mt-2 outline-ring", {
        "z-50": active,
      })}
      style={style}
      ref={setNodeRef}
      {...attributes}
    >
      {isElse ? (
        <div className="w-6 mr-4" />
      ) : (
        <GripVertical
          className="w-6 h-6 my-auto mr-4 opacity-50 hover:opacity-100 transition-opacity outline-ring"
          tabIndex={0}
          {...listeners}
        />
      )}

      <div className="flex-1">
        <div className="flex flex-wrap gap-1">
          {isElse ? (
            <Badge variant="outline">All other events...</Badge>
          ) : (
            <Badge>{data.condition}</Badge>
          )}
        </div>
      </div>
      <ArrowRight className="my-auto mx-8 w-6 h-6 shrink-0" />

      <div className="">
        <Select value={data.decision} onValueChange={onDecisionChange}>
          <SelectTrigger className="w-36 ml-auto font-semibold shrink-0 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {decisionOpts.map((decision) => (
              <SelectItem value={decision}>{decision}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isElse ? (
        <div className="w-6 h-6 ml-4" />
      ) : (
        <button onClick={onDelete}>
          <X className="w-6 h-6 my-auto ml-4 opacity-20 hover:opacity-60 text-destructive-foreground transition-opacity" />
        </button>
      )}
    </div>
  );
}

interface AddConditionProps {
  ruleOpts: string[];
  onAdd?: (condition: string) => void;
}

function AddCondition({ onAdd, ruleOpts }: AddConditionProps) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="mt-1.5 mb-0.5 px-3 py-1 rounded-xl text-center text-sm opacity-50 hover:opacity-100 transition-opacity">
          + add a condition
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="p-0">
        {ruleOpts.length > 0 ? (
          <Command>
            <CommandInput placeholder="search..." />
            <CommandList>
              <CommandEmpty>No Results Found</CommandEmpty>
              <CommandGroup>
                {ruleOpts.map((rule) => (
                  <CommandItem
                    onSelect={() => {
                      onAdd?.(rule);
                      setOpen(false);
                    }}
                  >
                    {rule}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            No more rules to add.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
