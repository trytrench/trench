import React, { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetPortal,
} from "~/components/ui/sheet";
import { selectors, useEditorStore } from "./state/zustand";
import { editNodeSheetAtom } from "./state/jotai";
import { useAtom } from "jotai";
import { NodeEditorProps } from "./types";
import { FnType } from "event-processing";
import { EditBlocklist } from "./EditBlocklist";
import { EditComputed } from "./EditComputed";
import { EditCounter } from "./EditCounter";
import { EditDecision } from "./EditDecision";
import { EditUniqueCounter } from "./EditUniqueCounter";
import { EditEvent } from "./EditEvent";

const MAP_FN_TYPE_TO_EDITOR: Partial<
  Record<FnType, React.FC<NodeEditorProps>>
> = {
  [FnType.Computed]: EditComputed,
  [FnType.Counter]: EditCounter,
  [FnType.UniqueCounter]: EditUniqueCounter,
  [FnType.Decision]: EditDecision,
  [FnType.Blocklist]: EditBlocklist,
  [FnType.Event]: EditEvent,
};

export function EditNodeSheet({ eventType }: { eventType: string }) {
  const [state, setState] = useAtom(editNodeSheetAtom);

  const node = useEditorStore(
    selectors.getNodeDef(state.isOpen && state.isEditing ? state.nodeId : "")
  );

  const fnType = useMemo(() => {
    if (state.isOpen) {
      if (state.isEditing) {
        if (node) return node.fn.type;
        else return null;
      } else {
        return state.fnType;
      }
    } else {
      return null;
    }
  }, [node, state]);

  const EditNodeEditor = fnType ? MAP_FN_TYPE_TO_EDITOR[fnType] : null;

  return (
    <Sheet
      open={state.isOpen}
      onOpenChange={(open) => {
        if (!open) setState({ isOpen: false });
      }}
    >
      <SheetPortal>
        <SheetOverlay />
        <SheetContent className="sm:max-w-xl" showClose={false}>
          {EditNodeEditor && (
            <EditNodeEditor
              initialNodeId={node?.id}
              eventType={eventType}
              onSaveSuccess={() => {
                setState({ isOpen: false });
              }}
            />
          )}
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
