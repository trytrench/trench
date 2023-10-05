import { fromUnixTime, getUnixTime } from "date-fns";

export const DateParam = {
  encode: (date: Date | undefined) => {
    console.log(date);
    return date ? getUnixTime(date) : "";
  },
  decode: (date: string | undefined) =>
    date ? fromUnixTime(parseInt(date, 10)) : "",
};
