import React, { useMemo } from "react";
import { Sheet, SheetContent } from "~/components/ui/sheet";
import { selectors, useEditorStore } from "./state/zustand";
import { editNodeSheetAtom } from "./state/jotai";
import { useAtom } from "jotai";
import { MAP_FN_TYPE_TO_EDITOR } from "./EventEditor";

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
      <SheetContent className="sm:max-w-xl" showClose={false}>
        {EditNodeEditor && (
          <EditNodeEditor initialNodeId={node?.id} eventType={eventType} />
        )}
      </SheetContent>
    </Sheet>
  );
}
