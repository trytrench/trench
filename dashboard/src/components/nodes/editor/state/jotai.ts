import { FnType } from "event-processing";
import { atom } from "jotai";

type EditNodeSheetState =
  | {
      isOpen: true;
      isEditing: true;
      nodeId: string;
    }
  | {
      isOpen: true;
      isEditing: false;
      fnType: FnType;
    }
  | {
      isOpen: false;
    };

export const editNodeSheetAtom = atom<EditNodeSheetState>({
  isOpen: false,
});
