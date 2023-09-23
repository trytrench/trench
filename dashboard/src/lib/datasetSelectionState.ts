import { create } from "zustand";

interface DatasetSelectionStore {
  selection: number;
  set: (val: number) => void;
}

export const useDatasetSelectionStore = create<DatasetSelectionStore>(
  (set) => ({
    selection: 0,
    set: (val: number) => set({ selection: val }),
  })
);
