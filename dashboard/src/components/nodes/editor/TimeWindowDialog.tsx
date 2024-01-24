import { zodResolver } from "@hookform/resolvers/zod";
import {
  TimeWindow,
  timeWindowSchema,
} from "event-processing/src/function-type-defs/lib/timeWindow";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface Props {
  children: React.ReactNode;
  value: TimeWindow;
  onSubmit: (values: TimeWindow) => void;
}

export function TimeWindowDialog({ children, onSubmit, value }: Props) {
  const form = useForm<TimeWindow>({
    resolver: zodResolver(timeWindowSchema),
    defaultValues: {
      unit: "days",
      value: 1,
    },
  });

  useEffect(() => {
    form.reset(value);
  }, [form, value]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select time window</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem className="w-[6rem]">
                    {/* <FormLabel>Time</FormLabel> */}
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem className="w-[8rem]">
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                        </SelectContent>
                        <FormMessage />
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function RenderTimeWindow({ value }: { value: TimeWindow }) {
  return (
    <>
      {value.value} {value.unit}
    </>
  );
}
