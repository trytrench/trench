import { XIcon } from "lucide-react";

interface FilterChipProps {
  label: string;
  onDelete?: () => void;
}

export function FilterChip({ label, onDelete }: FilterChipProps) {
  return (
    <div className="bg-gray-100 pr-1.5 pl-2.5 py-0.5 rounded-full text-sm flex items-center gap-1">
      {label}
      <button
        className="text-gray-400 hover:text-gray-700 rounded-full transition-colors"
        onClick={onDelete}
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}
