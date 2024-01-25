import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "../../ui/label";

type TimeInterval = {
  number: number;
  unit: "minutes" | "hours" | "days" | "weeks" | "months";
};

export function TimeIntervalSelector(props: {
  value: TimeInterval;
  onChange?: (value: TimeInterval) => void;
  label: string;
  disabled?: boolean;
}) {
  const { value, onChange, label, disabled } = props;

  return (
    <div className="flex gap-3 items-end">
      {/* Feature Type */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-md">{label}</Label>
        <Input
          type="number"
          value={value.number}
          onChange={(e) => {
            onChange?.({
              ...value,
              number: e.target.valueAsNumber,
            });
          }}
          className="w-[20rem]"
          disabled={disabled}
        />
      </div>

      {/* Data Type */}
      <div className="flex flex-col gap-1.5">
        <Select
          value={value.unit}
          onValueChange={(v) => {
            onChange?.({
              ...value,
              unit: v as TimeInterval["unit"],
            });
          }}
        >
          <SelectTrigger className="w-[8rem]" disabled={disabled}>
            <SelectValue></SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
            <SelectItem value="weeks">Weeks</SelectItem>
            <SelectItem value="months">Months</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
